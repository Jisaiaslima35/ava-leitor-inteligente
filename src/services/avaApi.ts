/**
 * Cliente HTTP centralizado do AVA (Leitor Inteligente).
 *
 * REGRAS CRÍTICAS:
 * 1. Consome EXCLUSIVAMENTE endpoints `/api/ava/*` com `Authorization: Bearer <token>`.
 * 2. Nunca acessa PostgREST diretamente.
 * 3. Controlado exclusivamente por `import.meta.env.VITE_USE_MOCK === 'true'`.
 * 4. ZERO fallback silencioso: quando `USE_MOCK` for `false` (padrão de produção),
 *    toda falha de rede ou erro HTTP é propagada via `AvaApiError` para exibição real na UI.
 */

import type {
  AvaAulaResponse,
  AvaAvaliacaoDetalheResponse,
  AvaAvaliacoesResponse,
  AvaBootstrapResponse,
  AvaCalendarioResponse,
  AvaFrequenciaResponse,
  AvaLoginResponse,
  AvaLogoutResponse,
  AvaMeResponse,
  AvaModulosResponse,
  AvaNotasResponse,
  AvaResponderAvaliacaoResponse,
  AvaTurmaDetalheResponse,
  AvaTurmasResponse,
  AvaVincularResponse,
} from '../types/ava';
import {
  MOCK_ANOS,
  MOCK_CONTAS,
  findMockContaByToken,
  getMockAvaliacoesDetalhadas,
  getMockAvaliacoesList,
  getMockCalendario,
  getMockFrequencia,
  getMockModulos,
  getMockNotas,
  getMockSalas,
  getMockTenant,
  getMockTurmaDetalhe,
  getMockTurmas,
  submeterMockAvaliacao,
  vincularMockAluno,
} from './avaMockData';

export const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '');
const TOKEN_STORAGE_KEY = 'ava_access_token';
const TENANT_STORAGE_KEY = 'ava_tenant_slug';

export class AvaApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'AvaApiError';
    this.status = status;
  }
}

type UnauthorizedListener = () => void;
const unauthorizedListeners = new Set<UnauthorizedListener>();

export function onAvaUnauthorized(listener: UnauthorizedListener): () => void {
  unauthorizedListeners.add(listener);
  return () => unauthorizedListeners.delete(listener);
}

function notifyUnauthorized(): void {
  clearStoredToken();
  unauthorizedListeners.forEach((fn) => fn());
}

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } catch {
    // storage indisponível
  }
}

export function clearStoredToken(): void {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // storage indisponível
  }
}

export function getStoredTenantSlug(): string | null {
  try {
    return localStorage.getItem(TENANT_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredTenantSlug(slug: string): void {
  try {
    localStorage.setItem(TENANT_STORAGE_KEY, slug);
  } catch {
    // storage indisponível
  }
}

function delayMock(ms = 140): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  tenantSlug?: string | null;
  query?: Record<string, string | undefined | null>;
  requireAuth?: boolean;
}

async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, tenantSlug, query, requireAuth = true } = options;
  const token = getStoredToken();

  if (requireAuth && !token) {
    notifyUnauthorized();
    throw new AvaApiError(401, 'Sessão não autenticada. Faça login para continuar.');
  }

  const params = new URLSearchParams();
  if (tenantSlug) {
    params.set('tenant', tenantSlug);
  }
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== '') {
        params.set(k, v);
      }
    }
  }
  const qs = params.toString();
  const url = `${API_BASE}${path}${qs ? `?${qs}` : ''}`;

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (tenantSlug) {
    headers['X-Tenant-Slug'] = tenantSlug;
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    const detalhe = err instanceof Error ? err.message : 'Falha de conexão com o servidor.';
    throw new AvaApiError(0, `Não foi possível conectar à API do AVA (${path}): ${detalhe}`);
  }

  let payload: unknown = null;
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
  }

  if (response.status === 401) {
    const msg =
      (payload as { erro?: string } | null)?.erro ||
      'Sua sessão expirou ou é inválida. Entre novamente.';
    notifyUnauthorized();
    throw new AvaApiError(401, msg);
  }

  if (!response.ok) {
    const msg =
      (payload as { erro?: string; message?: string } | null)?.erro ||
      (payload as { erro?: string; message?: string } | null)?.message ||
      `Erro HTTP ${response.status} ao consultar ${path}.`;
    throw new AvaApiError(response.status, msg);
  }

  if (payload && typeof payload === 'object' && 'ok' in payload && (payload as { ok: boolean }).ok === false) {
    const msg = (payload as { erro?: string }).erro || 'A API retornou uma resposta inválida.';
    throw new AvaApiError(response.status || 400, msg);
  }

  return payload as T;
}

/**
 * Credenciais de demonstração expostas APENAS quando `USE_MOCK === true`
 * para facilitar o teste das telas de Aluno e Professor no preview.
 */
export function getMockDemoAccounts() {
  if (!USE_MOCK) return [];
  return MOCK_CONTAS.map((c) => ({
    email: c.email,
    senha: c.senha,
    nome: c.usuario.nome,
    papel: c.usuario.papel,
    precisa_vincular: Boolean(c.usuario.precisa_vincular),
    identificador_dica: c.identificador_esperado ?? c.usuario.identificador ?? null,
    tenant_slug: c.tenant_slug,
  }));
}

export const avaApi = {
  // ---------------------------------------------------------------------------
  // Autenticação (Seção 3.4)
  // ---------------------------------------------------------------------------
  async login(email: string, senha: string, tenantSlug?: string | null): Promise<AvaLoginResponse> {
    if (USE_MOCK) {
      await delayMock(200);
      const emailLimpo = email.trim().toLowerCase();
      const conta = MOCK_CONTAS.find(
        (c) => c.email.toLowerCase() === emailLimpo && c.senha === senha,
      );
      if (!conta) {
        throw new AvaApiError(
          401,
          'E-mail ou senha inválidos. Verifique suas credenciais cadastradas na instituição.',
        );
      }
      const tenant = getMockTenant(tenantSlug || conta.tenant_slug);
      setStoredToken(conta.token);
      setStoredTenantSlug(tenant.slug);
      const atualizada = findMockContaByToken(conta.token) ?? conta;
      return {
        ok: true,
        token: atualizada.token,
        usuario: atualizada.usuario,
        tenant,
      };
    }

    const res = await apiFetch<AvaLoginResponse>('/api/ava/auth/login', {
      method: 'POST',
      body: { email: email.trim(), senha },
      tenantSlug,
      requireAuth: false,
    });
    if (res.token) {
      setStoredToken(res.token);
    }
    if (res.tenant?.slug) {
      setStoredTenantSlug(res.tenant.slug);
    }
    return res;
  },

  async vincular(identifier: string, tenantSlug?: string | null): Promise<AvaVincularResponse> {
    if (USE_MOCK) {
      await delayMock(180);
      const token = getStoredToken();
      if (!token) {
        notifyUnauthorized();
        throw new AvaApiError(401, 'Sessão expirada.');
      }
      const res = vincularMockAluno(token, identifier);
      if (!res.ok) {
        throw new AvaApiError(res.status, res.erro);
      }
      setStoredToken(res.token);
      return {
        ok: true,
        token: res.token,
        aluno: res.aluno,
      };
    }

    const res = await apiFetch<AvaVincularResponse>('/api/ava/auth/vincular', {
      method: 'POST',
      body: { identifier: identifier.trim() },
      tenantSlug,
    });
    if (res.token) {
      setStoredToken(res.token);
    }
    return res;
  },

  async me(tenantSlug?: string | null): Promise<AvaMeResponse> {
    if (USE_MOCK) {
      await delayMock(120);
      const conta = findMockContaByToken(getStoredToken());
      if (!conta) {
        notifyUnauthorized();
        throw new AvaApiError(401, 'Sessão não encontrada.');
      }
      return {
        ok: true,
        usuario: conta.usuario,
        permissoes: conta.permissoes,
      };
    }

    return apiFetch<AvaMeResponse>('/api/ava/me', { tenantSlug });
  },

  async logout(tenantSlug?: string | null): Promise<AvaLogoutResponse> {
    if (USE_MOCK) {
      await delayMock(100);
      clearStoredToken();
      return { ok: true };
    }

    try {
      return await apiFetch<AvaLogoutResponse>('/api/ava/auth/logout', {
        method: 'POST',
        tenantSlug,
        requireAuth: false,
      });
    } finally {
      clearStoredToken();
    }
  },

  // ---------------------------------------------------------------------------
  // Endpoints Acadêmicos (Seção 4.4)
  // ---------------------------------------------------------------------------
  async bootstrap(tenantSlug?: string | null, anoId?: string | null): Promise<AvaBootstrapResponse> {
    if (USE_MOCK) {
      await delayMock(140);
      const conta = findMockContaByToken(getStoredToken());
      if (!conta) {
        notifyUnauthorized();
        throw new AvaApiError(401, 'Sessão expirada. Faça login novamente.');
      }
      const tenant = getMockTenant(tenantSlug || conta.tenant_slug);
      const anoSelecionado = MOCK_ANOS.find((a) => a.id === anoId) ?? MOCK_ANOS[0];
      const turmasMock = getMockTurmas(anoSelecionado.id).map((t) => ({
        id: t.id,
        disciplina: t.disciplina,
        curso_tipo: tenant.curso_tipo,
        total_alunos: t.alunos.length,
      }));
      return {
        ok: true,
        usuario: conta.usuario,
        tenant,
        ano: anoSelecionado,
        anos: MOCK_ANOS,
        turmas: turmasMock,
      };
    }

    return apiFetch<AvaBootstrapResponse>('/api/ava/bootstrap', {
      tenantSlug,
      query: { ano_id: anoId },
    });
  },

  async modulos(tenantSlug?: string | null, anoId?: string | null): Promise<AvaModulosResponse> {
    if (USE_MOCK) {
      await delayMock(150);
      const conta = findMockContaByToken(getStoredToken());
      if (!conta) {
        notifyUnauthorized();
        throw new AvaApiError(401, 'Sessão expirada.');
      }
      return {
        ok: true,
        modulos: getMockModulos(anoId || 'ano-2026-1'),
      };
    }

    return apiFetch<AvaModulosResponse>('/api/ava/modulos', {
      tenantSlug,
      query: { ano_id: anoId },
    });
  },

  async notas(
    tenantSlug?: string | null,
    anoId?: string | null,
    alunoId?: string | null,
  ): Promise<AvaNotasResponse> {
    if (USE_MOCK) {
      await delayMock(150);
      const conta = findMockContaByToken(getStoredToken());
      if (!conta) {
        notifyUnauthorized();
        throw new AvaApiError(401, 'Sessão expirada.');
      }
      if (alunoId && conta.usuario.papel === 'aluno' && alunoId !== conta.usuario.id) {
        throw new AvaApiError(403, 'Acesso negado: você só pode consultar suas próprias notas.');
      }
      return getMockNotas(anoId || 'ano-2026-1', alunoId || conta.usuario.id);
    }

    const endpoint = alunoId ? `/api/ava/notas/${encodeURIComponent(alunoId)}` : '/api/ava/notas';
    return apiFetch<AvaNotasResponse>(endpoint, {
      tenantSlug,
      query: { ano_id: anoId },
    });
  },

  async frequencia(
    tenantSlug?: string | null,
    anoId?: string | null,
    turmaId?: string | null,
  ): Promise<AvaFrequenciaResponse> {
    if (USE_MOCK) {
      await delayMock(140);
      const conta = findMockContaByToken(getStoredToken());
      if (!conta) {
        notifyUnauthorized();
        throw new AvaApiError(401, 'Sessão expirada.');
      }
      return getMockFrequencia(anoId || 'ano-2026-1');
    }

    return apiFetch<AvaFrequenciaResponse>('/api/ava/frequencia', {
      tenantSlug,
      query: { ano_id: anoId, turma_id: turmaId },
    });
  },

  async calendario(tenantSlug?: string | null, anoId?: string | null): Promise<AvaCalendarioResponse> {
    if (USE_MOCK) {
      await delayMock(140);
      const conta = findMockContaByToken(getStoredToken());
      if (!conta) {
        notifyUnauthorized();
        throw new AvaApiError(401, 'Sessão expirada.');
      }
      return {
        ok: true,
        eventos: getMockCalendario(anoId || 'ano-2026-1'),
      };
    }

    return apiFetch<AvaCalendarioResponse>('/api/ava/calendario', {
      tenantSlug,
      query: { ano_id: anoId },
    });
  },

  async turmas(tenantSlug?: string | null, anoId?: string | null): Promise<AvaTurmasResponse> {
    if (USE_MOCK) {
      await delayMock(150);
      const conta = findMockContaByToken(getStoredToken());
      if (!conta) {
        notifyUnauthorized();
        throw new AvaApiError(401, 'Sessão expirada.');
      }
      if (conta.usuario.papel === 'aluno') {
        throw new AvaApiError(403, 'Acesso restrito a professores.');
      }
      return {
        ok: true,
        turmas: getMockTurmas(anoId || 'ano-2026-1'),
      };
    }

    return apiFetch<AvaTurmasResponse>('/api/ava/turmas', {
      tenantSlug,
      query: { ano_id: anoId },
    });
  },

  async turmaDetalhe(
    turmaId: string,
    tenantSlug?: string | null,
    anoId?: string | null,
  ): Promise<AvaTurmaDetalheResponse> {
    if (USE_MOCK) {
      await delayMock(150);
      const conta = findMockContaByToken(getStoredToken());
      if (!conta) {
        notifyUnauthorized();
        throw new AvaApiError(401, 'Sessão expirada.');
      }
      if (conta.usuario.papel === 'aluno') {
        throw new AvaApiError(403, 'Acesso restrito a professores.');
      }
      const detalhe = getMockTurmaDetalhe(turmaId, anoId || 'ano-2026-1');
      if (!detalhe) {
        throw new AvaApiError(404, 'Turma não encontrada para esta instituição.');
      }
      return detalhe;
    }

    return apiFetch<AvaTurmaDetalheResponse>(`/api/ava/turma/${encodeURIComponent(turmaId)}`, {
      tenantSlug,
      query: { ano_id: anoId },
    });
  },

  async aula(roomId: string, tenantSlug?: string | null): Promise<AvaAulaResponse> {
    if (USE_MOCK) {
      await delayMock(140);
      const conta = findMockContaByToken(getStoredToken());
      if (!conta) {
        notifyUnauthorized();
        throw new AvaApiError(401, 'Sessão expirada.');
      }
      const tenant = getMockTenant(tenantSlug || conta.tenant_slug);
      const salas = getMockSalas(tenant.slug);
      const sala = salas[roomId];
      if (!sala) {
        throw new AvaApiError(404, 'Sala ao vivo não encontrada ou expirada.');
      }
      return { ok: true, sala };
    }

    return apiFetch<AvaAulaResponse>(`/api/ava/aula/${encodeURIComponent(roomId)}`, {
      tenantSlug,
    });
  },

  async avaliacoes(tenantSlug?: string | null, anoId?: string | null): Promise<AvaAvaliacoesResponse> {
    if (USE_MOCK) {
      await delayMock(140);
      const conta = findMockContaByToken(getStoredToken());
      if (!conta) {
        notifyUnauthorized();
        throw new AvaApiError(401, 'Sessão expirada.');
      }
      return {
        ok: true,
        avaliacoes: getMockAvaliacoesList(),
      };
    }

    return apiFetch<AvaAvaliacoesResponse>('/api/ava/avaliacoes', {
      tenantSlug,
      query: { ano_id: anoId },
    });
  },

  async avaliacaoDetalhe(
    avaliacaoId: string,
    tenantSlug?: string | null,
  ): Promise<AvaAvaliacaoDetalheResponse> {
    if (USE_MOCK) {
      await delayMock(150);
      const conta = findMockContaByToken(getStoredToken());
      if (!conta) {
        notifyUnauthorized();
        throw new AvaApiError(401, 'Sessão expirada.');
      }
      const todas = getMockAvaliacoesDetalhadas();
      const avaliacao = todas[avaliacaoId];
      if (!avaliacao) {
        throw new AvaApiError(404, 'Avaliação não encontrada.');
      }
      return { ok: true, avaliacao };
    }

    return apiFetch<AvaAvaliacaoDetalheResponse>(
      `/api/ava/avaliacoes/${encodeURIComponent(avaliacaoId)}`,
      { tenantSlug },
    );
  },

  async responderAvaliacao(
    avaliacaoId: string,
    respostas: Record<string, number>,
    tenantSlug?: string | null,
  ): Promise<AvaResponderAvaliacaoResponse> {
    if (USE_MOCK) {
      await delayMock(200);
      const conta = findMockContaByToken(getStoredToken());
      if (!conta) {
        notifyUnauthorized();
        throw new AvaApiError(401, 'Sessão expirada.');
      }
      const resultado = submeterMockAvaliacao(avaliacaoId, respostas);
      if (!resultado) {
        throw new AvaApiError(404, 'Avaliação não encontrada.');
      }
      return { ok: true, resultado };
    }

    return apiFetch<AvaResponderAvaliacaoResponse>(
      `/api/ava/avaliacoes/${encodeURIComponent(avaliacaoId)}/responder`,
      {
        method: 'POST',
        body: { respostas },
        tenantSlug,
      },
    );
  },
};

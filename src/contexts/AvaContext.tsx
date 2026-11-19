import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  AvaApiError,
  avaApi,
  clearStoredToken,
  getStoredTenantSlug,
  getStoredToken,
  onAvaUnauthorized,
  setStoredTenantSlug,
} from '../services/avaApi';
import type { AvaAno, AvaBootstrapResponse, AvaTenant, AvaUsuario } from '../types/ava';

interface AvaContextValue {
  token: string | null;
  tenantSlug: string | null;
  bootstrap: AvaBootstrapResponse | null;
  usuario: AvaUsuario | null;
  tenant: AvaTenant | null;
  anoAtual: AvaAno | null;
  anosDisponiveis: AvaAno[];
  selectedAnoId: string | null;
  setSelectedAnoId: (anoId: string) => void;
  isProfessor: boolean;
  isAluno: boolean;
  isLoading: boolean;
  error: AvaApiError | null;
  refreshBootstrap: (anoOverride?: string | null) => Promise<void>;
  login: (email: string, senha: string, slugOverride?: string | null) => Promise<AvaUsuario>;
  vincular: (identifier: string) => Promise<void>;
  logout: () => Promise<void>;
  buildAvaPath: (subpath?: string) => string;
}

const AvaContext = createContext<AvaContextValue | null>(null);

export function AvaProvider({ children }: { children: React.ReactNode }) {
  const params = useParams<{ slug?: string }>();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  const queryTenant = searchParams.get('tenant');
  const routeSlug = params.slug || null;

  const tenantSlug = useMemo(() => {
    return routeSlug || queryTenant || getStoredTenantSlug() || null;
  }, [routeSlug, queryTenant]);

  useEffect(() => {
    if (routeSlug) {
      setStoredTenantSlug(routeSlug);
    } else if (queryTenant) {
      setStoredTenantSlug(queryTenant);
    }
  }, [routeSlug, queryTenant]);

  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [bootstrap, setBootstrap] = useState<AvaBootstrapResponse | null>(null);
  const [selectedAnoId, setSelectedAnoIdState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(() => Boolean(getStoredToken()));
  const [error, setError] = useState<AvaApiError | null>(null);

  const buildAvaPath = useCallback(
    (subpath = '') => {
      const normalized = subpath
        ? subpath.startsWith('/')
          ? subpath
          : `/${subpath}`
        : '';
      const activeSlug = routeSlug || bootstrap?.tenant?.slug || tenantSlug;
      if (routeSlug && activeSlug) {
        return `/t/${encodeURIComponent(activeSlug)}/ava${normalized}`;
      }
      if (queryTenant) {
        return `/ava${normalized}?tenant=${encodeURIComponent(queryTenant)}`;
      }
      if (activeSlug) {
        return `/t/${encodeURIComponent(activeSlug)}/ava${normalized}`;
      }
      return `/ava${normalized}`;
    },
    [routeSlug, queryTenant, bootstrap?.tenant?.slug, tenantSlug],
  );

  // Listener global de 401: limpa sessão e redireciona para /ava/entrar
  useEffect(() => {
    return onAvaUnauthorized(() => {
      setToken(null);
      setBootstrap(null);
      setError(null);
      const isAlreadyLogin = location.pathname.endsWith('/ava/entrar');
      if (!isAlreadyLogin) {
        navigate(buildAvaPath('/entrar'), { replace: true });
      }
    });
  }, [location.pathname, navigate, buildAvaPath]);

  const refreshBootstrap = useCallback(
    async (anoOverride?: string | null) => {
      const currentToken = getStoredToken();
      if (!currentToken) {
        setToken(null);
        setBootstrap(null);
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const res = await avaApi.bootstrap(tenantSlug, anoOverride ?? selectedAnoId);
        setBootstrap(res);
        setToken(currentToken);
        if (res.tenant?.slug) {
          setStoredTenantSlug(res.tenant.slug);
        }
        if (res.ano?.id && !anoOverride && !selectedAnoId) {
          setSelectedAnoIdState(res.ano.id);
        }
      } catch (err) {
        if (err instanceof AvaApiError) {
          if (err.status !== 401) {
            setError(err);
          }
        } else {
          setError(new AvaApiError(500, 'Erro inesperado ao carregar dados iniciais do AVA.'));
        }
      } finally {
        setIsLoading(false);
      }
    },
    [tenantSlug, selectedAnoId],
  );

  useEffect(() => {
    if (token) {
      void refreshBootstrap(selectedAnoId);
    } else {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, tenantSlug, selectedAnoId]);

  const setSelectedAnoId = useCallback((anoId: string) => {
    setSelectedAnoIdState(anoId);
  }, []);

  const login = useCallback(
    async (email: string, senha: string, slugOverride?: string | null): Promise<AvaUsuario> => {
      const slugToUse = slugOverride || tenantSlug;
      const res = await avaApi.login(email, senha, slugToUse);
      setToken(res.token);
      setError(null);
      if (!res.usuario.precisa_vincular) {
        const boot = await avaApi.bootstrap(res.tenant?.slug || slugToUse, null);
        setBootstrap(boot);
        if (boot.ano?.id) {
          setSelectedAnoIdState(boot.ano.id);
        }
      }
      return res.usuario;
    },
    [tenantSlug],
  );

  const vincular = useCallback(
    async (identifier: string) => {
      const res = await avaApi.vincular(identifier, tenantSlug);
      setToken(res.token);
      const boot = await avaApi.bootstrap(tenantSlug, null);
      setBootstrap(boot);
      if (boot.ano?.id) {
        setSelectedAnoIdState(boot.ano.id);
      }
    },
    [tenantSlug],
  );

  const logout = useCallback(async () => {
    try {
      await avaApi.logout(tenantSlug);
    } finally {
      clearStoredToken();
      setToken(null);
      setBootstrap(null);
      setSelectedAnoIdState(null);
      setError(null);
      navigate(buildAvaPath('/entrar'), { replace: true });
    }
  }, [tenantSlug, navigate, buildAvaPath]);

  const usuario = bootstrap?.usuario ?? null;
  const tenant = bootstrap?.tenant ?? null;
  const anoAtual = bootstrap?.ano ?? null;
  const anosDisponiveis = useMemo(() => {
    if (bootstrap?.anos && bootstrap.anos.length > 0) {
      return bootstrap.anos;
    }
    return bootstrap?.ano ? [bootstrap.ano] : [];
  }, [bootstrap]);

  const isProfessor =
    usuario?.papel === 'professor' ||
    usuario?.papel === 'institution_manager' ||
    usuario?.papel === 'super_admin';
  const isAluno = usuario?.papel === 'aluno';

  const value = useMemo<AvaContextValue>(
    () => ({
      token,
      tenantSlug: tenant?.slug || tenantSlug,
      bootstrap,
      usuario,
      tenant,
      anoAtual,
      anosDisponiveis,
      selectedAnoId: selectedAnoId || anoAtual?.id || null,
      setSelectedAnoId,
      isProfessor,
      isAluno,
      isLoading,
      error,
      refreshBootstrap,
      login,
      vincular,
      logout,
      buildAvaPath,
    }),
    [
      token,
      tenant,
      tenantSlug,
      bootstrap,
      usuario,
      anoAtual,
      anosDisponiveis,
      selectedAnoId,
      setSelectedAnoId,
      isProfessor,
      isAluno,
      isLoading,
      error,
      refreshBootstrap,
      login,
      vincular,
      logout,
      buildAvaPath,
    ],
  );

  return <AvaContext.Provider value={value}>{children}</AvaContext.Provider>;
}

export function useAva(): AvaContextValue {
  const ctx = useContext(AvaContext);
  if (!ctx) {
    throw new Error('useAva deve ser usado dentro de AvaProvider.');
  }
  return ctx;
}

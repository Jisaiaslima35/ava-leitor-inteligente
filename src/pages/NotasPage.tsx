import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EmptyState, ErrorBanner, LoadingSkeleton } from '../components/StateBlocks';
import { useAva } from '../contexts/AvaContext';
import { AvaApiError, avaApi } from '../services/avaApi';
import type { AvaNotaDisciplina, AvaNotasResponse, AvaTurmaItem } from '../types/ava';
import { formatarDataHora, formatarNota, rotuloTipoCurso } from '../utils/format';

function classeSituacao(situacao: string): string {
  const s = situacao.toLowerCase();
  if (s.includes('aprov')) return 'text-emerald-700 font-semibold';
  if (s.includes('reprov')) return 'text-red-700 font-semibold';
  if (s.includes('recup')) return 'text-amber-700 font-semibold';
  return 'text-slate-700 font-medium';
}

export function TabelaBoletimAluno({
  dados,
  cursoTipo,
  buildAvaPath,
}: {
  dados: AvaNotasResponse;
  cursoTipo?: string;
  buildAvaPath: (sub?: string) => string;
}) {
  const [abertas, setAbertas] = useState<Record<string, boolean>>({});
  const periodos = dados.periodos.length > 0 ? dados.periodos : ['N1', 'N2', 'N3', 'N4', 'REC'];
  const isCursoLivre = cursoTipo === 'curso_livre';

  function toggle(discId: string) {
    setAbertas((prev) => ({ ...prev, [discId]: !prev[discId] }));
  }

  function valorPeriodo(nota: AvaNotaDisciplina, periodo: string): number | null {
    const key = periodo.toLowerCase() as 'n1' | 'n2' | 'n3' | 'n4' | 'rec';
    if (key in nota) {
      return nota[key];
    }
    return null;
  }

  if (dados.notas.length === 0) {
    return (
      <EmptyState
        title="Nenhuma nota lançada neste ano letivo"
        description="As notas das avaliações realizadas aparecerão automaticamente aqui assim que forem processadas."
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-600">
            <tr>
              <th scope="col" className="px-4 py-3">
                Disciplina
              </th>
              {!isCursoLivre &&
                periodos.map((p) => (
                  <th key={p} scope="col" className="px-3 py-3 text-right font-mono">
                    {p}
                  </th>
                ))}
              <th scope="col" className="px-3 py-3 text-right">
                Média
              </th>
              <th scope="col" className="px-3 py-3 text-right">
                Final
              </th>
              <th scope="col" className="px-4 py-3 text-right">
                Situação
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {dados.notas.map((item) => {
              const aberta = Boolean(abertas[item.disciplina_id]);
              const colSpan = (isCursoLivre ? 4 : 4 + periodos.length);
              return (
                <React.Fragment key={item.disciplina_id}>
                  <tr className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3.5">
                      <button
                        type="button"
                        onClick={() => toggle(item.disciplina_id)}
                        aria-expanded={aberta}
                        className="flex items-center gap-2 text-left font-medium text-slate-900 hover:text-blue-700 cursor-pointer"
                      >
                        {aberta ? (
                          <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                        ) : (
                          <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                        )}
                        <span>{item.disciplina}</span>
                        <span className="text-xs font-normal text-slate-500 tabular-nums">
                          ({item.avaliacoes.length})
                        </span>
                      </button>
                    </td>
                    {!isCursoLivre &&
                      periodos.map((p) => (
                        <td
                          key={p}
                          className="px-3 py-3.5 text-right font-mono text-slate-700 tabular-nums"
                        >
                          {formatarNota(valorPeriodo(item, p))}
                        </td>
                      ))}
                    <td className="px-3 py-3.5 text-right font-mono font-medium text-slate-900 tabular-nums">
                      {formatarNota(item.media)}
                    </td>
                    <td className="px-3 py-3.5 text-right font-mono font-semibold text-slate-900 tabular-nums">
                      {formatarNota(item.final)}
                    </td>
                    <td className={`px-4 py-3.5 text-right whitespace-nowrap ${classeSituacao(item.situacao)}`}>
                      {item.situacao}
                    </td>
                  </tr>

                  {aberta && (
                    <tr className="bg-slate-50/70">
                      <td colSpan={colSpan} className="px-6 py-4">
                        <p className="text-xs font-semibold text-slate-600">
                          Avaliações computadas em {item.disciplina}
                        </p>
                        {item.avaliacoes.length === 0 ? (
                          <p className="mt-2 text-xs text-slate-500">
                            Nenhuma avaliação individual registrada até o momento.
                          </p>
                        ) : (
                          <ul className="mt-2 divide-y divide-slate-200/80 border-t border-slate-200/80">
                            {item.avaliacoes.map((av) => (
                              <li
                                key={av.id}
                                className="flex flex-col gap-1 py-2.5 sm:flex-row sm:items-center sm:justify-between text-xs"
                              >
                                <div>
                                  <Link
                                    to={buildAvaPath(`/avaliacao/${av.id}`)}
                                    className="font-medium text-blue-700 hover:underline"
                                  >
                                    {av.titulo}
                                  </Link>
                                  <span className="ml-2 text-slate-500 tabular-nums">
                                    Concluída em {formatarDataHora(av.concluido_em)}
                                  </span>
                                </div>
                                <div className="font-mono text-slate-700 tabular-nums whitespace-nowrap">
                                  Nota {formatarNota(av.pontos)} · {av.acertos}/{av.total} acertos
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function NotasPage() {
  const { tenant, tenantSlug, selectedAnoId, anoAtual, isProfessor, buildAvaPath } = useAva();

  const [notasAluno, setNotasAluno] = useState<AvaNotasResponse | null>(null);
  const [turmas, setTurmas] = useState<AvaTurmaItem[]>([]);
  const [turmaAtivaId, setTurmaAtivaId] = useState<string>('');
  const [buscaAluno, setBuscaAluno] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AvaApiError | null>(null);

  const carregar = useCallback(
    async (silencioso = false) => {
      if (!silencioso) {
        setLoading(true);
        setError(null);
      }
      try {
        if (isProfessor) {
          const res = await avaApi.turmas(tenantSlug, selectedAnoId);
          setTurmas(res.turmas);
          if (res.turmas.length > 0) {
            setTurmaAtivaId((atual) =>
              res.turmas.some((t) => t.id === atual) ? atual : res.turmas[0].id,
            );
          } else {
            setTurmaAtivaId('');
          }
        } else {
          const res = await avaApi.notas(tenantSlug, selectedAnoId);
          setNotasAluno(res);
        }
      } catch (err) {
        if (!silencioso) {
          setError(
            err instanceof AvaApiError
              ? err
              : new AvaApiError(500, 'Erro ao carregar notas.'),
          );
        }
      } finally {
        if (!silencioso) {
          setLoading(false);
        }
      }
    },
    [isProfessor, tenantSlug, selectedAnoId],
  );

  useEffect(() => {
    void carregar(false);
  }, [carregar]);

  // Polling simples de 15s conforme Seção 4.5 do PRD
  useEffect(() => {
    const id = window.setInterval(() => {
      void carregar(true);
    }, 15000);
    return () => window.clearInterval(id);
  }, [carregar]);

  const turmaSelecionada = useMemo(
    () => turmas.find((t) => t.id === turmaAtivaId) ?? turmas[0] ?? null,
    [turmas, turmaAtivaId],
  );

  const alunosFiltrados = useMemo(() => {
    if (!turmaSelecionada) return [];
    const q = buscaAluno.trim().toLowerCase();
    if (!q) return turmaSelecionada.alunos;
    return turmaSelecionada.alunos.filter(
      (a) =>
        a.nome.toLowerCase().includes(q) || a.identificador.toLowerCase().includes(q),
    );
  }, [turmaSelecionada, buscaAluno]);

  if (loading) return <LoadingSkeleton rows={5} />;
  if (error) return <ErrorBanner error={error} onRetry={() => void carregar(false)} />;

  if (isProfessor) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-slate-200 pb-5">
          <div>
            <p className="text-xs font-medium text-slate-500">
              Boletim por turma · Ano letivo <span className="tabular-nums">{anoAtual?.label || '—'}</span>
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
              Boletins das Turmas
            </h1>
          </div>

          <div className="relative w-full sm:w-72">
            <Search
              className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={buscaAluno}
              onChange={(e) => setBuscaAluno(e.target.value)}
              placeholder="Filtrar aluno por nome ou matrícula..."
              aria-label="Filtrar aluno"
              className="h-9 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600"
            />
          </div>
        </div>

        {turmas.length === 0 ? (
          <EmptyState
            title="Nenhuma turma encontrada"
            description="Não há turmas vinculadas ao seu perfil neste ano letivo."
          />
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1 w-fit">
              {turmas.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTurmaAtivaId(t.id)}
                  className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                    turmaSelecionada?.id === t.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t.disciplina}
                </button>
              ))}
            </div>

            {turmaSelecionada && (
              <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-600">
                      <tr>
                        <th scope="col" className="px-4 py-3">
                          Aluno
                        </th>
                        <th scope="col" className="px-4 py-3">
                          Identificador
                        </th>
                        <th scope="col" className="px-4 py-3 text-right">
                          Média
                        </th>
                        <th scope="col" className="px-4 py-3 text-right">
                          Presenças
                        </th>
                        <th scope="col" className="px-4 py-3 text-right">
                          Ação
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {alunosFiltrados.map((aluno) => (
                        <tr key={aluno.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-4 py-3.5 font-medium text-slate-900">{aluno.nome}</td>
                          <td className="px-4 py-3.5 font-mono text-xs text-slate-600 tabular-nums">
                            {aluno.identificador}
                          </td>
                          <td className="px-4 py-3.5 text-right font-mono font-semibold text-slate-900 tabular-nums">
                            {formatarNota(aluno.media)}
                          </td>
                          <td className="px-4 py-3.5 text-right font-mono text-slate-700 tabular-nums">
                            {aluno.presencas}
                            {aluno.total_sessoes ? `/${aluno.total_sessoes}` : ''}
                          </td>
                          <td className="px-4 py-3.5 text-right whitespace-nowrap">
                            <Link
                              to={buildAvaPath(`/notas/${aluno.id}`)}
                              className="text-sm font-medium text-blue-700 hover:text-blue-800 hover:underline"
                            >
                              Ver boletim
                            </Link>
                          </td>
                        </tr>
                      ))}
                      {alunosFiltrados.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">
                            Nenhum aluno encontrado para o filtro aplicado.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between border-b border-slate-200 pb-5">
        <div>
          <p className="text-xs font-medium text-slate-500">
            {rotuloTipoCurso(tenant?.curso_tipo)} · Ano letivo{' '}
            <span className="tabular-nums">{anoAtual?.label || '—'}</span>
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Minhas Notas</h1>
          {notasAluno?.aluno && (
            <p className="mt-1 text-sm text-slate-600">
              {notasAluno.aluno.nome} · Matrícula/ID:{' '}
              <span className="font-mono text-slate-800">{notasAluno.aluno.identificador}</span>
            </p>
          )}
        </div>
        <p className="text-xs text-slate-500">Clique em uma disciplina para ver as avaliações.</p>
      </div>

      {notasAluno && (
        <TabelaBoletimAluno
          dados={notasAluno}
          cursoTipo={tenant?.curso_tipo}
          buildAvaPath={buildAvaPath}
        />
      )}
    </div>
  );
}

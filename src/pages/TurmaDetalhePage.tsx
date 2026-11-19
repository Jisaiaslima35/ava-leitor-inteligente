import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import {
  EmptyState,
  ErrorBanner,
  LoadingSkeleton,
  RestrictedAccess,
} from '../components/StateBlocks';
import { useAva } from '../contexts/AvaContext';
import { AvaApiError, avaApi } from '../services/avaApi';
import type { AvaTurmaDetalheResponse } from '../types/ava';
import { formatarData, formatarNota, rotuloTipoCurso } from '../utils/format';

export function TurmaDetalhePage() {
  const { id } = useParams<{ id: string }>();
  const { tenantSlug, selectedAnoId, isProfessor, buildAvaPath } = useAva();

  const [detalhe, setDetalhe] = useState<AvaTurmaDetalheResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AvaApiError | null>(null);

  const carregar = useCallback(async () => {
    if (!isProfessor || !id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await avaApi.turmaDetalhe(id, tenantSlug, selectedAnoId);
      setDetalhe(res);
    } catch (err) {
      setError(
        err instanceof AvaApiError
          ? err
          : new AvaApiError(500, 'Erro ao carregar detalhes da turma.'),
      );
    } finally {
      setLoading(false);
    }
  }, [isProfessor, id, tenantSlug, selectedAnoId]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  if (!isProfessor) {
    return <RestrictedAccess backTo={buildAvaPath('')} />;
  }

  if (loading) return <LoadingSkeleton rows={5} />;

  return (
    <div className="space-y-8">
      <Link
        to={buildAvaPath('/turmas')}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Voltar para turmas
      </Link>

      {error ? (
        <ErrorBanner error={error} onRetry={() => void carregar()} />
      ) : (
        detalhe && (
          <>
            <header className="border-b border-slate-200 pb-5">
              <p className="text-xs font-medium text-slate-500">
                {rotuloTipoCurso(detalhe.turma.curso_tipo)}
                {detalhe.turma.ano_label ? ` · Ano letivo ${detalhe.turma.ano_label}` : ''}
                {detalhe.turma.codigo ? ` · ${detalhe.turma.codigo}` : ''}
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
                {detalhe.turma.disciplina}
              </h1>
            </header>

            {/* Alunos matriculados */}
            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-slate-900">
                Alunos matriculados ({detalhe.alunos.length})
              </h2>

              {detalhe.alunos.length === 0 ? (
                <EmptyState
                  title="Nenhum aluno matriculado"
                  description="Os alunos cadastrados nesta turma aparecerão nesta tabela."
                />
              ) : (
                <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                      <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-600">
                        <tr>
                          <th scope="col" className="px-4 py-3">
                            Nome do aluno
                          </th>
                          <th scope="col" className="px-4 py-3">
                            Matrícula / CPF
                          </th>
                          <th scope="col" className="px-4 py-3 text-right">
                            Média
                          </th>
                          <th scope="col" className="px-4 py-3 text-right">
                            Presenças
                          </th>
                          <th scope="col" className="px-4 py-3 text-right">
                            Boletim
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {detalhe.alunos.map((aluno) => (
                          <tr key={aluno.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="px-4 py-3.5 font-medium text-slate-900">
                              {aluno.nome}
                            </td>
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
                                className="inline-flex items-center gap-1 text-sm font-medium text-blue-700 hover:underline"
                              >
                                Detalhes
                                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>

            {/* Avaliações da turma */}
            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-slate-900">
                Avaliações da turma ({detalhe.avaliacoes.length})
              </h2>

              {detalhe.avaliacoes.length === 0 ? (
                <EmptyState
                  title="Nenhuma avaliação cadastrada"
                  description="As avaliações aplicadas nesta disciplina aparecerão aqui."
                />
              ) : (
                <div className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
                  {detalhe.avaliacoes.map((av) => (
                    <div
                      key={av.id}
                      className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          {av.grade_period && <span className="font-mono">{av.grade_period}</span>}
                          {av.capitulo && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span>{av.capitulo}</span>
                            </>
                          )}
                          {av.criado_em && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="tabular-nums">{formatarData(av.criado_em)}</span>
                            </>
                          )}
                        </div>
                        <h3 className="text-base font-semibold text-slate-900">{av.titulo}</h3>
                        <p className="text-xs text-slate-500 tabular-nums">
                          {av.submissoes !== undefined
                            ? `${av.submissoes} submissões`
                            : 'Submissões em acompanhamento'}
                          {av.media_turma !== undefined && av.media_turma !== null
                            ? ` · Média da turma: ${formatarNota(av.media_turma)}`
                            : ''}
                        </p>
                      </div>

                      <Link
                        to={buildAvaPath(`/avaliacao/${av.id}`)}
                        className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
                      >
                        Visualizar prova
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )
      )}
    </div>
  );
}

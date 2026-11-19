import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState, ErrorBanner, LoadingSkeleton } from '../components/StateBlocks';
import { useAva } from '../contexts/AvaContext';
import { AvaApiError, avaApi } from '../services/avaApi';
import type { AvaFrequenciaResponse, AvaTurmaItem } from '../types/ava';
import { formatarDataHora, formatarPercentual } from '../utils/format';

export function FrequenciaPage() {
  const { tenantSlug, selectedAnoId, anoAtual, isProfessor, buildAvaPath } = useAva();

  const [frequencia, setFrequencia] = useState<AvaFrequenciaResponse | null>(null);
  const [turmas, setTurmas] = useState<AvaTurmaItem[]>([]);
  const [turmaAtivaId, setTurmaAtivaId] = useState('');
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
          const [turmasRes, freqRes] = await Promise.all([
            avaApi.turmas(tenantSlug, selectedAnoId),
            avaApi.frequencia(tenantSlug, selectedAnoId, turmaAtivaId || null),
          ]);
          setTurmas(turmasRes.turmas);
          setFrequencia(freqRes);
          if (turmasRes.turmas.length > 0 && !turmaAtivaId) {
            setTurmaAtivaId(turmasRes.turmas[0].id);
          }
        } else {
          const freqRes = await avaApi.frequencia(tenantSlug, selectedAnoId);
          setFrequencia(freqRes);
        }
      } catch (err) {
        if (!silencioso) {
          setError(
            err instanceof AvaApiError
              ? err
              : new AvaApiError(500, 'Erro ao carregar dados de frequência.'),
          );
        }
      } finally {
        if (!silencioso) {
          setLoading(false);
        }
      }
    },
    [isProfessor, tenantSlug, selectedAnoId, turmaAtivaId],
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

  if (loading) return <LoadingSkeleton rows={5} />;
  if (error) return <ErrorBanner error={error} onRetry={() => void carregar(false)} />;

  if (isProfessor) {
    return (
      <div className="space-y-6">
        <div className="border-b border-slate-200 pb-5">
          <p className="text-xs font-medium text-slate-500">
            Controle de presenças registradas pelo Portão · Ano letivo{' '}
            <span className="tabular-nums">{anoAtual?.label || '—'}</span>
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Frequência das Turmas
          </h1>
        </div>

        {turmas.length === 0 ? (
          <EmptyState
            title="Nenhuma turma encontrada"
            description="Não há turmas cadastradas para o ano letivo selecionado."
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
                          Presenças
                        </th>
                        <th scope="col" className="px-4 py-3 text-right">
                          Taxa estimada
                        </th>
                        <th scope="col" className="px-4 py-3 text-right">
                          Situação
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {turmaSelecionada.alunos.map((aluno) => {
                        const total = aluno.total_sessoes ?? frequencia?.total_sessoes ?? 0;
                        const pct = total > 0 ? (aluno.presencas / total) * 100 : 0;
                        const regular = pct >= 75;
                        return (
                          <tr key={aluno.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="px-4 py-3.5 font-medium text-slate-900">
                              <Link
                                to={buildAvaPath(`/notas/${aluno.id}`)}
                                className="hover:text-blue-700 hover:underline"
                              >
                                {aluno.nome}
                              </Link>
                            </td>
                            <td className="px-4 py-3.5 font-mono text-xs text-slate-600 tabular-nums">
                              {aluno.identificador}
                            </td>
                            <td className="px-4 py-3.5 text-right font-mono text-slate-800 tabular-nums">
                              {aluno.presencas}
                              {total > 0 ? `/${total}` : ''}
                            </td>
                            <td className="px-4 py-3.5 text-right font-mono font-semibold text-slate-900 tabular-nums">
                              {total > 0 ? formatarPercentual(pct) : '—'}
                            </td>
                            <td
                              className={`px-4 py-3.5 text-right whitespace-nowrap ${
                                regular
                                  ? 'text-emerald-700 font-semibold'
                                  : 'text-amber-700 font-semibold'
                              }`}
                            >
                              {regular ? 'Regular' : 'Atenção (< 75%)'}
                            </td>
                          </tr>
                        );
                      })}
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

  const pct = frequencia?.frequencia_pct ?? 0;
  const faltas = Math.max(0, (frequencia?.total_sessoes ?? 0) - (frequencia?.presentes ?? 0));

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-5">
        <p className="text-xs font-medium text-slate-500">
          Registro automático pelo Portão das aulas · Ano letivo{' '}
          <span className="tabular-nums">{anoAtual?.label || '—'}</span>
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Minha Frequência</h1>
      </div>

      {/* Resumo numérico */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Frequência acumulada</p>
          <p
            className={`mt-2 text-2xl font-bold font-mono tabular-nums ${
              pct >= 75 ? 'text-emerald-700' : 'text-amber-700'
            }`}
          >
            {formatarPercentual(pct)}
          </p>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full ${pct >= 75 ? 'bg-emerald-600' : 'bg-amber-600'}`}
              style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {pct >= 75 ? 'Situação regular (mínimo 75%)' : 'Abaixo do mínimo recomendado de 75%'}
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Presenças confirmadas</p>
          <p className="mt-2 text-2xl font-bold font-mono text-slate-900 tabular-nums">
            {frequencia?.presentes ?? 0}
          </p>
          <p className="mt-1 text-xs text-slate-500 tabular-nums">
            De {frequencia?.total_sessoes ?? 0} sessões realizadas
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Ausências registradas</p>
          <p className="mt-2 text-2xl font-bold font-mono text-slate-900 tabular-nums">{faltas}</p>
          <p className="mt-1 text-xs text-slate-500">Deduplicadas por sala e dia</p>
        </div>
      </section>

      {/* Histórico de sessões */}
      {!frequencia || frequencia.sessoes.length === 0 ? (
        <EmptyState
          title="Nenhuma sessão registrada neste período"
          description="Suas presenças registradas nas salas ao vivo serão listadas aqui."
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-600">
                <tr>
                  <th scope="col" className="px-4 py-3">
                    Data e hora
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Disciplina
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Capítulo
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    Registro
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {frequencia.sessoes.map((sessao) => (
                  <tr
                    key={`${sessao.room_id}-${sessao.data}`}
                    className="hover:bg-slate-50/70 transition-colors"
                  >
                    <td className="px-4 py-3.5 font-mono text-xs text-slate-600 tabular-nums whitespace-nowrap">
                      {formatarDataHora(sessao.data)}
                    </td>
                    <td className="px-4 py-3.5 font-medium text-slate-900">{sessao.disciplina}</td>
                    <td className="px-4 py-3.5 text-slate-600">{sessao.capitulo}</td>
                    <td
                      className={`px-4 py-3.5 text-right whitespace-nowrap ${
                        sessao.presente
                          ? 'text-emerald-700 font-semibold'
                          : 'text-red-700 font-semibold'
                      }`}
                    >
                      {sessao.presente ? 'Presente' : 'Falta'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

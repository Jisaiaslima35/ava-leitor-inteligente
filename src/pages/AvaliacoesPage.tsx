import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EmptyState, ErrorBanner, LoadingSkeleton } from '../components/StateBlocks';
import { useAva } from '../contexts/AvaContext';
import { AvaApiError, avaApi } from '../services/avaApi';
import type { AvaAvaliacaoItem } from '../types/ava';
import { formatarDataHora, formatarNota } from '../utils/format';

type FiltroStatus = 'todas' | 'pendente' | 'concluida';

export function AvaliacoesPage() {
  const { tenantSlug, selectedAnoId, anoAtual, isProfessor, buildAvaPath } = useAva();
  const [avaliacoes, setAvaliacoes] = useState<AvaAvaliacaoItem[]>([]);
  const [filtro, setFiltro] = useState<FiltroStatus>('todas');
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AvaApiError | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await avaApi.avaliacoes(tenantSlug, selectedAnoId);
      setAvaliacoes(res.avaliacoes);
    } catch (err) {
      setError(
        err instanceof AvaApiError
          ? err
          : new AvaApiError(500, 'Erro ao carregar lista de avaliações.'),
      );
    } finally {
      setLoading(false);
    }
  }, [tenantSlug, selectedAnoId]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return avaliacoes.filter((av) => {
      if (filtro !== 'todas' && av.status !== filtro) return false;
      if (!q) return true;
      return (
        av.titulo.toLowerCase().includes(q) ||
        av.disciplina.toLowerCase().includes(q) ||
        av.capitulo.toLowerCase().includes(q)
      );
    });
  }, [avaliacoes, filtro, busca]);

  if (loading) return <LoadingSkeleton rows={4} />;
  if (error) return <ErrorBanner error={error} onRetry={() => void carregar()} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-slate-200 pb-5">
        <div>
          <p className="text-xs font-medium text-slate-500">
            Ano letivo <span className="tabular-nums">{anoAtual?.label || '—'}</span> ·{' '}
            <span className="tabular-nums">{avaliacoes.length}</span> avaliações
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Avaliações</h1>
        </div>

        <div className="relative w-full sm:w-72">
          <Search
            className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar avaliação ou disciplina..."
            aria-label="Buscar avaliações"
            className="h-9 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600"
          />
        </div>
      </div>

      {/* Controle segmentado de filtro */}
      <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 w-fit">
        {(
          [
            { id: 'todas', label: 'Todas' },
            { id: 'pendente', label: 'Pendentes' },
            { id: 'concluida', label: 'Concluídas' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFiltro(tab.id)}
            className={`rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
              filtro === tab.id
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {filtradas.length === 0 ? (
        <EmptyState
          title="Nenhuma avaliação encontrada"
          description="Não existem avaliações para o filtro selecionado neste período."
        />
      ) : (
        <div className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
          {filtradas.map((av) => (
            <div
              key={av.id}
              className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="font-medium text-slate-700">{av.disciplina}</span>
                  {av.grade_period && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono">{av.grade_period}</span>
                    </>
                  )}
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">{av.total_questoes} questões</span>
                  <span aria-hidden="true">·</span>
                  <span
                    className={
                      av.status === 'concluida'
                        ? 'font-semibold text-emerald-700'
                        : 'font-semibold text-amber-700'
                    }
                  >
                    {av.status === 'concluida' ? 'Concluída' : 'Pendente'}
                  </span>
                </div>

                <h2 className="text-base font-semibold text-slate-900">{av.titulo}</h2>
                <p className="text-sm text-slate-600">
                  {av.capitulo}
                  {av.faixa_paginas ? ` · Páginas ${av.faixa_paginas}` : ''}
                </p>

                <p className="text-xs text-slate-500 tabular-nums">
                  {av.status === 'concluida'
                    ? `Enviada em ${formatarDataHora(av.concluido_em)} · Nota ${formatarNota(av.nota_obtida)} (${av.acertos ?? 0}/${av.total_questoes} acertos)`
                    : av.prazo_em
                      ? `Prazo até ${formatarDataHora(av.prazo_em)}`
                      : 'Disponível para resposta'}
                </p>
              </div>

              <Link
                to={buildAvaPath(`/avaliacao/${av.id}`)}
                className={`inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                  av.status === 'pendente' && !isProfessor
                    ? 'bg-blue-700 text-white hover:bg-blue-800'
                    : 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
                }`}
              >
                {isProfessor
                  ? 'Visualizar questões'
                  : av.status === 'concluida'
                    ? 'Ver resultado'
                    : 'Responder'}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

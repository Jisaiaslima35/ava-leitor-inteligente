import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EmptyState, ErrorBanner, LoadingSkeleton } from '../components/StateBlocks';
import { useAva } from '../contexts/AvaContext';
import { AvaApiError, avaApi } from '../services/avaApi';
import type { AvaCalendarioEvento } from '../types/ava';
import { formatarDataExtenso, formatarHora } from '../utils/format';

type FiltroTipo = 'todos' | 'aula' | 'avaliacao';

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function CalendarioPage() {
  const { tenantSlug, selectedAnoId, anoAtual, buildAvaPath } = useAva();

  const [eventos, setEventos] = useState<AvaCalendarioEvento[]>([]);
  const [filtro, setFiltro] = useState<FiltroTipo>('todos');
  const [mesReferencia, setMesReferencia] = useState<Date>(() => new Date(2026, 10, 1));
  const [diaSelecionado, setDiaSelecionado] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AvaApiError | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await avaApi.calendario(tenantSlug, selectedAnoId);
      const ordenados = [...res.eventos].sort(
        (a, b) => new Date(a.comeca_em).getTime() - new Date(b.comeca_em).getTime(),
      );
      setEventos(ordenados);
      if (ordenados.length > 0) {
        const primeira = new Date(ordenados[0].comeca_em);
        if (!Number.isNaN(primeira.getTime())) {
          setMesReferencia(new Date(primeira.getFullYear(), primeira.getMonth(), 1));
        }
      }
      setDiaSelecionado(null);
    } catch (err) {
      setError(
        err instanceof AvaApiError
          ? err
          : new AvaApiError(500, 'Erro ao carregar eventos do calendário.'),
      );
    } finally {
      setLoading(false);
    }
  }, [tenantSlug, selectedAnoId]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const eventosFiltrados = useMemo(() => {
    return eventos.filter((ev) => {
      if (filtro !== 'todos' && ev.tipo !== filtro) return false;
      if (diaSelecionado) {
        const d = new Date(ev.comeca_em);
        const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        return chave === diaSelecionado;
      }
      return true;
    });
  }, [eventos, filtro, diaSelecionado]);

  const mapaDias = useMemo(() => {
    const map = new Map<string, AvaCalendarioEvento[]>();
    for (const ev of eventos) {
      if (filtro !== 'todos' && ev.tipo !== filtro) continue;
      const d = new Date(ev.comeca_em);
      if (Number.isNaN(d.getTime())) continue;
      const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const atual = map.get(chave) ?? [];
      atual.push(ev);
      map.set(chave, atual);
    }
    return map;
  }, [eventos, filtro]);

  const gradeDias = useMemo(() => {
    const ano = mesReferencia.getFullYear();
    const mes = mesReferencia.getMonth();
    const primeiroDiaSemana = new Date(ano, mes, 1).getDay();
    const totalDias = new Date(ano, mes + 1, 0).getDate();

    const celulas: Array<{ dia: number | null; chave: string | null }> = [];
    for (let i = 0; i < primeiroDiaSemana; i++) {
      celulas.push({ dia: null, chave: null });
    }
    for (let d = 1; d <= totalDias; d++) {
      const chave = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      celulas.push({ dia: d, chave });
    }
    return celulas;
  }, [mesReferencia]);

  const tituloMes = useMemo(() => {
    const txt = new Intl.DateTimeFormat('pt-BR', {
      month: 'long',
      year: 'numeric',
    }).format(mesReferencia);
    return txt.charAt(0).toUpperCase() + txt.slice(1);
  }, [mesReferencia]);

  if (loading) return <LoadingSkeleton rows={4} />;
  if (error) return <ErrorBanner error={error} onRetry={() => void carregar()} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-slate-200 pb-5">
        <div>
          <p className="text-xs font-medium text-slate-500">
            Aulas e avaliações agendadas · Ano letivo{' '}
            <span className="tabular-nums">{anoAtual?.label || '—'}</span>
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Calendário Acadêmico
          </h1>
        </div>

        <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 w-fit">
          {(
            [
              { id: 'todos', label: 'Todos' },
              { id: 'aula', label: 'Aulas' },
              { id: 'avaliacao', label: 'Avaliações' },
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
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Grade Mensal */}
        <section className="lg:col-span-5 rounded-lg border border-slate-200 bg-white p-5 h-fit">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-900">{tituloMes}</h2>
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Mês anterior"
                onClick={() =>
                  setMesReferencia(
                    (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1),
                  )
                }
                className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Próximo mês"
                onClick={() =>
                  setMesReferencia(
                    (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1),
                  )
                }
                className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs font-medium text-slate-500">
            {DIAS_SEMANA.map((d) => (
              <div key={d} className="py-1.5">
                {d}
              </div>
            ))}
          </div>

          <div className="mt-1 grid grid-cols-7 gap-1">
            {gradeDias.map((cel, idx) => {
              if (!cel.dia || !cel.chave) {
                return <div key={`empty-${idx}`} className="h-10" />;
              }
              const evs = mapaDias.get(cel.chave) ?? [];
              const selecionado = diaSelecionado === cel.chave;
              const temEvento = evs.length > 0;
              return (
                <button
                  key={cel.chave}
                  type="button"
                  onClick={() =>
                    setDiaSelecionado((atual) => (atual === cel.chave ? null : cel.chave))
                  }
                  className={`flex h-10 flex-col items-center justify-center rounded-md text-xs font-mono tabular-nums transition-colors cursor-pointer ${
                    selecionado
                      ? 'bg-blue-700 text-white font-semibold'
                      : temEvento
                        ? 'bg-blue-50 text-blue-900 font-semibold hover:bg-blue-100'
                        : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span>{cel.dia}</span>
                  {temEvento && !selecionado && (
                    <span className="mt-0.5 text-[10px] leading-none text-blue-700">
                      {evs.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {diaSelecionado && (
            <div className="mt-4 border-t border-slate-100 pt-3 flex items-center justify-between text-xs">
              <span className="text-slate-600">
                Filtrando dia <span className="font-mono font-medium">{diaSelecionado}</span>
              </span>
              <button
                type="button"
                onClick={() => setDiaSelecionado(null)}
                className="font-medium text-blue-700 hover:underline cursor-pointer"
              >
                Mostrar todos
              </button>
            </div>
          )}
        </section>

        {/* Lista Cronológica */}
        <section className="lg:col-span-7 space-y-3">
          {eventosFiltrados.length === 0 ? (
            <EmptyState
              title="Nenhum evento encontrado"
              description={
                diaSelecionado
                  ? 'Não há aulas ou avaliações programadas para o dia selecionado.'
                  : 'Nenhum evento foi cadastrado no calendário para este período.'
              }
              action={
                diaSelecionado ? (
                  <button
                    type="button"
                    onClick={() => setDiaSelecionado(null)}
                    className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    Limpar filtro de data
                  </button>
                ) : undefined
              }
            />
          ) : (
            <div className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
              {eventosFiltrados.map((ev) => {
                const destino =
                  ev.tipo === 'aula' && ev.room_id
                    ? buildAvaPath(`/aula/${ev.room_id}`)
                    : buildAvaPath(`/avaliacao/${ev.id}`);
                return (
                  <div
                    key={`${ev.tipo}-${ev.id}`}
                    className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span
                          className={
                            ev.tipo === 'avaliacao'
                              ? 'font-semibold text-amber-700'
                              : 'font-semibold text-blue-700'
                          }
                        >
                          {ev.tipo === 'avaliacao' ? 'Avaliação' : 'Aula'}
                        </span>
                        <span className="text-slate-300" aria-hidden="true">
                          ·
                        </span>
                        <span className="text-slate-600">{ev.disciplina}</span>
                        {ev.ativo && ev.tipo === 'aula' && (
                          <>
                            <span className="text-slate-300" aria-hidden="true">
                              ·
                            </span>
                            <span className="font-semibold text-emerald-700">Ao vivo</span>
                          </>
                        )}
                      </div>

                      <h3 className="text-base font-semibold text-slate-900">{ev.titulo}</h3>
                      <p className="text-xs text-slate-500 tabular-nums">
                        {formatarDataExtenso(ev.comeca_em)} · {formatarHora(ev.comeca_em)} às{' '}
                        {formatarHora(ev.termina_em)}
                      </p>
                    </div>

                    <Link
                      to={destino}
                      className="inline-flex items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
                    >
                      {ev.tipo === 'aula' ? 'Abrir sala' : 'Ver avaliação'}
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

import React, { useCallback, useEffect, useState } from 'react';
import { ArrowRight, BookOpen, Calendar, ExternalLink, Radio } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EmptyState, ErrorBanner, LoadingSkeleton } from '../components/StateBlocks';
import { useAva } from '../contexts/AvaContext';
import { AvaApiError, avaApi } from '../services/avaApi';
import type {
  AvaCalendarioEvento,
  AvaFrequenciaResponse,
  AvaModulo,
  AvaNotasResponse,
  AvaTurmaItem,
} from '../types/ava';
import {
  formatarDataHora,
  formatarNota,
  formatarPercentual,
  rotuloPapel,
  rotuloTipoCurso,
} from '../utils/format';

export function DashboardPage() {
  const { usuario, tenant, anoAtual, selectedAnoId, tenantSlug, isProfessor, buildAvaPath } =
    useAva();

  const [modulos, setModulos] = useState<AvaModulo[]>([]);
  const [eventos, setEventos] = useState<AvaCalendarioEvento[]>([]);
  const [notas, setNotas] = useState<AvaNotasResponse | null>(null);
  const [frequencia, setFrequencia] = useState<AvaFrequenciaResponse | null>(null);
  const [turmas, setTurmas] = useState<AvaTurmaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AvaApiError | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (isProfessor) {
        const [modRes, calRes, turmasRes] = await Promise.all([
          avaApi.modulos(tenantSlug, selectedAnoId),
          avaApi.calendario(tenantSlug, selectedAnoId),
          avaApi.turmas(tenantSlug, selectedAnoId),
        ]);
        setModulos(modRes.modulos);
        setEventos(calRes.eventos);
        setTurmas(turmasRes.turmas);
      } else {
        const [modRes, calRes, notasRes, freqRes] = await Promise.all([
          avaApi.modulos(tenantSlug, selectedAnoId),
          avaApi.calendario(tenantSlug, selectedAnoId),
          avaApi.notas(tenantSlug, selectedAnoId),
          avaApi.frequencia(tenantSlug, selectedAnoId),
        ]);
        setModulos(modRes.modulos);
        setEventos(calRes.eventos);
        setNotas(notasRes);
        setFrequencia(freqRes);
      }
    } catch (err) {
      setError(
        err instanceof AvaApiError
          ? err
          : new AvaApiError(500, 'Erro inesperado ao carregar o painel inicial.'),
      );
    } finally {
      setLoading(false);
    }
  }, [isProfessor, tenantSlug, selectedAnoId]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  if (loading) return <LoadingSkeleton rows={4} />;
  if (error) return <ErrorBanner error={error} onRetry={() => void carregar()} />;

  const aulaAoVivo = modulos.flatMap((m) => m.aulas).find((a) => a.ativa) ?? null;

  const mediaGeralAluno = (() => {
    if (!notas || notas.notas.length === 0) return null;
    const validas = notas.notas
      .map((n) => n.final ?? n.media)
      .filter((v): v is number => v !== null && v !== undefined);
    if (validas.length === 0) return null;
    return validas.reduce((acc, v) => acc + v, 0) / validas.length;
  })();

  const totalAlunosProfessor = turmas.reduce((acc, t) => acc + t.alunos.length, 0);

  return (
    <div className="space-y-8">
      {/* Cabeçalho da página */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between border-b border-slate-200 pb-5">
        <div>
          <p className="text-xs font-medium text-slate-500">
            {tenant?.nome || 'Instituição'} · {rotuloTipoCurso(tenant?.curso_tipo)} · Ano letivo{' '}
            <span className="tabular-nums">{anoAtual?.label || '—'}</span>
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Olá, {usuario?.nome?.split(' ')[0] || 'Usuário'}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {isProfessor
              ? 'Acompanhe suas turmas, módulos cadastrados e agenda de aulas e avaliações.'
              : 'Acompanhe seus módulos, notas, frequência e próximas aulas do período.'}
          </p>
        </div>
        <div className="text-xs text-slate-500 whitespace-nowrap">
          {rotuloPapel(usuario?.papel || 'aluno')}
          {usuario?.identificador ? ` · ${usuario.identificador}` : ''}
        </div>
      </div>

      {/* Destaque para sala ao vivo ativa */}
      {aulaAoVivo && (
        <section className="rounded-lg border border-blue-200 bg-blue-50/60 p-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
              <Radio className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Aula ao vivo em andamento</span>
            </div>
            <h2 className="text-base font-semibold text-slate-900">{aulaAoVivo.titulo}</h2>
            <p className="text-sm text-slate-600">
              {aulaAoVivo.capitulo} · Início em{' '}
              <span className="tabular-nums">{formatarDataHora(aulaAoVivo.comeca_em)}</span>
            </p>
          </div>
          <Link
            to={buildAvaPath(`/aula/${aulaAoVivo.room_id}`)}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0"
          >
            Entrar na sala
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </Link>
        </section>
      )}

      {/* Indicadores resumidos */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Módulos no período</p>
          <p className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">{modulos.length}</p>
          <p className="mt-1 text-xs text-slate-500">Ano letivo {anoAtual?.label || '—'}</p>
        </div>

        {isProfessor ? (
          <>
            <div className="rounded-lg border border-slate-200 bg-white p-5">
              <p className="text-xs font-medium text-slate-500">Turmas atribuídas</p>
              <p className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">{turmas.length}</p>
              <p className="mt-1 text-xs text-slate-500">Disciplinas sob sua regência</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-5">
              <p className="text-xs font-medium text-slate-500">Matrículas ativas</p>
              <p className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">
                {totalAlunosProfessor}
              </p>
              <p className="mt-1 text-xs text-slate-500">Soma de alunos nas turmas</p>
            </div>
          </>
        ) : (
          <>
            <div className="rounded-lg border border-slate-200 bg-white p-5">
              <p className="text-xs font-medium text-slate-500">Média geral</p>
              <p className="mt-2 text-2xl font-bold text-slate-900 tabular-nums font-mono">
                {formatarNota(mediaGeralAluno)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {notas?.notas.length ?? 0} disciplinas avaliadas
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-5">
              <p className="text-xs font-medium text-slate-500">Frequência</p>
              <p className="mt-2 text-2xl font-bold text-slate-900 tabular-nums font-mono">
                {formatarPercentual(frequencia?.frequencia_pct)}
              </p>
              <p className="mt-1 text-xs text-slate-500 tabular-nums">
                {frequencia?.presentes ?? 0} de {frequencia?.total_sessoes ?? 0} sessões
              </p>
            </div>
          </>
        )}

        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Eventos no calendário</p>
          <p className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">{eventos.length}</p>
          <p className="mt-1 text-xs text-slate-500">Aulas e avaliações agendadas</p>
        </div>
      </section>

      {/* Grid Principal: Módulos + Agenda */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Coluna de Módulos (estilo Moodle limpo) */}
        <section className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-slate-900">Módulos do ano letivo</h2>
            <Link
              to={buildAvaPath('/modulos')}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-700 hover:text-blue-800 whitespace-nowrap"
            >
              Ver todos
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          {modulos.length === 0 ? (
            <EmptyState
              title="Nenhum módulo disponível neste ano letivo"
              description="Altere o ano letivo no topo da página ou aguarde a liberação dos módulos pela secretaria."
            />
          ) : (
            <div className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
              {modulos.map((mod) => {
                const temAoVivo = mod.aulas.some((a) => a.ativa);
                return (
                  <Link
                    key={mod.id}
                    to={buildAvaPath(`/modulo/${mod.id}`)}
                    className="block p-5 hover:bg-slate-50/80 transition-colors"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-1 min-w-0">
                        <p className="text-xs text-slate-500">
                          {mod.disciplinas.map((d) => d.nome).join(' · ') || 'Disciplina geral'}
                        </p>
                        <h3 className="text-base font-semibold text-slate-900">{mod.titulo}</h3>
                        <p className="text-sm text-slate-600 line-clamp-2">{mod.descricao}</p>
                      </div>
                      {temAoVivo && (
                        <span className="text-xs font-semibold text-emerald-700 whitespace-nowrap shrink-0">
                          Sala ao vivo
                        </span>
                      )}
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 tabular-nums">
                      <span className="inline-flex items-center gap-1">
                        <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                        {mod.livros.length} {mod.livros.length === 1 ? 'livro' : 'livros'}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {mod.aulas.length} {mod.aulas.length === 1 ? 'aula' : 'aulas'}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* Coluna de Agenda / Calendário */}
        <section className="lg:col-span-4 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-slate-900">Próximos eventos</h2>
            <Link
              to={buildAvaPath('/calendario')}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-700 hover:text-blue-800 whitespace-nowrap"
            >
              Calendário
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          {eventos.length === 0 ? (
            <EmptyState
              title="Agenda sem eventos"
              description="Nenhuma aula ou avaliação agendada para este período."
            />
          ) : (
            <div className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
              {eventos.slice(0, 5).map((ev) => {
                const destino =
                  ev.tipo === 'aula' && ev.room_id
                    ? buildAvaPath(`/aula/${ev.room_id}`)
                    : buildAvaPath(`/avaliacao/${ev.id}`);
                return (
                  <Link
                    key={`${ev.tipo}-${ev.id}`}
                    to={destino}
                    className="block p-4 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span
                        className={
                          ev.tipo === 'avaliacao'
                            ? 'font-semibold text-amber-700'
                            : 'font-semibold text-blue-700'
                        }
                      >
                        {ev.tipo === 'avaliacao' ? 'Avaliação' : 'Aula'}
                      </span>
                      <span className="text-slate-500 tabular-nums">
                        {formatarDataHora(ev.comeca_em)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-medium text-slate-900">{ev.titulo}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{ev.disciplina}</p>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Atalho rápido de turmas para o Professor */}
          {isProfessor && turmas.length > 0 && (
            <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">Acesso rápido às turmas</h3>
                <Link
                  to={buildAvaPath('/turmas')}
                  className="text-xs font-medium text-blue-700 hover:underline whitespace-nowrap"
                >
                  Ver todas
                </Link>
              </div>
              <ul className="divide-y divide-slate-100">
                {turmas.map((t) => (
                  <li key={t.id} className="py-2 first:pt-0 last:pb-0">
                    <Link
                      to={buildAvaPath(`/turma/${t.id}`)}
                      className="flex items-center justify-between text-sm text-slate-700 hover:text-blue-700"
                    >
                      <span className="truncate font-medium">{t.disciplina}</span>
                      <span className="text-xs text-slate-500 tabular-nums whitespace-nowrap ml-2">
                        {t.alunos.length} alunos
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!isProfessor && (
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Calendar className="h-4 w-4 text-slate-500" aria-hidden="true" />
                <span>Resumo do estudante</span>
              </div>
              <div className="mt-3 flex flex-col gap-2 text-sm">
                <Link
                  to={buildAvaPath('/notas')}
                  className="flex items-center justify-between text-slate-700 hover:text-blue-700"
                >
                  <span>Consultar boletim completo</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link
                  to={buildAvaPath('/avaliacoes')}
                  className="flex items-center justify-between text-slate-700 hover:text-blue-700"
                >
                  <span>Responder avaliações pendentes</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

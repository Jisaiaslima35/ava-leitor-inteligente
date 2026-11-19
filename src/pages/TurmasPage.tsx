import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, Search, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  EmptyState,
  ErrorBanner,
  LoadingSkeleton,
  RestrictedAccess,
} from '../components/StateBlocks';
import { useAva } from '../contexts/AvaContext';
import { AvaApiError, avaApi } from '../services/avaApi';
import type { AvaTurmaItem } from '../types/ava';
import { formatarNota } from '../utils/format';

export function TurmasPage() {
  const { tenantSlug, selectedAnoId, anoAtual, isProfessor, buildAvaPath } = useAva();
  const [turmas, setTurmas] = useState<AvaTurmaItem[]>([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AvaApiError | null>(null);

  const carregar = useCallback(async () => {
    if (!isProfessor) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await avaApi.turmas(tenantSlug, selectedAnoId);
      setTurmas(res.turmas);
    } catch (err) {
      setError(
        err instanceof AvaApiError
          ? err
          : new AvaApiError(500, 'Não foi possível carregar as turmas.'),
      );
    } finally {
      setLoading(false);
    }
  }, [isProfessor, tenantSlug, selectedAnoId]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return turmas;
    return turmas.filter(
      (t) =>
        t.disciplina.toLowerCase().includes(q) ||
        t.alunos.some(
          (a) =>
            a.nome.toLowerCase().includes(q) ||
            a.identificador.toLowerCase().includes(q),
        ),
    );
  }, [turmas, busca]);

  if (!isProfessor) {
    return <RestrictedAccess backTo={buildAvaPath('')} />;
  }

  if (loading) return <LoadingSkeleton rows={4} />;
  if (error) return <ErrorBanner error={error} onRetry={() => void carregar()} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-slate-200 pb-5">
        <div>
          <p className="text-xs font-medium text-slate-500">
            Área do Professor · Ano letivo{' '}
            <span className="tabular-nums">{anoAtual?.label || '—'}</span>
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Minhas Turmas</h1>
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
            placeholder="Buscar turma ou aluno..."
            aria-label="Buscar turmas"
            className="h-9 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600"
          />
        </div>
      </div>

      {filtradas.length === 0 ? (
        <EmptyState
          title="Nenhuma turma encontrada"
          description="Não existem turmas atribuídas ao seu perfil neste ano letivo."
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filtradas.map((turma) => {
            const mediasValidas = turma.alunos
              .map((a) => a.media)
              .filter((m): m is number => m !== null && m !== undefined);
            const mediaTurma =
              mediasValidas.length > 0
                ? mediasValidas.reduce((acc, v) => acc + v, 0) / mediasValidas.length
                : null;

            return (
              <article
                key={turma.id}
                className="flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-6 hover:border-slate-300 transition-colors"
              >
                <div>
                  <p className="text-xs text-slate-500 font-mono">{turma.id}</p>
                  <h2 className="mt-1.5 text-lg font-semibold text-slate-900">
                    {turma.disciplina}
                  </h2>

                  <div className="mt-4 grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                    <div>
                      <p className="text-xs text-slate-500">Alunos</p>
                      <p className="mt-0.5 text-lg font-bold font-mono text-slate-900 tabular-nums">
                        {turma.alunos.length}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Média da turma</p>
                      <p className="mt-0.5 text-lg font-bold font-mono text-slate-900 tabular-nums">
                        {formatarNota(mediaTurma)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                  <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                    <Users className="h-3.5 w-3.5" aria-hidden="true" />
                    Lista e boletins
                  </span>
                  <Link
                    to={buildAvaPath(`/turma/${turma.id}`)}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:text-blue-800 whitespace-nowrap"
                  >
                    Abrir turma
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

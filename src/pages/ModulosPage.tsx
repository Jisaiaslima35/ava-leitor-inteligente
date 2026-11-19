import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, BookOpen, Search, Video } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EmptyState, ErrorBanner, LoadingSkeleton } from '../components/StateBlocks';
import { useAva } from '../contexts/AvaContext';
import { AvaApiError, avaApi } from '../services/avaApi';
import type { AvaModulo } from '../types/ava';

export function ModulosPage() {
  const { tenantSlug, selectedAnoId, anoAtual, buildAvaPath } = useAva();
  const [modulos, setModulos] = useState<AvaModulo[]>([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AvaApiError | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await avaApi.modulos(tenantSlug, selectedAnoId);
      setModulos([...res.modulos].sort((a, b) => a.ordem - b.ordem));
    } catch (err) {
      setError(
        err instanceof AvaApiError
          ? err
          : new AvaApiError(500, 'Não foi possível carregar os módulos.'),
      );
    } finally {
      setLoading(false);
    }
  }, [tenantSlug, selectedAnoId]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return modulos;
    return modulos.filter(
      (m) =>
        m.titulo.toLowerCase().includes(q) ||
        m.descricao.toLowerCase().includes(q) ||
        m.disciplinas.some((d) => d.nome.toLowerCase().includes(q)) ||
        m.livros.some((l) => l.titulo.toLowerCase().includes(q)),
    );
  }, [modulos, busca]);

  if (loading) return <LoadingSkeleton rows={4} />;
  if (error) return <ErrorBanner error={error} onRetry={() => void carregar()} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-slate-200 pb-5">
        <div>
          <p className="text-xs font-medium text-slate-500">
            Ano letivo <span className="tabular-nums">{anoAtual?.label || '—'}</span> ·{' '}
            <span className="tabular-nums">{modulos.length}</span>{' '}
            {modulos.length === 1 ? 'módulo' : 'módulos'}
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Módulos e Disciplinas
          </h1>
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
            placeholder="Buscar módulo, disciplina ou livro..."
            aria-label="Buscar módulos"
            className="h-9 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600"
          />
        </div>
      </div>

      {filtrados.length === 0 ? (
        <EmptyState
          title="Nenhum módulo encontrado"
          description={
            busca
              ? 'Nenhum módulo corresponde ao filtro digitado.'
              : 'Não há módulos cadastrados para o ano letivo selecionado.'
          }
          action={
            busca ? (
              <button
                type="button"
                onClick={() => setBusca('')}
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Limpar busca
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {filtrados.map((mod) => {
            const aulaAtiva = mod.aulas.find((a) => a.ativa);
            return (
              <article
                key={mod.id}
                className="flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-6 hover:border-slate-300 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                    <span className="truncate">
                      {mod.disciplinas.map((d) => d.nome).join(' · ') || 'Módulo acadêmico'}
                    </span>
                    {aulaAtiva && (
                      <span className="font-semibold text-emerald-700 whitespace-nowrap shrink-0">
                        Ao vivo agora
                      </span>
                    )}
                  </div>

                  <h2 className="mt-2 text-lg font-semibold text-slate-900">{mod.titulo}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{mod.descricao}</p>

                  {mod.livros.length > 0 && (
                    <div className="mt-4 border-t border-slate-100 pt-3">
                      <p className="text-xs font-medium text-slate-500">Livros vinculados</p>
                      <ul className="mt-1.5 space-y-1 text-sm text-slate-700">
                        {mod.livros.map((livro) => (
                          <li key={livro.slug} className="flex items-center justify-between gap-2">
                            <span className="truncate">{livro.titulo}</span>
                            <span className="text-xs text-slate-500 tabular-nums whitespace-nowrap shrink-0">
                              {livro.paginas} p.
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                  <div className="flex items-center gap-3 text-xs text-slate-500 tabular-nums">
                    <span className="inline-flex items-center gap-1">
                      <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                      {mod.livros.length} {mod.livros.length === 1 ? 'livro' : 'livros'}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1">
                      <Video className="h-3.5 w-3.5" aria-hidden="true" />
                      {mod.aulas.length} {mod.aulas.length === 1 ? 'aula' : 'aulas'}
                    </span>
                  </div>

                  <Link
                    to={buildAvaPath(`/modulo/${mod.id}`)}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:text-blue-800 whitespace-nowrap"
                  >
                    Abrir módulo
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

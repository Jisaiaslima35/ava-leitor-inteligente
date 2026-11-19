import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, BookOpen, ClipboardList, ExternalLink, Video } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { EmptyState, ErrorBanner, LoadingSkeleton } from '../components/StateBlocks';
import { useAva } from '../contexts/AvaContext';
import { AvaApiError, avaApi } from '../services/avaApi';
import type { AvaAvaliacaoItem, AvaModulo } from '../types/ava';
import { formatarDataHora, formatarNota } from '../utils/format';

export function ModuloDetalhePage() {
  const { id } = useParams<{ id: string }>();
  const { tenantSlug, selectedAnoId, buildAvaPath } = useAva();

  const [modulo, setModulo] = useState<AvaModulo | null>(null);
  const [avaliacoes, setAvaliacoes] = useState<AvaAvaliacaoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AvaApiError | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [modRes, avalRes] = await Promise.all([
        avaApi.modulos(tenantSlug, selectedAnoId),
        avaApi.avaliacoes(tenantSlug, selectedAnoId),
      ]);
      const encontrado = modRes.modulos.find((m) => m.id === id) ?? null;
      if (!encontrado) {
        setError(new AvaApiError(404, 'Módulo não encontrado para o ano letivo selecionado.'));
        setModulo(null);
        return;
      }
      setModulo(encontrado);
      const discIds = new Set(encontrado.disciplinas.map((d) => d.id));
      setAvaliacoes(
        avalRes.avaliacoes.filter(
          (a) => a.modulo_id === encontrado.id || discIds.has(a.disciplina_id),
        ),
      );
    } catch (err) {
      setError(
        err instanceof AvaApiError
          ? err
          : new AvaApiError(500, 'Erro ao carregar detalhes do módulo.'),
      );
    } finally {
      setLoading(false);
    }
  }, [id, tenantSlug, selectedAnoId]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  if (loading) return <LoadingSkeleton rows={4} />;
  if (error) {
    return (
      <div className="space-y-4">
        <Link
          to={buildAvaPath('/modulos')}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Voltar para módulos
        </Link>
        <ErrorBanner error={error} onRetry={() => void carregar()} />
      </div>
    );
  }

  if (!modulo) return null;

  return (
    <div className="space-y-8">
      <div>
        <Link
          to={buildAvaPath('/modulos')}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Voltar para módulos
        </Link>

        <div className="mt-4 border-b border-slate-200 pb-5">
          <p className="text-xs font-medium text-slate-500">
            {modulo.disciplinas.map((d) => d.nome).join(' · ') || 'Módulo'}
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            {modulo.titulo}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
            {modulo.descricao}
          </p>
        </div>
      </div>

      {/* Livros do Módulo */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-slate-500" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-slate-900">Livros e Material de Leitura</h2>
        </div>

        {modulo.livros.length === 0 ? (
          <EmptyState
            title="Nenhum livro vinculado a este módulo"
            description="Os livros cadastrados no Leitor Inteligente aparecerão aqui assim que forem associados ao módulo."
          />
        ) : (
          <div className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
            {modulo.livros.map((livro) => {
              const readerHref = `/t/${encodeURIComponent(tenantSlug || 'faculdade-js')}#/reader/${encodeURIComponent(livro.slug)}`;
              return (
                <div
                  key={livro.slug}
                  className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">{livro.titulo}</h3>
                    <p className="mt-0.5 text-xs text-slate-500 tabular-nums">
                      Slug: <span className="font-mono">{livro.slug}</span> · {livro.paginas} páginas
                    </p>
                  </div>
                  <a
                    href={readerHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
                  >
                    Abrir no Leitor
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  </a>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Aulas do Módulo */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Video className="h-4 w-4 text-slate-500" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-slate-900">Aulas e Salas ao Vivo</h2>
        </div>

        {modulo.aulas.length === 0 ? (
          <EmptyState
            title="Nenhuma aula cadastrada neste módulo"
            description="Quando o professor abrir ou agendar uma sala de aula no Portão, ela aparecerá aqui."
          />
        ) : (
          <div className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
            {modulo.aulas.map((aula) => (
              <div
                key={aula.id}
                className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span
                      className={
                        aula.ativa
                          ? 'font-semibold text-emerald-700'
                          : 'font-medium text-slate-500'
                      }
                    >
                      {aula.ativa ? 'Sala ativa agora' : 'Agendada / Encerrada'}
                    </span>
                    <span className="text-slate-300" aria-hidden="true">
                      ·
                    </span>
                    <span className="text-slate-500 tabular-nums">
                      {formatarDataHora(aula.comeca_em)} até {formatarDataHora(aula.termina_em)}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-slate-900">{aula.titulo}</h3>
                  <p className="text-sm text-slate-600">{aula.capitulo}</p>
                </div>

                <Link
                  to={buildAvaPath(`/aula/${aula.room_id}`)}
                  className={`inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                    aula.ativa
                      ? 'bg-blue-700 text-white hover:bg-blue-800'
                      : 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  {aula.ativa ? 'Entrar na sala ao vivo' : 'Ver detalhes da sala'}
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Avaliações do Módulo */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-slate-500" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-slate-900">Avaliações do Módulo</h2>
        </div>

        {avaliacoes.length === 0 ? (
          <EmptyState
            title="Nenhuma avaliação vinculada"
            description="As avaliações criadas para as disciplinas deste módulo serão listadas aqui."
          />
        ) : (
          <div className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
            {avaliacoes.map((aval) => (
              <div
                key={aval.id}
                className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className="font-medium text-slate-700">{aval.disciplina}</span>
                    {aval.grade_period && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono">{aval.grade_period}</span>
                      </>
                    )}
                    <span aria-hidden="true">·</span>
                    <span
                      className={
                        aval.status === 'concluida'
                          ? 'font-semibold text-emerald-700'
                          : 'font-semibold text-amber-700'
                      }
                    >
                      {aval.status === 'concluida'
                        ? `Concluída (Nota ${formatarNota(aval.nota_obtida)})`
                        : 'Pendente'}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-slate-900">{aval.titulo}</h3>
                  <p className="text-sm text-slate-600">
                    {aval.capitulo}
                    {aval.faixa_paginas ? ` · Páginas ${aval.faixa_paginas}` : ''}
                  </p>
                </div>

                <Link
                  to={buildAvaPath(`/avaliacao/${aval.id}`)}
                  className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
                >
                  {aval.status === 'concluida' ? 'Ver resultado' : 'Responder avaliação'}
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

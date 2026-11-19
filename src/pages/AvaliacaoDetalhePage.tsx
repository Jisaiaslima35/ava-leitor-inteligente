import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, XCircle } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { ErrorBanner, LoadingSkeleton } from '../components/StateBlocks';
import { useAva } from '../contexts/AvaContext';
import { AvaApiError, avaApi } from '../services/avaApi';
import type { AvaAvaliacaoDetalheResponse } from '../types/ava';
import { formatarDataHora, formatarNota } from '../utils/format';

export function AvaliacaoDetalhePage() {
  const { id } = useParams<{ id: string }>();
  const { tenantSlug, isProfessor, buildAvaPath } = useAva();

  const [avaliacao, setAvaliacao] = useState<AvaAvaliacaoDetalheResponse['avaliacao'] | null>(null);
  const [respostas, setRespostas] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<AvaApiError | null>(null);
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await avaApi.avaliacaoDetalhe(id, tenantSlug);
      setAvaliacao(res.avaliacao);
      if (res.avaliacao.respostas_enviadas) {
        setRespostas(res.avaliacao.respostas_enviadas);
      }
    } catch (err) {
      setError(
        err instanceof AvaApiError
          ? err
          : new AvaApiError(500, 'Erro ao carregar a avaliação.'),
      );
    } finally {
      setLoading(false);
    }
  }, [id, tenantSlug]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function handleEnviar(e: React.FormEvent) {
    e.preventDefault();
    if (!avaliacao) return;
    setErroEnvio(null);

    const faltantes = avaliacao.questoes.filter((q) => respostas[q.id] === undefined);
    if (faltantes.length > 0) {
      setErroEnvio(
        `Responda todas as questões antes de enviar (faltam ${faltantes.length}).`,
      );
      return;
    }

    setEnviando(true);
    try {
      await avaApi.responderAvaliacao(avaliacao.id, respostas, tenantSlug);
      await carregar();
    } catch (err) {
      setErroEnvio(
        err instanceof AvaApiError
          ? err.message
          : 'Não foi possível enviar suas respostas. Tente novamente.',
      );
    } finally {
      setEnviando(false);
    }
  }

  if (loading) return <LoadingSkeleton rows={5} />;
  if (error) {
    return (
      <div className="space-y-4">
        <Link
          to={buildAvaPath('/avaliacoes')}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Voltar para avaliações
        </Link>
        <ErrorBanner error={error} onRetry={() => void carregar()} />
      </div>
    );
  }

  if (!avaliacao) return null;

  const modoLeitura = isProfessor || avaliacao.status === 'concluida';

  return (
    <div className="space-y-6 max-w-4xl">
      <Link
        to={buildAvaPath('/avaliacoes')}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Voltar para avaliações
      </Link>

      <header className="border-b border-slate-200 pb-5">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span className="font-medium text-slate-700">{avaliacao.disciplina}</span>
          {avaliacao.grade_period && (
            <>
              <span aria-hidden="true">·</span>
              <span className="font-mono">{avaliacao.grade_period}</span>
            </>
          )}
          <span aria-hidden="true">·</span>
          <span>{avaliacao.capitulo}</span>
          {avaliacao.faixa_paginas && (
            <>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">Páginas {avaliacao.faixa_paginas}</span>
            </>
          )}
        </div>
        <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900">
          {avaliacao.titulo}
        </h1>
      </header>

      {/* Resumo do resultado quando concluída */}
      {avaliacao.status === 'concluida' && !isProfessor && (
        <section className="rounded-lg border border-slate-200 bg-white p-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs font-medium text-slate-500">Nota obtida</p>
            <p className="mt-1 text-2xl font-bold font-mono text-slate-900 tabular-nums">
              {formatarNota(avaliacao.nota_obtida)}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Acertos</p>
            <p className="mt-1 text-2xl font-bold font-mono text-slate-900 tabular-nums">
              {avaliacao.acertos ?? 0}/{avaliacao.total_questoes}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Concluída em</p>
            <p className="mt-1 text-sm font-medium text-slate-900 tabular-nums">
              {formatarDataHora(avaliacao.concluido_em)}
            </p>
          </div>
        </section>
      )}

      {erroEnvio && (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {erroEnvio}
        </div>
      )}

      <form onSubmit={handleEnviar} className="space-y-5">
        {avaliacao.questoes.map((questao, idx) => {
          const selecionada = respostas[questao.id];
          const correta = questao.correct_index;

          return (
            <fieldset
              key={questao.id}
              className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6 space-y-4"
            >
              <legend className="text-base font-semibold text-slate-900 leading-snug">
                <span className="mr-2 font-mono text-sm text-slate-500 tabular-nums">
                  {String(idx + 1).padStart(2, '0')}.
                </span>
                {questao.question}
              </legend>

              <div className="space-y-2.5">
                {questao.options.map((opcao, optIdx) => {
                  const isMarcada = selecionada === optIdx;
                  const isCorreta = modoLeitura && correta === optIdx;
                  const isErroMarcado =
                    modoLeitura && isMarcada && correta !== undefined && correta !== optIdx;

                  let borderClass = 'border-slate-200 hover:bg-slate-50';
                  if (isCorreta) {
                    borderClass = 'border-emerald-300 bg-emerald-50/70';
                  } else if (isErroMarcado) {
                    borderClass = 'border-red-300 bg-red-50/70';
                  } else if (isMarcada) {
                    borderClass = 'border-blue-600 bg-blue-50/50';
                  }

                  return (
                    <label
                      key={optIdx}
                      className={`flex items-start gap-3 rounded-md border p-3.5 text-sm transition-colors ${borderClass} ${
                        modoLeitura ? 'cursor-default' : 'cursor-pointer'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`questao-${questao.id}`}
                        checked={isMarcada}
                        disabled={modoLeitura}
                        onChange={() =>
                          setRespostas((prev) => ({ ...prev, [questao.id]: optIdx }))
                        }
                        className="mt-0.5 h-4 w-4 text-blue-700"
                      />
                      <span className="flex-1 text-slate-800">{opcao}</span>
                      {isCorreta && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 whitespace-nowrap">
                          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                          Correta
                        </span>
                      )}
                      {isErroMarcado && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 whitespace-nowrap">
                          <XCircle className="h-4 w-4" aria-hidden="true" />
                          Sua resposta
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>

              {modoLeitura && questao.explanation && (
                <div className="border-t border-slate-100 pt-3 text-xs leading-relaxed text-slate-600">
                  <span className="font-semibold text-slate-800">Comentário: </span>
                  {questao.explanation}
                </div>
              )}
            </fieldset>
          );
        })}

        {!modoLeitura && (
          <div className="flex items-center justify-between gap-4 border-t border-slate-200 pt-5">
            <p className="text-xs text-slate-500 tabular-nums">
              {Object.keys(respostas).length} de {avaliacao.questoes.length} questões respondidas
            </p>
            <button
              type="submit"
              disabled={enviando}
              className="inline-flex items-center justify-center rounded-md bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60 transition-colors cursor-pointer whitespace-nowrap"
            >
              {enviando ? 'Enviando respostas...' : 'Enviar avaliação'}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}

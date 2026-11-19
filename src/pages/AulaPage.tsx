import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, BookOpen, ExternalLink, Radio } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { ErrorBanner, LoadingSkeleton } from '../components/StateBlocks';
import { useAva } from '../contexts/AvaContext';
import { AvaApiError, avaApi } from '../services/avaApi';
import type { AvaAulaSala } from '../types/ava';
import { formatarDataHora } from '../utils/format';

export function AulaPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const { tenantSlug, buildAvaPath } = useAva();

  const [sala, setSala] = useState<AvaAulaSala | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AvaApiError | null>(null);

  const carregar = useCallback(async () => {
    if (!roomId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await avaApi.aula(roomId, tenantSlug);
      setSala(res.sala);
    } catch (err) {
      setError(
        err instanceof AvaApiError
          ? err
          : new AvaApiError(500, 'Não foi possível carregar os dados da sala ao vivo.'),
      );
    } finally {
      setLoading(false);
    }
  }, [roomId, tenantSlug]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  if (loading) return <LoadingSkeleton rows={3} />;

  return (
    <div className="space-y-6 max-w-3xl">
      <Link
        to={buildAvaPath('/modulos')}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Voltar para módulos
      </Link>

      {error ? (
        <ErrorBanner error={error} onRetry={() => void carregar()} />
      ) : (
        sala && (
          <section className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 space-y-6">
            <div className="space-y-2 border-b border-slate-200 pb-5">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span
                  className={
                    sala.ativa
                      ? 'inline-flex items-center gap-1.5 font-semibold text-emerald-700'
                      : 'font-semibold text-slate-500'
                  }
                >
                  {sala.ativa && <Radio className="h-3.5 w-3.5" aria-hidden="true" />}
                  {sala.ativa ? 'Sala ativa agora' : 'Sala encerrada ou aguardando início'}
                </span>
                <span className="text-slate-300" aria-hidden="true">
                  ·
                </span>
                <span className="text-slate-600">
                  Modo de acesso:{' '}
                  <strong className="font-semibold text-slate-800">
                    {sala.acesso.modo === 'portao' ? 'Portão (registro de presença)' : 'Acesso livre'}
                  </strong>
                </span>
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {sala.capitulo}
              </h1>
              <p className="text-sm text-slate-600">
                {sala.disciplina ? `${sala.disciplina} · ` : ''}
                {sala.professor_nome ? `${sala.professor_nome}` : 'Sala integrada ao Leitor Inteligente'}
              </p>
            </div>

            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-sm">
              <div className="rounded-md border border-slate-200 bg-slate-50/70 p-4">
                <dt className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                  <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                  Livro da aula
                </dt>
                <dd className="mt-1 font-semibold text-slate-900">
                  {sala.book_title || sala.book_slug}
                </dd>
                <dd className="mt-0.5 text-xs font-mono text-slate-500">{sala.book_slug}</dd>
              </div>

              <div className="rounded-md border border-slate-200 bg-slate-50/70 p-4">
                <dt className="text-xs font-medium text-slate-500">Faixa de páginas</dt>
                <dd className="mt-1 font-semibold font-mono text-slate-900 tabular-nums">
                  Páginas {sala.pagina_inicio} a {sala.pagina_fim}
                </dd>
                <dd className="mt-0.5 text-xs font-mono text-slate-500">
                  Sala: {sala.room_id}
                </dd>
              </div>

              {sala.comeca_em && (
                <div className="rounded-md border border-slate-200 bg-slate-50/70 p-4 sm:col-span-2">
                  <dt className="text-xs font-medium text-slate-500">Horário previsto</dt>
                  <dd className="mt-1 font-medium text-slate-900 tabular-nums">
                    {formatarDataHora(sala.comeca_em)}
                    {sala.termina_em ? ` até ${formatarDataHora(sala.termina_em)}` : ''}
                  </dd>
                </div>
              )}
            </dl>

            <div className="space-y-3 border-t border-slate-200 pt-5">
              <div className="text-xs text-slate-500">
                Destino no Leitor Inteligente:{' '}
                <code className="font-mono text-slate-700 break-all">{sala.acesso.link}</code>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <a
                  href={sala.acesso.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 transition-colors whitespace-nowrap"
                >
                  Abrir sala ao vivo no Leitor
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                </a>

                <Link
                  to={buildAvaPath('/calendario')}
                  className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap"
                >
                  Ver calendário
                </Link>
              </div>
            </div>
          </section>
        )
      )}
    </div>
  );
}

import React, { useCallback, useEffect, useState } from 'react';
import { LogOut } from 'lucide-react';
import { ErrorBanner, LoadingSkeleton } from '../components/StateBlocks';
import { useAva } from '../contexts/AvaContext';
import { AvaApiError, avaApi } from '../services/avaApi';
import type { AvaMeResponse } from '../types/ava';
import { rotuloPapel, rotuloTipoCurso } from '../utils/format';

export function PerfilPage() {
  const { tenant, anoAtual, tenantSlug, logout } = useAva();
  const [me, setMe] = useState<AvaMeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AvaApiError | null>(null);
  const [saindo, setSaindo] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await avaApi.me(tenantSlug);
      setMe(res);
    } catch (err) {
      setError(
        err instanceof AvaApiError
          ? err
          : new AvaApiError(500, 'Erro ao carregar dados do seu perfil.'),
      );
    } finally {
      setLoading(false);
    }
  }, [tenantSlug]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function handleLogout() {
    setSaindo(true);
    await logout();
  }

  if (loading) return <LoadingSkeleton rows={3} />;
  if (error) return <ErrorBanner error={error} onRetry={() => void carregar()} />;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="border-b border-slate-200 pb-5">
        <p className="text-xs font-medium text-slate-500">Conta institucional vinculada</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Meu Perfil</h1>
      </div>

      {me && (
        <section className="rounded-lg border border-slate-200 bg-white divide-y divide-slate-200">
          <div className="p-6">
            <h2 className="text-base font-semibold text-slate-900">Dados pessoais</h2>
            <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 text-sm">
              <div>
                <dt className="text-xs font-medium text-slate-500">Nome completo</dt>
                <dd className="mt-1 font-medium text-slate-900">{me.usuario.nome}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">E-mail de acesso</dt>
                <dd className="mt-1 font-medium text-slate-900">{me.usuario.email}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">Perfil no AVA</dt>
                <dd className="mt-1 font-medium text-slate-900">
                  {rotuloPapel(me.usuario.papel)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">Matrícula / Documento</dt>
                <dd className="mt-1 font-mono text-slate-900">
                  {me.usuario.identificador || '—'}
                </dd>
              </div>
            </dl>
          </div>

          <div className="p-6">
            <h2 className="text-base font-semibold text-slate-900">Vínculo institucional</h2>
            <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 text-sm">
              <div>
                <dt className="text-xs font-medium text-slate-500">Instituição</dt>
                <dd className="mt-1 font-medium text-slate-900">{tenant?.nome || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">Identificador (slug)</dt>
                <dd className="mt-1 font-mono text-slate-900">{tenant?.slug || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">Modalidade</dt>
                <dd className="mt-1 font-medium text-slate-900">
                  {rotuloTipoCurso(tenant?.curso_tipo)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">Ano letivo selecionado</dt>
                <dd className="mt-1 font-mono text-slate-900 tabular-nums">
                  {anoAtual?.label || '—'}
                </dd>
              </div>
            </dl>
          </div>

          {me.permissoes.length > 0 && (
            <div className="p-6">
              <h2 className="text-base font-semibold text-slate-900">Permissões da sessão</h2>
              <p className="mt-2 text-xs font-mono text-slate-600 leading-relaxed">
                {me.permissoes.join(' · ')}
              </p>
            </div>
          )}

          <div className="p-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-slate-50/50">
            <p className="text-xs text-slate-500">
              Para atualizar seu e-mail ou matrícula, procure o gestor da sua instituição no Leitor
              Inteligente.
            </p>
            <button
              type="button"
              disabled={saindo}
              onClick={() => void handleLogout()}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100 disabled:opacity-60 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              {saindo ? 'Saindo...' : 'Sair do AVA'}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

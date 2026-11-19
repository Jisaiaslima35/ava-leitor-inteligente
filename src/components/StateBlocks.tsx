import React from 'react';
import { AlertCircle, Lock, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AvaApiError } from '../services/avaApi';

export function LoadingSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-4" role="status" aria-label="Carregando conteúdo">
      <div className="h-7 w-56 rounded bg-slate-200/80 animate-pulse" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="h-24 rounded-lg border border-slate-200 bg-white p-5">
          <div className="h-3 w-24 rounded bg-slate-200/80 animate-pulse" />
          <div className="mt-4 h-7 w-16 rounded bg-slate-200/80 animate-pulse" />
        </div>
        <div className="h-24 rounded-lg border border-slate-200 bg-white p-5">
          <div className="h-3 w-28 rounded bg-slate-200/80 animate-pulse" />
          <div className="mt-4 h-7 w-20 rounded bg-slate-200/80 animate-pulse" />
        </div>
        <div className="h-24 rounded-lg border border-slate-200 bg-white p-5">
          <div className="h-3 w-24 rounded bg-slate-200/80 animate-pulse" />
          <div className="mt-4 h-7 w-14 rounded bg-slate-200/80 animate-pulse" />
        </div>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center justify-between px-5 py-4">
            <div className="space-y-2">
              <div className="h-4 w-64 rounded bg-slate-200/80 animate-pulse" />
              <div className="h-3 w-40 rounded bg-slate-100 animate-pulse" />
            </div>
            <div className="h-4 w-20 rounded bg-slate-200/80 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ErrorBanner({
  error,
  onRetry,
}: {
  error: AvaApiError | Error | string;
  onRetry?: () => void;
}) {
  const status = error instanceof AvaApiError ? error.status : null;
  const message =
    typeof error === 'string'
      ? error
      : error instanceof Error
        ? error.message
        : 'Não foi possível carregar os dados solicitados.';

  return (
    <div
      role="alert"
      className="rounded-lg border border-red-200 bg-red-50/70 p-5 text-slate-900"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-700" aria-hidden="true" />
          <div>
            <h3 className="text-sm font-semibold text-red-900">
              {status ? `Falha na comunicação com a API (HTTP ${status})` : 'Erro ao carregar dados'}
            </h3>
            <p className="mt-1 text-sm text-red-800">{message}</p>
          </div>
        </div>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-900 hover:bg-red-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Tentar novamente
          </button>
        )}
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-6 py-12 text-center">
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-600">{description}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

export function RestrictedAccess({ backTo }: { backTo: string }) {
  return (
    <div className="mx-auto max-w-lg rounded-lg border border-slate-200 bg-white px-6 py-12 text-center">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700">
        <Lock className="h-5 w-5" aria-hidden="true" />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-slate-900">Acesso restrito (403)</h2>
      <p className="mt-2 text-sm text-slate-600">
        Esta área é exclusiva para professores da instituição. Sua conta está vinculada com perfil de aluno.
      </p>
      <div className="mt-6">
        <Link
          to={backTo}
          className="inline-flex items-center justify-center rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 transition-colors whitespace-nowrap"
        >
          Voltar ao painel inicial
        </Link>
      </div>
    </div>
  );
}

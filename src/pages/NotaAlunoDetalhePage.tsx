import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { ErrorBanner, LoadingSkeleton, RestrictedAccess } from '../components/StateBlocks';
import { useAva } from '../contexts/AvaContext';
import { AvaApiError, avaApi } from '../services/avaApi';
import type { AvaNotasResponse } from '../types/ava';
import { TabelaBoletimAluno } from './NotasPage';

export function NotaAlunoDetalhePage() {
  const { alunoId } = useParams<{ alunoId: string }>();
  const { tenant, tenantSlug, selectedAnoId, anoAtual, isProfessor, buildAvaPath } = useAva();

  const [dados, setDados] = useState<AvaNotasResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AvaApiError | null>(null);

  const carregar = useCallback(async () => {
    if (!isProfessor || !alunoId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await avaApi.notas(tenantSlug, selectedAnoId, alunoId);
      setDados(res);
    } catch (err) {
      setError(
        err instanceof AvaApiError
          ? err
          : new AvaApiError(500, 'Não foi possível carregar o boletim do aluno.'),
      );
    } finally {
      setLoading(false);
    }
  }, [isProfessor, alunoId, tenantSlug, selectedAnoId]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  if (!isProfessor) {
    return <RestrictedAccess backTo={buildAvaPath('')} />;
  }

  if (loading) return <LoadingSkeleton rows={4} />;

  return (
    <div className="space-y-6">
      <Link
        to={buildAvaPath('/notas')}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Voltar para boletins das turmas
      </Link>

      {error ? (
        <ErrorBanner error={error} onRetry={() => void carregar()} />
      ) : (
        dados && (
          <>
            <div className="border-b border-slate-200 pb-5">
              <p className="text-xs font-medium text-slate-500">
                Boletim individual · Ano letivo{' '}
                <span className="tabular-nums">{anoAtual?.label || '—'}</span>
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
                {dados.aluno.nome}
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Identificador:{' '}
                <span className="font-mono text-slate-900">{dados.aluno.identificador}</span>
              </p>
            </div>

            <TabelaBoletimAluno
              dados={dados}
              cursoTipo={tenant?.curso_tipo}
              buildAvaPath={buildAvaPath}
            />
          </>
        )
      )}
    </div>
  );
}

/**
 * Utilitários de formatação pt-BR e normalização conforme PRD do AVA.
 */

export function formatarData(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

export function formatarDataHora(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatarHora(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatarDataExtenso(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatarNota(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return '—';
  return valor.toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

export function formatarPercentual(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return '0%';
  return `${valor.toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  })}%`;
}

/**
 * Normaliza CPF ou matrícula removendo '.', '-', '/' e espaços, conforme Seção 1.3 e 4.6 do PRD.
 */
export function normalizarIdentificador(raw: string): string {
  return raw.replace(/[.\-/\s]/g, '').trim().toLowerCase();
}

export function rotuloPapel(papel: string): string {
  switch (papel) {
    case 'professor':
      return 'Professor';
    case 'institution_manager':
      return 'Gestor Institucional';
    case 'super_admin':
      return 'Administrador';
    default:
      return 'Aluno';
  }
}

export function rotuloTipoCurso(tipo?: string): string {
  switch (tipo) {
    case 'faculdade':
      return 'Faculdade';
    case 'tecnico':
      return 'Curso Técnico';
    case 'curso_livre':
      return 'Curso Livre';
    default:
      return 'Acadêmico';
  }
}

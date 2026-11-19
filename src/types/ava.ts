/**
 * Contratos de dados JSON (snake_case, datas ISO-8601 UTC, IDs como string)
 * conforme Seção 3.4 e Seção 4.4 do PRD oficial do AVA (Leitor Inteligente).
 */

export type AvaPapel = 'aluno' | 'professor' | 'institution_manager' | 'super_admin';

export type AvaCursoTipo = 'faculdade' | 'tecnico' | 'curso_livre';

export interface AvaUsuario {
  id: string;
  email: string;
  nome: string;
  papel: AvaPapel;
  identificador?: string | null;
  precisa_vincular?: boolean;
}

export interface AvaTenant {
  id: string;
  slug: string;
  nome: string;
  edition: 'common' | 'radio_embed' | 'academic_premium' | string;
  type: 'common' | 'school' | 'radio' | string;
  curso_tipo?: AvaCursoTipo;
}

export interface AvaAno {
  id: string;
  label: string;
  atual: boolean;
}

export interface AvaTurmaResumo {
  id: string;
  disciplina: string;
  codigo?: string;
  curso_tipo?: AvaCursoTipo;
  class_group?: string;
  total_alunos?: number;
}

export interface AvaBootstrapResponse {
  ok: true;
  usuario: AvaUsuario;
  tenant: AvaTenant;
  ano: AvaAno;
  anos?: AvaAno[];
  turmas: AvaTurmaResumo[];
}

export interface AvaLoginResponse {
  ok: true;
  token: string;
  usuario: AvaUsuario;
  tenant: AvaTenant;
}

export interface AvaVincularResponse {
  ok: true;
  token: string;
  aluno: {
    id: string;
    nome: string;
    identificador: string;
  };
}

export interface AvaMeResponse {
  ok: true;
  usuario: AvaUsuario;
  permissoes: string[];
}

export interface AvaLogoutResponse {
  ok: true;
}

export interface AvaDisciplinaRef {
  id: string;
  nome: string;
}

export interface AvaLivroRef {
  slug: string;
  titulo: string;
  paginas: number;
}

export interface AvaAulaResumo {
  id: string;
  room_id: string;
  titulo: string;
  capitulo: string;
  comeca_em: string;
  termina_em: string;
  ativa: boolean;
}

export interface AvaModulo {
  id: string;
  titulo: string;
  descricao: string;
  ordem: number;
  disciplinas: AvaDisciplinaRef[];
  livros: AvaLivroRef[];
  aulas: AvaAulaResumo[];
}

export interface AvaModulosResponse {
  ok: true;
  modulos: AvaModulo[];
}

export interface AvaAvaliacaoNota {
  id: string;
  titulo: string;
  pontos: number;
  total: number;
  acertos: number;
  concluido_em: string;
}

export interface AvaNotaDisciplina {
  disciplina_id: string;
  disciplina: string;
  n1: number | null;
  n2: number | null;
  n3: number | null;
  n4: number | null;
  rec: number | null;
  media: number | null;
  final: number | null;
  situacao: string;
  avaliacoes: AvaAvaliacaoNota[];
}

export interface AvaNotasResponse {
  ok: true;
  aluno: {
    id: string;
    nome: string;
    identificador: string;
  };
  periodos: string[];
  notas: AvaNotaDisciplina[];
}

export interface AvaFrequenciaSessao {
  room_id: string;
  disciplina: string;
  capitulo: string;
  data: string;
  presente: boolean;
}

export interface AvaFrequenciaResponse {
  ok: true;
  total_sessoes: number;
  presentes: number;
  frequencia_pct: number;
  sessoes: AvaFrequenciaSessao[];
}

export interface AvaCalendarioEvento {
  tipo: 'aula' | 'avaliacao';
  id: string;
  room_id: string | null;
  titulo: string;
  disciplina: string;
  comeca_em: string;
  termina_em: string;
  ativo: boolean;
  url: string;
}

export interface AvaCalendarioResponse {
  ok: true;
  eventos: AvaCalendarioEvento[];
}

export interface AvaAlunoTurma {
  id: string;
  nome: string;
  identificador: string;
  media: number | null;
  presencas: number;
  total_sessoes?: number;
}

export interface AvaTurmaItem {
  id: string;
  disciplina: string;
  alunos: AvaAlunoTurma[];
}

export interface AvaTurmasResponse {
  ok: true;
  turmas: AvaTurmaItem[];
}

export interface AvaTurmaAvaliacao {
  id: string;
  titulo: string;
  modulo_id?: string | null;
  grade_period?: string | null;
  capitulo?: string | null;
  criado_em?: string;
  submissoes?: number;
  media_turma?: number | null;
}

export interface AvaTurmaDetalheResponse {
  ok: true;
  turma: {
    id: string;
    disciplina: string;
    codigo?: string;
    curso_tipo?: AvaCursoTipo;
    ano_label?: string;
  };
  alunos: AvaAlunoTurma[];
  avaliacoes: AvaTurmaAvaliacao[];
}

export interface AvaAulaSala {
  room_id: string;
  book_slug: string;
  book_title?: string;
  disciplina?: string;
  professor_nome?: string;
  capitulo: string;
  pagina_inicio: number;
  pagina_fim: number;
  ativa: boolean;
  comeca_em?: string;
  termina_em?: string;
  acesso: {
    modo: 'portao' | 'livre';
    link: string;
  };
}

export interface AvaAulaResponse {
  ok: true;
  sala: AvaAulaSala;
}

export interface AvaAvaliacaoQuestao {
  id: string;
  question: string;
  options: string[];
  correct_index?: number;
  explanation?: string;
}

export interface AvaAvaliacaoItem {
  id: string;
  titulo: string;
  disciplina_id: string;
  disciplina: string;
  modulo_id: string | null;
  capitulo: string;
  faixa_paginas: string | null;
  grade_period: string | null;
  total_questoes: number;
  status: 'pendente' | 'concluida';
  nota_obtida: number | null;
  acertos: number | null;
  concluido_em: string | null;
  prazo_em: string | null;
}

export interface AvaAvaliacoesResponse {
  ok: true;
  avaliacoes: AvaAvaliacaoItem[];
}

export interface AvaAvaliacaoDetalheResponse {
  ok: true;
  avaliacao: AvaAvaliacaoItem & {
    questoes: AvaAvaliacaoQuestao[];
    respostas_enviadas?: Record<string, number>;
  };
}

export interface AvaResponderAvaliacaoResponse {
  ok: true;
  resultado: {
    avaliacao_id: string;
    pontos: number;
    total: number;
    acertos: number;
    aprovado: boolean;
    concluido_em: string;
    respostas: Record<string, number>;
    gabarito: Record<string, { correct_index: number; explanation?: string }>;
  };
}

export interface AvaApiErrorPayload {
  ok: false;
  erro: string;
}

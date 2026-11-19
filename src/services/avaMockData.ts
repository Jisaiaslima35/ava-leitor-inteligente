/**
 * Fixtures simuladas fiéis aos contratos JSON da Seção 4.4 do PRD oficial.
 * IMPORTADO EXCLUSIVAMENTE por src/services/avaApi.ts quando VITE_USE_MOCK === 'true'.
 * Nunca importar este arquivo em páginas ou componentes.
 */

import type {
  AvaAno,
  AvaAulaSala,
  AvaAvaliacaoDetalheResponse,
  AvaAvaliacaoItem,
  AvaCalendarioEvento,
  AvaFrequenciaResponse,
  AvaModulo,
  AvaNotaDisciplina,
  AvaNotasResponse,
  AvaTenant,
  AvaTurmaDetalheResponse,
  AvaTurmaItem,
  AvaUsuario,
} from '../types/ava';
import { normalizarIdentificador } from '../utils/format';

export interface MockConta {
  email: string;
  senha: string;
  token: string;
  usuario: AvaUsuario;
  tenant_slug: string;
  identificador_esperado?: string;
  permissoes: string[];
}

export const MOCK_TENANTS: Record<string, AvaTenant> = {
  'faculdade-js': {
    id: 'ten-01-faculdade-js',
    slug: 'faculdade-js',
    nome: 'Faculdade JS',
    edition: 'academic_premium',
    type: 'school',
    curso_tipo: 'faculdade',
  },
  'juventude-10': {
    id: 'ten-02-juventude-10',
    slug: 'juventude-10',
    nome: 'Instituto Técnico Juventude 10',
    edition: 'academic_premium',
    type: 'school',
    curso_tipo: 'tecnico',
  },
  raiz: {
    id: 'ten-03-raiz',
    slug: 'raiz',
    nome: 'Escola Raiz — Cursos Livres',
    edition: 'academic_premium',
    type: 'school',
    curso_tipo: 'curso_livre',
  },
};

export const MOCK_ANOS: AvaAno[] = [
  { id: 'ano-2026-1', label: '2026.1', atual: true },
  { id: 'ano-2025-2', label: '2025.2', atual: false },
];

export const MOCK_CONTAS: MockConta[] = [
  {
    email: 'lucas.mendes@faculdadejs.edu.br',
    senha: '123456',
    token: 'mock_token_aluno_lucas',
    tenant_slug: 'faculdade-js',
    usuario: {
      id: 'usr-aluno-01',
      email: 'lucas.mendes@faculdadejs.edu.br',
      nome: 'Lucas Mendes Ferreira',
      papel: 'aluno',
      identificador: 'MAT-MUG8RPZ3',
      precisa_vincular: false,
    },
    permissoes: [
      'ava:modulos:ler',
      'ava:notas:proprias',
      'ava:frequencia:propria',
      'ava:avaliacoes:responder',
      'ava:aulas:acessar',
    ],
  },
  {
    email: 'mariana.costa@faculdadejs.edu.br',
    senha: '123456',
    token: 'mock_token_aluno_mariana_pendente',
    tenant_slug: 'faculdade-js',
    identificador_esperado: 'MAT-20260412',
    usuario: {
      id: 'usr-aluno-02',
      email: 'mariana.costa@faculdadejs.edu.br',
      nome: 'Mariana Costa Oliveira',
      papel: 'aluno',
      identificador: null,
      precisa_vincular: true,
    },
    permissoes: ['ava:vincular'],
  },
  {
    email: 'ricardo.almeida@faculdadejs.edu.br',
    senha: '123456',
    token: 'mock_token_professor_ricardo',
    tenant_slug: 'faculdade-js',
    usuario: {
      id: 'usr-prof-01',
      email: 'ricardo.almeida@faculdadejs.edu.br',
      nome: 'Prof. Ricardo Almeida',
      papel: 'professor',
      identificador: 'DOC-904182',
      precisa_vincular: false,
    },
    permissoes: [
      'ava:modulos:ler',
      'ava:turmas:gerenciar',
      'ava:notas:turma',
      'ava:frequencia:turma',
      'ava:avaliacoes:gerenciar',
      'ava:aulas:acessar',
    ],
  },
];

// Estado mutável em memória para o preview (vínculo 1º acesso e envio de avaliações)
const mockAlunosVinculados = new Set<string>();
const mockSubmissoesAvaliacoes: Record<
  string,
  {
    pontos: number;
    total: number;
    acertos: number;
    concluido_em: string;
    respostas: Record<string, number>;
  }
> = {};

export function getMockTenant(slug?: string | null): AvaTenant {
  if (slug && MOCK_TENANTS[slug]) {
    return MOCK_TENANTS[slug];
  }
  return MOCK_TENANTS['faculdade-js'];
}

export function findMockContaByToken(token: string | null): MockConta | null {
  if (!token) return null;
  const conta = MOCK_CONTAS.find((c) => c.token === token) ?? null;
  if (!conta) return null;
  if (mockAlunosVinculados.has(conta.usuario.id)) {
    return {
      ...conta,
      usuario: {
        ...conta.usuario,
        identificador: conta.identificador_esperado ?? conta.usuario.identificador,
        precisa_vincular: false,
      },
      permissoes: [
        'ava:modulos:ler',
        'ava:notas:proprias',
        'ava:frequencia:propria',
        'ava:avaliacoes:responder',
        'ava:aulas:acessar',
      ],
    };
  }
  return conta;
}

export function vincularMockAluno(token: string, identifier: string) {
  const conta = findMockContaByToken(token);
  if (!conta || conta.usuario.papel !== 'aluno') {
    return { ok: false as const, status: 403, erro: 'Apenas contas de aluno podem vincular matrícula.' };
  }
  const limpo = normalizarIdentificador(identifier);
  const esperado = normalizarIdentificador(conta.identificador_esperado ?? conta.usuario.identificador ?? 'MAT-20260412');
  const cpfDemo = normalizarIdentificador('123.456.789-00');
  if (!limpo || (limpo !== esperado && limpo !== cpfDemo && limpo !== '505050')) {
    return {
      ok: false as const,
      status: 400,
      erro: `Matrícula ou CPF não encontrado para este e-mail. Para testar no preview, use ${conta.identificador_esperado ?? 'MAT-20260412'} ou 505050.`,
    };
  }
  mockAlunosVinculados.add(conta.usuario.id);
  const finalId = conta.identificador_esperado ?? identifier.trim().toUpperCase();
  return {
    ok: true as const,
    token: conta.token,
    aluno: {
      id: conta.usuario.id,
      nome: conta.usuario.nome,
      identificador: finalId,
    },
  };
}

export function getMockModulos(anoId: string): AvaModulo[] {
  if (anoId === 'ano-2025-2') {
    return [
      {
        id: 'mod-2025-01',
        titulo: 'Módulo 01 — Introdução à Lógica e Leitura Analítica',
        descricao:
          'Fundamentos de interpretação técnica, estruturação de argumentos e leitura guiada de textos acadêmicos.',
        ordem: 1,
        disciplinas: [{ id: 'disc-log-25', nome: 'Lógica e Argumentação' }],
        livros: [
          {
            slug: 'fundamentos-leitura-analitica',
            titulo: 'Fundamentos da Leitura Analítica',
            paginas: 184,
          },
        ],
        aulas: [
          {
            id: 'aula-25-01',
            room_id: '9a8b7c6d5e4f3a2b',
            titulo: 'Revisão Geral e Encerramento do Semestre',
            capitulo: 'Capítulo 6 — Síntese Crítica',
            comeca_em: '2025-11-28T22:00:00Z',
            termina_em: '2025-11-28T23:30:00Z',
            ativa: false,
          },
        ],
      },
    ];
  }

  return [
    {
      id: 'mod-01',
      titulo: 'Módulo 01 — Arquitetura de Sistemas Web',
      descricao:
        'Estudo de protocolos HTTP, contratos REST, isolamento multi-tenant e padrões de segurança em aplicações modernas.',
      ordem: 1,
      disciplinas: [
        { id: 'disc-arq', nome: 'Arquitetura de Software' },
        { id: 'disc-api', nome: 'Integração de APIs' },
      ],
      livros: [
        {
          slug: 'arquitetura-web-moderna',
          titulo: 'Arquitetura Web Moderna e APIs Seguras',
          paginas: 248,
        },
        {
          slug: 'guia-contratos-http',
          titulo: 'Guia Prático de Contratos HTTP e Autenticação',
          paginas: 132,
        },
      ],
      aulas: [
        {
          id: 'aula-01',
          room_id: 'a4f9c2e81b704d3a',
          titulo: 'Isolamento Multi-Tenant e Controle de Acesso',
          capitulo: 'Capítulo 4 — Segurança por Tenant',
          comeca_em: '2026-11-19T22:00:00Z',
          termina_em: '2026-11-19T23:40:00Z',
          ativa: true,
        },
        {
          id: 'aula-02',
          room_id: 'b8d1e5f02c934a11',
          titulo: 'Contratos JSON e Versionamento de Rotas',
          capitulo: 'Capítulo 5 — Padronização de Respostas',
          comeca_em: '2026-11-24T22:00:00Z',
          termina_em: '2026-11-24T23:30:00Z',
          ativa: false,
        },
      ],
    },
    {
      id: 'mod-02',
      titulo: 'Módulo 02 — Banco de Dados Relacional e PostgreSQL',
      descricao:
        'Modelagem normalizada, políticas de Row Level Security (RLS), índices compostos e migrações seguras em produção.',
      ordem: 2,
      disciplinas: [{ id: 'disc-bd', nome: 'Banco de Dados II' }],
      livros: [
        {
          slug: 'postgresql-producao',
          titulo: 'PostgreSQL em Produção: Modelagem e RLS',
          paginas: 310,
        },
      ],
      aulas: [
        {
          id: 'aula-03',
          room_id: 'c3e7a9d41f028b6e',
          titulo: 'Políticas de RLS e Auditoria de Consultas',
          capitulo: 'Capítulo 7 — Segurança em Nível de Linha',
          comeca_em: '2026-11-21T22:00:00Z',
          termina_em: '2026-11-21T23:30:00Z',
          ativa: false,
        },
      ],
    },
    {
      id: 'mod-03',
      titulo: 'Módulo 03 — Engenharia de Interfaces Acadêmicas',
      descricao:
        'Acessibilidade WCAG AA, tipografia para leitura densa, tabelas financeiras/acadêmicas e performance em SPAs React.',
      ordem: 3,
      disciplinas: [{ id: 'disc-ui', nome: 'Engenharia de Frontend' }],
      livros: [
        {
          slug: 'interfaces-acessiveis-react',
          titulo: 'Interfaces Acessíveis com React e TypeScript',
          paginas: 196,
        },
      ],
      aulas: [
        {
          id: 'aula-04',
          room_id: 'd9f1b4c62a853e70',
          titulo: 'Estados de Carregamento, Erro Real e Acessibilidade',
          capitulo: 'Capítulo 3 — Resiliência no Cliente',
          comeca_em: '2026-11-26T22:00:00Z',
          termina_em: '2026-11-26T23:30:00Z',
          ativa: false,
        },
      ],
    },
  ];
}

export function getMockSalas(tenantSlug: string): Record<string, AvaAulaSala> {
  return {
    a4f9c2e81b704d3a: {
      room_id: 'a4f9c2e81b704d3a',
      book_slug: 'arquitetura-web-moderna',
      book_title: 'Arquitetura Web Moderna e APIs Seguras',
      disciplina: 'Arquitetura de Software',
      professor_nome: 'Prof. Ricardo Almeida',
      capitulo: 'Capítulo 4 — Segurança por Tenant',
      pagina_inicio: 82,
      pagina_fim: 114,
      ativa: true,
      comeca_em: '2026-11-19T22:00:00Z',
      termina_em: '2026-11-19T23:40:00Z',
      acesso: {
        modo: 'portao',
        link: `/t/${tenantSlug}#/reader/arquitetura-web-moderna?room=a4f9c2e81b704d3a&modo=portao`,
      },
    },
    b8d1e5f02c934a11: {
      room_id: 'b8d1e5f02c934a11',
      book_slug: 'guia-contratos-http',
      book_title: 'Guia Prático de Contratos HTTP e Autenticação',
      disciplina: 'Integração de APIs',
      professor_nome: 'Prof. Ricardo Almeida',
      capitulo: 'Capítulo 5 — Padronização de Respostas',
      pagina_inicio: 54,
      pagina_fim: 79,
      ativa: false,
      comeca_em: '2026-11-24T22:00:00Z',
      termina_em: '2026-11-24T23:30:00Z',
      acesso: {
        modo: 'portao',
        link: `/t/${tenantSlug}#/reader/guia-contratos-http?room=b8d1e5f02c934a11&modo=portao`,
      },
    },
    c3e7a9d41f028b6e: {
      room_id: 'c3e7a9d41f028b6e',
      book_slug: 'postgresql-producao',
      book_title: 'PostgreSQL em Produção: Modelagem e RLS',
      disciplina: 'Banco de Dados II',
      professor_nome: 'Prof. Ricardo Almeida',
      capitulo: 'Capítulo 7 — Segurança em Nível de Linha',
      pagina_inicio: 140,
      pagina_fim: 175,
      ativa: false,
      comeca_em: '2026-11-21T22:00:00Z',
      termina_em: '2026-11-21T23:30:00Z',
      acesso: {
        modo: 'portao',
        link: `/t/${tenantSlug}#/reader/postgresql-producao?room=c3e7a9d41f028b6e&modo=portao`,
      },
    },
    d9f1b4c62a853e70: {
      room_id: 'd9f1b4c62a853e70',
      book_slug: 'interfaces-acessiveis-react',
      book_title: 'Interfaces Acessíveis com React e TypeScript',
      disciplina: 'Engenharia de Frontend',
      professor_nome: 'Prof. Ricardo Almeida',
      capitulo: 'Capítulo 3 — Resiliência no Cliente',
      pagina_inicio: 48,
      pagina_fim: 72,
      ativa: false,
      comeca_em: '2026-11-26T22:00:00Z',
      termina_em: '2026-11-26T23:30:00Z',
      acesso: {
        modo: 'livre',
        link: `/t/${tenantSlug}#/reader/interfaces-acessiveis-react?room=d9f1b4c62a853e70&modo=livre`,
      },
    },
    '9a8b7c6d5e4f3a2b': {
      room_id: '9a8b7c6d5e4f3a2b',
      book_slug: 'fundamentos-leitura-analitica',
      book_title: 'Fundamentos da Leitura Analítica',
      disciplina: 'Lógica e Argumentação',
      professor_nome: 'Prof. Ricardo Almeida',
      capitulo: 'Capítulo 6 — Síntese Crítica',
      pagina_inicio: 130,
      pagina_fim: 184,
      ativa: false,
      comeca_em: '2025-11-28T22:00:00Z',
      termina_em: '2025-11-28T23:30:00Z',
      acesso: {
        modo: 'livre',
        link: `/t/${tenantSlug}#/reader/fundamentos-leitura-analitica?room=9a8b7c6d5e4f3a2b&modo=livre`,
      },
    },
  };
}

export function getMockAvaliacoesDetalhadas(): Record<string, AvaAvaliacaoDetalheResponse['avaliacao']> {
  const base: Record<string, AvaAvaliacaoDetalheResponse['avaliacao']> = {
    'aval-01': {
      id: 'aval-01',
      titulo: 'Avaliação N1 — Arquitetura Multi-Tenant e Autenticação',
      disciplina_id: 'disc-arq',
      disciplina: 'Arquitetura de Software',
      modulo_id: 'mod-01',
      capitulo: 'Capítulo 4 — Segurança por Tenant',
      faixa_paginas: '82–114',
      grade_period: 'N1',
      total_questoes: 3,
      status: 'concluida',
      nota_obtida: 8.5,
      acertos: 3,
      concluido_em: '2026-10-14T23:15:00Z',
      prazo_em: '2026-10-15T23:59:00Z',
      respostas_enviadas: { q1: 1, q2: 2, q3: 0 },
      questoes: [
        {
          id: 'q1',
          question: 'Em uma arquitetura multi-tenant por slug (/t/:slug), onde o filtro por tenant_id deve ser aplicado obrigatoriamente?',
          options: [
            'Apenas no localStorage do navegador antes de renderizar a tela.',
            'No servidor/backend em toda consulta ao banco de dados, sem confiar no corpo enviado pelo cliente.',
            'Somente na tela de login, ficando livre nas demais rotas.',
            'Exclusivamente no proxy de arquivos estáticos.',
          ],
          correct_index: 1,
          explanation: 'O isolamento multi-tenant só é seguro quando aplicado no servidor em cada SELECT/UPDATE usando o contexto autenticado.',
        },
        {
          id: 'q2',
          question: 'Qual cabeçalho HTTP é utilizado pelo AVA para enviar o token de acesso nas rotas /api/ava/*?',
          options: [
            'X-Custom-Password',
            'Cookie-Session-Public',
            'Authorization: Bearer <token>',
            'Accept-Language: pt-BR',
          ],
          correct_index: 2,
          explanation: 'Todas as rotas autenticadas da API do AVA recebem o access_token no cabeçalho Authorization no padrão Bearer.',
        },
        {
          id: 'q3',
          question: 'Quando a API retorna HTTP 401 em uma rota protegida do AVA, qual é o comportamento esperado no frontend?',
          options: [
            'Encerrar a sessão local e redirecionar o usuário para /ava/entrar.',
            'Substituir a resposta por dados fictícios em cache.',
            'Ignorar o erro e manter a página anterior congelada.',
            'Reenviar a mesma requisição infinitamente sem parar.',
          ],
          correct_index: 0,
          explanation: 'HTTP 401 indica sessão ausente ou expirada, exigindo novo login em /ava/entrar.',
        },
      ],
    },
    'aval-02': {
      id: 'aval-02',
      titulo: 'Avaliação N2 — Row Level Security (RLS) no PostgreSQL',
      disciplina_id: 'disc-bd',
      disciplina: 'Banco de Dados II',
      modulo_id: 'mod-02',
      capitulo: 'Capítulo 7 — Segurança em Nível de Linha',
      faixa_paginas: '140–175',
      grade_period: 'N2',
      total_questoes: 3,
      status: 'pendente',
      nota_obtida: null,
      acertos: null,
      concluido_em: null,
      prazo_em: '2026-11-27T23:59:00Z',
      questoes: [
        {
          id: 'q1',
          question: 'O que acontece no PostgreSQL se existirem policies criadas em uma tabela, mas relrowsecurity estiver definido como false?',
          options: [
            'As policies são aplicadas apenas para administradores.',
            'As policies não são aplicadas e os dados ficam expostos conforme os GRANTs da role.',
            'O banco bloqueia automaticamente todas as consultas SELECT.',
            'As policies passam a valer somente para inserções.',
          ],
          correct_index: 1,
          explanation: 'Sem ALTER TABLE ... ENABLE ROW LEVEL SECURITY, as policies definidas em pg_policies não têm efeito.',
        },
        {
          id: 'q2',
          question: 'Qual é a prática recomendada para normalizar CPF ou matrícula antes de comparar identificadores no backend?',
          options: [
            'Converter para número inteiro de 32 bits.',
            'Remover pontos, hífens e barras e comparar em caixa uniforme.',
            'Usar apenas os 4 primeiros caracteres digitados.',
            'Exigir que o usuário digite sempre com máscara fixa.',
          ],
          correct_index: 1,
          explanation: 'Canonicalizar removendo ".", "-", "/" e espaços evita falhas de vínculo entre formatos diferentes.',
        },
        {
          id: 'q3',
          question: 'Por que o frontend do AVA deve consumir /api/ava/* em vez de consultar tabelas diretamente via PostgREST com chave anônima?',
          options: [
            'Porque PostgREST não suporta JSON.',
            'Para garantir filtro server-side estrito por tenant_id, papel e user_id, além de evitar exposição com chave pública.',
            'Apenas para mudar o nome da URL.',
            'Porque o navegador bloqueia chamadas REST diretas.',
          ],
          correct_index: 1,
          explanation: 'A camada /api/ava/* aplica autorização por papel, tenant e validação de JWT no servidor.',
        },
      ],
    },
    'aval-03': {
      id: 'aval-03',
      titulo: 'Avaliação N1 — Modelagem de Matrículas e Turmas',
      disciplina_id: 'disc-bd',
      disciplina: 'Banco de Dados II',
      modulo_id: 'mod-02',
      capitulo: 'Capítulo 3 — Relacionamentos N:N',
      faixa_paginas: '60–92',
      grade_period: 'N1',
      total_questoes: 2,
      status: 'concluida',
      nota_obtida: 7.0,
      acertos: 2,
      concluido_em: '2026-10-20T21:40:00Z',
      prazo_em: '2026-10-22T23:59:00Z',
      respostas_enviadas: { q1: 0, q2: 1 },
      questoes: [
        {
          id: 'q1',
          question: 'Qual tabela resolve o relacionamento muitos-para-muitos entre alunos e disciplinas por ano letivo?',
          options: [
            'Uma tabela associativa de matrículas (academic_enrollments).',
            'Duplicar o cadastro do aluno para cada disciplina.',
            'Guardar nomes separados por vírgula em uma coluna texto.',
            'Usar a tabela de logs de acesso.',
          ],
          correct_index: 0,
          explanation: 'Uma tabela de matrículas associa aluno, disciplina, curso, turma e ano letivo de forma normalizada.',
        },
        {
          id: 'q2',
          question: 'Ao evoluir um banco já em produção com dados reais, qual estratégia preserva compatibilidade imediata?',
          options: [
            'Remover colunas existentes e recriar o banco do zero.',
            'Adicionar tabelas e colunas novas como nullable (aditivas) sem quebrar constraints existentes.',
            'Alterar todos os tipos UUID para texto livre.',
            'Desativar chaves primárias temporariamente.',
          ],
          correct_index: 1,
          explanation: 'Migrações aditivas e nullable mantêm o sistema principal operando sem interrupção.',
        },
      ],
    },
    'aval-04': {
      id: 'aval-04',
      titulo: 'Avaliação N2 — Acessibilidade e Estados de Erro em React',
      disciplina_id: 'disc-ui',
      disciplina: 'Engenharia de Frontend',
      modulo_id: 'mod-03',
      capitulo: 'Capítulo 3 — Resiliência no Cliente',
      faixa_paginas: '48–72',
      grade_period: 'N2',
      total_questoes: 2,
      status: 'pendente',
      nota_obtida: null,
      acertos: null,
      concluido_em: null,
      prazo_em: '2026-11-30T23:59:00Z',
      questoes: [
        {
          id: 'q1',
          question: 'Quando uma chamada de API falha em produção, qual prática garante transparência e diagnóstico seguro?',
          options: [
            'Retornar dados fictícios no bloco catch sem avisar o usuário.',
            'Exibir a mensagem de erro real e oferecer ação para tentar novamente.',
            'Ocultar a seção inteira em branco.',
            'Recarregar a janela automaticamente a cada 100ms.',
          ],
          correct_index: 1,
          explanation: 'Falhas reais devem ser comunicadas claramente ao usuário com opção de nova tentativa, nunca mascaradas com dados falsos.',
        },
        {
          id: 'q2',
          question: 'Por que usar tabular-nums em boletins de notas e tabelas de frequência?',
          options: [
            'Para deixar os números em itálico.',
            'Para alinhar verticalmente dígitos e casas decimais sem deslocamento visual.',
            'Para reduzir o tamanho da resposta JSON.',
            'Para traduzir datas automaticamente.',
          ],
          correct_index: 1,
          explanation: 'Algarismos tabulares possuem largura fixa, alinhando colunas numéricas com precisão.',
        },
      ],
    },
  };

  // Aplica submissões feitas nesta sessão de preview
  for (const [id, sub] of Object.entries(mockSubmissoesAvaliacoes)) {
    if (base[id]) {
      base[id] = {
        ...base[id],
        status: 'concluida',
        nota_obtida: sub.pontos,
        acertos: sub.acertos,
        concluido_em: sub.concluido_em,
        respostas_enviadas: sub.respostas,
      };
    }
  }

  return base;
}

export function getMockAvaliacoesList(): AvaAvaliacaoItem[] {
  return Object.values(getMockAvaliacoesDetalhadas()).map(({ questoes: _q, respostas_enviadas: _r, ...item }) => item);
}

export function submeterMockAvaliacao(avaliacaoId: string, respostas: Record<string, number>) {
  const todas = getMockAvaliacoesDetalhadas();
  const aval = todas[avaliacaoId];
  if (!aval) {
    return null;
  }
  let acertos = 0;
  const gabarito: Record<string, { correct_index: number; explanation?: string }> = {};
  for (const q of aval.questoes) {
    const correta = q.correct_index ?? 0;
    gabarito[q.id] = { correct_index: correta, explanation: q.explanation };
    if (respostas[q.id] === correta) {
      acertos += 1;
    }
  }
  const total = aval.questoes.length;
  const pontos = Number(((acertos / Math.max(total, 1)) * 10).toFixed(1));
  const concluido_em = new Date().toISOString();

  mockSubmissoesAvaliacoes[avaliacaoId] = {
    pontos,
    total,
    acertos,
    concluido_em,
    respostas,
  };

  return {
    avaliacao_id: avaliacaoId,
    pontos,
    total,
    acertos,
    aprovado: pontos >= 6,
    concluido_em,
    respostas,
    gabarito,
  };
}

export function getMockNotas(anoId: string, alunoId?: string): AvaNotasResponse {
  const alunosMapa: Record<string, { id: string; nome: string; identificador: string }> = {
    'usr-aluno-01': { id: 'usr-aluno-01', nome: 'Lucas Mendes Ferreira', identificador: 'MAT-MUG8RPZ3' },
    'usr-aluno-02': { id: 'usr-aluno-02', nome: 'Mariana Costa Oliveira', identificador: 'MAT-20260412' },
    'alu-03': { id: 'alu-03', nome: 'Gabriel Santos Rocha', identificador: '7654321' },
    'alu-04': { id: 'alu-04', nome: 'Beatriz Lima Nogueira', identificador: '505050' },
  };

  const aluno = alunosMapa[alunoId ?? 'usr-aluno-01'] ?? alunosMapa['usr-aluno-01'];

  if (anoId === 'ano-2025-2') {
    return {
      ok: true,
      aluno,
      periodos: ['N1', 'N2', 'N3', 'N4', 'REC'],
      notas: [
        {
          disciplina_id: 'disc-log-25',
          disciplina: 'Lógica e Argumentação',
          n1: 8.0,
          n2: 8.5,
          n3: 9.0,
          n4: 8.5,
          rec: null,
          media: 8.5,
          final: 8.5,
          situacao: 'Aprovado',
          avaliacoes: [
            {
              id: 'aval-25-01',
              titulo: 'Prova Semestral de Lógica',
              pontos: 8.5,
              total: 10,
              acertos: 9,
              concluido_em: '2025-11-20T21:10:00Z',
            },
          ],
        },
      ],
    };
  }

  const subAval02 = mockSubmissoesAvaliacoes['aval-02'];
  const subAval04 = mockSubmissoesAvaliacoes['aval-04'];

  const notasBase: AvaNotaDisciplina[] =
    aluno.id === 'alu-03'
      ? [
          {
            disciplina_id: 'disc-arq',
            disciplina: 'Arquitetura de Software',
            n1: 5.5,
            n2: 6.0,
            n3: null,
            n4: null,
            rec: 7.0,
            media: 5.8,
            final: 6.4,
            situacao: 'Em recuperação',
            avaliacoes: [
              {
                id: 'aval-01',
                titulo: 'Avaliação N1 — Arquitetura Multi-Tenant e Autenticação',
                pontos: 5.5,
                total: 10,
                acertos: 6,
                concluido_em: '2026-10-14T22:50:00Z',
              },
            ],
          },
          {
            disciplina_id: 'disc-bd',
            disciplina: 'Banco de Dados II',
            n1: 6.5,
            n2: 7.0,
            n3: null,
            n4: null,
            rec: null,
            media: 6.8,
            final: 6.8,
            situacao: 'Em andamento',
            avaliacoes: [
              {
                id: 'aval-03',
                titulo: 'Avaliação N1 — Modelagem de Matrículas e Turmas',
                pontos: 6.5,
                total: 10,
                acertos: 7,
                concluido_em: '2026-10-20T22:00:00Z',
              },
            ],
          },
        ]
      : [
          {
            disciplina_id: 'disc-arq',
            disciplina: 'Arquitetura de Software',
            n1: 8.5,
            n2: 9.0,
            n3: null,
            n4: null,
            rec: null,
            media: 8.8,
            final: 8.8,
            situacao: 'Aprovado',
            avaliacoes: [
              {
                id: 'aval-01',
                titulo: 'Avaliação N1 — Arquitetura Multi-Tenant e Autenticação',
                pontos: 8.5,
                total: 3,
                acertos: 3,
                concluido_em: '2026-10-14T23:15:00Z',
              },
            ],
          },
          {
            disciplina_id: 'disc-bd',
            disciplina: 'Banco de Dados II',
            n1: 7.0,
            n2: subAval02 ? subAval02.pontos : null,
            n3: null,
            n4: null,
            rec: null,
            media: subAval02 ? Number(((7.0 + subAval02.pontos) / 2).toFixed(1)) : 7.0,
            final: subAval02 ? Number(((7.0 + subAval02.pontos) / 2).toFixed(1)) : 7.0,
            situacao: subAval02 && subAval02.pontos < 6 ? 'Em recuperação' : 'Em andamento',
            avaliacoes: [
              {
                id: 'aval-03',
                titulo: 'Avaliação N1 — Modelagem de Matrículas e Turmas',
                pontos: 7.0,
                total: 2,
                acertos: 2,
                concluido_em: '2026-10-20T21:40:00Z',
              },
              ...(subAval02
                ? [
                    {
                      id: 'aval-02',
                      titulo: 'Avaliação N2 — Row Level Security (RLS) no PostgreSQL',
                      pontos: subAval02.pontos,
                      total: subAval02.total,
                      acertos: subAval02.acertos,
                      concluido_em: subAval02.concluido_em,
                    },
                  ]
                : []),
            ],
          },
          {
            disciplina_id: 'disc-ui',
            disciplina: 'Engenharia de Frontend',
            n1: 9.2,
            n2: subAval04 ? subAval04.pontos : null,
            n3: null,
            n4: null,
            rec: null,
            media: subAval04 ? Number(((9.2 + subAval04.pontos) / 2).toFixed(1)) : 9.2,
            final: subAval04 ? Number(((9.2 + subAval04.pontos) / 2).toFixed(1)) : 9.2,
            situacao: 'Aprovado',
            avaliacoes: subAval04
              ? [
                  {
                    id: 'aval-04',
                    titulo: 'Avaliação N2 — Acessibilidade e Estados de Erro em React',
                    pontos: subAval04.pontos,
                    total: subAval04.total,
                    acertos: subAval04.acertos,
                    concluido_em: subAval04.concluido_em,
                  },
                ]
              : [],
          },
        ];

  return {
    ok: true,
    aluno,
    periodos: ['N1', 'N2', 'N3', 'N4', 'REC'],
    notas: notasBase,
  };
}

export function getMockFrequencia(anoId: string): AvaFrequenciaResponse {
  if (anoId === 'ano-2025-2') {
    return {
      ok: true,
      total_sessoes: 4,
      presentes: 4,
      frequencia_pct: 100,
      sessoes: [
        {
          room_id: '9a8b7c6d5e4f3a2b',
          disciplina: 'Lógica e Argumentação',
          capitulo: 'Capítulo 6 — Síntese Crítica',
          data: '2025-11-28T22:00:00Z',
          presente: true,
        },
        {
          room_id: '9a8b7c6d5e4f3a2a',
          disciplina: 'Lógica e Argumentação',
          capitulo: 'Capítulo 5 — Falácias Formais',
          data: '2025-11-21T22:00:00Z',
          presente: true,
        },
        {
          room_id: '9a8b7c6d5e4f3a29',
          disciplina: 'Lógica e Argumentação',
          capitulo: 'Capítulo 4 — Dedução e Indução',
          data: '2025-11-14T22:00:00Z',
          presente: true,
        },
        {
          room_id: '9a8b7c6d5e4f3a28',
          disciplina: 'Lógica e Argumentação',
          capitulo: 'Capítulo 3 — Estrutura de Premissas',
          data: '2025-11-07T22:00:00Z',
          presente: true,
        },
      ],
    };
  }

  return {
    ok: true,
    total_sessoes: 8,
    presentes: 7,
    frequencia_pct: 87.5,
    sessoes: [
      {
        room_id: 'a4f9c2e81b704d3a',
        disciplina: 'Arquitetura de Software',
        capitulo: 'Capítulo 4 — Segurança por Tenant',
        data: '2026-11-19T22:00:00Z',
        presente: true,
      },
      {
        room_id: 'c3e7a9d41f028b61',
        disciplina: 'Banco de Dados II',
        capitulo: 'Capítulo 6 — Índices Compostos e Planos de Execução',
        data: '2026-11-14T22:00:00Z',
        presente: true,
      },
      {
        room_id: 'd9f1b4c62a853e12',
        disciplina: 'Engenharia de Frontend',
        capitulo: 'Capítulo 2 — Acessibilidade e Contraste WCAG',
        data: '2026-11-12T22:00:00Z',
        presente: true,
      },
      {
        room_id: 'a4f9c2e81b704d10',
        disciplina: 'Arquitetura de Software',
        capitulo: 'Capítulo 3 — Autenticação Bearer e Sessões',
        data: '2026-11-05T22:00:00Z',
        presente: false,
      },
      {
        room_id: 'c3e7a9d41f028b50',
        disciplina: 'Banco de Dados II',
        capitulo: 'Capítulo 5 — Migrações Aditivas sem Downtime',
        data: '2026-10-31T22:00:00Z',
        presente: true,
      },
      {
        room_id: 'd9f1b4c62a853e09',
        disciplina: 'Engenharia de Frontend',
        capitulo: 'Capítulo 1 — Arquitetura de Componentes',
        data: '2026-10-29T22:00:00Z',
        presente: true,
      },
      {
        room_id: 'a4f9c2e81b704d08',
        disciplina: 'Arquitetura de Software',
        capitulo: 'Capítulo 2 — Separação Frontend e Microserviços',
        data: '2026-10-22T22:00:00Z',
        presente: true,
      },
      {
        room_id: 'c3e7a9d41f028b42',
        disciplina: 'Banco de Dados II',
        capitulo: 'Capítulo 4 — Normalização de Turmas e Matrículas',
        data: '2026-10-17T22:00:00Z',
        presente: true,
      },
    ],
  };
}

export function getMockCalendario(anoId: string): AvaCalendarioEvento[] {
  if (anoId === 'ano-2025-2') {
    return [
      {
        tipo: 'aula',
        id: 'ev-25-01',
        room_id: '9a8b7c6d5e4f3a2b',
        titulo: 'Revisão Geral e Encerramento do Semestre',
        disciplina: 'Lógica e Argumentação',
        comeca_em: '2025-11-28T22:00:00Z',
        termina_em: '2025-11-28T23:30:00Z',
        ativo: false,
        url: '/ava/aula/9a8b7c6d5e4f3a2b',
      },
    ];
  }

  return [
    {
      tipo: 'aula',
      id: 'ev-01',
      room_id: 'a4f9c2e81b704d3a',
      titulo: 'Isolamento Multi-Tenant e Controle de Acesso',
      disciplina: 'Arquitetura de Software',
      comeca_em: '2026-11-19T22:00:00Z',
      termina_em: '2026-11-19T23:40:00Z',
      ativo: true,
      url: '/ava/aula/a4f9c2e81b704d3a',
    },
    {
      tipo: 'aula',
      id: 'ev-02',
      room_id: 'c3e7a9d41f028b6e',
      titulo: 'Políticas de RLS e Auditoria de Consultas',
      disciplina: 'Banco de Dados II',
      comeca_em: '2026-11-21T22:00:00Z',
      termina_em: '2026-11-21T23:30:00Z',
      ativo: false,
      url: '/ava/aula/c3e7a9d41f028b6e',
    },
    {
      tipo: 'aula',
      id: 'ev-03',
      room_id: 'b8d1e5f02c934a11',
      titulo: 'Contratos JSON e Versionamento de Rotas',
      disciplina: 'Integração de APIs',
      comeca_em: '2026-11-24T22:00:00Z',
      termina_em: '2026-11-24T23:30:00Z',
      ativo: false,
      url: '/ava/aula/b8d1e5f02c934a11',
    },
    {
      tipo: 'aula',
      id: 'ev-04',
      room_id: 'd9f1b4c62a853e70',
      titulo: 'Estados de Carregamento, Erro Real e Acessibilidade',
      disciplina: 'Engenharia de Frontend',
      comeca_em: '2026-11-26T22:00:00Z',
      termina_em: '2026-11-26T23:30:00Z',
      ativo: false,
      url: '/ava/aula/d9f1b4c62a853e70',
    },
    {
      tipo: 'avaliacao',
      id: 'aval-02',
      room_id: null,
      titulo: 'Avaliação N2 — Row Level Security (RLS) no PostgreSQL',
      disciplina: 'Banco de Dados II',
      comeca_em: '2026-11-27T18:00:00Z',
      termina_em: '2026-11-27T23:59:00Z',
      ativo: true,
      url: '/ava/avaliacao/aval-02',
    },
    {
      tipo: 'avaliacao',
      id: 'aval-04',
      room_id: null,
      titulo: 'Avaliação N2 — Acessibilidade e Estados de Erro em React',
      disciplina: 'Engenharia de Frontend',
      comeca_em: '2026-11-30T18:00:00Z',
      termina_em: '2026-11-30T23:59:00Z',
      ativo: true,
      url: '/ava/avaliacao/aval-04',
    },
  ];
}

export function getMockTurmas(anoId: string): AvaTurmaItem[] {
  if (anoId === 'ano-2025-2') {
    return [
      {
        id: 'turma-25-log',
        disciplina: 'Lógica e Argumentação',
        alunos: [
          { id: 'usr-aluno-01', nome: 'Lucas Mendes Ferreira', identificador: 'MAT-MUG8RPZ3', media: 8.5, presencas: 4, total_sessoes: 4 },
          { id: 'alu-03', nome: 'Gabriel Santos Rocha', identificador: '7654321', media: 7.4, presencas: 3, total_sessoes: 4 },
        ],
      },
    ];
  }

  return [
    {
      id: 'turma-arq-2026',
      disciplina: 'Arquitetura de Software',
      alunos: [
        { id: 'usr-aluno-01', nome: 'Lucas Mendes Ferreira', identificador: 'MAT-MUG8RPZ3', media: 8.8, presencas: 7, total_sessoes: 8 },
        { id: 'usr-aluno-02', nome: 'Mariana Costa Oliveira', identificador: 'MAT-20260412', media: 8.2, presencas: 8, total_sessoes: 8 },
        { id: 'alu-03', nome: 'Gabriel Santos Rocha', identificador: '7654321', media: 6.4, presencas: 5, total_sessoes: 8 },
        { id: 'alu-04', nome: 'Beatriz Lima Nogueira', identificador: '505050', media: 9.1, presencas: 8, total_sessoes: 8 },
      ],
    },
    {
      id: 'turma-bd-2026',
      disciplina: 'Banco de Dados II',
      alunos: [
        { id: 'usr-aluno-01', nome: 'Lucas Mendes Ferreira', identificador: 'MAT-MUG8RPZ3', media: 7.0, presencas: 6, total_sessoes: 7 },
        { id: 'alu-03', nome: 'Gabriel Santos Rocha', identificador: '7654321', media: 6.8, presencas: 6, total_sessoes: 7 },
        { id: 'alu-04', nome: 'Beatriz Lima Nogueira', identificador: '505050', media: 8.6, presencas: 7, total_sessoes: 7 },
      ],
    },
    {
      id: 'turma-ui-2026',
      disciplina: 'Engenharia de Frontend',
      alunos: [
        { id: 'usr-aluno-01', nome: 'Lucas Mendes Ferreira', identificador: 'MAT-MUG8RPZ3', media: 9.2, presencas: 6, total_sessoes: 6 },
        { id: 'usr-aluno-02', nome: 'Mariana Costa Oliveira', identificador: 'MAT-20260412', media: 8.9, presencas: 5, total_sessoes: 6 },
        { id: 'alu-04', nome: 'Beatriz Lima Nogueira', identificador: '505050', media: 9.4, presencas: 6, total_sessoes: 6 },
      ],
    },
  ];
}

export function getMockTurmaDetalhe(turmaId: string, anoId: string): AvaTurmaDetalheResponse | null {
  const turmas = getMockTurmas(anoId);
  const encontrada = turmas.find((t) => t.id === turmaId) ?? getMockTurmas('ano-2026-1').find((t) => t.id === turmaId);
  if (!encontrada) return null;

  const avaliacoes = getMockAvaliacoesList()
    .filter((a) => a.disciplina === encontrada.disciplina)
    .map((a) => ({
      id: a.id,
      titulo: a.titulo,
      modulo_id: a.modulo_id,
      grade_period: a.grade_period,
      capitulo: a.capitulo,
      criado_em: a.concluido_em ?? a.prazo_em ?? '2026-10-10T18:00:00Z',
      submissoes: a.status === 'concluida' ? encontrada.alunos.length : Math.max(1, encontrada.alunos.length - 2),
      media_turma: a.nota_obtida ?? 7.4,
    }));

  return {
    ok: true,
    turma: {
      id: encontrada.id,
      disciplina: encontrada.disciplina,
      codigo: encontrada.id.toUpperCase(),
      curso_tipo: 'faculdade',
      ano_label: anoId === 'ano-2025-2' ? '2025.2' : '2026.1',
    },
    alunos: encontrada.alunos,
    avaliacoes,
  };
}

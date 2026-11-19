import React, { useMemo, useState } from 'react';
import { ArrowRight, GraduationCap, KeyRound, Mail, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAva } from '../contexts/AvaContext';
import { AvaApiError, USE_MOCK, getMockDemoAccounts } from '../services/avaApi';
import { rotuloPapel } from '../utils/format';

export function LoginPage() {
  const { tenantSlug, usuario: usuarioSessao, login, vincular, buildAvaPath } = useAva();
  const navigate = useNavigate();

  const [slugInput, setSlugInput] = useState(tenantSlug || 'faculdade-js');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [etapa, setEtapa] = useState<'login' | 'vincular'>(() =>
    usuarioSessao?.precisa_vincular ? 'vincular' : 'login',
  );
  const [identifier, setIdentifier] = useState('');
  const [nomePendente, setNomePendente] = useState(() => usuarioSessao?.nome || '');
  const [submitting, setSubmitting] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const contasPreview = useMemo(() => getMockDemoAccounts(), []);

  async function handleLoginSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!email.trim() || !senha) {
      setErro('Informe seu e-mail institucional e sua senha.');
      return;
    }
    setSubmitting(true);
    try {
      const usuario = await login(email, senha, slugInput.trim() || null);
      if (usuario.precisa_vincular && usuario.papel === 'aluno') {
        setNomePendente(usuario.nome);
        setEtapa('vincular');
        return;
      }
      const destino = slugInput.trim()
        ? `/t/${encodeURIComponent(slugInput.trim())}/ava`
        : buildAvaPath('');
      navigate(destino, { replace: true });
    } catch (err) {
      if (err instanceof AvaApiError) {
        setErro(err.message);
      } else {
        setErro('Não foi possível autenticar no momento. Tente novamente.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVincularSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!identifier.trim()) {
      setErro('Informe seu CPF ou número de matrícula cadastrado pela secretaria.');
      return;
    }
    setSubmitting(true);
    try {
      await vincular(identifier);
      const destino = slugInput.trim()
        ? `/t/${encodeURIComponent(slugInput.trim())}/ava`
        : buildAvaPath('');
      navigate(destino, { replace: true });
    } catch (err) {
      if (err instanceof AvaApiError) {
        setErro(err.message);
      } else {
        setErro('Falha ao vincular matrícula. Verifique o dado informado.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  function preencherContaPreview(conta: (typeof contasPreview)[number]) {
    setSlugInput(conta.tenant_slug);
    setEmail(conta.email);
    setSenha(conta.senha);
    setEtapa('login');
    setErro(null);
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-5xl flex-1 flex items-center">
        <div className="grid w-full grid-cols-1 gap-8 lg:grid-cols-12 lg:items-center">
          {/* Coluna institucional */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-700 text-white">
                <GraduationCap className="h-5 w-5" aria-hidden="true" />
              </div>
              <span
                className="text-xl font-bold tracking-tight text-slate-900"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Leitor Inteligente · AVA
              </span>
            </div>

            <div className="space-y-3 max-w-lg">
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Portal Acadêmico do Aluno e Professor
              </h1>
              <p className="text-base leading-relaxed text-slate-600">
                Acesse seus módulos, livros, aulas ao vivo, avaliações, boletim e histórico de
                frequência em um ambiente integrado à sua instituição.
              </p>
            </div>

            <div className="border-t border-slate-200 pt-5 max-w-lg space-y-2.5 text-sm text-slate-600">
              <p>
                <span className="font-semibold text-slate-900">Cadastro unificado:</span> utilize o
                mesmo e-mail cadastrado pelo gestor da instituição.
              </p>
              <p>
                <span className="font-semibold text-slate-900">Isolamento por perfil:</span> cada
                aluno visualiza exclusivamente suas próprias disciplinas, notas e presenças.
              </p>
              <p>
                <span className="font-semibold text-slate-900">Primeiro acesso do aluno:</span> após
                entrar com e-mail e senha, confirme seu CPF ou matrícula para vincular sua conta.
              </p>
            </div>
          </div>

          {/* Card de Autenticação */}
          <div className="lg:col-span-6">
            <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs">
              {etapa === 'login' ? (
                <>
                  <div className="mb-6">
                    <h2 className="text-xl font-semibold text-slate-900">Entrar no portal</h2>
                    <p className="mt-1 text-sm text-slate-600">
                      Informe a instituição e suas credenciais de acesso.
                    </p>
                  </div>

                  {erro && (
                    <div
                      role="alert"
                      className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
                    >
                      {erro}
                    </div>
                  )}

                  <form onSubmit={handleLoginSubmit} className="space-y-4">
                    <div>
                      <label
                        htmlFor="tenant-slug"
                        className="block text-sm font-medium text-slate-700"
                      >
                        Instituição (identificador / slug)
                      </label>
                      <input
                        id="tenant-slug"
                        type="text"
                        value={slugInput}
                        onChange={(e) => setSlugInput(e.target.value)}
                        placeholder="ex: faculdade-js"
                        autoComplete="organization"
                        className="mt-1.5 block w-full rounded-md border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="ava-email"
                        className="block text-sm font-medium text-slate-700"
                      >
                        E-mail
                      </label>
                      <div className="relative mt-1.5">
                        <Mail
                          className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-slate-400"
                          aria-hidden="true"
                        />
                        <input
                          id="ava-email"
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="nome@instituicao.edu.br"
                          autoComplete="email"
                          className="block w-full rounded-md border border-slate-300 bg-white pl-10 pr-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600"
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="ava-senha"
                        className="block text-sm font-medium text-slate-700"
                      >
                        Senha
                      </label>
                      <div className="relative mt-1.5">
                        <KeyRound
                          className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-slate-400"
                          aria-hidden="true"
                        />
                        <input
                          id="ava-senha"
                          type="password"
                          required
                          value={senha}
                          onChange={(e) => setSenha(e.target.value)}
                          placeholder="Digite sua senha"
                          autoComplete="current-password"
                          className="block w-full rounded-md border border-slate-300 bg-white pl-10 pr-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-md bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60 transition-colors cursor-pointer whitespace-nowrap"
                    >
                      {submitting ? 'Autenticando...' : 'Entrar no AVA'}
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </form>

                  {/* Exibido EXCLUSIVAMENTE quando VITE_USE_MOCK === 'true' */}
                  {USE_MOCK && contasPreview.length > 0 && (
                    <div className="mt-6 border-t border-slate-200 pt-5">
                      <p className="text-xs font-semibold text-slate-700">
                        Contas de teste disponíveis neste ambiente de visualização
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Selecione um perfil para preencher o formulário e testar o portal:
                      </p>
                      <div className="mt-3 divide-y divide-slate-100 rounded-md border border-slate-200">
                        {contasPreview.map((conta) => (
                          <button
                            key={conta.email}
                            type="button"
                            onClick={() => preencherContaPreview(conta)}
                            className="flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left hover:bg-slate-50 transition-colors cursor-pointer"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-slate-900">
                                {conta.nome}
                              </p>
                              <p className="truncate text-xs text-slate-500">
                                {rotuloPapel(conta.papel)}
                                {conta.precisa_vincular
                                  ? ` · 1º acesso (matrícula: ${conta.identificador_dica})`
                                  : ` · ${conta.email}`}
                              </p>
                            </div>
                            <span className="text-xs font-medium text-blue-700 whitespace-nowrap shrink-0">
                              Preencher
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="mb-6">
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-700">
                      <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <h2 className="text-xl font-semibold text-slate-900">
                      Confirmar matrícula (1º acesso)
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">
                      Olá, <span className="font-medium text-slate-900">{nomePendente}</span>. Para
                      vincular sua conta de aluno com segurança, informe seu CPF ou matrícula
                      cadastrada na instituição.
                    </p>
                  </div>

                  {erro && (
                    <div
                      role="alert"
                      className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
                    >
                      {erro}
                    </div>
                  )}

                  <form onSubmit={handleVincularSubmit} className="space-y-4">
                    <div>
                      <label
                        htmlFor="ava-identifier"
                        className="block text-sm font-medium text-slate-700"
                      >
                        CPF ou Matrícula
                      </label>
                      <input
                        id="ava-identifier"
                        type="text"
                        required
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        placeholder="Ex: MAT-20260412 ou 000.000.000-00"
                        className="mt-1.5 block w-full rounded-md border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-mono text-slate-900 placeholder:font-sans placeholder:text-slate-400 focus:border-blue-600"
                      />
                      <p className="mt-1.5 text-xs text-slate-500">
                        Pontos, traços e barras são normalizados automaticamente.
                      </p>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row">
                      <button
                        type="submit"
                        disabled={submitting}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60 transition-colors cursor-pointer whitespace-nowrap"
                      >
                        {submitting ? 'Vinculando...' : 'Vincular e acessar'}
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEtapa('login');
                          setErro(null);
                        }}
                        className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap"
                      >
                        Voltar
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <footer className="mx-auto mt-8 w-full max-w-5xl border-t border-slate-200 pt-4 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-2">
        <span>AVA · Leitor Inteligente</span>
        <span>Acesso autenticado via instituição</span>
      </footer>
    </div>
  );
}

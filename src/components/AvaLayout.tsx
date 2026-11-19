import React, { useMemo, useState } from 'react';
import {
  Award,
  BookOpen,
  Calendar,
  CheckSquare,
  ClipboardList,
  GraduationCap,
  Home,
  LogOut,
  Menu,
  User,
  Users,
  X,
} from 'lucide-react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAva } from '../contexts/AvaContext';
import { rotuloPapel } from '../utils/format';
import { ErrorBanner, LoadingSkeleton } from './StateBlocks';

interface NavItem {
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  end?: boolean;
}

export function AvaLayout() {
  const {
    usuario,
    tenant,
    anoAtual,
    anosDisponiveis,
    selectedAnoId,
    setSelectedAnoId,
    isProfessor,
    isLoading,
    error,
    refreshBootstrap,
    logout,
    buildAvaPath,
  } = useAva();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navItems = useMemo<NavItem[]>(() => {
    const items: NavItem[] = [
      { label: 'Início', to: buildAvaPath(''), icon: Home, end: true },
      { label: 'Módulos', to: buildAvaPath('/modulos'), icon: BookOpen },
    ];

    if (isProfessor) {
      items.push({ label: 'Turmas', to: buildAvaPath('/turmas'), icon: Users });
      items.push({ label: 'Boletins', to: buildAvaPath('/notas'), icon: Award });
    } else {
      items.push({ label: 'Notas', to: buildAvaPath('/notas'), icon: Award });
    }

    items.push(
      { label: 'Avaliações', to: buildAvaPath('/avaliacoes'), icon: ClipboardList },
      { label: 'Frequência', to: buildAvaPath('/frequencia'), icon: CheckSquare },
      { label: 'Calendário', to: buildAvaPath('/calendario'), icon: Calendar },
      { label: 'Perfil', to: buildAvaPath('/perfil'), icon: User },
    );

    return items;
  }, [isProfessor, buildAvaPath]);

  const breadcrumb = useMemo(() => {
    const path = location.pathname;
    if (path.includes('/ava/modulos')) return 'Módulos';
    if (path.includes('/ava/modulo/')) return 'Módulos / Detalhe';
    if (path.includes('/ava/turmas')) return 'Turmas';
    if (path.includes('/ava/turma/')) return 'Turmas / Detalhe';
    if (path.includes('/ava/notas/')) return 'Boletins / Aluno';
    if (path.includes('/ava/notas')) return isProfessor ? 'Boletins' : 'Minhas Notas';
    if (path.includes('/ava/avaliacoes')) return 'Avaliações';
    if (path.includes('/ava/avaliacao/')) return 'Avaliações / Prova';
    if (path.includes('/ava/frequencia')) return 'Frequência';
    if (path.includes('/ava/calendario')) return 'Calendário';
    if (path.includes('/ava/aula/')) return 'Sala ao Vivo';
    if (path.includes('/ava/perfil')) return 'Meu Perfil';
    return 'Painel Inicial';
  }, [location.pathname, isProfessor]);

  const renderNav = (onSelect?: () => void) => (
    <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Navegação principal do AVA">
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onSelect}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-blue-50 text-blue-800'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              }`
            }
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="truncate">{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 border-r border-slate-200 bg-white">
        <div className="flex h-16 items-center gap-2.5 border-b border-slate-200 px-5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-700 text-white">
            <GraduationCap className="h-4 w-4" aria-hidden="true" />
          </div>
          <Link
            to={buildAvaPath('')}
            className="truncate font-semibold tracking-tight text-slate-900 text-base"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {tenant?.nome || 'Portal AVA'}
          </Link>
        </div>

        {renderNav()}

        <div className="border-t border-slate-200 p-4">
          {usuario && (
            <div className="mb-3 px-1">
              <p className="truncate text-sm font-medium text-slate-900">{usuario.nome}</p>
              <p className="truncate text-xs text-slate-500">
                {rotuloPapel(usuario.papel)}
                {usuario.identificador ? ` · ${usuario.identificador}` : ''}
              </p>
            </div>
          )}
          <button
            type="button"
            onClick={() => void logout()}
            className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer whitespace-nowrap"
          >
            <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
            Sair da conta
          </button>
        </div>
      </aside>

      {/* Drawer Mobile */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <aside className="fixed inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-white border-r border-slate-200 shadow-lg">
            <div className="flex h-16 items-center justify-between border-b border-slate-200 px-5">
              <span
                className="truncate font-semibold text-slate-900"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {tenant?.nome || 'Portal AVA'}
              </span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Fechar menu"
                className="flex h-10 w-10 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {renderNav(() => setMobileMenuOpen(false))}
            <div className="border-t border-slate-200 p-4">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  void logout();
                }}
                className="flex w-full items-center gap-2.5 rounded-md px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Sair da conta
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Área Principal */}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Abrir menu de navegação"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex min-w-0 items-center gap-2 text-sm text-slate-500">
              <span className="hidden sm:inline truncate max-w-[180px] text-slate-600">
                {tenant?.nome || 'AVA'}
              </span>
              <span className="hidden sm:inline text-slate-300" aria-hidden="true">
                /
              </span>
              <span className="truncate font-medium text-slate-900">{breadcrumb}</span>
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            {anosDisponiveis.length > 0 && (
              <div className="flex items-center gap-2">
                <label
                  htmlFor="seletor-ano-letivo"
                  className="hidden sm:inline text-xs font-medium text-slate-500 whitespace-nowrap"
                >
                  Ano letivo
                </label>
                <select
                  id="seletor-ano-letivo"
                  value={selectedAnoId ?? anoAtual?.id ?? ''}
                  onChange={(e) => setSelectedAnoId(e.target.value)}
                  className="h-9 rounded-md border border-slate-200 bg-white px-2.5 text-sm font-medium text-slate-900 tabular-nums hover:border-slate-300 cursor-pointer"
                >
                  {anosDisponiveis.map((ano) => (
                    <option key={ano.id} value={ano.id}>
                      {ano.label}
                      {ano.atual ? ' (Atual)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {usuario && (
              <Link
                to={buildAvaPath('/perfil')}
                className="hidden md:flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-blue-700 transition-colors whitespace-nowrap shrink-0"
              >
                <span className="max-w-[160px] truncate">{usuario.nome}</span>
              </Link>
            )}
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {isLoading && !usuario ? (
            <LoadingSkeleton />
          ) : error && !usuario ? (
            <ErrorBanner error={error} onRetry={() => void refreshBootstrap()} />
          ) : (
            <Outlet />
          )}
        </main>
      </div>
    </div>
  );
}

import React from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { AvaLayout } from './components/AvaLayout';
import { AvaProvider, useAva } from './contexts/AvaContext';
import { AulaPage } from './pages/AulaPage';
import { AvaliacaoDetalhePage } from './pages/AvaliacaoDetalhePage';
import { AvaliacoesPage } from './pages/AvaliacoesPage';
import { CalendarioPage } from './pages/CalendarioPage';
import { DashboardPage } from './pages/DashboardPage';
import { FrequenciaPage } from './pages/FrequenciaPage';
import { LoginPage } from './pages/LoginPage';
import { ModuloDetalhePage } from './pages/ModuloDetalhePage';
import { ModulosPage } from './pages/ModulosPage';
import { NotaAlunoDetalhePage } from './pages/NotaAlunoDetalhePage';
import { NotasPage } from './pages/NotasPage';
import { PerfilPage } from './pages/PerfilPage';
import { TurmaDetalhePage } from './pages/TurmaDetalhePage';
import { TurmasPage } from './pages/TurmasPage';

function AvaScopeWrapper() {
  return (
    <AvaProvider>
      <Outlet />
    </AvaProvider>
  );
}

function RequireAuth() {
  const { token, usuario, buildAvaPath } = useAva();
  if (!token || usuario?.precisa_vincular) {
    return <Navigate to={buildAvaPath('/entrar')} replace />;
  }
  return <AvaLayout />;
}

function PublicOnlyLogin() {
  const { token, usuario, buildAvaPath } = useAva();
  if (token && usuario && !usuario.precisa_vincular) {
    return <Navigate to={buildAvaPath('')} replace />;
  }
  return <LoginPage />;
}

/**
 * Mapa completo de rotas da Seção 4.3 do PRD, suportando tanto:
 * - Multi-tenant por slug: /t/:slug/ava/*
 * - Raiz direta com query opcional (?tenant=slug): /ava/*
 */
function renderAvaChildRoutes() {
  return (
    <>
      <Route path="entrar" element={<PublicOnlyLogin />} />
      <Route element={<RequireAuth />}>
        <Route index element={<DashboardPage />} />
        <Route path="modulos" element={<ModulosPage />} />
        <Route path="modulo/:id" element={<ModuloDetalhePage />} />
        <Route path="notas" element={<NotasPage />} />
        <Route path="notas/:alunoId" element={<NotaAlunoDetalhePage />} />
        <Route path="avaliacoes" element={<AvaliacoesPage />} />
        <Route path="avaliacao/:id" element={<AvaliacaoDetalhePage />} />
        <Route path="calendario" element={<CalendarioPage />} />
        <Route path="frequencia" element={<FrequenciaPage />} />
        <Route path="turmas" element={<TurmasPage />} />
        <Route path="turma/:id" element={<TurmaDetalhePage />} />
        <Route path="aula/:roomId" element={<AulaPage />} />
        <Route path="perfil" element={<PerfilPage />} />
      </Route>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Multi-tenant explícito por slug: /t/:slug/ava/* */}
        <Route path="/t/:slug/ava" element={<AvaScopeWrapper />}>
          {renderAvaChildRoutes()}
        </Route>

        {/* Rotas diretas /ava/* (compatível com ?tenant=slug) */}
        <Route path="/ava" element={<AvaScopeWrapper />}>
          {renderAvaChildRoutes()}
        </Route>

        {/* Redirecionamento padrão */}
        <Route path="/t/:slug" element={<Navigate to="ava" replace />} />
        <Route path="/" element={<Navigate to="/t/faculdade-js/ava" replace />} />
        <Route path="*" element={<Navigate to="/t/faculdade-js/ava" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

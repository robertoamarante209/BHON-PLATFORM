import React, { Suspense, lazy } from 'react';
import { Route, Switch, Redirect } from 'wouter';
import { AuthProvider, useAuth } from './context/AuthContext';

// Layouts
import { ClinicLayout } from './components/shell/ClinicLayout';
import { PlatformLayout } from './components/shell/PlatformLayout';

// Páginas de Autenticação
import { LoginPage } from './pages/login/LoginPage';

// Cada área é carregada somente quando aberta, mantendo a entrada leve.
const OverviewPage = lazy(() => import('./pages/clinic/OverviewPage').then((module) => ({ default: module.OverviewPage })));
const AgendaPage = lazy(() => import('./pages/clinic/AgendaPage').then((module) => ({ default: module.AgendaPage })));
const PatientsPage = lazy(() => import('./pages/clinic/PatientsPage').then((module) => ({ default: module.PatientsPage })));
const PatientDetailPage = lazy(() => import('./pages/clinic/PatientDetailPage').then((module) => ({ default: module.PatientDetailPage })));
const TreatmentsPage = lazy(() => import('./pages/clinic/TreatmentsPage').then((module) => ({ default: module.TreatmentsPage })));
const OpportunitiesPage = lazy(() => import('./pages/clinic/OpportunitiesPage').then((module) => ({ default: module.OpportunitiesPage })));
const FollowUpsPage = lazy(() => import('./pages/clinic/FollowUpsPage').then((module) => ({ default: module.FollowUpsPage })));
const BudgetsPage = lazy(() => import('./pages/clinic/BudgetsPage').then((module) => ({ default: module.BudgetsPage })));
const FinancePage = lazy(() => import('./pages/clinic/FinancePage').then((module) => ({ default: module.FinancePage })));
const TeamPage = lazy(() => import('./pages/clinic/TeamPage').then((module) => ({ default: module.TeamPage })));
const IndicatorsPage = lazy(() => import('./pages/clinic/IndicatorsPage').then((module) => ({ default: module.IndicatorsPage })));
const SettingsPage = lazy(() => import('./pages/clinic/SettingsPage').then((module) => ({ default: module.SettingsPage })));

const PlatformUnavailablePage = lazy(() => import('./pages/platform/PlatformUnavailablePage').then((module) => ({ default: module.PlatformUnavailablePage })));

const RouteLoading: React.FC = () => (
  <div role="status" className="flex min-h-64 items-center justify-center">
    <div className="flex flex-col items-center gap-3 text-center">
      <div aria-hidden="true" className="h-8 w-8 animate-spin rounded-full border-2 border-bhon-teal border-t-transparent" />
      <span className="text-sm font-medium text-bhon-muted">Preparando seu ambiente…</span>
    </div>
  </div>
);

// ============================================================
// Guard: redireciona para /login se não autenticado
// ============================================================
const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoadingAuth } = useAuth();

  if (isLoadingAuth) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#F8FAFB]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#13AA99] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-[#687386] font-medium">Verificando sessão…</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  return <>{children}</>;
};

const RequireRole: React.FC<{ role: 'PLATFORM_OWNER' | 'CLINIC_USER'; children: React.ReactNode }> = ({ role, children }) => {
  const { currentUser } = useAuth();
  const isPlatform = currentUser.role === 'PLATFORM_OWNER';
  if (role === 'PLATFORM_OWNER' && !isPlatform) return <Redirect to="/clinic/overview" />;
  if (role === 'CLINIC_USER' && isPlatform) return <Redirect to="/platform/overview" />;
  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  return (
    <Switch>
      {/* Rota Raiz e Login */}
      <Route path="/">
        <Redirect to="/login" />
      </Route>
      <Route path="/login" component={LoginPage} />

      {/* Rotas do Ambiente Clínico (/clinic/*) */}
      <Route path="/clinic/:rest*">
        <RequireAuth>
          <RequireRole role="CLINIC_USER">
            <ClinicLayout>
            <Suspense fallback={<RouteLoading />}>
            <div className="bhon-page-enter">
            <Switch>
              <Route path="/clinic/overview" component={OverviewPage} />
              <Route path="/clinic/agenda" component={AgendaPage} />
              <Route path="/clinic/patients" component={PatientsPage} />
              <Route path="/clinic/patients/:id" component={PatientDetailPage} />
              <Route path="/clinic/treatments" component={TreatmentsPage} />
              <Route path="/clinic/opportunities" component={OpportunitiesPage} />
              <Route path="/clinic/follow-ups" component={FollowUpsPage} />
              <Route path="/clinic/budgets" component={BudgetsPage} />
              <Route path="/clinic/finance" component={FinancePage} />
              <Route path="/clinic/team" component={TeamPage} />
              <Route path="/clinic/indicators" component={IndicatorsPage} />
              <Route path="/clinic/settings" component={SettingsPage} />
              <Route>
                <Redirect to="/clinic/overview" />
              </Route>
            </Switch>
            </div>
            </Suspense>
          </ClinicLayout>
          </RequireRole>
        </RequireAuth>
      </Route>

      {/* Rotas do Mantenedor da Plataforma (/platform/*) */}
      <Route path="/platform/:rest*">
        <RequireAuth>
          <RequireRole role="PLATFORM_OWNER">
            <PlatformLayout>
            <Suspense fallback={<RouteLoading />}>
            <div className="bhon-page-enter">
            <Switch>
              <Route path="/platform/overview"><PlatformUnavailablePage title="Visão Geral" description="Painel executivo de operação, clientes e saúde da plataforma BHON." /></Route>
              <Route path="/platform/clinics/:id"><PlatformUnavailablePage title="Dossiê da Clínica" description="Visão administrativa detalhada de uma clínica da plataforma." /></Route>
              <Route path="/platform/clinics"><PlatformUnavailablePage title="Clínicas" description="Gestão de clínicas, contratos e situação operacional." /></Route>
              <Route path="/platform/subscriptions"><PlatformUnavailablePage title="Assinaturas" description="Planos, limites e ciclo de vida das assinaturas." /></Route>
              <Route path="/platform/billing"><PlatformUnavailablePage title="Faturamento" description="Cobranças e conciliação das assinaturas da plataforma." /></Route>
              <Route path="/platform/revenue"><PlatformUnavailablePage title="Receita" description="Indicadores financeiros consolidados da BHON." /></Route>
              <Route path="/platform/customers"><PlatformUnavailablePage title="Clientes" description="Relacionamento e sucesso das clínicas atendidas." /></Route>
              <Route path="/platform/users"><PlatformUnavailablePage title="Usuários" description="Administração dos acessos internos à plataforma." /></Route>
              <Route path="/platform/support"><PlatformUnavailablePage title="Suporte" description="Fila de atendimento e acompanhamento técnico das clínicas." /></Route>
              <Route path="/platform/indicators"><PlatformUnavailablePage title="Indicadores" description="Métricas consolidadas de produto e operação da plataforma." /></Route>
              <Route path="/platform/settings"><PlatformUnavailablePage title="Configurações" description="Parâmetros administrativos e políticas globais da BHON." /></Route>
              <Route>
                <Redirect to="/platform/overview" />
              </Route>
            </Switch>
            </div>
            </Suspense>
          </PlatformLayout>
          </RequireRole>
        </RequireAuth>
      </Route>

      {/* Rota Padrão de Fallback */}
      <Route>
        <Redirect to="/login" />
      </Route>
    </Switch>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
};

export default App;

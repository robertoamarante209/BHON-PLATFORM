import React from 'react';
import { Route, Switch, Redirect } from 'wouter';
import { AuthProvider, useAuth } from './context/AuthContext';
import { OperationalDataProvider } from './context/OperationalDataContext';

// Layouts
import { ClinicLayout } from './components/shell/ClinicLayout';
import { PlatformLayout } from './components/shell/PlatformLayout';

// Páginas de Autenticação
import { LoginPage } from './pages/login/LoginPage';

// Páginas da Clínica
import { OverviewPage } from './pages/clinic/OverviewPage';
import { AgendaPage } from './pages/clinic/AgendaPage';
import { PatientsPage } from './pages/clinic/PatientsPage';
import { PatientDetailPage } from './pages/clinic/PatientDetailPage';
import { TreatmentsPage } from './pages/clinic/TreatmentsPage';
import { OpportunitiesPage } from './pages/clinic/OpportunitiesPage';
import { FollowUpsPage } from './pages/clinic/FollowUpsPage';
import { BudgetsPage } from './pages/clinic/BudgetsPage';
import { FinancePage } from './pages/clinic/FinancePage';
import { TeamPage } from './pages/clinic/TeamPage';
import { IndicatorsPage } from './pages/clinic/IndicatorsPage';
import { SettingsPage } from './pages/clinic/SettingsPage';

// Páginas da Plataforma (Platform Owner)
import { PlatformOverviewPage } from './pages/platform/PlatformOverviewPage';
import { PlatformClinicsPage } from './pages/platform/PlatformClinicsPage';
import { PlatformClinicDetailPage } from './pages/platform/PlatformClinicDetailPage';
import { PlatformSubscriptionsPage } from './pages/platform/PlatformSubscriptionsPage';
import { PlatformBillingPage } from './pages/platform/PlatformBillingPage';
import { PlatformRevenuePage } from './pages/platform/PlatformRevenuePage';
import { PlatformCustomersPage } from './pages/platform/PlatformCustomersPage';
import { PlatformUsersPage } from './pages/platform/PlatformUsersPage';
import { PlatformSupportPage } from './pages/platform/PlatformSupportPage';
import { PlatformIndicatorsPage } from './pages/platform/PlatformIndicatorsPage';
import { PlatformSettingsPage } from './pages/platform/PlatformSettingsPage';

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
          </ClinicLayout>
          </RequireRole>
        </RequireAuth>
      </Route>

      {/* Rotas do Mantenedor da Plataforma (/platform/*) */}
      <Route path="/platform/:rest*">
        <RequireAuth>
          <RequireRole role="PLATFORM_OWNER">
            <PlatformLayout>
            <Switch>
              <Route path="/platform/overview" component={PlatformOverviewPage} />
              <Route path="/platform/clinics" component={PlatformClinicsPage} />
              <Route path="/platform/clinics/:id" component={PlatformClinicDetailPage} />
              <Route path="/platform/subscriptions" component={PlatformSubscriptionsPage} />
              <Route path="/platform/billing" component={PlatformBillingPage} />
              <Route path="/platform/revenue" component={PlatformRevenuePage} />
              <Route path="/platform/customers" component={PlatformCustomersPage} />
              <Route path="/platform/users" component={PlatformUsersPage} />
              <Route path="/platform/support" component={PlatformSupportPage} />
              <Route path="/platform/indicators" component={PlatformIndicatorsPage} />
              <Route path="/platform/settings" component={PlatformSettingsPage} />
              <Route>
                <Redirect to="/platform/overview" />
              </Route>
            </Switch>
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
      <OperationalDataProvider>
        <AppRoutes />
      </OperationalDataProvider>
    </AuthProvider>
  );
};

export default App;

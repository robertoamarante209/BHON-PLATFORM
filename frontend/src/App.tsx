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

const AppRoutes: React.FC = () => {
  const { currentUser } = useAuth();

  return (
    <Switch>
      {/* Rota Raiz e Login */}
      <Route path="/">
        <Redirect to="/login" />
      </Route>
      <Route path="/login" component={LoginPage} />

      {/* Rotas do Ambiente Clínico (/clinic/*) */}
      <Route path="/clinic/:rest*">
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
      </Route>

      {/* Rotas do Mantenedor da Plataforma (/platform/*) */}
      <Route path="/platform/:rest*">
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

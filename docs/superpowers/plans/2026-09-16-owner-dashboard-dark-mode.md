# Modo escuro clínico e central Owner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir alternância clara/escura persistente para a clínica e disponibilizar as áreas reais de gestão para o Owner.

**Architecture:** Um `ThemeProvider` independente controla a preferência local e fornece `theme`/`toggleTheme` ao `ClinicLayout`. O Owner mantém `bhon-dark-theme`; o roteador passa a montar os componentes Owner existentes, que já usam o `OperationalDataProvider` raiz.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Vitest, Testing Library e Wouter.

**Spec:** `docs/superpowers/specs/2026-09-16-owner-dashboard-dark-mode-design.md`

## Global Constraints

- Não incluir `.env` nem alterar variáveis de produção.
- Preferência de tema é local ao navegador e nunca chama a API.
- Preservar `prefers-reduced-motion`, foco visível e contraste.
- Não apresentar dados locais do Owner como integrações externas concluídas.

---

### Task 1: Preferência de tema clínico

**Files:**
- Create: `frontend/src/context/ThemeContext.tsx`
- Create: `frontend/src/context/ThemeContext.test.tsx`
- Modify: `frontend/src/App.tsx`

**Interfaces:**
- Produces: `ThemeProvider`, `useTheme`, `ThemeMode = 'light' | 'dark'`.
- Consumes: React context and `localStorage` key `bhon-clinic-theme`.

- [ ] **Step 1: Write the failing test**

```tsx
render(<ThemeProvider><Probe /></ThemeProvider>);
expect(screen.getByText('light')).toBeVisible();
fireEvent.click(screen.getByRole('button', { name: 'Alternar tema' }));
expect(screen.getByText('dark')).toBeVisible();
expect(localStorage.getItem('bhon-clinic-theme')).toBe('dark');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node node_modules\\vitest\\vitest.mjs run src\\context\\ThemeContext.test.tsx --reporter=verbose --no-file-parallelism`

Expected: FAIL because `ThemeProvider` does not exist.

- [ ] **Step 3: Write minimal implementation**

```tsx
export type ThemeMode = 'light' | 'dark';
const ThemeContext = createContext<{ theme: ThemeMode; toggleTheme: () => void } | null>(null);
export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setTheme] = useState<ThemeMode>(() => localStorage.getItem('bhon-clinic-theme') === 'dark' ? 'dark' : 'light');
  const toggleTheme = () => setTheme((current) => current === 'light' ? 'dark' : 'light');
  useEffect(() => localStorage.setItem('bhon-clinic-theme', theme), [theme]);
  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node node_modules\\vitest\\vitest.mjs run src\\context\\ThemeContext.test.tsx --reporter=verbose --no-file-parallelism`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add frontend/src/context/ThemeContext.tsx frontend/src/context/ThemeContext.test.tsx frontend/src/App.tsx
git commit -m "feat: persist clinic theme preference"
```

### Task 2: Aplicar tema e alternância acessível

**Files:**
- Modify: `frontend/src/components/shell/ClinicLayout.tsx`
- Modify: `frontend/src/components/shell/TopHeader.tsx`
- Modify: `frontend/src/components/shell/TopHeader.test.tsx`
- Modify: `frontend/src/index.css`

**Interfaces:**
- Consumes: `useTheme(): { theme: ThemeMode; toggleTheme(): void }`.
- Produces: classe `bhon-clinic-theme--dark` e botão `Alternar para tema escuro/claro`.

- [ ] **Step 1: Write the failing test**

```tsx
render(<ThemeProvider><TopHeader /></ThemeProvider>);
const button = screen.getByRole('button', { name: 'Alternar para tema escuro' });
fireEvent.click(button);
expect(screen.getByRole('button', { name: 'Alternar para tema claro' })).toBeVisible();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node node_modules\\vitest\\vitest.mjs run src\\components\\shell\\TopHeader.test.tsx --reporter=verbose --no-file-parallelism`

Expected: FAIL because the control does not exist.

- [ ] **Step 3: Write minimal implementation**

```tsx
const { theme, toggleTheme } = useTheme();
<button type="button" onClick={toggleTheme} aria-label={theme === 'light' ? 'Alternar para tema escuro' : 'Alternar para tema claro'}>
  {theme === 'light' ? <Moon /> : <Sun />}
</button>
```

```css
.bhon-clinic-theme--dark {
  --color-bg: #101817;
  --color-surface: #16211F;
  --color-text: #EDF5F1;
  --color-muted: #A7B8B2;
  --color-border: #2B3B37;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node node_modules\\vitest\\vitest.mjs run src\\components\\shell\\ClinicLayout.test.tsx src\\components\\shell\\TopHeader.test.tsx --reporter=verbose --no-file-parallelism`

Expected: PASS, with no missing provider error.

- [ ] **Step 5: Commit**

```powershell
git add frontend/src/components/shell/ClinicLayout.tsx frontend/src/components/shell/TopHeader.tsx frontend/src/components/shell/TopHeader.test.tsx frontend/src/index.css
git commit -m "feat: add accessible clinic dark mode"
```

### Task 3: Conectar as áreas Owner existentes

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/App.test.tsx`

**Interfaces:**
- Consumes: os exports `PlatformClinicsPage`, `PlatformClinicDetailPage`, `PlatformSubscriptionsPage`, `PlatformBillingPage`, `PlatformRevenuePage`, `PlatformCustomersPage`, `PlatformUsersPage`, `PlatformSupportPage`, `PlatformIndicatorsPage`, `PlatformSettingsPage` e `PlatformIntegrationsPage`.
- Produces: rotas Owner funcionais sob `/platform/*`.

- [ ] **Step 1: Write the failing route test**

```tsx
window.history.replaceState(null, '', '/platform/clinics');
render(<App />);
expect(await screen.findByRole('heading', { name: /clínicas/i })).toBeVisible();
expect(screen.queryByText('Esta área estará disponível em breve.')).not.toBeInTheDocument();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node node_modules\\vitest\\vitest.mjs run src\\App.test.tsx --reporter=verbose --no-file-parallelism`

Expected: FAIL because the route renders `PlatformUnavailablePage`.

- [ ] **Step 3: Write minimal implementation**

```tsx
const PlatformClinicsPage = lazy(() => import('./pages/platform/PlatformClinicsPage').then((module) => ({ default: module.PlatformClinicsPage })));
// Repeat the lazy import pattern for each existing Owner page.
<Route path="/platform/clinics" component={PlatformClinicsPage} />
```

- [ ] **Step 4: Run route and role regression tests**

Run: `node node_modules\\vitest\\vitest.mjs run src\\App.test.tsx src\\pages\\platform\\PlatformOverviewPage.test.tsx --reporter=verbose --no-file-parallelism`

Expected: PASS; user clínico permanece redirecionado e Owner enxerga a página real.

- [ ] **Step 5: Commit**

```powershell
git add frontend/src/App.tsx frontend/src/App.test.tsx
git commit -m "feat: expose owner management workspaces"
```

### Task 4: Validação e publicação

**Files:**
- Modify: nenhum, salvo correções necessárias originadas pelos testes.

- [ ] **Step 1: Executar regressão e build**

Run:

```powershell
node node_modules\\vitest\\vitest.mjs run --reporter=verbose --no-file-parallelism
npm run build
```

Expected: toda a suíte e TypeScript/Vite passam.

- [ ] **Step 2: Validar layouts e acessibilidade**

Verificar em 390 px, 768 px e desktop: botão de tema focável, nenhuma rolagem horizontal causada pelo cabeçalho, contraste de texto/campo e páginas Owner sem placeholder.

- [ ] **Step 3: Publicar preview e produção**

```powershell
git push origin codex/clinic-stability
git push origin codex/clinic-stability:main
```

Expected: preview Ready antes do push para `main`; produção Ready depois do push.

- [ ] **Step 4: Confirmar repositório limpo**

Run: `git status --short`

Expected: saída vazia e nenhum arquivo `.env` rastreado.

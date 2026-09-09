# BHON Final Visual Identity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aplicar a identidade escura final da BHON ao login, shell, dashboard e telas clínicas sem alterar dados ou regras operacionais.

**Architecture:** A identidade será centralizada em tokens Tailwind/CSS e aplicada pelo `ClinicLayout`, permitindo que componentes existentes herdem o tema. Login, navegação e overview recebem composições próprias; páginas internas preservam estrutura e contratos, mas passam a usar as novas superfícies e estados.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Wouter, Lucide, Vitest, Testing Library, Vite.

**Spec:** `docs/superpowers/specs/2026-09-09-identidade-visual-final-design.md`

## Global Constraints

- Paleta: carvão `#0F1115`, superfície `#181A1F`, teal `#00B894`, off-white `#F8F9F7`, cinza `#6B7280` e borda `#2A2D32`.
- Manrope em toda a interface e teal somente em seleção, ação, progresso e estados positivos.
- Nenhum contrato de API, regra clínica, autenticação, permissão ou dado real será alterado.
- Nenhum dado demonstrativo será criado.
- Movimento entre 180 e 320 ms, somente opacidade e transformação, respeitando `prefers-reduced-motion`.
- Layout validado em 375, 768, 1366 e 1920 px.

---

### Task 1: Ativos oficiais e tokens de marca

**Files:**
- Create: `frontend/public/logo-bhon-dark.png`
- Create: `frontend/public/logo-bhon-light.png`
- Create: `frontend/public/bhon-symbol.png`
- Modify: `frontend/tailwind.config.js`
- Modify: `frontend/src/index.css`
- Test: `frontend/src/pages/login/LoginPage.test.tsx`

**Interfaces:**
- Consumes: imagens oficiais fornecidas pelo proprietário.
- Produces: `/logo-bhon-dark.png`, `/logo-bhon-light.png`, `/bhon-symbol.png` e classes `.bhon-dark-theme`, `.bhon-page-enter`, `.bhon-card-enter`.

- [ ] **Step 1: Preserve the failing asset assertion**

```tsx
expect(screen.getByRole('img', { name: 'BHON' })).toHaveAttribute('src', '/logo-bhon-light.png');
```

- [ ] **Step 2: Verify the assertion fails against the old asset**

Run: `npm test -- src/pages/login/LoginPage.test.tsx --pool=threads --maxWorkers=1`
Expected: FAIL because the current logo is `/logo-official.jpg`.

- [ ] **Step 3: Create and inspect the three production assets**

Use the supplied new logo as the identity source. Preserve symbol geometry and exact text. Export transparent PNGs with tight padding; the light lockup uses off-white wordmark, the dark lockup uses charcoal wordmark, and the symbol contains no text.

- [ ] **Step 4: Set the shared palette**

```js
bhon: {
  navy: '#0F1115', teal: '#00B894', bg: '#0F1115', surface: '#181A1F',
  text: '#F8F9F7', muted: '#9CA3AF', border: '#2A2D32'
}
```

- [ ] **Step 5: Add scoped dark-surface rules and motion primitives**

```css
.bhon-dark-theme { color-scheme: dark; background: #0F1115; color: #F8F9F7; }
.bhon-card-enter { animation: bhon-card-enter 280ms cubic-bezier(.22,1,.36,1) both; }
@keyframes bhon-card-enter { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
```

- [ ] **Step 6: Commit**

```bash
git add frontend/public frontend/tailwind.config.js frontend/src/index.css frontend/src/pages/login/LoginPage.test.tsx
git commit -m "design: aplicar fundamentos visuais finais da bhon"
```

### Task 2: Login escuro animado e minimalista

**Files:**
- Modify: `frontend/src/pages/login/LoginPage.tsx`
- Modify: `frontend/src/pages/login/LoginPage.test.tsx`

**Interfaces:**
- Consumes: `useAuth().login(email, password, rememberMe)` e `/logo-bhon-light.png`.
- Produces: tela única de autenticação com os mesmos redirecionamentos por papel.

- [ ] **Step 1: Write minimal-content assertions**

```tsx
expect(screen.getByRole('heading', { name: /acesse sua clínica/i })).toBeVisible();
expect(screen.queryByText(/agenda coordenada|acesso protegido|seu acesso é individual/i)).not.toBeInTheDocument();
```

- [ ] **Step 2: Run and verify RED**

Run: `npm test -- src/pages/login/LoginPage.test.tsx --pool=threads --maxWorkers=1`
Expected: FAIL because the prior editorial content remains.

- [ ] **Step 3: Implement the single centered login**

Render the light logo, one heading, two labelled fields, remember checkbox, error alert and submit button. Keep the existing `handleSubmit`, `login` arguments and role redirects unchanged. Use two blurred teal ambient shapes and CSS-only entrance animations.

- [ ] **Step 4: Verify GREEN**

Run: `npm test -- src/pages/login/LoginPage.test.tsx --pool=threads --maxWorkers=1`
Expected: 3 tests PASS with no console warnings.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/login/LoginPage.tsx frontend/src/pages/login/LoginPage.test.tsx
git commit -m "design: criar login escuro e minimalista"
```

### Task 3: Shell compacto inspirado no ritmo do Runey

**Files:**
- Modify: `frontend/src/components/shell/ClinicLayout.tsx`
- Modify: `frontend/src/components/shell/Sidebar.tsx`
- Modify: `frontend/src/components/shell/TopHeader.tsx`
- Create: `frontend/src/components/shell/ClinicShell.test.tsx`

**Interfaces:**
- Consumes: `useAuth()` e rotas clínicas existentes.
- Produces: navegação desktop compacta, navegação mobile e cabeçalho preservando todas as rotas.

- [ ] **Step 1: Write the shell route test**

```tsx
for (const name of ['Visão do dia', 'Agenda clínica', 'Pacientes', 'Tratamentos']) {
  expect(screen.getByRole('link', { name })).toBeInTheDocument();
}
expect(screen.getByRole('button', { name: /sair/i })).toBeInTheDocument();
```

- [ ] **Step 2: Run and verify RED for the new symbol contract**

Add `expect(screen.getByRole('img', { name: 'BHON' })).toHaveAttribute('src', '/bhon-symbol.png')` and run the file. Expected: FAIL on the old lockup.

- [ ] **Step 3: Implement the compact rail and dark layout**

Use a 76 px rail on desktop, icon links with accessible names/tooltips, teal active state, quiet top header, and the existing four-item mobile navigation. Wrap content in `.bhon-dark-theme`.

- [ ] **Step 4: Verify GREEN**

Run: `npm test -- src/components/shell/ClinicShell.test.tsx --pool=threads --maxWorkers=1`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/shell
git commit -m "design: compactar shell clínico da bhon"
```

### Task 4: Dashboard clínico final

**Files:**
- Modify: `frontend/src/pages/clinic/OverviewPage.tsx`
- Modify: `frontend/src/pages/clinic/OverviewPage.test.tsx`
- Modify: `frontend/src/components/common/MetricCard.tsx`
- Modify: `frontend/src/components/recovery/RecoveryQueue.tsx`

**Interfaces:**
- Consumes: `listAppointments`, `getSchedulingResources`, `updateAppointmentStatus`, `rescheduleAppointment`.
- Produces: KPIs, próximo atendimento, agenda do dia e fila de acompanhamento usando somente dados dessas APIs.

- [ ] **Step 1: Add dashboard semantics assertions**

```tsx
expect(await screen.findByRole('heading', { name: /bom dia|visão do dia/i })).toBeVisible();
expect(screen.getByRole('region', { name: /indicadores do dia/i })).toBeInTheDocument();
expect(screen.getByRole('table', { name: /agenda do dia/i })).toBeInTheDocument();
```

- [ ] **Step 2: Run and verify RED**

Run: `npm test -- src/pages/clinic/OverviewPage.test.tsx --pool=threads --maxWorkers=1`
Expected: FAIL because the existing regions do not expose those names.

- [ ] **Step 3: Recompose the overview without changing data flow**

Create a compact greeting row, five KPI cards, a wide operational panel and an agenda panel. Keep loading, empty and error states. Remove click-only table rows; open commands with the explicit `Comando` button.

- [ ] **Step 4: Verify GREEN**

Run: `npm test -- src/pages/clinic/OverviewPage.test.tsx --pool=threads --maxWorkers=1`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/clinic/OverviewPage.tsx frontend/src/pages/clinic/OverviewPage.test.tsx frontend/src/components/common/MetricCard.tsx frontend/src/components/recovery/RecoveryQueue.tsx
git commit -m "design: finalizar dashboard clínico escuro"
```

### Task 5: Consistência das telas internas e publicação

**Files:**
- Modify: `frontend/src/index.css`
- Modify: `frontend/src/components/common/Drawer.tsx`
- Modify: `frontend/src/components/common/ConfirmationDialog.tsx`
- Modify: `frontend/src/components/common/StatusBadge.tsx`
- Modify: `frontend/src/pages/clinic/*.tsx`
- Test: `frontend/src/pages/clinic/LegacyTablesAccessibility.test.tsx`

**Interfaces:**
- Consumes: `.bhon-dark-theme` e componentes clínicos existentes.
- Produces: todas as áreas clínicas com superfícies, tabelas, formulários e estados coerentes.

- [ ] **Step 1: Extend accessibility coverage**

Keep the existing explicit-action table tests and add a render check for dark-theme-safe dialogs. The mutation caught is a return to click-only rows or inaccessible dialog controls.

- [ ] **Step 2: Run the focused tests before styling**

Run: `npm test -- src/pages/clinic/LegacyTablesAccessibility.test.tsx --pool=threads --maxWorkers=1`
Expected: current tests PASS; new dialog assertion FAIL until common surfaces are updated.

- [ ] **Step 3: Apply the shared surfaces**

Replace unscoped white/slate surfaces in common controls with brand surface classes. Keep semantic status colors distinguishable. Do not alter API calls, mutations, table columns or form fields.

- [ ] **Step 4: Run all verification**

```bash
cd frontend && npm test -- --pool=threads --maxWorkers=1
npm run build
cd ../backend && npm test
git diff --check
```

Expected: frontend and backend suites PASS, production build succeeds, no whitespace errors.

- [ ] **Step 5: Inspect responsive production behavior**

Verify login and authenticated overview at 375, 768, 1366 and 1920 px. Confirm no horizontal overflow, visible focus, reduced motion, readable contrast and explicit actions.

- [ ] **Step 6: Commit and push**

```bash
git add frontend
git commit -m "design: harmonizar telas clínicas com a nova identidade"
git push origin main
```

- [ ] **Step 7: Confirm Vercel**

Confirm the newest production deployment is `Ready` and validate `https://www.bhonapp.com.br/login` without cached assets.

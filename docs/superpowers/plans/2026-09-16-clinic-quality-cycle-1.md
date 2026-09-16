# BHON Clinic Quality Cycle 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Validate the daily clinical and Owner journeys, make dark mode consistently readable across dashboards, render status-aware appointment cards, and provide reviewed WhatsApp copy for clinical follow-up.

**Architecture:** Keep `OperationalDataContext` as the temporary in-app operation store and add focused presentation helpers rather than duplicating status and message rules in pages. The `ThemeContext` remains the persisted clinical theme authority; CSS semantic tokens override legacy utility colors only within the clinic workspace. Journey tests exercise the routed application with a mocked session and seed data.

**Tech Stack:** React, TypeScript, Wouter, Tailwind CSS, Vitest, Testing Library, Lucide.

**Spec:** `docs/superpowers/specs/2026-09-16-clinic-quality-and-operations-design.md`

## Global Constraints

- Do not commit `.env`, credentials, patient exports, or third-party access tokens.
- Theme preference remains in `localStorage` key `bhon-clinic-theme`.
- Status colors supplement visible text and never convey meaning by color alone.
- WhatsApp sends remain user-reviewed deep links; no automatic outbound messaging is introduced.
- Preserve tenant and Owner authorization boundaries; UI visibility is not authorization.
- Run targeted tests, full frontend suite, `npm run build`, preview deployment, production deployment, and post-deploy smoke checks before claiming release.

---

### Task 1: Establish a repeatable journey audit baseline

**Files:**
- Create: `docs/qa/clinic-owner-journey-matrix.md`
- Modify: `frontend/src/App.test.tsx`
- Test: `frontend/src/App.test.tsx`

**Interfaces:**
- Consumes: `App`, existing session endpoint `/api/auth/me`, and routed pages.
- Produces: documented scenario IDs `CLINIC-*` and `OWNER-*`; route regression coverage for protected screens.

- [ ] **Step 1: Write failing route coverage for clinical and Owner destinations**

```tsx
it.each([
  ['/clinic/agenda', 'Agenda clínica'],
  ['/clinic/patients', 'Pacientes'],
  ['/clinic/follow-ups', 'Recuperação'],
  ['/platform/clinics', 'Gestão Global de Clínicas'],
  ['/platform/support', 'Central de Suporte'],
])('renders %s without a recovery reset', async (path, heading) => {
  window.history.replaceState(null, '', path);
  mockAuthenticatedUser();
  render(<App />);
  expect(await screen.findByRole('heading', { name: heading })).toBeVisible();
});
```

- [ ] **Step 2: Run the test to verify the current gaps**

Run: `node node_modules\\vitest\\vitest.mjs run src\\App.test.tsx --reporter=verbose --no-file-parallelism`

Expected: failures identify routes whose visible heading or protected-session behavior does not match the journey contract.

- [ ] **Step 3: Correct only the route/session causes revealed by the tests**

Keep explicit routes before collection routes, retain the application’s recoverable session state, and avoid redirecting users to `/clinic/overview` when a child route is valid.

- [ ] **Step 4: Add the manual matrix**

Create a table with ID, role, precondition, action, expected result, automated test, and status for login/logout, sidebar, overview, agenda CRUD/status, dossier, patients, recovery, budgets, team, settings, Owner clinics, billing, support, indicators, and mobile navigation.

- [ ] **Step 5: Verify and commit**

Run: `node node_modules\\vitest\\vitest.mjs run src\\App.test.tsx --reporter=verbose --no-file-parallelism`

Expected: PASS.

```bash
git add frontend/src/App.test.tsx docs/qa/clinic-owner-journey-matrix.md
git commit -m "test: define clinic and owner journey baseline"
```

### Task 2: Make the dark theme semantic across the clinical workspace

**Files:**
- Modify: `frontend/src/index.css`
- Modify: `frontend/src/components/shell/ClinicLayout.tsx`
- Modify: `frontend/src/components/shell/ClinicLayout.test.tsx`

**Interfaces:**
- Consumes: `useTheme(): { theme: 'light' | 'dark'; toggleTheme(): void }` and class root `bhon-clinic-theme`.
- Produces: semantic CSS variables `--color-page`, `--color-surface`, `--color-surface-raised`, `--color-text`, `--color-muted`, `--color-border`, `--color-focus`, `--color-status-*` for child pages.

- [ ] **Step 1: Write failing root-class tests**

```tsx
expect(screen.getByTestId('clinic-workspace')).toHaveClass('bhon-clinic-theme--dark');
```

- [ ] **Step 2: Run the layout tests to verify failure**

Run: `node node_modules\\vitest\\vitest.mjs run src\\components\\shell\\ClinicLayout.test.tsx --reporter=verbose --no-file-parallelism`

Expected: FAIL because the clinical workspace root does not yet expose the semantic dark-theme contract.

- [ ] **Step 3: Introduce scoped semantic token layers**

Define light and dark values for page, surface, raised surface, text, muted, border, focus, teal, and all agenda status colors. Scope replacements to `.bhon-clinic-theme--dark`, including `bg-white`, slate backgrounds, text utilities, inputs, selects, tables, drawers, and status badges. Do not use blanket `filter` or opacity inversion. Preserve the existing Owner visual system.

- [ ] **Step 5: Verify and commit**

Run: `node node_modules\\vitest\\vitest.mjs run src\\context\\ThemeContext.test.tsx src\\components\\shell\\TopHeader.test.tsx src\\components\\shell\\ClinicLayout.test.tsx --reporter=verbose --no-file-parallelism`

Expected: PASS with light as default and dark persisted.

```bash
git add frontend/src/index.css frontend/src/components/shell/ClinicLayout.tsx frontend/src/components/shell/ClinicLayout.test.tsx
git commit -m "fix: unify accessible dashboard dark theme"
```

### Task 3: Render agenda appointments as readable status cards

**Files:**
- Create: `frontend/src/components/agenda/AppointmentCard.tsx`
- Create: `frontend/src/components/agenda/AppointmentCard.test.tsx`
- Modify: `frontend/src/pages/clinic/AgendaPage.tsx`
- Modify: `frontend/src/pages/clinic/AgendaPage.test.tsx`

**Interfaces:**
- Consumes: `Appointment` and `AppointmentStatus` from `src/types/index.ts`.
- Produces: `AppointmentCard({ appointment, onOpen }): JSX.Element` with `data-status` and a visible status label.

- [ ] **Step 1: Write failing status-card tests**

```tsx
it.each([
  ['CONFIRMADO', 'Confirmado', 'teal'],
  ['AGUARDANDO_CONFIRMACAO', 'Aguardando confirmação', 'amber'],
  ['EM_ATENDIMENTO', 'Em atendimento', 'blue'],
  ['CONCLUIDO', 'Concluído', 'green'],
  ['FALTA', 'Falta', 'rose'],
])('shows %s with text and token', (status, label, token) => {
  render(<AppointmentCard appointment={{ ...appointment, status }} onOpen={vi.fn()} />);
  expect(screen.getByText(label)).toBeVisible();
  expect(screen.getByTestId('appointment-card')).toHaveAttribute('data-tone', token);
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `node node_modules\\vitest\\vitest.mjs run src\\components\\agenda\\AppointmentCard.test.tsx --reporter=verbose --no-file-parallelism`

Expected: FAIL because `AppointmentCard` does not exist.

- [ ] **Step 3: Implement the focused card and use it in agenda cells**

The card must show patient, time, procedure, professional and status. Use token-backed classes keyed by `data-tone`; keep the existing appointment drawer action on click; allow wrapping and a minimum height instead of clipped text.

- [ ] **Step 4: Extend the agenda integration test**

```tsx
expect(screen.getByTestId('appointment-card')).toHaveTextContent('Paciente Teste');
expect(screen.getByTestId('appointment-card')).toHaveTextContent('Confirmado');
```

- [ ] **Step 5: Verify and commit**

Run: `node node_modules\\vitest\\vitest.mjs run src\\components\\agenda\\AppointmentCard.test.tsx src\\pages\\clinic\\AgendaPage.test.tsx --reporter=verbose --no-file-parallelism`

Expected: PASS.

```bash
git add frontend/src/components/agenda/AppointmentCard.tsx frontend/src/components/agenda/AppointmentCard.test.tsx frontend/src/pages/clinic/AgendaPage.tsx frontend/src/pages/clinic/AgendaPage.test.tsx
git commit -m "feat: show status-aware agenda cards"
```

### Task 4: Centralize reviewed WhatsApp message templates

**Files:**
- Create: `frontend/src/lib/whatsappTemplates.ts`
- Create: `frontend/src/lib/whatsappTemplates.test.ts`
- Modify: `frontend/src/components/recovery/RecoveryQueue.tsx`
- Modify: `frontend/src/pages/clinic/AgendaPage.tsx`
- Modify: `frontend/src/components/recovery/RecoveryQueue.test.tsx`

**Interfaces:**
- Produces: `buildWhatsAppMessage(kind: 'CONFIRMATION' | 'MISSED_APPOINTMENT' | 'BUDGET_FOLLOW_UP' | 'TREATMENT_CONTINUITY', values: { clinicName: string; patientName: string; date?: string; time?: string; procedure?: string }): string`.
- Consumes: selected appointment/follow-up data and existing WhatsApp deep-link opener.

- [ ] **Step 1: Write failing template tests**

```ts
expect(buildWhatsAppMessage('CONFIRMATION', values)).toContain('confirmar ou ajustar o horário');
expect(buildWhatsAppMessage('MISSED_APPOINTMENT', values)).toContain('conte com a gente');
expect(buildWhatsAppMessage('BUDGET_FOLLOW_UP', values)).toContain('tirar suas dúvidas');
expect(buildWhatsAppMessage('TREATMENT_CONTINUITY', values)).toContain('próximo passo');
```

- [ ] **Step 2: Run the test to verify failure**

Run: `node node_modules\\vitest\\vitest.mjs run src\\lib\\whatsappTemplates.test.ts --reporter=verbose --no-file-parallelism`

Expected: FAIL because the centralized builder does not exist.

- [ ] **Step 3: Implement explicit, non-coercive templates**

Use greeting, clinic name, context, a single practical call-to-action, and opt-in to questions. Do not invent dates, values, diagnosis, limited availability, or send messages without user review.

- [ ] **Step 4: Replace inline message assembly at agenda and recovery entry points**

Open a reviewable message field/drawer first; only the existing user click launches the WhatsApp URL.

- [ ] **Step 5: Verify and commit**

Run: `node node_modules\\vitest\\vitest.mjs run src\\lib\\whatsappTemplates.test.ts src\\components\\recovery\\RecoveryQueue.test.tsx src\\pages\\clinic\\AgendaPage.test.tsx --reporter=verbose --no-file-parallelism`

Expected: PASS.

```bash
git add frontend/src/lib/whatsappTemplates.ts frontend/src/lib/whatsappTemplates.test.ts frontend/src/components/recovery/RecoveryQueue.tsx frontend/src/components/recovery/RecoveryQueue.test.tsx frontend/src/pages/clinic/AgendaPage.tsx frontend/src/pages/clinic/AgendaPage.test.tsx
git commit -m "feat: add reviewed clinical WhatsApp templates"
```

### Task 5: Full regression, responsive review, and release validation

**Files:**
- Modify: `docs/qa/clinic-owner-journey-matrix.md`

**Interfaces:**
- Consumes: all Cycle 1 routes and test suites.
- Produces: audited release evidence and a matrix marked with actual pass/fail results.

- [ ] **Step 1: Run the full frontend regression suite**

Run: `node node_modules\\vitest\\vitest.mjs run --reporter=verbose --no-file-parallelism`

Expected: all tests PASS.

- [ ] **Step 2: Run production build**

Run: `npm run build`

Expected: TypeScript exits 0 and Vite finishes a production bundle.

- [ ] **Step 3: Perform visual smoke paths in light and dark mode**

Use the browser at desktop and 390px width. Confirm overview, agenda populated card, patient list/dossier, recovery message review, Owner clinics, and Owner support. Record actual results in the matrix; do not mark an untested flow as passed.

- [ ] **Step 4: Push preview and verify Vercel Ready**

```bash
git push origin codex/clinic-stability
```

Confirm the deployment commit is Ready in Vercel before continuing.

- [ ] **Step 5: Publish production and verify the custom domain**

```bash
git push origin codex/clinic-stability:main
```

Confirm the matching main deployment is Ready and smoke-test `https://www.bhonapp.com.br`.

- [ ] **Step 6: Commit audit evidence**

```bash
git add docs/qa/clinic-owner-journey-matrix.md
git commit -m "test: record clinic quality release validation"
git push origin codex/clinic-stability
git push origin codex/clinic-stability:main
```

## Deferred Plan: Cycle 2

Clinic creation/deactivation, spreadsheet ingestion with template and mapping, and bidirectional support require persistent API and data-model contracts. They are intentionally separated from Cycle 1 so the visual and existing-workflow quality release can be verified independently. Their implementation plan begins only after Cycle 1 is complete and the current persistence model is reviewed.

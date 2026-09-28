# Clinic Activation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give each new BHON clinic a safe, measurable path to its first recovery opportunity in ten minutes.

**Architecture:** Fastify exposes tenant-isolated onboarding state, sanitized activation events, and transactional demo-lot operations. React renders a compact checklist in the existing clinic overview and reuses existing Patient, Agenda, Opportunity, Sarah, and Support routes rather than introducing new navigation. Demo data is tagged at the database level and can only be removed by its own lot.

**Tech Stack:** TypeScript, Fastify, Prisma/PostgreSQL, React, Vite, Vitest, Node test runner.

**Spec:** `docs/superpowers/specs/2026-09-28-clinic-activation-design.md`

## Global Constraints

- The path must never send WhatsApp content without an official provider connection and an explicit human action.
- Activation events must not retain message bodies, CPF, phone numbers, patient record numbers, or clinical fields.
- Demo loading is allowed only for an otherwise empty tenant and removal must affect only the demo lot.
- Existing clinic routes must remain usable when onboarding cannot load or is dismissed.
- Public BHON copy uses only “BHON”; never use “BHON Clinical OS”.

## Review Focus

- Tenant A must not read, complete, load, or remove activation data belonging to tenant B; cover this in Task 1 route tests.
- An existing real patient/opportunity must reject demo loading without writes; cover this in Task 2 transaction test.
- A malformed or verbose analytics payload must not persist arbitrary metadata; cover this in Task 1 sanitization test.
- A dismissed checklist must not block any clinic route and must remain resumable; cover this in Task 3 component test.
- A Sarah preparation action must only navigate/create a draft and must never call a WhatsApp delivery endpoint; cover this in Task 4 integration test.

---

### Task 1: Tenant-isolated activation state and safe event contract

**Files:**
- Create: `backend/src/domain/activation.ts`
- Create: `backend/src/routes/onboarding.ts`
- Create: `backend/test/onboarding.test.mjs`
- Create: `backend/prisma/migrations/20260928103000_activation_journey/migration.sql`
- Modify: `backend/prisma/schema.prisma`
- Modify: `backend/src/app.ts`

**Interfaces:**
- Consumes: authenticated `request.tenantId`, `request.user.id`, and existing `OnboardingProgress`.
- Produces: `GET /onboarding` returns `ActivationSnapshot`; `POST /onboarding/events` accepts `{ type: ActivationEventType }`; `PATCH /onboarding/steps/:step` accepts `{ completed: boolean }`; `PATCH /onboarding` accepts `{ dismissed: boolean }`.
- Produces: `getActivationSnapshot(progress, counts): ActivationSnapshot`, consumed by Task 3.

- [ ] **Step 1: Write failing route tests for state calculation, tenant isolation, and event sanitization**

```js
assert.equal(response.statusCode, 200);
assert.equal(response.json().steps.find((step) => step.key === "PATIENTS").complete, false);
assert.equal(calls.activationEvent.create[0].data.metadata, undefined);
assert.equal(crossTenant.statusCode, 404);
```

- [ ] **Step 2: Run the onboarding route tests to verify they fail**

Run: `node --import tsx --test test/onboarding.test.mjs`

Expected: FAIL because onboarding routes and activation domain do not exist.

- [ ] **Step 3: Add activation persistence and `getActivationSnapshot`**

Extend `OnboardingProgress` with `dismissedAt DateTime?`; add `ActivationEvent` with `tenantId`, `actorUserId`, enum `type`, and `createdAt`. Implement `getActivationSnapshot(progress, counts)` with the fixed steps `PROFILE`, `PATIENTS`, `TEAM`, `AGENDA`, `OPPORTUNITY`, and `SARAH_MESSAGE`. Do not add free-form metadata.

- [ ] **Step 4: Implement authenticated onboarding routes in `backend/src/routes/onboarding.ts`**

Use `requireAuth`, `requireTenant`, and owner/admin/manager roles. Scope every read/write by `request.tenantId`. Route event types through an allow-list; create audit records without patient content. Register routes below the existing `/api` prefix in `backend/src/app.ts`.

- [ ] **Step 5: Run the onboarding route tests to verify they pass**

Run: `node --import tsx --test test/onboarding.test.mjs`

Expected: PASS with tenant isolation and no persisted sensitive metadata.

- [ ] **Step 6: Commit**

```bash
git add backend/prisma backend/src/domain/activation.ts backend/src/routes/onboarding.ts backend/src/app.ts backend/test/onboarding.test.mjs
git commit -m "feat: add clinic activation state"
```

### Task 2: Reversible clinic demonstration lot

**Files:**
- Create: `backend/src/domain/demo-clinic.ts`
- Create: `backend/test/demo-clinic.test.mjs`
- Modify: `backend/src/routes/onboarding.ts`
- Modify: `backend/prisma/schema.prisma`
- Modify: `backend/prisma/migrations/20260928103000_activation_journey/migration.sql`

**Interfaces:**
- Consumes: `loadDemoClinic(tx, tenantId, actorUserId)` and `removeDemoClinic(tx, tenantId, actorUserId)` from this task.
- Produces: `POST /onboarding/demo` and `DELETE /onboarding/demo`, consumed by Task 3.

- [ ] **Step 1: Write failing demo service tests**

```js
await assert.rejects(() => loadDemoClinic(tx, "tenant-real", "owner"), /DEMO_REQUIRES_EMPTY_CLINIC/);
assert.deepEqual(deletedLotIds, [created.demoLotId]);
assert.equal(outboxWrites, 0);
```

- [ ] **Step 2: Run demo tests to verify they fail**

Run: `node --import tsx --test test/demo-clinic.test.mjs`

Expected: FAIL because no demo-lot service exists.

- [ ] **Step 3: Model and implement a transactional demo lot**

Add `DemoDataLot` and nullable `demoLotId` foreign keys only to seeded entities used by the demo: patient, opportunity, appointment, and follow-up. `loadDemoClinic` first checks that the tenant has no non-demo patients/opportunities/appointments, then creates one lot with minimal labeled demonstration data. It must not create a WhatsApp outbox item.

- [ ] **Step 4: Add load/remove routes with confirmation-oriented responses**

`POST /onboarding/demo` returns the lot and updated snapshot. `DELETE /onboarding/demo` removes only entities with the tenant’s `demoLotId`, then removes the lot. Both run inside Prisma transactions and record sanitized activation/audit events.

- [ ] **Step 5: Run demo tests to verify they pass**

Run: `node --import tsx --test test/demo-clinic.test.mjs`

Expected: PASS; real data blocks loading and deletion remains lot-scoped.

- [ ] **Step 6: Commit**

```bash
git add backend/prisma backend/src/domain/demo-clinic.ts backend/src/routes/onboarding.ts backend/test/demo-clinic.test.mjs
git commit -m "feat: add reversible clinic demonstration"
```

### Task 3: Compact onboarding checklist and contextual help

**Files:**
- Create: `frontend/src/lib/onboarding.ts`
- Create: `frontend/src/lib/onboarding.test.ts`
- Create: `frontend/src/components/onboarding/ActivationChecklist.tsx`
- Create: `frontend/src/components/onboarding/ActivationChecklist.test.tsx`
- Create: `frontend/src/components/common/ContextualHelp.tsx`
- Modify: `frontend/src/pages/clinic/OverviewPage.tsx`
- Modify: `frontend/src/pages/clinic/PatientsPage.tsx`
- Modify: `frontend/src/pages/clinic/SettingsPage.tsx`

**Interfaces:**
- Consumes: `ActivationSnapshot` from `GET /api/onboarding`; `completeActivationStep(step)` and `trackActivationEvent(type)` in `frontend/src/lib/onboarding.ts`.
- Produces: `ActivationChecklist` which accepts `{ snapshot, onRefresh, onNavigate }`.

- [ ] **Step 1: Write failing frontend tests for compact checklist behavior**

```tsx
expect(screen.getByRole('heading', { name: /primeiro resultado/i })).toBeInTheDocument();
await user.click(screen.getByRole('button', { name: /continuar com dados de exemplo/i }));
expect(mockNavigate).toHaveBeenCalledWith('/clinic/opportunities');
expect(screen.queryByText(/primeiro resultado/i)).not.toBeInTheDocument();
```

- [ ] **Step 2: Run the checklist tests to verify they fail**

Run: `npx vitest run src/components/onboarding/ActivationChecklist.test.tsx src/lib/onboarding.test.ts --pool=threads --maxWorkers=1 --no-fileParallelism`

Expected: FAIL because onboarding client and components do not exist.

- [ ] **Step 3: Implement typed onboarding API client and checklist**

Expose typed snapshot/event/step functions from `frontend/src/lib/onboarding.ts`. Render no checklist when `dismissed` is true; otherwise show only the next recommended step plus progress, a resume link, and a dismiss control. Use existing BHON panel/tokens and no modal on page load.

- [ ] **Step 4: Add contextual help to existing activation surfaces**

Add a small dismissible `ContextualHelp` trigger to Patients (CSV and example), Opportunities (prioritize and prepare), and Settings (resume onboarding). Event tracking is best effort: UI failure must not block the user’s action.

- [ ] **Step 5: Run checklist tests to verify they pass**

Run: `npx vitest run src/components/onboarding/ActivationChecklist.test.tsx src/lib/onboarding.test.ts --pool=threads --maxWorkers=1 --no-fileParallelism`

Expected: PASS; dismiss/resume and navigation work without blocking clinic pages.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/lib/onboarding.ts frontend/src/lib/onboarding.test.ts frontend/src/components/onboarding frontend/src/components/common/ContextualHelp.tsx frontend/src/pages/clinic
git commit -m "feat: guide clinic activation"
```

### Task 4: First recovery result handoff and end-to-end protection

**Files:**
- Create: `frontend/src/components/onboarding/FirstRecoveryResult.test.tsx`
- Modify: `frontend/src/pages/clinic/OpportunitiesPage.tsx`
- Modify: `frontend/src/components/secretary/SecretaryConsole.tsx`
- Modify: `frontend/src/lib/operations.ts`
- Modify: `backend/test/onboarding.test.mjs`

**Interfaces:**
- Consumes: `trackActivationEvent("OPPORTUNITY_PRIORITIZED" | "SARAH_MESSAGE_PREPARED")` and existing Sarah dashboard conversation APIs.
- Produces: owner journey from opportunity selection to a Sarah draft, with no delivery request.

- [ ] **Step 1: Write failing journey tests for a prepared-only Sarah handoff**

```tsx
await user.click(screen.getByRole('button', { name: /preparar com sarah/i }));
expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining('/clinic/whatsapp'));
expect(fetchMock).not.toHaveBeenCalledWith(expect.stringContaining('whatsapp/send'), expect.anything());
```

- [ ] **Step 2: Run the first-result test to verify it fails**

Run: `npx vitest run src/components/onboarding/FirstRecoveryResult.test.tsx --pool=threads --maxWorkers=1 --no-fileParallelism`

Expected: FAIL because the guided handoff is absent.

- [ ] **Step 3: Implement the opportunity-to-Sarah draft handoff**

Add an explicit “Preparar com Sarah” action for eligible opportunities. It tracks prioritization and opens the existing Sarah console with patient context/draft intent. Do not invoke an external provider or create `NotificationOutbox` delivery records.

- [ ] **Step 4: Add activation completion and fallback handling**

When a draft is prepared, mark `SARAH_MESSAGE` and `firstValueAt`; if no opportunity exists, route the user back to Patients/CSV instead. On API errors, retain the normal opportunity and Sarah workflows.

- [ ] **Step 5: Run focused backend/frontend verification**

Run: `node --import tsx --test test/onboarding.test.mjs && npx vitest run src/components/onboarding/FirstRecoveryResult.test.tsx src/pages/clinic/OverviewPage.test.tsx --pool=threads --maxWorkers=1 --no-fileParallelism`

Expected: PASS; the first result is prepared, not delivered.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/clinic/OpportunitiesPage.tsx frontend/src/components/secretary/SecretaryConsole.tsx frontend/src/lib/operations.ts frontend/src/components/onboarding/FirstRecoveryResult.test.tsx backend/test/onboarding.test.mjs
git commit -m "feat: guide first recovery result"
```

### Task 5: Whole-flow verification and release

**Files:**
- Modify: `docs/superpowers/specs/2026-09-28-clinic-activation-design.md` only if verification reveals a design correction.

**Interfaces:**
- Consumes: all previous task contracts.
- Produces: verified deployment and documented evidence.

- [ ] **Step 1: Run backend activation and Stripe safety tests**

Run: `node --import tsx --test test/onboarding.test.mjs test/demo-clinic.test.mjs test/stripe-webhook.test.mjs`

Expected: PASS.

- [ ] **Step 2: Run frontend activation and existing overview/patient tests**

Run: `npx vitest run src/components/onboarding src/pages/clinic/OverviewPage.test.tsx src/pages/clinic/PatientsPage.test.tsx --pool=threads --maxWorkers=1 --no-fileParallelism`

Expected: PASS.

- [ ] **Step 3: Build production frontend and Prisma client**

Run: `npm run build --prefix frontend && cmd.exe /d /s /c "backend\\node_modules\\.bin\\prisma.cmd generate --schema backend\\prisma\\schema.prisma"`

Expected: both commands exit 0.

- [ ] **Step 4: Verify owner journey in browser without Stripe checkout or message delivery**

Open the production-preview flow, authenticate as a test owner, confirm the checklist is readable, navigate through CSV/demo/opportunity/Sarah, and assert no delivery action occurs.

- [ ] **Step 5: Commit final verification adjustments and publish**

```bash
git add -A
git commit -m "test: verify clinic activation journey"
git push origin HEAD
vercel --prod --yes --scope bhon
```


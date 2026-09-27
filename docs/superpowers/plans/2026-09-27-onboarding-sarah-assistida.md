# BHON Onboarding and Assisted Sarah Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Launch a low-friction clinic onboarding that proves BHON value before WhatsApp automation, with real R$290/R$2.900 Stripe subscription activation.

**Architecture:** Account and clinic setup precede a hosted Stripe Checkout. A verified webhook activates the tenant; the clinic then uses a guided onboarding and Sarah-assisted recovery. Meta WhatsApp automation remains an independently released integration because it requires clinic-owned authorization.

**Tech Stack:** React/Vite, Fastify, Prisma/Postgres/Supabase, Stripe Checkout and webhooks, Vitest and Node tests.

**Spec:** `docs/superpowers/specs/2026-09-27-onboarding-sarah-assistida-design.md`

## Global Constraints

- Monthly plan is R$290; annual plan is R$2.900.
- Payment data is collected only by Stripe Checkout.
- WhatsApp connection is optional during trial; no password collection or automatic sending without authorization and consent.
- Never use the product name “BHON Clinical OS”.

## Review Focus

- A webhook with an invalid signature must not activate a clinic.
- Selecting annual versus monthly must create the corresponding Stripe price only.
- A clinic that skips WhatsApp must still reach the daily workspace.
- A malformed spreadsheet row must not create a partial patient record.
- Dark Sarah surfaces must not resolve to white or low-contrast text.

---

### Task 1: Dark Sarah surface and assisted-mode entry point

**Files:**
- Modify: `frontend/src/index.css`
- Modify: `frontend/src/pages/clinic/OperationsPages.tsx`
- Test: `frontend/test/theme.dark.test.mjs`

**Interfaces:**
- Produces: a `Sarah assistida` status panel that opens manual WhatsApp drafts and clearly labels automation as optional.

- [ ] **Step 1: Write failing theme and assisted-mode tests**
- [ ] **Step 2: Verify tests fail because light utility surfaces remain in dark mode**
- [ ] **Step 3: Implement dark-surface tokens and assisted-mode status copy**
- [ ] **Step 4: Run `npm test -- theme.dark.test.mjs` and verify pass**
- [ ] **Step 5: Commit `fix(ui): complete Sarah dark contrast`**

### Task 2: Trial onboarding and review-first patient import

**Files:**
- Modify: `frontend/src/pages/clinic/PatientsPage.tsx`
- Modify: `frontend/src/pages/clinic/PatientsPage.test.tsx`
- Create: `frontend/src/lib/patientImportTemplate.ts`
- Create: `frontend/src/lib/patientImportTemplate.test.ts`

**Interfaces:**
- Produces: `downloadPatientImportTemplate(): Blob` and an onboarding checklist that permits “Configurar depois”.

- [ ] **Step 1: Write failing tests for template headers, sample row and invalid-row preview**
- [ ] **Step 2: Verify tests fail because no downloadable template exists**
- [ ] **Step 3: Implement template generation and the import example/download action**
- [ ] **Step 4: Add the non-blocking onboarding checklist after clinic activation**
- [ ] **Step 5: Run patient import tests and `npm run build`**
- [ ] **Step 6: Commit `feat(onboarding): add clinic-first import guidance`**

### Task 3: Stripe subscription activation

**Files:**
- Create: `backend/src/routes/billing.ts`
- Modify: `backend/src/app.ts`
- Modify: `backend/prisma/schema.prisma`
- Create: `backend/test/billing.test.mjs`
- Modify: `frontend/src/pages/login/LoginPage.tsx` or the plan-selection page
- Create: `frontend/src/lib/billing.ts`

**Interfaces:**
- Produces: `POST /api/billing/checkout` with `{ plan: 'MONTHLY' | 'ANNUAL' }`; `POST /webhooks/stripe`; persisted Stripe customer, subscription and invoice identifiers.

- [ ] **Step 1: Write failing backend tests for plan selection and rejected webhook signature**
- [ ] **Step 2: Verify tests fail because billing routes do not exist**
- [ ] **Step 3: Add Stripe environment validation and hosted Checkout creation for the approved prices**
- [ ] **Step 4: Implement signed webhook handling to activate, suspend and update the tenant subscription**
- [ ] **Step 5: Add UI transition from plan selection to hosted Checkout and return-state messaging**
- [ ] **Step 6: Run billing tests, existing backend tests and production build**
- [ ] **Step 7: Commit `feat(billing): activate clinics from Stripe subscriptions`**

### Task 4: Meta WhatsApp authorization release

**Files:**
- Create: `backend/src/routes/whatsapp.ts`
- Modify: `backend/prisma/schema.prisma`
- Modify: `frontend/src/pages/clinic/OperationsPages.tsx`
- Create: `backend/test/whatsapp.test.mjs`

**Interfaces:**
- Consumes: Meta app credentials and a clinic-admin authorization.
- Produces: `POST /api/integrations/whatsapp/connect`, verified inbound webhook and tenant-scoped connection state.

- [ ] **Step 1: Write failing tests for tenant isolation, invalid webhook verification and opt-out handling**
- [ ] **Step 2: Verify tests fail because the official provider route does not exist**
- [ ] **Step 3: Implement connection-state persistence and Meta Embedded Signup handoff**
- [ ] **Step 4: Implement verified webhook intake and human-handoff/opt-out stop rules**
- [ ] **Step 5: Show “Configurar depois”, “Conectado” and “Aguardando autorização” states in the clinic UI**
- [ ] **Step 6: Run WhatsApp tests and full API regression tests**
- [ ] **Step 7: Commit `feat(whatsapp): add clinic-owned official connection`**

## Self-review

Spec coverage is mapped: low-friction trial and import are Tasks 1–2; subscription source-of-truth is Task 3; official WhatsApp authorization is Task 4. Task 4 is intentionally release-gated on Meta credentials and does not block the assisted Sarah launch.

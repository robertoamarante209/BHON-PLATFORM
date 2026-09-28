# BHON Pilot Privacy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a tenant-safe privacy foundation for the BHON clinic pilot: contact preferences, governed recovery eligibility, privacy request/incident records, and transparent public legal drafts.

**Architecture:** Extend the Prisma tenant model with narrowly scoped privacy records and sanitized audit writes. Fastify routes enforce the existing cookie/session, tenant and management-role boundaries; React consumes typed API clients in the patient and settings experiences. Sarah remains draft-only and reads eligibility rather than delivering a provider message.

**Tech Stack:** React 19, TypeScript, Wouter, Fastify 5, Prisma 7, PostgreSQL/Supabase, Vitest, Node test runner.

**Spec:** `docs/superpowers/specs/2026-09-28-pilot-privacy-design.md`

## Global Constraints

- Treat the clinic as operational controller of patient records and BHON as operator for those records; BHON remains controller for its own account, billing, support and marketing data.
- Never place health data, diagnosis, prescription, attachment contents, phone numbers, rendered message text, passwords, tokens or secrets in audit metadata, URLs, analytics, logs or error payloads.
- Sarah may prepare a draft only; it must not send to a provider, queue an outbox delivery or claim WhatsApp automation.
- Every privacy record and lookup must be tenant-scoped and use existing authenticated session, trusted-origin and RBAC controls.
- Keep public terms/privacy visibly marked as a draft pending legal review; do not claim certification or legal compliance.
- Do not implement physical patient-record deletion or automated ANPD notification decisions in this cycle.

## Review Focus

- A patient from another clinic must yield the same safe not-found/restricted result when a contact preference is read or changed; test this in Task 2.
- A channel refusal must prevent Sarah recovery eligibility even when a phone number exists; test this in Task 3.
- Audit metadata must contain only action, resource and safe field names—not contact values or clinical text; test this in Tasks 2 and 4.
- A receptionist/viewer must not create or edit privacy requests or incidents; test this in Task 4.
- A missing privacy mailbox must not be presented as active in public legal copy; test this in Task 5.

---

## File structure

| File | Responsibility |
| --- | --- |
| `backend/prisma/schema.prisma` | Tenant-scoped privacy models and enum values. |
| `backend/prisma/migrations/<timestamp>_pilot_privacy/migration.sql` | Reproducible database migration with RLS and revoked public grants. |
| `backend/src/domain/contact-preferences.ts` | Channel normalization and recovery eligibility calculation without patient data in errors. |
| `backend/src/routes/privacy.ts` | Authenticated tenant-scoped preferences, requests and incident endpoints. |
| `backend/src/domain/sarah-recovery-draft.ts` | Reject ineligible recovery drafts before conversation creation. |
| `backend/test/privacy-http.test.mjs` | HTTP/RBAC/tenant/audit regression coverage. |
| `backend/test/sarah-recovery-draft.test.mjs` | Opt-out and draft-only domain coverage. |
| `frontend/src/lib/privacy.ts` | Typed API client and UI types. |
| `frontend/src/components/patients/ContactPreferencesPanel.tsx` | Compact editable patient preferences section. |
| `frontend/src/components/settings/PrivacyGovernancePanel.tsx` | Requests and incidents management section. |
| `frontend/src/pages/clinic/PatientDetailPage.tsx` | Patient-preference integration point. |
| `frontend/src/pages/clinic/SettingsPage.tsx` | Privacy/security section integration point. |
| `frontend/src/pages/public/LegalPage.tsx` | Clear public draft language and contact fallback. |
| `frontend/src/components/patients/ContactPreferencesPanel.test.tsx` | Preference UI tests. |
| `frontend/src/components/settings/PrivacyGovernancePanel.test.tsx` | Governance UI/RBAC tests. |
| `frontend/src/pages/public/PublicExperience.test.tsx` | Public privacy draft and contact-copy regression tests. |

### Task 1: Tenant-scoped privacy data contract

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Create: `backend/prisma/migrations/<timestamp>_pilot_privacy/migration.sql`
- Create: `backend/src/domain/contact-preferences.ts`
- Test: `backend/test/contact-preferences.test.mjs`

**Interfaces:**
- Produces: `ContactChannel`, `ContactPreferenceStatus`, `PrivacyRequest`, `PrivacyIncident` Prisma models; `evaluateRecoveryEligibility(preferences: ContactPreferences | null, channel: ContactChannel): RecoveryEligibility`.
- Consumes: existing `Patient`, `Tenant`, `User` and `AuditLog` models.

- [ ] **Step 1: Write failing domain tests for channel status and recovery eligibility**

```js
test('a refused WhatsApp channel is not eligible even when a patient has a phone', () => {
  assert.deepEqual(evaluateRecoveryEligibility({ whatsapp: 'REFUSED' }, 'WHATSAPP'), {
    eligible: false,
    code: 'CONTACT_CHANNEL_REFUSED',
  });
});

test('an allowed channel is eligible without exposing preference provenance', () => {
  assert.equal(evaluateRecoveryEligibility({ whatsapp: 'ALLOWED' }, 'WHATSAPP').eligible, true);
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `node --import tsx --test test/contact-preferences.test.mjs` from `backend`.

Expected: FAIL because the domain module and types do not exist.

- [ ] **Step 3: Add the minimal schema and `evaluateRecoveryEligibility` contract**

Create a single `PatientContactPreference` record per patient with `tenantId`, three enum statuses (`NOT_INFORMED`, `ALLOWED`, `REFUSED`), safe provenance label, recorded timestamp and actor id. Add tenant-scoped `PrivacyRequest` and `PrivacyIncident` models with status enums, safe summaries limited to operational details, actor/responsible relations and indexes by tenant/status/date. Add all required tenant and user relations. The domain function must return only `{ eligible: boolean, code?: 'CONTACT_CHANNEL_NOT_ALLOWED' | 'CONTACT_CHANNEL_REFUSED' }`.

- [ ] **Step 4: Create the database migration**

Create foreign keys and tenant indexes; enable RLS and revoke `anon`, `authenticated` and `PUBLIC` privileges on each new table, matching prior BHON migrations. Do not add permissive policies because application access is through Prisma service credentials.

- [ ] **Step 5: Run focused tests and migration verification**

Run: `node --import tsx --test test/contact-preferences.test.mjs && npm run typecheck && npm run verify:migrations` from `backend`.

Expected: PASS.

- [ ] **Step 6: Commit the task**

```bash
git add backend/prisma backend/src/domain/contact-preferences.ts backend/test/contact-preferences.test.mjs
git commit -m "feat: add privacy data contracts"
```

### Task 2: Contact-preference API with tenant isolation

**Files:**
- Modify: `backend/src/app.ts`
- Create: `backend/src/routes/privacy.ts`
- Test: `backend/test/privacy-http.test.mjs`

**Interfaces:**
- Consumes: `PatientContactPreference`, `evaluateRecoveryEligibility`, `requireAuth`, `requireTenant`, `requireRole`.
- Produces: `GET/PATCH /api/patients/:id/contact-preferences`.

- [ ] **Step 1: Write failing HTTP tests for management RBAC, tenant isolation and sanitized audit records**

```js
test('cannot read another tenant patient contact preference', async () => {
  const response = await app.inject({ method: 'GET', url: `/api/patients/${foreignPatient.id}/contact-preferences`, headers: ownerHeaders });
  assert.equal(response.statusCode, 404);
});

test('persists a refusal and audits safe field names only', async () => {
  const response = await patchPreferences({ whatsapp: 'REFUSED', source: 'PATIENT_REQUEST' });
  assert.equal(response.statusCode, 200);
  assert.deepEqual(audit.metadata, { fields: ['whatsapp', 'source'] });
});
```

- [ ] **Step 2: Run the focused HTTP test to verify it fails**

Run: `node --import tsx --test test/privacy-http.test.mjs` from `backend`.

Expected: FAIL with route not found.

- [ ] **Step 3: Implement contact-preference routes in `privacyRoutes`**

Register the route module below existing `/api` routes. Require authentication and tenant on all routes; allow reads to clinic roles and writes only to `OWNER`, `ADMIN`, `MANAGER`. Scope the patient lookup by `id`, `tenantId`, and `deletedAt: null`; return `404` for a foreign/missing patient. Validate only known fields, normalize source to a safe enum/string, set `recordedAt` server-side and upsert the preference with its tenant. Write `CONTACT_PREFERENCES_UPDATED` audit metadata containing field names only.

- [ ] **Step 4: Run focused tests to verify they pass**

Run: `node --import tsx --test test/privacy-http.test.mjs` from `backend`.

Expected: PASS.

- [ ] **Step 5: Commit the task**

```bash
git add backend/src/app.ts backend/src/routes/privacy.ts backend/test/privacy-http.test.mjs
git commit -m "feat: protect patient contact preferences"
```

### Task 3: Make Sarah recovery eligibility explicit

**Files:**
- Modify: `backend/src/domain/sarah-recovery-draft.ts`
- Modify: `backend/test/onboarding.test.mjs`
- Create: `backend/test/sarah-recovery-draft.test.mjs`
- Modify: `frontend/src/lib/operations.ts`
- Modify: `frontend/src/pages/clinic/OpportunitiesPage.tsx`
- Test: `frontend/src/components/onboarding/FirstRecoveryResult.test.tsx`

**Interfaces:**
- Consumes: `evaluateRecoveryEligibility`, current `createSarahRecoveryDraft`, existing recovery navigation helpers.
- Produces: safe `SARAH_CONTACT_CHANNEL_REFUSED`/`SARAH_CONTACT_CHANNEL_NOT_ALLOWED` errors and UI guidance; still no provider delivery.

- [ ] **Step 1: Write failing backend test for a refused WhatsApp preference**

```js
test('does not create a Sarah conversation when recovery WhatsApp is refused', async () => {
  await assert.rejects(() => createSarahRecoveryDraft(db, tenantId, userId, opportunityId), { code: 'SARAH_CONTACT_CHANNEL_REFUSED' });
  assert.equal(db.secretaryConversation.createCalls.length, 0);
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `node --import tsx --test test/sarah-recovery-draft.test.mjs` from `backend`.

Expected: FAIL because the existing draft flow does not inspect preferences.

- [ ] **Step 3: Evaluate preference before creating the draft**

Load only the current tenant’s preference needed for WhatsApp. If refused or not allowed, return a safe domain error and do not create a conversation, message, activation event or outbox item. Preserve the existing behavior for a patient without a connected provider: a successful path creates only a dashboard draft and no delivery.

- [ ] **Step 4: Write and run the frontend failure-state test**

Add a test that mocks `prepareSarahRecoveryDraft` with `SARAH_CONTACT_CHANNEL_REFUSED` and verifies the user sees actionable guidance without navigation. Run: `npx vitest run src/components/onboarding/FirstRecoveryResult.test.tsx --pool=threads --maxWorkers=1 --no-fileParallelism` from `frontend`.

Expected: FAIL before UI handling, then PASS after mapping the safe error to “O paciente não autorizou contato por WhatsApp.”

- [ ] **Step 5: Commit the task**

```bash
git add backend/src/domain/sarah-recovery-draft.ts backend/test/onboarding.test.mjs backend/test/sarah-recovery-draft.test.mjs frontend/src/lib/operations.ts frontend/src/pages/clinic/OpportunitiesPage.tsx frontend/src/components/onboarding/FirstRecoveryResult.test.tsx
git commit -m "feat: respect recovery contact preferences"
```

### Task 4: Privacy governance routes and clinic panels

**Files:**
- Modify: `backend/src/routes/privacy.ts`
- Modify: `frontend/src/lib/privacy.ts`
- Create: `frontend/src/components/patients/ContactPreferencesPanel.tsx`
- Create: `frontend/src/components/patients/ContactPreferencesPanel.test.tsx`
- Create: `frontend/src/components/settings/PrivacyGovernancePanel.tsx`
- Create: `frontend/src/components/settings/PrivacyGovernancePanel.test.tsx`
- Modify: `frontend/src/pages/clinic/PatientDetailPage.tsx`
- Modify: `frontend/src/pages/clinic/SettingsPage.tsx`
- Test: `backend/test/privacy-http.test.mjs`

**Interfaces:**
- Consumes: Task 1 models/domain and Task 2 preference endpoints.
- Produces: `GET/POST/PATCH /api/privacy-requests`, `GET/POST/PATCH /api/privacy-incidents`; `getContactPreferences`, `saveContactPreferences`, `listPrivacyRequests`, `createPrivacyRequest`, `listPrivacyIncidents`, `createPrivacyIncident` client functions.

- [ ] **Step 1: Write failing backend tests for request/incident RBAC and tenant scope**

```js
test('rejects a receptionist creating a privacy incident', async () => {
  const response = await app.inject({ method: 'POST', url: '/api/privacy-incidents', headers: receptionistHeaders, payload: validIncident });
  assert.equal(response.statusCode, 403);
});

test('returns only current tenant privacy requests', async () => {
  const response = await app.inject({ method: 'GET', url: '/api/privacy-requests', headers: ownerHeaders });
  assert.deepEqual(response.json().items.map((item) => item.id), [currentTenantRequest.id]);
});
```

- [ ] **Step 2: Implement request and incident endpoints with safe schemas**

Require management roles for all mutations; choose clinic read roles only if a non-sensitive list view is genuinely needed, otherwise management-only. Limit request/incident summary fields to 500 characters, never allow arbitrary metadata, resolve patient references through tenant-scoped lookups and audit safe action/resource/id/status only. Use status transition allow-lists instead of arbitrary strings.

- [ ] **Step 3: Run backend privacy tests to verify they pass**

Run: `node --import tsx --test test/privacy-http.test.mjs` from `backend`.

Expected: PASS.

- [ ] **Step 4: Write failing React tests for patient preference form and governance access**

```tsx
it('saves a WhatsApp refusal and announces success', async () => {
  await user.click(screen.getByLabelText(/whatsapp/i));
  await user.click(screen.getByRole('button', { name: /salvar preferências/i }));
  expect(saveContactPreferences).toHaveBeenCalledWith(patientId, expect.objectContaining({ whatsapp: 'REFUSED' }));
});

it('does not render management controls for a receptionist', () => {
  render(<PrivacyGovernancePanel role="RECEPTIONIST" />);
  expect(screen.queryByRole('button', { name: /registrar incidente/i })).not.toBeInTheDocument();
});
```

- [ ] **Step 5: Implement compact accessible panels and typed client**

Use native labels, `aria-live` feedback and visible status copy. Add “Preferências de contato” to the patient detail without hiding clinical content. Add a management-only “Privacidade e segurança” settings section with request and incident forms; do not expose irreversible deletion. Client types mirror only safe API response fields.

- [ ] **Step 6: Run focused frontend tests and typecheck**

Run: `npx vitest run src/components/patients/ContactPreferencesPanel.test.tsx src/components/settings/PrivacyGovernancePanel.test.tsx --pool=threads --maxWorkers=1 --no-fileParallelism && npx tsc --noEmit` from `frontend`.

Expected: PASS.

- [ ] **Step 7: Commit the task**

```bash
git add backend/src/routes/privacy.ts backend/test/privacy-http.test.mjs frontend/src/lib/privacy.ts frontend/src/components/patients frontend/src/components/settings/PrivacyGovernancePanel.tsx frontend/src/components/settings/PrivacyGovernancePanel.test.tsx frontend/src/pages/clinic/PatientDetailPage.tsx frontend/src/pages/clinic/SettingsPage.tsx
git commit -m "feat: add clinic privacy governance"
```

### Task 5: Public legal transparency and release validation

**Files:**
- Modify: `frontend/src/pages/public/LegalPage.tsx`
- Modify: `frontend/src/pages/public/PublicExperience.test.tsx`
- Modify: `docs/VERCEL_DEPLOYMENT.md`
- Test: `frontend/src/pages/public/PublicExperience.test.tsx`

**Interfaces:**
- Consumes: public legal routes and provider list already rendered by `LegalPage`.
- Produces: dated, non-certification privacy draft and a deployment checklist for the pilot.

- [ ] **Step 1: Write failing public-page tests for version, privacy channel fallback and no certification claim**

```tsx
it('identifies the privacy document as a legal-review draft and does not claim certification', () => {
  renderPrivacyRoute();
  expect(screen.getByText(/revisão jurídica/i)).toBeInTheDocument();
  expect(screen.queryByText(/certificada|100% em conformidade/i)).not.toBeInTheDocument();
});

it('uses the active support contact until a privacy mailbox is configured', () => {
  expect(screen.getByText(/bhonsuport@gmail.com/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Update legal drafts and deployment checklist**

Keep the documents human-readable. Explain controller/operator context, data categories, purpose, providers, retention, patient rights and security limits. Keep the existing active support address until an actual `privacidade@bhonapp.com.br` mailbox is confirmed; do not display an unprovisioned address. Add a production checklist to `docs/VERCEL_DEPLOYMENT.md` for legal review, a working privacy channel, secret rotation, access review, backups and incident owner.

- [ ] **Step 3: Run public tests, full builds and migration checks**

Run:

```bash
cd frontend && npx vitest run src/pages/public/PublicExperience.test.tsx --pool=threads --maxWorkers=1 --no-fileParallelism && npx tsc --noEmit && npm run build
cd ../backend && node --import tsx --test test/contact-preferences.test.mjs test/privacy-http.test.mjs test/sarah-recovery-draft.test.mjs test/onboarding.test.mjs && npm run typecheck && npm run verify:migrations
```

Expected: all commands exit 0.

- [ ] **Step 4: Apply the reviewed migration, commit and deploy**

Apply the migration through the configured Supabase workflow after inspecting its SQL. Commit all release files, push the branch and deploy via Vercel production workflow. Smoke check `/health/live`, `/login`, unauthenticated privacy endpoints and public `/privacidade`; do not use a real patient record for automated production tests.

- [ ] **Step 5: Commit the task**

```bash
git add frontend/src/pages/public/LegalPage.tsx frontend/src/pages/public/PublicExperience.test.tsx docs/VERCEL_DEPLOYMENT.md
git commit -m "docs: clarify pilot privacy safeguards"
```

## Plan self-review

- **Spec coverage:** Tasks 1–4 implement all application changes; Task 5 implements public transparency and release evidence. Lawyer review, mailbox provisioning, physical deletion and provider delivery remain explicitly out of scope as required.
- **Type consistency:** preference status names and eligibility errors are defined in Task 1 and consumed identically in Tasks 2–4; client function names are produced once in Task 4.
- **Review focus coverage:** foreign tenant is Task 2; refusal is Task 3; safe audit data is Tasks 2/4; management RBAC is Task 4; legal mailbox claim is Task 5.
- **Proportion:** tasks are split on independently reviewable deliverables: data contract, protected API, Sarah safety, UI governance and public release.


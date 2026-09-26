# Sarah Recovery Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the consented recovery workflow that lets Sarah prioritize, draft, sequence and hand off commercial opportunities without sending messages to external providers.

**Architecture:** The first release is an internal recovery domain: PostgreSQL/Prisma stores consent, opportunities, sequences and append-only communication events; Fastify exposes tenant-scoped endpoints; React renders a prioritized human-review queue. Actual Cloud API, Memed and Stripe connectors remain separate plans because their credentials, webhooks and provider contracts create independent release risk.

**Tech Stack:** Fastify, Prisma/PostgreSQL, TypeScript, React, Wouter, Vitest/Node test runner.

**Spec:** `docs/superpowers/specs/2026-09-26-sarah-recovery-design.md`

## Global Constraints

- The clinic is the data controller; all data access is tenant-scoped.
- No automatic outbound message is permitted without active, explicit, traceable WhatsApp consent.
- Commercial text must not include diagnosis, procedure, medication or other health data.
- Sarah cannot alter appointments, budgets, records or payments without a human action.
- Human request, opt-out, urgency, clinical question, exceptional negotiation or low confidence end automation immediately.
- One patient has at most one active recovery sequence.
- No provider call, billing, OAuth connection or simulated external success belongs in this plan.

## Review Focus

- A patient imported without consent must never enter an outbound-ready queue; Task 2 test pins this.
- Revoking consent after an opportunity is scheduled must cancel its active sequence; Task 2 test pins this.
- A recovery message must be rejected when its text contains protected clinical terms; Task 3 test pins this.
- Replayed or out-of-order sequence transitions must not produce duplicate contact attempts; Task 3 test pins this.
- A user from another clinic must receive neither opportunity nor communication metadata; Task 4 test pins this.

---

## File Structure

- `backend/prisma/schema.prisma` — persistent consent, opportunity, sequence and event models with tenant relations and unique active-sequence constraint.
- `backend/src/domain/recovery.ts` — pure scoring, cadence, message-safety and sequence transition rules.
- `backend/src/domain/recovery.test.ts` — deterministic tests for the domain rules.
- `backend/src/routes/recovery.ts` — tenant-scoped Fastify routes for consent, opportunities, handoff and reviewed drafts.
- `backend/test/recovery-http.test.mjs` — HTTP isolation and lifecycle tests using existing backend test conventions.
- `frontend/src/lib/recovery.ts` — typed API client and view models.
- `frontend/src/pages/clinic/FollowUpsPage.tsx` — prioritized Sarah queue and human handoff UI.
- `frontend/src/pages/clinic/FollowUpsPage.test.tsx` — query, state and action tests.

### Task 1: Persist Sarah recovery entities

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Create: `backend/prisma/migrations/<timestamp>_add_sarah_recovery/migration.sql`
- Test: `backend/test/recovery-schema.test.mjs`

**Interfaces:**
- Produces Prisma models `ContactConsent`, `RecoveryOpportunity`, `RecoverySequence`, `CommunicationEvent` for Tasks 2–4.

- [ ] **Step 1: Write the failing schema test**

Assert required tenant foreign keys, immutable event timestamp, `patientId` indexes, and a database-level constraint preventing two active sequences for one patient.

- [ ] **Step 2: Run the schema test to verify it fails**

Run: `node --import tsx --test test/recovery-schema.test.mjs`

Expected: FAIL because Sarah models are absent.

- [ ] **Step 3: Add the models and migration**

Use statuses `ACTIVE`, `PAUSED`, `ENDED` for sequences and include `channel`, `purpose`, capture/revocation metadata on consent. Store only redacted message content on events.

- [ ] **Step 4: Run schema test and Prisma validation**

Run: `node --import tsx --test test/recovery-schema.test.mjs && npx prisma validate`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/prisma
git commit -m "feat(recovery): persist consent and Sarah opportunities"
```

### Task 2: Implement consent and opportunity scoring

**Files:**
- Create: `backend/src/domain/recovery.ts`
- Create: `backend/src/domain/recovery.test.ts`

**Interfaces:**
- Consumes: Task 1 models.
- Produces: `isOutboundEligible(consent, sequence): boolean`, `scoreOpportunity(input): number`, `scheduleCadence(sourceType, now): CadenceStep[]`, `revokeConsent(sequence): SequenceTransition`.

- [ ] **Step 1: Write failing domain tests**

Cover an imported patient without consent, a revoked consent with an already scheduled sequence, each three-step cadence, and stable scoring for value/urgency/response inputs.

- [ ] **Step 2: Run the domain test to verify it fails**

Run: `node --import tsx --test src/domain/recovery.test.ts`

Expected: FAIL because recovery functions are absent.

- [ ] **Step 3: Implement deterministic recovery rules**

Make `isOutboundEligible` require active WhatsApp consent; make revocation end active sequence and schedule no further action. Use the exact cadence from the approved spec.

- [ ] **Step 4: Run domain tests**

Run: `node --import tsx --test src/domain/recovery.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/domain/recovery.ts backend/src/domain/recovery.test.ts
git commit -m "feat(recovery): add Sarah consent and cadence rules"
```

### Task 3: Add tenant-scoped recovery API and handoff lifecycle

**Files:**
- Create: `backend/src/routes/recovery.ts`
- Modify: `backend/src/server.ts`
- Create: `backend/test/recovery-http.test.mjs`

**Interfaces:**
- Consumes: Task 1 Prisma models and Task 2 domain functions.
- Produces: `GET /api/recovery/opportunities`, `POST /api/recovery/consents`, `POST /api/recovery/:id/handoff`, `POST /api/recovery/:id/opt-out`, `POST /api/recovery/:id/drafts`.

- [ ] **Step 1: Write failing HTTP tests**

Assert foreign-tenant IDs return no data, opt-out ends active sequence, handoff prevents further automation, duplicate transition is idempotent, and a draft containing a protected clinical term is rejected.

- [ ] **Step 2: Run HTTP tests to verify they fail**

Run: `node --import tsx --test test/recovery-http.test.mjs`

Expected: FAIL because routes are absent.

- [ ] **Step 3: Implement route handlers**

Use existing auth/RBAC middleware. Owner, admin, manager and reception roles may review/handoff; only authorized management roles may record clinic consent policy. Append `CommunicationEvent` records without exposing full clinical content.

- [ ] **Step 4: Run HTTP tests and typecheck**

Run: `node --import tsx --test test/recovery-http.test.mjs && npm run typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/routes/recovery.ts backend/src/server.ts backend/test/recovery-http.test.mjs
git commit -m "feat(recovery): add tenant-safe Sarah workflow API"
```

### Task 4: Ship the human recovery queue

**Files:**
- Modify: `frontend/src/lib/recovery.ts`
- Modify: `frontend/src/pages/clinic/FollowUpsPage.tsx`
- Modify: `frontend/src/pages/clinic/FollowUpsPage.test.tsx`

**Interfaces:**
- Consumes: Task 3 routes and `RecoveryOpportunity` response shape.
- Produces: human-review queue with priority, consent status, draft review, handoff and opt-out controls.

- [ ] **Step 1: Write failing UI tests**

Assert missing consent produces a non-sendable state, handoff removes the item from Sarah’s active queue, URL focus opens the intended opportunity, and an error remains visible rather than rendering a false empty queue.

- [ ] **Step 2: Run UI test to verify it fails**

Run: `npx vitest run src/pages/clinic/FollowUpsPage.test.tsx`

Expected: FAIL before the new UI state exists.

- [ ] **Step 3: Implement the queue and controls**

Render `agir agora`, `Sarah conduzindo` and `encerrado` as distinct states. Drafts must be copyable and clearly marked for human review; no send button or provider request exists.

- [ ] **Step 4: Run frontend validation**

Run: `npx vitest run src/pages/clinic/FollowUpsPage.test.tsx && npm run build`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/recovery.ts frontend/src/pages/clinic/FollowUpsPage.tsx frontend/src/pages/clinic/FollowUpsPage.test.tsx
git commit -m "feat(recovery): add Sarah human review queue"
```

### Task 5: Validate the launch foundation end-to-end

**Files:**
- Modify: `docs/superpowers/specs/2026-09-26-sarah-recovery-design.md`
- Test: `backend/test/recovery-http.test.mjs`

**Interfaces:**
- Consumes: Tasks 1–4.
- Produces: a documented launch acceptance record for the next connector plans.

- [ ] **Step 1: Add failing acceptance coverage**

Create one lifecycle test: consented budget opportunity enters queue, draft is generated, human handoff ends automation, then opt-out blocks a newly created sequence.

- [ ] **Step 2: Run acceptance test to verify it fails when lifecycle gaps exist**

Run: `node --import tsx --test test/recovery-http.test.mjs`

Expected: PASS only after Tasks 1–4 are complete.

- [ ] **Step 3: Document verified foundation scope**

Add the executed commands, migration identifier and explicit statement that Meta, Memed and Stripe remain unconnected.

- [ ] **Step 4: Run full validation**

Run: `npm run typecheck && npm test` in `backend`, then `npm run build` in `frontend`.

Expected: PASS, or document an existing test-runner infrastructure gap separately.

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/specs/2026-09-26-sarah-recovery-design.md backend/test/recovery-http.test.mjs
git commit -m "test(recovery): verify Sarah launch foundation"
```

## Deferred Connector Plans

1. Meta WhatsApp Cloud API: Embedded Signup, token encryption, webhook verification, message template policy, delivery/retry/idempotency and cost observability.
2. Multi-specialty prescription: provider abstraction, CFO guided flow for dental, Memed production connector, professional eligibility and document reference capture.
3. Stripe: R$ 390 subscription, Checkout, customer portal, idempotent webhook and clinic entitlement rules.


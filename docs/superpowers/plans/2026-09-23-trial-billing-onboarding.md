# BHON Trial, Billing and Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permit a clinic to start a 14-day BHON trial through a secure Stripe Checkout and reach its first operational value in the product within 72 hours.

**Architecture:** A public signup becomes a provisional, rate-limited record. Stripe Checkout is created exclusively by the backend from the two server-owned offers; a verified, idempotent webhook provisions the tenant and owner. Persisted onboarding progress and billing read models serve the clinic and platform owner without exposing patient records or Stripe secrets.

**Tech Stack:** Fastify 5, TypeScript, Prisma/PostgreSQL, Stripe Node SDK in test mode, React 18, Wouter, Vitest, Node test runner.

**Spec:** `docs/superpowers/specs/2026-09-23-trial-acquisition-onboarding-design.md` and `docs/superpowers/specs/2026-09-23-stripe-subscriptions-design.md`

## Global Constraints

- Offer exactly `BHON_CLINIC`: R$ 290/month or R$ 2,900/year, both in BRL and both with a 14-day trial.
- Checkout, price IDs, currency, tenant selection, subscription status and access decisions are backend-owned.
- Start in Stripe Test Mode only; never place API keys, webhook secrets, passwords or customer card data in source, frontend, logs or commits.
- Process Stripe using raw request bytes, `Stripe-Signature`, durable event deduplication and guarded state transitions.
- A browser redirect is not payment or provisioning proof; only the verified webhook can provision access.
- Do not send email or WhatsApp in this cycle; persist eligible notification events only.
- Terms and Privacy consent is explicit and versioned; launch requires legal review of the document contents.
- Preserve tenant isolation and existing authenticated owner provisioning routes.

## Review Focus

- Replayed valid webhook: one event ID and concurrent delivery provision exactly one tenant, owner and subscription.
- Abandoned Checkout: no tenant, user, session or operational access exists after the browser leaves Stripe.
- Client tampering: price, currency, Stripe customer, tenant and trial duration from query/body are rejected or ignored.
- Trial expiry/payment failure: webhook state, not a frontend timer, controls access and grace period.
- Public signup abuse: malformed data, duplicate normalized email and rate-limited requests never leak whether another clinic exists.

---

## File structure

- `backend/src/domain/billing-catalog.ts`: immutable server-side BHON product and safe plan/cycle resolver.
- `backend/src/domain/trial-signup.ts`: input normalization, consent validation and first-value calculation.
- `backend/src/lib/stripe.ts`: lazy Stripe test-mode client and configuration validation.
- `backend/src/routes/public-signup.ts`: public signup and Checkout start endpoints.
- `backend/src/routes/billing.ts`: authenticated clinic portal/state and owner billing overview.
- `backend/src/routes/stripe-webhook.ts`: raw-body verified durable event acceptance and safe worker invocation.
- `backend/src/domain/stripe-events.ts`: event-to-domain transition logic with no HTTP concerns.
- `backend/prisma/schema.prisma` and a new migration: durable signup, consent, Stripe and onboarding tables/columns.
- `backend/test/billing-catalog.test.mjs`, `backend/test/public-signup.test.mjs`, `backend/test/stripe-webhook.test.mjs`, `backend/test/onboarding.test.mjs`: backend contract and idempotency coverage.
- `frontend/src/lib/billing.ts`: typed API client for signup, billing state, portal and onboarding.
- `frontend/src/pages/public/StartTrialPage.tsx`, `frontend/src/pages/public/TrialSuccessPage.tsx`: public pricing/cadastro/success flow.
- `frontend/src/components/onboarding/OnboardingChecklist.tsx`: clinic activation checklist.
- `frontend/src/pages/clinic/SubscriptionPage.tsx`, `frontend/src/pages/platform/PlatformBillingPage.tsx`, `frontend/src/pages/platform/PlatformSubscriptionsPage.tsx`: persisted billing and owner funnel views.
- `frontend/src/pages/public/StartTrialPage.test.tsx`, `frontend/src/components/onboarding/OnboardingChecklist.test.tsx`, `frontend/src/pages/platform/PlatformBillingPage.test.tsx`: visible contract coverage.
- `frontend/src/App.tsx`: public and authenticated billing/onboarding routes.

### Task 1: Add the server-owned offer catalog and configuration boundary

**Files:**
- Create: `backend/src/domain/billing-catalog.ts`
- Create: `backend/src/lib/stripe.ts`
- Modify: `backend/package.json`
- Test: `backend/test/billing-catalog.test.mjs`

**Interfaces:**
- Produces `resolveBhonOffer(cycle: "MONTHLY" | "ANNUAL"): { code: "BHON_CLINIC"; amountInCents: number; priceEnvKey: string; trialDays: 14 }`.
- Produces `getStripeConfiguration(): { secretKey: string; webhookSecret: string; monthlyPriceId: string; annualPriceId: string; billingGraceDays: number }`.

- [ ] **Step 1: Write failing catalog tests**

```js
assert.deepEqual(resolveBhonOffer("MONTHLY"), {
  code: "BHON_CLINIC", amountInCents: 29000,
  priceEnvKey: "STRIPE_PRICE_BHON_CLINIC_MONTHLY", trialDays: 14,
});
assert.equal(resolveBhonOffer("WEEKLY"), null);
assert.throws(() => getStripeConfiguration({}), /STRIPE_SECRET_KEY/);
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `npm test -- --test-name-pattern="offer catalog"` from `backend`.

Expected: FAIL because the billing catalog module does not exist.

- [ ] **Step 3: Add Stripe SDK and minimal server-only resolver**

```ts
export const BHON_OFFERS = {
  MONTHLY: { code: "BHON_CLINIC", amountInCents: 29000, priceEnvKey: "STRIPE_PRICE_BHON_CLINIC_MONTHLY", trialDays: 14 },
  ANNUAL: { code: "BHON_CLINIC", amountInCents: 290000, priceEnvKey: "STRIPE_PRICE_BHON_CLINIC_ANNUAL", trialDays: 14 },
} as const;
export function resolveBhonOffer(cycle: string) { return BHON_OFFERS[cycle as keyof typeof BHON_OFFERS] ?? null; }
```

Install the pinned `stripe` package in `backend`, load all secrets only from `process.env`, and make configuration fail closed outside tests.

- [ ] **Step 4: Run the catalog tests and typecheck**

Run: `npm test -- --test-name-pattern="offer catalog" && npm run typecheck` from `backend`.

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/package.json backend/package-lock.json backend/src/domain/billing-catalog.ts backend/src/lib/stripe.ts backend/test/billing-catalog.test.mjs
git commit -m "feat: add server-owned BHON billing catalog"
```

### Task 2: Persist provisional signup, consent, Stripe identities and onboarding state

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Create: `backend/prisma/migrations/20260923150000_trial_billing_onboarding/migration.sql`
- Test: `backend/test/billing-schema.test.mjs`

**Interfaces:**
- Produces models `TrialSignup`, `LegalConsent`, `StripeWebhookEvent`, `SubscriptionTransition`, `OnboardingProgress` and `NotificationOutbox`.
- Extends `Subscription` with unique nullable Stripe customer, subscription and price IDs plus `stripeLivemode`.

- [ ] **Step 1: Write schema contract tests**

```js
assert.match(schema, /model TrialSignup/);
assert.match(schema, /stripeEventId\s+String\s+@unique/);
assert.match(schema, /firstValueAt\s+DateTime\?/);
assert.match(schema, /stripeCustomerId\s+String\?\s+@unique/);
```

- [ ] **Step 2: Run schema contract test and verify it fails**

Run: `npm test -- --test-name-pattern="billing schema"` from `backend`.

Expected: FAIL because the models and fields are absent.

- [ ] **Step 3: Create an additive, deploy-safe migration**

Add a `trial_signups` table with normalized owner email unique only for live pending/active attempts through a partial index, consent version/timestamp, chosen cycle, password hash, status and expiry. Add tenant/user/subscription foreign keys only after Stripe confirmation. Store minimal webhook payload JSON, processing timestamps and a unique Stripe event ID. Add onboarding booleans/timestamps and an outbox that contains channel, template key and state but no rendered sensitive text.

- [ ] **Step 4: Validate migration and Prisma types**

Run: `npm run verify:migrations && npx prisma validate && npm run typecheck` from `backend`.

Expected: PASS; migration is additive and no existing production data is rewritten.

- [ ] **Step 5: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations backend/test/billing-schema.test.mjs
git commit -m "feat: persist trial billing lifecycle"
```

### Task 3: Implement safe public signup and server-created Checkout

**Files:**
- Create: `backend/src/domain/trial-signup.ts`
- Create: `backend/src/routes/public-signup.ts`
- Modify: `backend/src/app.ts`
- Test: `backend/test/public-signup.test.mjs`

**Interfaces:**
- `POST /public/trials` accepts `{ clinicName, ownerName, ownerEmail, username, password, phone, billingCycle, termsVersion, privacyVersion, acceptedTerms, acceptedPrivacy }`.
- `POST /public/trials/:id/checkout` returns `{ checkoutUrl: string }` only for its unexpired provisional signup.

- [ ] **Step 1: Write failing HTTP tests**

```js
const denied = await app.inject({ method: "POST", url: "/public/trials", payload: validSignup({ acceptedPrivacy: false }) });
assert.equal(denied.statusCode, 400);
assert.equal(denied.json().code, "LEGAL_CONSENT_REQUIRED");
const tampered = await app.inject({ method: "POST", url: "/public/trials", payload: { ...validSignup(), amount: 1, priceId: "price_any" } });
assert.equal(tampered.statusCode, 400);
```

- [ ] **Step 2: Run focused test and verify it fails**

Run: `npm test -- --test-name-pattern="public trial"` from `backend`.

Expected: FAIL because routes are not registered.

- [ ] **Step 3: Implement validation, non-enumerating duplicate behavior and Checkout**

Use JSON schema with `additionalProperties: false`; normalize email/username/phone; hash password before persistence; rate-limit by IP and normalized email. Return the same safe response for an existing pending email as for a newly accepted request. Resolve cycle through `resolveBhonOffer`; create Stripe Checkout with `mode: "subscription"`, `subscription_data.trial_period_days: 14`, server metadata `trialSignupId`, and idempotency key derived from the attempt. Never return Stripe customer or price data to the browser.

- [ ] **Step 4: Run focused tests**

Run: `npm test -- --test-name-pattern="public trial"` from `backend`.

Expected: PASS for consent, duplicate, malformed, tampered, abandoned and allowed monthly/annual cases.

- [ ] **Step 5: Commit**

```bash
git add backend/src/domain/trial-signup.ts backend/src/routes/public-signup.ts backend/src/app.ts backend/test/public-signup.test.mjs
git commit -m "feat: start secure BHON trial checkout"
```

### Task 4: Accept Stripe webhooks durably and provision exactly once

**Files:**
- Create: `backend/src/domain/stripe-events.ts`
- Create: `backend/src/routes/stripe-webhook.ts`
- Modify: `backend/src/app.ts`
- Test: `backend/test/stripe-webhook.test.mjs`

**Interfaces:**
- `POST /webhooks/stripe` consumes raw bytes and Stripe signature.
- `processStripeEvent(eventId: string): Promise<void>` applies a guarded transition.

- [ ] **Step 1: Write failing webhook tests**

```js
assert.equal((await app.inject({ method: "POST", url: "/webhooks/stripe", payload: "{}" })).statusCode, 400);
await deliverSignedEvent("evt_trial_start");
await deliverSignedEvent("evt_trial_start");
assert.equal(await count("tenants"), 1);
assert.equal(await count("users"), 1);
assert.equal(await count("subscriptions"), 1);
```

- [ ] **Step 2: Run focused test and verify it fails**

Run: `npm test -- --test-name-pattern="Stripe webhook"` from `backend`.

Expected: FAIL because the webhook route does not exist.

- [ ] **Step 3: Implement raw body verification and transactional provisioning**

Configure Fastify to retain raw bytes only for this endpoint. Verify with `stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)`; reject invalid/stale signatures before storage. Insert `StripeWebhookEvent` with a unique ID first. Process `checkout.session.completed`, `customer.subscription.created|updated|deleted`, `invoice.paid`, `invoice.payment_failed` and `customer.subscription.trial_will_end` through guarded, monotonic transition functions. On a trial-start session, transactionally create tenant, owner, `BHON_CLINIC` subscription, audit log, onboarding progress and notification outbox events. Return 2xx only after durable event insertion; storage failure returns non-2xx for Stripe retry.

- [ ] **Step 4: Run idempotency and error tests**

Run: `npm test -- --test-name-pattern="Stripe webhook"` from `backend`.

Expected: PASS for duplicate delivery, invalid signature, old event, failure before inbox persistence and cancelled subscription.

- [ ] **Step 5: Commit**

```bash
git add backend/src/domain/stripe-events.ts backend/src/routes/stripe-webhook.ts backend/src/app.ts backend/test/stripe-webhook.test.mjs
git commit -m "feat: provision trials from verified Stripe webhooks"
```

### Task 5: Provide authenticated billing state, Portal and owner funnel metrics

**Files:**
- Create: `backend/src/routes/billing.ts`
- Modify: `backend/src/app.ts`
- Test: `backend/test/billing-http.test.mjs`

**Interfaces:**
- `GET /api/platform/billing/subscription` returns only caller tenant billing state.
- `POST /api/platform/billing/portal` creates a Stripe portal session for the caller tenant customer.
- `GET /api/platform/billing/overview` is `PLATFORM_OWNER` only and returns aggregate funnel metrics.

- [ ] **Step 1: Write failing authorization tests**

```js
assert.equal((await app.inject({ method: "GET", url: "/api/platform/billing/subscription" })).statusCode, 401);
assert.equal((await asClinicB.inject({ method: "GET", url: "/api/platform/billing/subscription" })).json().tenantId, clinicB.id);
assert.equal((await asClinicB.inject({ method: "GET", url: "/api/platform/billing/overview" })).statusCode, 403);
```

- [ ] **Step 2: Run focused test and verify it fails**

Run: `npm test -- --test-name-pattern="billing HTTP"` from `backend`.

Expected: FAIL because billing routes are absent.

- [ ] **Step 3: Implement read models without manual payment controls**

Clinic state returns current period, status, allowed action and onboarding status only. Portal uses the authenticated tenant's stored Stripe customer ID, never a body parameter. Owner metrics aggregate signups started, Checkout started/completed, active trials, first value within 72 hours, conversion and cancellations by date range. Remove/disable any client-only action that marks a platform invoice paid.

- [ ] **Step 4: Run focused tests**

Run: `npm test -- --test-name-pattern="billing HTTP"` from `backend`.

Expected: PASS for tenant isolation, role gates, portal ownership and no manual paid transition.

- [ ] **Step 5: Commit**

```bash
git add backend/src/routes/billing.ts backend/src/app.ts backend/test/billing-http.test.mjs
git commit -m "feat: expose secure billing state and funnel metrics"
```

### Task 6: Persist onboarding progress from real clinic actions

**Files:**
- Modify: `backend/src/routes/clinical.ts`
- Modify: `backend/src/routes/team.ts`
- Modify: `backend/src/routes/recovery.ts`
- Create: `backend/src/domain/onboarding.ts`
- Test: `backend/test/onboarding.test.mjs`

**Interfaces:**
- `recordOnboardingEvent(tenantId: string, event: "TEAM_MEMBER_CREATED" | "PATIENT_READY" | "APPOINTMENT_CREATED" | "FOLLOW_UP_CREATED"): Promise<OnboardingProgress>`.

- [ ] **Step 1: Write failing domain tests**

```js
let progress = await recordOnboardingEvent("tenant-1", "PATIENT_READY");
assert.equal(progress.patientReadyAt !== null, true);
progress = await recordOnboardingEvent("tenant-1", "APPOINTMENT_CREATED");
assert.equal(progress.firstValueAt !== null, true);
```

- [ ] **Step 2: Run focused test and verify it fails**

Run: `npm test -- --test-name-pattern="onboarding"` from `backend`.

Expected: FAIL because onboarding events are not persisted.

- [ ] **Step 3: Implement idempotent post-success recording**

Call the domain function only after a transaction successfully creates a team member, patient/imported valid batch, appointment or follow-up. First value becomes set when a patient exists and either an appointment or follow-up exists. Repeating events must never reset timestamps or emit duplicate outbox records.

- [ ] **Step 4: Run focused and affected backend tests**

Run: `npm test -- --test-name-pattern="onboarding|scheduling|tenant provisioning"` from `backend`.

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/domain/onboarding.ts backend/src/routes/clinical.ts backend/src/routes/team.ts backend/src/routes/recovery.ts backend/test/onboarding.test.mjs
git commit -m "feat: track clinic activation milestones"
```

### Task 7: Build public pricing, signup and confirmation views

**Files:**
- Create: `frontend/src/lib/billing.ts`
- Create: `frontend/src/pages/public/StartTrialPage.tsx`
- Create: `frontend/src/pages/public/TrialSuccessPage.tsx`
- Modify: `frontend/src/App.tsx`
- Test: `frontend/src/pages/public/StartTrialPage.test.tsx`

**Interfaces:**
- `startTrial(input: TrialSignupInput): Promise<{ id: string }>` and `startCheckout(id: string): Promise<{ checkoutUrl: string }>`.
- Routes `/comece` and `/teste-confirmado` are public; app access remains guarded.

- [ ] **Step 1: Write failing UI tests**

```tsx
render(<StartTrialPage />);
await user.click(screen.getByRole("button", { name: /começar mensal/i }));
expect(screen.getByText("R$ 290 por mês")).toBeInTheDocument();
expect(screen.getByRole("checkbox", { name: /termos de uso/i })).toBeRequired();
```

- [ ] **Step 2: Run focused test and verify it fails**

Run: `npm test -- StartTrialPage.test.tsx` from `frontend`.

Expected: FAIL because the page and API client do not exist.

- [ ] **Step 3: Implement two-card public funnel**

Render only monthly R$ 290 and annual R$ 2.900, the annual saving of R$ 580, 14-day trial, card requirement, exact future charge disclosure, cancel action and links to legal documents. Keep all sensitive data in controlled fields; on submit call signup then Checkout and navigate only to the backend-provided Stripe URL. The success page says the account is being confirmed and polls a safe status endpoint; it never asserts access before webhook confirmation.

- [ ] **Step 4: Run focused UI tests and frontend build**

Run: `npm test -- StartTrialPage.test.tsx && npm run build` from `frontend`.

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/billing.ts frontend/src/pages/public frontend/src/App.tsx
git commit -m "feat: add BHON public trial signup flow"
```

### Task 8: Replace local billing screens and add clinic onboarding UI

**Files:**
- Create: `frontend/src/components/onboarding/OnboardingChecklist.tsx`
- Create: `frontend/src/pages/clinic/SubscriptionPage.tsx`
- Modify: `frontend/src/pages/platform/PlatformBillingPage.tsx`
- Modify: `frontend/src/pages/platform/PlatformSubscriptionsPage.tsx`
- Modify: `frontend/src/App.tsx`
- Test: `frontend/src/components/onboarding/OnboardingChecklist.test.tsx`
- Test: `frontend/src/pages/platform/PlatformBillingPage.test.tsx`

**Interfaces:**
- `OnboardingChecklist` receives `{ clinicProfileReadyAt, teamReadyAt, patientReadyAt, appointmentReadyAt, followUpReadyAt, firstValueAt }`.
- Platform views consume `GET /api/platform/billing/overview`, not `OperationalDataContext` billing mocks.

- [ ] **Step 1: Write failing component tests**

```tsx
render(<OnboardingChecklist progress={{ patientReadyAt: "2026-09-23T10:00:00Z", appointmentReadyAt: null, firstValueAt: null }} />);
expect(screen.getByText(/crie o primeiro agendamento/i)).toBeInTheDocument();
expect(screen.queryByText(/primeiro valor alcançado/i)).not.toBeInTheDocument();
```

- [ ] **Step 2: Run focused UI tests and verify failure**

Run: `npm test -- OnboardingChecklist.test.tsx PlatformBillingPage.test.tsx` from `frontend`.

Expected: FAIL because the components still use local billing data.

- [ ] **Step 3: Implement state-driven UI**

Show clinic subscription status, period, trial deadline and “Gerenciar assinatura” portal action. Show onboarding next action without blocking the rest of the product. Replace the owner cards and tables with API-backed funnel/billing data; remove the “Confirmar Pagamento” local-state action and plan price prompt. Present one BHON product with its two billing cycles.

- [ ] **Step 4: Run focused tests and build**

Run: `npm test -- OnboardingChecklist.test.tsx PlatformBillingPage.test.tsx && npm run build` from `frontend`.

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/onboarding frontend/src/pages/clinic/SubscriptionPage.tsx frontend/src/pages/platform/PlatformBillingPage.tsx frontend/src/pages/platform/PlatformSubscriptionsPage.tsx frontend/src/App.tsx
git commit -m "feat: show persistent BHON billing and onboarding"
```

### Task 9: Verify the release in test mode and prepare deployment configuration

**Files:**
- Modify: `backend/.env.example`
- Modify: `README.md`
- Test: `backend/test/stripe-webhook.test.mjs`

**Interfaces:**
- Documents only variable names: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_BHON_CLINIC_MONTHLY`, `STRIPE_PRICE_BHON_CLINIC_ANNUAL`, `STRIPE_BILLING_GRACE_DAYS` and portal configuration ID.

- [ ] **Step 1: Write a release guard test**

```js
assert.equal(getStripeConfiguration({ STRIPE_SECRET_KEY: "sk_test_x", STRIPE_WEBHOOK_SECRET: "whsec_x", STRIPE_PRICE_BHON_CLINIC_MONTHLY: "price_month", STRIPE_PRICE_BHON_CLINIC_ANNUAL: "price_year" }).livemode, false);
assert.throws(() => getStripeConfiguration({ STRIPE_SECRET_KEY: "sk_live_x" }), /test mode/);
```

- [ ] **Step 2: Run the guard test and verify it fails before enforcement**

Run: `npm test -- --test-name-pattern="release guard"` from `backend`.

Expected: FAIL until test-mode-only enforcement is implemented.

- [ ] **Step 3: Add documentation and enforce test-only mode**

Document variable names, Stripe CLI forwarding for local webhook verification, and Vercel environment placement without values. Reject live Stripe keys/configuration in this release. Configure Vercel variables manually after code review; never put them in `.env` or Git.

- [ ] **Step 4: Run the complete quality gate**

Run: `npm run typecheck && npm test` from `backend`, then `npm test && npm run build` from `frontend`.

Expected: PASS. Execute Stripe CLI test events only against the authorized test account after configuration exists.

- [ ] **Step 5: Commit and publish only after approval of test results**

```bash
git add backend/.env.example README.md backend/test/stripe-webhook.test.mjs
git commit -m "docs: prepare Stripe test-mode release"
git push origin codex/clinic-stability
```

Create a Vercel preview deployment first. Promote only after the test-mode Checkout, duplicate webhook and cancellation checks pass and the user approves the preview.

## Plan self-review

- Spec coverage: Tasks 1–5 implement offer, consent, Checkout, webhook, billing status, portal and owner funnel; Task 6 covers first value; Tasks 7–8 cover public/clinic/owner UI; Task 9 covers safe release.
- Placeholder scan: no unresolved implementation placeholders are present.
- Type consistency: `BHON_CLINIC`, `MONTHLY`, `ANNUAL`, 14-day trial and the onboarding event names are defined once and reused by later tasks.
- Review focus coverage: webhook replay is Task 4; abandoned Checkout and client tampering are Task 3; expiry is Task 4/5; abuse is Task 3.

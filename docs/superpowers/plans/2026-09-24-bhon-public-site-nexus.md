# BHON Public Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an original responsive BHON public site with Nexus-inspired motion, the unmodified supplied logo, product immersion, pricing, and legal pages.

**Architecture:** Preserve the React/Vite/Wouter application and replace only public-page presentation. Typed components use Framer Motion for optional motion; checkout, login, clinic and platform routes remain independent.

**Tech Stack:** React 18, TypeScript, Vite, Wouter, Tailwind CSS, Framer Motion, Lucide React, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-24-bhon-public-site-nexus-design.md`

## Global Constraints

- Alter only public routes and public presentation components.
- Copy the supplied logo byte-for-byte; never crop, recolor, filter, redraw, or recompress it.
- Use R$ 290/month and R$ 2.900/year, both with 14 days of testing.
- Use `bhonsuport@gmail.com` as the support address.
- Do not invent customers, results, certifications, or availability guarantees.
- Respect reduced motion and never make touch interaction depend on hover.
- Validate in preview only; do not promote production in this cycle.

## Review Focus

- Public root stays public while authenticated root redirects correctly.
- Every pricing CTA retains `/comece`.
- Header, hero and phone preview do not overflow at 320 px.
- Reduced motion retains all content and actions.
- Legal URLs work directly and show the support email.

---

### Task 1: Motion foundation, header, footer, and logo

**Files:**
- Modify: `frontend/package.json`, `frontend/package-lock.json`, `frontend/src/index.css`
- Create: `frontend/public/logo-bhon-public.png`
- Create: `frontend/src/components/public/PublicShell.tsx`
- Create: `frontend/src/components/public/PublicHeader.tsx`
- Create: `frontend/src/components/public/PublicFooter.tsx`
- Test: `frontend/src/components/public/PublicHeader.test.tsx`

**Interfaces:** Produces `PublicShell`, `PublicHeader`, and `PublicFooter` for pages without authenticated context.

- [ ] **Step 1: Write the failing mobile-navigation test**

```tsx
it('opens mobile navigation with public destinations', async () => {
  const user = userEvent.setup();
  render(<PublicHeader />);
  await user.click(screen.getByRole('button', { name: /abrir navegação/i }));
  expect(screen.getByRole('link', { name: 'Produto' })).toHaveAttribute('href', '/#produto');
  expect(screen.getByRole('link', { name: /começar teste/i })).toHaveAttribute('href', '/comece');
});
```

- [ ] **Step 2: Verify the test fails**

Run `npm test -- --run src/components/public/PublicHeader.test.tsx`; expect failure because `PublicHeader` does not exist.

- [ ] **Step 3: Add Framer Motion and copy the asset**

Run `npm install framer-motion@^12.38.0`.

Run `Copy-Item -LiteralPath 'C:\Users\ROBERTO T . I\Downloads\logo atualizada (1).png' -Destination 'frontend\public\logo-bhon-public.png'`.

Verify `(Get-FileHash 'C:\Users\ROBERTO T . I\Downloads\logo atualizada (1).png').Hash -eq (Get-FileHash 'frontend\public\logo-bhon-public.png').Hash`.

- [ ] **Step 4: Implement primitives**

```tsx
export const PublicHeader = () => {
  const [open, setOpen] = useState(false);
  return <header>{/* anchors, /login, /comece and aria-labelled menu */}</header>;
};
```

Add CSS reduced-motion protection. Use `/logo-bhon-public.png` with `object-contain`; never transform the image. Limit pointer-following effects to `(hover: hover) and (pointer: fine)`.

- [ ] **Step 5: Verify and commit**

Run `npm test -- --run src/components/public/PublicHeader.test.tsx`; expect pass.

Run `git add frontend/package.json frontend/package-lock.json frontend/public/logo-bhon-public.png frontend/src/components/public frontend/src/index.css`.

Run `git commit -m "feat: add BHON public site motion foundation"`.

### Task 2: Landing content and dashboard-mobile immersion

**Files:**
- Create: `frontend/src/components/public/PublicReveal.tsx`
- Create: `frontend/src/components/public/DashboardMobilePreview.tsx`
- Create: `frontend/src/components/public/ProductPillars.tsx`
- Create: `frontend/src/components/public/PricingCards.tsx`
- Create: `frontend/src/components/public/PublicFaq.tsx`
- Modify: `frontend/src/pages/public/BhonLandingPage.tsx`
- Test: `frontend/src/pages/public/BhonLandingPage.test.tsx`

**Interfaces:** Consumes `PublicShell`; produces `DashboardMobilePreview` with `aria-label="Prévia do painel móvel da BHON"` and a composed `BhonLandingPage`.

- [ ] **Step 1: Extend the landing test**

```tsx
it('shows the dashboard mobile preview and conversion paths', () => {
  render(<BhonLandingPage />);
  expect(screen.getByLabelText(/prévia do painel móvel da BHON/i)).toBeVisible();
  expect(screen.getAllByRole('link', { name: /começar teste/i })[0]).toHaveAttribute('href', '/comece');
  expect(screen.getByRole('link', { name: /bhonsuport@gmail.com/i })).toHaveAttribute('href', 'mailto:bhonsuport@gmail.com');
});
```

- [ ] **Step 2: Verify the test fails**

Run `npm test -- --run src/pages/public/BhonLandingPage.test.tsx`; expect failure because preview and contact do not exist.

- [ ] **Step 3: Implement product sections**

```tsx
export const DashboardMobilePreview = () => (
  <figure aria-label="Prévia do painel móvel da BHON">
    <figcaption className="sr-only">Agenda, prioridades e retornos em uma ilustração de telefone.</figcaption>
  </figure>
);
```

Use illustrative non-identifying appointment content. Pillars must cover agenda, patients, team, opportunities, and support. Remove fictional Nexus proof content.

- [ ] **Step 4: Compose the landing page**

```tsx
export const BhonLandingPage = () => (
  <PublicShell>
    <Hero />
    <DashboardMobilePreview />
    <ProductPillars />
    <PricingCards />
    <SecuritySection />
    <PublicFaq />
  </PublicShell>
);
```

Use `MotionConfig reducedMotion="user"`, stable anchors, normal CTA links, formal direct Portuguese, approved prices, and the support mailto link.

- [ ] **Step 5: Verify and commit**

Run `npm test -- --run src/pages/public/BhonLandingPage.test.tsx`; expect pass.

Run `git add frontend/src/components/public frontend/src/pages/public/BhonLandingPage.tsx frontend/src/pages/public/BhonLandingPage.test.tsx`.

Run `git commit -m "feat: redesign BHON public landing experience"`.

### Task 3: Legal pages and routes

**Files:**
- Create: `frontend/src/pages/public/LegalPage.tsx`
- Test: `frontend/src/pages/public/LegalPage.test.tsx`
- Modify: `frontend/src/App.tsx`

**Interfaces:** Produces `LegalPage({ kind: 'terms' | 'privacy' })` and public `/termos`, `/privacidade` routes.

- [ ] **Step 1: Write direct-route tests**

```tsx
it.each([['/termos', /termos de uso/i], ['/privacidade', /política de privacidade/i]])('renders %s', (path, title) => {
  window.history.pushState({}, '', path);
  render(<App />);
  expect(screen.getByRole('heading', { name: title })).toBeVisible();
  expect(screen.getByRole('link', { name: /bhonsuport@gmail.com/i })).toHaveAttribute('href', 'mailto:bhonsuport@gmail.com');
});
```

- [ ] **Step 2: Verify the test fails**

Run `npm test -- --run src/pages/public/LegalPage.test.tsx`; expect failure because routes are absent.

- [ ] **Step 3: Implement pages and declarations**

```tsx
<Route path="/termos"><LegalPage kind="terms" /></Route>
<Route path="/privacidade"><LegalPage kind="privacy" /></Route>
```

Terms include service scope, responsibility, subscription/cancellation and acceptable use. Privacy includes purpose, data types, retention, safeguards and contact. Both visibly request legal review before commercial launch and make no certification claim.

- [ ] **Step 4: Verify and commit**

Run `npm test -- --run src/pages/public/LegalPage.test.tsx`; expect pass.

Run `git add frontend/src/pages/public/LegalPage.tsx frontend/src/pages/public/LegalPage.test.tsx frontend/src/App.tsx`.

Run `git commit -m "feat: add BHON public legal pages"`.

### Task 4: Route regression and preview readiness

**Files:**
- Modify: `frontend/src/App.test.tsx`
- Modify: `frontend/README.md`

**Interfaces:** Validates output from Tasks 1–3 without changing authenticated flows.

- [ ] **Step 1: Add route-isolation test**

```tsx
it('keeps the trial route independent from public landing layout', () => {
  window.history.pushState({}, '', '/comece');
  render(<App />);
  expect(screen.getByRole('heading', { name: /comece com 14 dias/i })).toBeVisible();
  expect(screen.queryByLabelText(/prévia do painel móvel/i)).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Verify baseline**

Run `npm test -- --run src/App.test.tsx`; expect pass, or failure only if public content leaks into `/comece`.

- [ ] **Step 3: Correct any discovered route leak and document validation**

Keep explicit public declarations: root, `/comece`, `/termos`, `/privacidade`, then `/login`. Document `npm test`, `npm run build`, and preview-only deployment in `frontend/README.md`.

- [ ] **Step 4: Validate and commit**

Run `npm test`; expect pass.

Run `npm run build`; expect pass without TypeScript errors.

Run `npm run dev -- --host 127.0.0.1`; inspect `/`, legal URLs, `/comece`, `/login`, desktop, 320 px and reduced-motion behavior.

Run `git add frontend/src/App.test.tsx frontend/README.md`.

Run `git commit -m "test: cover BHON public site route isolation"`.

## Self-review

1. **Spec coverage:** Tasks 1–2 cover logo, visual direction, motion, responsiveness, copy, plans, contact, and dashboard immersion. Task 3 covers legal pages. Task 4 protects existing public conversion and authentication routes.
2. **Placeholder scan:** Each task has concrete files, a test command, implementation boundary, and validation.
3. **Type consistency:** `PublicShell` is exported in Task 1 and used in Tasks 2–3; `LegalPage` accepts only `terms | privacy` in every route.
4. **Review Focus:** Task 1 tests mobile navigation; Task 2 tests CTA and phone preview; Task 3 tests direct legal URLs; Task 4 checks route isolation, viewport, and reduced motion.

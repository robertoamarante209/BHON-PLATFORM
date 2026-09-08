# BHON Pilot Publication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publicar um piloto acessível da BHON com marca atualizada, banco Supabase validado, testes verdes e deployment Vercel verificável.

**Architecture:** Manter a SPA React/Vite e a API Fastify/Prisma no mesmo domínio Vercel, com PostgreSQL Supabase como fonte de verdade. Alterações serão mínimas e orientadas por falhas reproduzíveis, sem ampliar o escopo funcional do roadmap.

**Tech Stack:** React 18, Vite 8, TypeScript, Fastify 5, Prisma 7, PostgreSQL/Supabase, Vercel Services, Node.js 24 e npm.

**Spec:** `docs/superpowers/specs/2026-09-08-piloto-publicavel-design.md`

## Global Constraints

- Não versionar nem imprimir `.env`, URLs de banco, senhas, cookies, chaves ou tokens.
- Tratar o deployment como piloto, não como produção plena para dados clínicos sensíveis.
- Criar testes de regressão antes de correções comportamentais.
- Salvar toda mudança material em commit antes de publicar.
- Não alterar dados remotos sem primeiro inspecionar migrations, tabelas e advisors.

---

### Task 1: Toolchain and Clean Baseline

**Files:**
- Verify: `backend/package-lock.json`
- Verify: `frontend/package-lock.json`
- Verify: `backend/prisma/schema.prisma`
- Verify: `backend/prisma/migrations/**/migration.sql`

**Interfaces:**
- Consumes: Node.js 24, npm lockfiles and committed Prisma migrations.
- Produces: a recorded pass/fail baseline for backend, frontend and migration validation.

- [ ] **Step 1: Repair or install Git for Windows**

Install the latest signed x64 Git for Windows release and verify:

```text
git --version
git remote -v
git fetch --dry-run origin
```

Expected: all commands complete without a missing `git-remote-https` helper.

- [ ] **Step 2: Install dependencies from lockfiles**

Run in `backend/` and `frontend/`, using workspace-local npm caches:

```text
npm ci
```

Expected: exit 0 and no lockfile changes.

- [ ] **Step 3: Validate backend and migrations**

Run in `backend/`:

```text
npx prisma validate
npm run verify:migrations
npm run typecheck
npm test
npm run build
```

Expected: schema valid, migrations accepted, typecheck/build exit 0 and all existing tests pass.

- [ ] **Step 4: Validate frontend and Vercel JSON**

Run:

```text
cd frontend && npm run build
node -e "JSON.parse(require('fs').readFileSync('vercel.json', 'utf8'))"
```

Expected: Vite build completes and `vercel.json` parses.

- [ ] **Step 5: Diagnose any baseline failure before editing**

For each failure, invoke `superpowers:systematic-debugging`, reproduce the smallest failing command and identify root cause. If behavior must change, add a focused failing test to the existing `backend/test/*.test.mjs` suite before modifying source.

---

### Task 2: Updated Brand Lockup

**Files:**
- Create: `frontend/public/brand-lockup.webp`
- Modify: `frontend/src/pages/login/LoginPage.tsx`
- Verify: `frontend/public/logo.png`
- Verify: `frontend/public/favicon.png`

**Interfaces:**
- Consumes: user-supplied WEBP master logo.
- Produces: `/brand-lockup.webp` for the login hero while compact transparent assets remain available to both sidebars and the favicon.

- [ ] **Step 1: Copy the master asset without transcoding**

Copy the supplied WEBP byte-for-byte to `frontend/public/brand-lockup.webp` and compare file hashes.

- [ ] **Step 2: Update the login brand surface**

Replace the login logo block with:

```tsx
<div className="mx-auto h-28 w-full max-w-sm overflow-hidden rounded-lg bg-bhon-navy">
  <img
    src="/brand-lockup.webp"
    alt="BHON — A clínica no controle."
    className="h-full w-full object-cover object-center"
  />
</div>
```

Keep `/logo.png` in the narrow sidebars because it is already a transparent compact lockup, and keep `/favicon.png` as the tooth mark.

- [ ] **Step 3: Build and inspect responsive rendering**

Run `npm run build` in `frontend/`, start a local preview and inspect login plus both sidebar variants at desktop and narrow widths. Expected: no distortion, clipping of the wordmark, duplicate brand, overflow or console error.

- [ ] **Step 4: Commit the brand update**

```text
git add frontend/public/brand-lockup.webp frontend/src/pages/login/LoginPage.tsx
git commit -m feat:atualizar-marca-bhon
```

---

### Task 3: Supabase Production-Readiness Check

**Files:**
- Verify: `backend/prisma/schema.prisma`
- Verify: `backend/prisma/migrations/**/migration.sql`
- Modify only if drift exists: a new migration created through the Prisma/Supabase migration workflow.

**Interfaces:**
- Consumes: Supabase project `pngxrwsvnqghloebbbba` and committed Prisma schema/migrations.
- Produces: matching migration state, healthy security/performance advisor results or an explicit risk list.

- [ ] **Step 1: Review current Supabase guidance**

Fetch the Supabase changelog index and relevant migration/security documentation before remote changes.

- [ ] **Step 2: Inspect remote state without mutation**

List remote migrations, exposed tables, extensions and both security/performance advisors. Compare migration names and tables with `backend/prisma/migrations` and `schema.prisma`.

- [ ] **Step 3: Reconcile only proven missing migrations**

If the remote migration list is behind, apply the exact committed SQL files in numeric order using their existing migration names. Do not invent DDL and do not modify a migration already recorded remotely.

- [ ] **Step 4: Verify database readiness**

Execute `SELECT 1 AS ok` and read-only counts from `Tenant` and `User` without returning row contents. Expected: query succeeds and no sensitive data is printed.

- [ ] **Step 5: Re-run advisors and record blockers**

Expected: no newly introduced security advisory. Any pre-existing advisory that blocks the pilot becomes a dedicated tested fix; non-blocking advisories are documented.

---

### Task 4: Vercel Link, Secrets and Deployment

**Files:**
- Verify or modify with a tested reason: `vercel.json`
- Never create: tracked `.env` files

**Interfaces:**
- Consumes: GitHub repository, Vercel account/project, Supabase runtime and direct connection values supplied through provider secret stores.
- Produces: one preview or production deployment URL on the BHON project.

- [ ] **Step 1: Discover the Vercel scope**

List teams and projects through the connected Vercel plugin. If the project is personal and unavailable to the plugin, import/link `robertoamarante209/BHON-PLATFORM` in the Vercel UI and use Git integration for deployment.

- [ ] **Step 2: Configure backend-only environment variables**

Set `DATABASE_URL`, `DIRECT_URL`, `COOKIE_SECRET`, `CORS_ORIGINS`, `NODE_ENV=production` and `ALLOW_BEARER_AUTH=false` in Vercel. Set `BHON_SEED_PASSWORD` only for the initial controlled seed and never expose its value in logs or Git.

- [ ] **Step 3: Push committed code**

```text
git status --short
git diff --cached --check
git push origin main
```

Expected: clean secret scan, successful push and a Vercel deployment triggered or created.

- [ ] **Step 4: Verify build logs**

Inspect the Vercel build result. Expected: dependency install, migration deployment when configured, Prisma generation, backend build and frontend build complete without secret values in output.

---

### Task 5: Deployment Smoke Tests and Handoff

**Files:**
- Modify if results changed: `docs/ROADMAP.md`
- Create: `docs/PILOT_RELEASE.md`

**Interfaces:**
- Consumes: deployed same-origin URL and configured pilot account.
- Produces: evidence-backed release status, limitations and rollback reference.

- [ ] **Step 1: Verify public health endpoints**

Request `/health/live` and `/health/ready`. Expected: HTTP 200; readiness reports `database=connected` without raw connection errors.

- [ ] **Step 2: Verify authentication lifecycle**

Log in through the browser, refresh, navigate to the authorized environment and log out. Expected: secure HttpOnly session cookie, persisted session after refresh and rejected access after logout.

- [ ] **Step 3: Verify persisted clinical flow**

Create one clearly labeled pilot patient, reload the list and confirm persistence. Verify an unauthenticated API request returns 401/403. Do not use real patient information.

- [ ] **Step 4: Document release evidence**

Write `docs/PILOT_RELEASE.md` with deployment URL, commit SHA, commands/tests passed, Supabase/Vercel checks, known limitations and rollback deployment/commit. Do not include credentials or database URLs.

- [ ] **Step 5: Run final verification and commit**

Run the complete backend and frontend validation commands again, inspect `git status`, scan tracked files for `.env` and common secret prefixes, then commit the release evidence.

- [ ] **Step 6: Push the final evidence commit**

```text
git push origin main
```

Expected: GitHub main contains all reviewed commits and the published deployment matches the recorded SHA.

# BHON Security Remediation — local hardening

This document records the hardening applied after auditing the local Antigravity commit `02d0cef`.

## Applied

- Session authority remains server-side with PostgreSQL-backed sessions and HttpOnly cookies.
- Browser `localStorage` is no longer treated as authentication authority.
- Removed demo role switching from login and clinic sidebar.
- Frontend environment routes now enforce `PLATFORM_OWNER` vs clinic users.
- RBAC is explicit on clinical API operations; `PLATFORM_OWNER` no longer bypasses declared roles.
- Tenant override requires `PLATFORM_OWNER`, validates the target tenant, blocks suspended/cancelled tenants, and creates an audit event.
- Clinic sessions are rejected after suspension/cancellation.
- Removed token from login JSON response; token remains in HttpOnly cookie.
- CORS is allowlisted instead of `origin: true`.
- `COOKIE_SECRET` must be provided by the environment; no hardcoded fallback.
- `DATABASE_URL` must be provided; no local database fallback in Prisma config.
- Patient record numbers use an atomic per-tenant sequence instead of `count + 1`.
- Appointment creation validates tenant ownership of patient/professional/room/treatment/stage relationships.
- Appointment status transitions are constrained by an explicit state machine.
- Budget approval is idempotent and refuses to create a second active treatment for the same patient.
- Budget approval converts only the most recent open opportunity for the patient.
- Clinic payments create/update a corresponding `FinancialTransaction` atomically.
- Global search now includes appointments, follow-ups and opportunities in addition to patients, treatments and budgets.
- Health endpoint no longer exposes raw database error messages.

## Intentionally not claimed as complete

The repository still needs the remaining domain APIs and frontend-to-backend integration for all clinical modules, plus the full BHON Platform backend. Those are separate implementation stages and should not be represented as finished merely because authentication and a subset of the clinical API are real.

# BHON Google Authentication Design

## Context

BHON currently authenticates users with email/password and server-side PostgreSQL sessions. The existing `User` model is tenant-scoped and uses a composite unique key on `(tenantId, emailNormalized)`. The current login endpoint creates secure HttpOnly sessions after password verification. The login page currently exposes only email/password.

The goal is to add Google Sign-In without replacing password authentication, while preserving BHON as the authority for tenant membership, role, authorization, audit, and session management.

The first linked account is the existing OWNER user for the OdontoPrime tenant, using the user's Google account `robertoamarante209@gmail.com`. No new OWNER should be created.

## Goals

- Add a production-grade "Continuar com Google" authentication method.
- Link the existing OWNER user to the user's Google account.
- Preserve email/password login as a fallback.
- Identify Google accounts by Google's stable `sub` claim, not by email.
- Keep tenant membership and RBAC entirely inside BHON.
- Support future commercial clinics and Google Workspace accounts.
- Preserve the existing HttpOnly BHON session model after Google authentication.
- Record Google sign-in events in the existing audit trail.
- Prevent account takeover through unsafe automatic account linking.

## Non-goals

- Replacing BHON sessions with Google sessions.
- Using Google access tokens as application session tokens.
- Automatically creating clinic OWNER accounts from arbitrary Google identities.
- Restricting authentication to `@gmail.com` domains.
- Adding Google Drive/Calendar/Gmail API access.

## Proposed architecture

### Identity model

Add a nullable `googleSubject` field to `User`, indexed for lookup. The value is the Google ID token `sub` claim. It must be globally unique within BHON because a Google subject identifies the Google account independently of the user's email address.

A user can have:
- password only;
- Google only;
- both password and Google.

This permits gradual migration and account recovery without forcing one authentication method.

### Google login flow

1. Login page renders the official Google Sign-In button.
2. Google returns an ID token to the BHON frontend.
3. Frontend sends the ID token to a dedicated BHON endpoint such as `POST /auth/google`.
4. Backend verifies the token signature and claims, including issuer, audience, expiry, and email verification/Google authority conditions.
5. Backend reads `sub` as the Google identity key.
6. If `googleSubject` is already linked, the corresponding active BHON user is authenticated.
7. If no subject is linked, BHON may perform a controlled account-linking path using the verified email, but only when there is an unambiguous existing user and the linking policy is satisfied. It must not blindly create or reassign users across tenants.
8. Backend creates the same secure BHON session used by password login and sets the same HttpOnly cookie.
9. Backend records the authentication event in `AuditLog`.
10. Frontend redirects based on the BHON role, not the Google account.

Google's documentation explicitly recommends the `sub` claim as the stable unique identifier and requires server-side ID-token validation before trusting the token.

## Account-linking safety

The existing OWNER account has a different email address from the selected Google account. Therefore the first production link cannot safely be inferred solely from email equality.

For this first link, use an explicit authenticated account-linking operation. The user must already prove control of the existing BHON OWNER account through the current password or a secure account-recovery mechanism. The link then stores the verified Google `sub` against that exact BHON user and tenant.

After the link, signing in with `robertoamarante209@gmail.com` must resolve to the existing OWNER record and never create a second OWNER.

For future clinics, an administrator should explicitly invite/link a Google identity to an existing user. Google email equality can be used as a signal, not as the sole authorization boundary when it would cross tenant or role boundaries.

## Frontend

Update `frontend/src/pages/login/LoginPage.tsx` to add a visually restrained Google Sign-In action between the password form and the existing alternative/fallback area. The control should use Google's supported button treatment and must not introduce generic SaaS/AI styling.

The page continues to support email/password, remember-me, errors, loading, and role-based redirects.

The Google client ID is supplied through environment configuration and is never hardcoded as a secret.

## Backend

Update `backend/src/routes/auth.ts` or a dedicated Google auth module to:

- accept an ID token;
- verify it against Google's published signing keys using a maintained Google/OIDC library;
- validate issuer and audience against the configured Google client ID;
- validate expiry and relevant email authority/verification claims;
- resolve `googleSubject` to a BHON user;
- enforce ACTIVE user and tenant status;
- create the normal BHON database session;
- audit successful Google authentication;
- return the same user payload shape as password login.

The existing password endpoint remains unchanged except for any shared session/audit helper extracted to avoid duplicated security logic.

## Data migration

Add a Prisma migration for:

- nullable `google_subject` column on `users`;
- unique index on `google_subject` where the database supports the required partial uniqueness semantics, or an equivalent safe uniqueness constraint.

Do not hardcode the Google subject in source code or seed data.

## Configuration

Required runtime configuration:

- `GOOGLE_CLIENT_ID`

No Google client secret is required for the Google Identity Services ID-token flow proposed here. Production and local environments must use the appropriate authorized origins/redirect configuration in Google Cloud.

The application must fail closed if Google authentication is attempted while the client ID is not configured.

## Security

- Never trust the frontend-provided email as the identity key.
- Never accept an unverified JWT without signature/audience/issuer/expiry validation.
- Use `sub` as the Google identity key.
- Do not expose Google ID tokens to application storage or logs.
- Continue issuing BHON HttpOnly, SameSite cookies for application sessions.
- Preserve rate limiting and audit logging.
- Do not automatically elevate roles based on Google claims.
- Never permit a Google identity already linked to one BHON user to be linked to another.
- Preserve server-side tenant isolation.

## Testing

Add/extend tests for:

1. successful Google authentication with a valid ID token;
2. invalid signature/token rejection;
3. wrong audience rejection;
4. expired token rejection;
5. unverified/unsupported identity rejection according to policy;
6. existing `googleSubject` resolves to the correct user;
7. inactive user rejection;
8. suspended/cancelled tenant rejection;
9. duplicate Google subject cannot link to another user;
10. first explicit link attaches the Google subject to the existing OWNER;
11. Google login creates a normal BHON session;
12. Google login creates an audit event;
13. frontend renders Google login control and preserves password login;
14. tenant isolation is preserved when resolving Google identities.

## Rollout

1. Deploy schema and backend support with Google login disabled unless `GOOGLE_CLIENT_ID` exists.
2. Configure the Google OAuth client for BHON production origin.
3. Deploy frontend button and backend endpoint.
4. Explicitly link `robertoamarante209@gmail.com` to the existing OWNER account.
5. Verify login in production.
6. Keep password login available as fallback.
7. Later add administrator-controlled Google linking/invitation for commercial clinics.

## Acceptance criteria

- The existing OWNER can use "Continuar com Google" with `robertoamarante209@gmail.com` and reaches `/clinic/overview`.
- No duplicate OWNER is created.
- Google authentication produces a normal BHON session and audit entry.
- Password login still works.
- The implementation uses Google's `sub`, not email, as the stable Google identity.
- Google authentication cannot bypass tenant isolation or RBAC.
- No secrets or ID tokens are committed to the repository.
- Automated tests cover the security-critical paths above.

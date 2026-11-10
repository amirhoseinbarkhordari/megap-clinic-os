# Security design and current limits

## Implemented foundation

- Tenant context is signed into short-lived access tokens only after the API resolves an active membership. Requests cannot choose their tenant with a client-supplied ID.
- Protected routes use a global membership guard. It rechecks the user, membership, tenant, role, and permissions on each request so suspensions take effect before token expiry.
- Access tokens expire after ten minutes. Refresh tokens are random opaque values, stored only as SHA-256 hashes, sent in an HttpOnly, SameSite=Strict cookie, and rotated with conditional revocation.
- Passwords use Node scrypt with a random 128-bit salt and explicit work factors. Password input is capped at 128 characters.
- Tenant-owned tables use PostgreSQL RLS with forced row security. Tenant scope is installed transaction-locally by `withTenantTransaction`; composite foreign keys bind memberships, roles, branches, and patients to the same tenant.
- Patient routes require the `patients.manage` permission. Patient queries are tenant-scoped both in Prisma filters and at the PostgreSQL RLS layer; optional branch assignment is constrained by a composite tenant foreign key.
- Registration creates a clinic, owner membership, first branch, permissions, and a 14-day trial atomically.
- Clinical note bodies use AES-256-GCM application-layer encryption with per-record associated data binding tenant, patient, encounter, and note identifiers. Versioned keys are supplied by environment; ciphertext, nonce, authentication tag, and key version are stored in PostgreSQL.
- Clinical encounters, notes, consents, and access-audit events have forced tenant RLS. Clinical notes and access-audit rows are append-only at the database layer. Consent rows allow a single revocation update and no deletion.
- Record reads and writes create tenant-scoped patient audit events in the same transaction. Consent has a partial unique constraint for one active consent per patient and kind.

## Database roles and production deployment

The local Compose PostgreSQL user is a development superuser and is not an acceptable production runtime identity. Production must apply migrations with a dedicated migration role, then run the API as a separate role that does not own tables, is not a superuser, and lacks `BYPASSRLS`. The runtime role needs only minimum DML grants. RLS protects against omitted tenant filters; it does not protect against arbitrary SQL executed by a compromised API role that can set transaction context. Parameterized queries, restricted raw SQL, app-layer tenant authorization, and security review remain required.

The membership RLS policy allows transaction-local `app.user_id` while resolving that authenticated user's memberships at login. The API sets it only after verifying the password, inside one transaction. Regular tenant access uses `app.tenant_id`.

## Not implemented yet

Phone/email verification, password reset, MFA, account recovery, Redis-backed rate limiting, per-device session management, external penetration testing, managed secret storage, backup restoration tests, and production least-privilege role bootstrap remain release blockers. Patient-record UI, private media storage, retention controls, key-management service integration, and independently reviewed key rotation remain incomplete. Do not use the current preview for real patient or payment data.

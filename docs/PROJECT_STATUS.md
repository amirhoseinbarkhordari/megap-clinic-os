# Project status

Updated: 2026-11-11

## Current phase

Phases 0–2 are complete. Phase 3 includes registration, login, and an authenticated patient workspace. Phase 4 includes tenant-scoped staff/service APIs and a basic appointment workflow; PostgreSQL prevents overlapping appointments per staff member. Phase 5 includes an encrypted clinical-record API and UI, consent lifecycle, and append-only access audit. Phase 6 now includes finance and branch inventory APIs and workspace screens with integer Rial ledger entries, idempotent invoicing/payments, full refunds, expenses, and concurrency-safe stock movements. Database-backed tenant isolation, concurrent booking, medical records, finance, inventory, and crypto checks pass locally.

Working-hour calendars, rescheduling, private medical media, suppliers and purchase orders, partial refunds, treatment-linked inventory consumption, patient portal, background jobs, SaaS administration, and production readiness remain open. This is not yet a production-ready clinic system.

## Available locally

- Web preview: `http://localhost:3000`.
- Authenticated workspace: `/workspace` after clinic registration at `/register`.
- NestJS API and Swagger: `http://localhost:4000/api/docs` when the API is running.
- Docker Compose uses ArvanCloud's mirror for PostgreSQL and Redis.
- Private GitHub remote: `amirhoseinbarkhordari/megap-clinic-os`.

## Completed work

- [x] Product, architecture, roadmap, environment, API, security, design, and UX documentation.
- [x] pnpm/Turborepo monorepo, Next.js RTL web app, NestJS API, CI scaffold, and pinned dependency lockfile.
- [x] PostgreSQL tenant-aware schema, forced RLS, tenant-aware foreign keys, and separate local runtime/admin database identities.
- [x] Clinic registration, owner membership, trial, scrypt password hashing, short-lived access JWT, hashed rotating refresh sessions, and logout revocation.
- [x] Tenant-scoped patient list, search, detail, and create API with permission enforcement.
- [x] Tenant-scoped staff and service APIs plus appointment creation, listing, and status transitions.
- [x] PostgreSQL appointment time ordering and concurrent staff overlap protection.
- [x] Tenant-scoped clinical encounters, encrypted note storage, consent lifecycle, and append-only patient access audit.
- [x] Medical-record migration constraints, RLS, versioned PHI encryption key configuration, and API integration coverage.
- [x] Immutable invoice/line and integer Rial ledger schema, idempotent invoice/payment/expense operations, full refund reversal, reports, RLS, and finance UI.
- [x] Branch-scoped inventory products, balances, zero-stock alerts, atomic stock-movement trigger, idempotency, RLS, and inventory UI.
- [x] Finance and inventory concurrency, idempotency, append-only, branch isolation, and tenant isolation integration coverage.
- [x] Push SaaS-core and scheduling milestones to GitHub (`master`).

## Remaining work

- [ ] Staff working hours, holidays, and appointment rescheduling.
- [ ] Patient-record UI, private media/object storage, and reviewed retention/export workflows.
- [ ] Supplier/purchase-order workflows, partial refunds, and automatic inventory consumption from treatments.
- [ ] Patient portal, notification/SMS provider boundary, and background jobs.
- [ ] Membership administration, subscription limits/lifecycle, and platform administration.
- [ ] Password recovery, phone/email verification, MFA, rate limiting, and device session management.
- [ ] Production least-privilege database bootstrap, managed secrets, deployment/reverse proxy/TLS, backups and restore exercise, observability, security review, and browser/e2e verification.

## Local demo safety

Use synthetic records only. The preview is still an MVP and lacks independent security review, operational controls, and complete clinical workflows. Do not use it for real patient or payment data.

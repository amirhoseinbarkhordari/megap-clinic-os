# Roadmap

## Phase 0 — Inspection and planning

- [x] Inspect clean workspace and available runtimes.
- [x] Define MVP, architecture, decisions, and risks.
- [x] Create initial documentation and project status.

## Phase 1 — Foundation

- [x] pnpm/Turborepo workspace and strict TypeScript.
- [x] Next.js web app and NestJS API foundation.
- [x] Prisma/PostgreSQL and Redis configuration.
- [x] Docker development environment and health checks.
- [x] Environment example, CI, lint/typecheck/build.
- [x] Start local containers and apply migrations.

## Phase 2 — SaaS core (complete)

- [x] Tenant, user, membership, role/permission, branch, subscription, refresh-session, and patient foundation models.
- [x] Initial migration with tenant-aware foreign keys and PostgreSQL RLS policies.
- [x] Registration, login, logout, refresh rotation, and membership guard.
- [x] Transaction-local tenant context helper.
- [x] Apply migration and run cross-tenant integration test against a non-superuser database role.

## Phase 3 — Design system and shell

RTL layout, design tokens, shared form components, login/registration, in-memory access token and cookie refresh lifecycle, authenticated clinic workspace, patient list/search/create, and responsive states. Core shell and first patient workflow are implemented; remaining navigation/module shells and browser accessibility review are open.

## Phase 4 — Clinic operations MVP

Staff and service catalog APIs, patient CRM, appointment creation/list/status lifecycle, tenant-scoped scheduling records, basic booking UI, and database-enforced conflict protection are implemented. Staff working-hour calendars, rescheduling, and end-to-end browser verification remain open.

## Phase 5 — Medical records (secure API foundation implemented)

- [x] Tenant-scoped encounters, encrypted clinical notes (AES-256-GCM), consent history, and permission-protected access audit.
- [x] PostgreSQL RLS, append-only note/audit triggers, one-way consent revocation, and tenant-aware encounter/appointment constraints.
- [x] Integration coverage for encryption, key rotation, tenant isolation, consent lifecycle, encounter lifecycle, and append-only data.
- [ ] Patient-record UI, immutable addenda UX, private media/object storage, retention/export workflows, and security review.

## Phase 6 — Finance and inventory

Integer money ledger, idempotent payments, reversal flow, expenses, inventory movement, tests.

## Phase 7 — Patient portal and communication

Patient identity, booking/history, SMS provider boundary, notifications and background jobs.

## Phase 8 — SaaS administration and analytics

Subscriptions, limits, tenant lifecycle, reporting and platform administration.

## Phase 9 — Production readiness

Production containers, Nginx, TLS/deployment docs, backups/restore, logging/monitoring, security review, load tests and CI/CD.

A phase is complete only with implementation evidence and updated status. Future phases remain unclaimed until done.

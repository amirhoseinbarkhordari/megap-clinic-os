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

RTL layout, design tokens, shared components, navigation, auth pages, dashboard shell and responsive states.

## Phase 4 — Clinic operations MVP

Staff, patient CRM, services, schedules, appointment lifecycle and database-enforced conflict protection.

## Phase 5 — Medical records

Permission-scoped histories, treatment records, consent, private media and access audit.

## Phase 6 — Finance and inventory

Integer money ledger, idempotent payments, reversal flow, expenses, inventory movement, tests.

## Phase 7 — Patient portal and communication

Patient identity, booking/history, SMS provider boundary, notifications and background jobs.

## Phase 8 — SaaS administration and analytics

Subscriptions, limits, tenant lifecycle, reporting and platform administration.

## Phase 9 — Production readiness

Production containers, Nginx, TLS/deployment docs, backups/restore, logging/monitoring, security review, load tests and CI/CD.

A phase is complete only with implementation evidence and updated status. Future phases remain unclaimed until done.

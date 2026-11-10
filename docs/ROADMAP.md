# Roadmap

## Phase 0 — Inspection and planning

- [x] Inspect clean workspace and available runtimes.
- [x] Define MVP, architecture, decisions, and risks.
- [x] Create initial documentation and project status.

## Phase 1 — Foundation

- [ ] pnpm/Turborepo workspace and strict TypeScript.
- [ ] Next.js web app and NestJS API.
- [ ] Prisma/PostgreSQL and Redis configuration.
- [ ] Docker development environment and health checks.
- [ ] Environment example, CI, lint/typecheck/build.

## Phase 2 — SaaS core

Tenant, user, membership, role/permission, branch, subscription models; migrations; authentication; tenant-scoped APIs; RLS and cross-tenant tests.

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

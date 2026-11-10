# Project status

Updated: 2026-11-10

## Current phase

Phases 0–2 are complete. The SaaS foundation includes Prisma schema and migration with RLS, tenant-scoped transaction helper, membership and permission guard, auth lifecycle, and the first tenant-scoped patient endpoints. The migration is applied and database-backed checks pass locally. Phase 3 is next: connect the existing web experience to auth and patient APIs.

## Available locally

- Web demo preview at `http://localhost:3000` (synthetic records in browser storage only).
- NestJS API source and Swagger at `/api/docs` once the API can connect to local PostgreSQL.
- Docker Compose targets ArvanCloud's mirror for PostgreSQL and Redis; both services are healthy.
- Private GitHub remote: `amirhoseinbarkhordari/megap-clinic-os`.

## Completed work

- [x] Product, architecture, roadmap, environment, API, security, design, and UX documentation.
- [x] pnpm/Turborepo monorepo, Next.js RTL preview, NestJS API, CI scaffold, and dependency lockfile.
- [x] Prisma 6.19 schema for tenants, users, memberships, roles, permissions, branches, subscriptions, sessions, and patients.
- [x] Initial PostgreSQL migration with tenant-aware foreign keys and forced RLS policies.
- [x] Local PostgreSQL admin/runtime role split; API runs with the non-superuser runtime role.
- [x] Atomic clinic-owner registration with first branch and 14-day trial, scrypt password hashing, short-lived access JWT, hashed rotating refresh sessions, and logout revocation.
- [x] Global membership guard and transaction-local tenant context helper.
- [x] Tenant-scoped patient list, search, detail, and create API with permission enforcement.
- [x] Applied initial migration using the admin URL; API runtime uses a separate non-superuser role.
- [x] RLS integration test passed with two isolated tenants.
- [x] HTTP smoke passed: health, register, login, refresh rotation, and logout.
- [x] Root formatting, lint, typecheck, production build, and design-token checks passed.
- [x] API smoke passed: health, registration, patient create/list/search/detail, login, refresh rotation, and logout.
- [ ] Push the current SaaS-core implementation to GitHub.

## Still required

- [ ] Build auth screens and connect the web UI to the tenant-scoped API.
- [ ] Implement appointment scheduling, including database conflict constraints.
- [ ] Complete scheduling, patient CRM, medical records, finance, inventory, patient portal, background jobs, and platform administration.
- [ ] Production deployment, backup/restore validation, observability, security review, and end-to-end/browser testing.

## Safety

The current web preview contains synthetic sample entries and stores them in localStorage. The backend foundation has no complete patient workflow yet. Do not use this project for real medical, patient, or payment data.

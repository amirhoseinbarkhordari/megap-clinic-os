# Architecture

## Current state

Status: see PROJECT_STATUS.md. The tenant model, auth, scheduling, medical records, finance and inventory described here are implemented; remaining items are listed in ROADMAP.md.

## Target architecture

A pnpm/Turborepo monorepo containing a Next.js App Router web client and a NestJS versioned REST API. Shared packages hold UI primitives, types, configuration, and validation where useful. PostgreSQL is accessed only by the API through Prisma. Redis/BullMQ handles asynchronous jobs. This is a modular monolith; domain boundaries precede any service extraction.

## Domain boundaries

Identity and access; tenant/clinic; staff; patient CRM; scheduling; services; medical records; finance; inventory; communication; reporting; subscription/platform administration.

## Tenant isolation strategy

Authentication identifies the user. A server-side membership lookup establishes the tenant context; client-supplied tenant IDs are selectors only and must be checked against that membership. Every tenant-owned query and mutation is scoped by the resolved tenant. Tenant-aware foreign keys/unique constraints prevent cross-tenant relationships. PostgreSQL RLS is an additional enforcement layer for tenant-owned tables, with transaction-local tenant context set only by trusted server code. Background jobs carry tenant IDs from persisted, validated records and establish the same database context. Exports, object access, search, and reporting use identical scopes. This strategy is implemented (forced RLS, composite tenant FKs) and covered by `apps/api/test/tenant-isolation.test.ts`, which requires a migrated PostgreSQL.

## API

REST under `/api/v1`, explicit DTOs and validation, centralized error format, pagination, authentication and permission guards, OpenAPI, rate limits, and idempotency on sensitive operations.

## Data and time

UUID identifiers, UTC timestamps, Asia/Tehran business calculations, Jalali display formatting in the client, integer monetary values with explicit Rial/Toman denomination. Currency conversion must be explicit.

## Runtime topology

Web client -> API -> PostgreSQL; API -> Redis for jobs. No browser/mobile direct database access. Docker Compose is for local development; Nginx and production topology are deferred to production-readiness work.

## Security boundaries

Medical records and private files require fine-grained permission checks and access audit. No public object URLs. Financial finalization is append-only with adjustment/reversal entries. Secrets stay outside source control.

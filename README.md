# MEGAP Clinic OS

MEGAP Clinic OS is a Persian-first, RTL clinic operations platform for beauty and aesthetic clinics. The web app currently provides a synthetic interactive preview. The backend now has a multi-tenant SaaS foundation, authentication, PostgreSQL row-level security, and first patient APIs. See [Project status](docs/PROJECT_STATUS.md) and the [roadmap](docs/ROADMAP.md) for what is implemented versus planned.

## Product direction

- Multi-tenant SaaS with strict clinic data isolation.
- Persian RTL workflows, Jalali display dates, Asia/Tehran business timezone.
- API-first modular monolith; PostgreSQL as source of truth.
- Sensitive medical and financial records require explicit authorization and auditability.

## Stack

Implemented foundation: pnpm/Turborepo, Next.js, NestJS, Prisma 6, PostgreSQL, Redis, Docker Compose, and automated CI. BullMQ and the clinic operation modules remain planned.

## Local development

Requirements: Node.js 20.19+, pnpm 10, and Docker Desktop. Follow [Local environment](docs/ENVIRONMENT.md) to configure a local `.env`, start the ArvanCloud-backed PostgreSQL and Redis containers, and apply migrations. Then run `pnpm dev`. API docs are served at `/api/docs`; the API health endpoint is `/api/v1/health`.

The web app opens at `http://localhost:3000`. Its patient and appointment screens are still a browser-only preview using synthetic records saved in localStorage; they are not connected to the API yet. Do not enter real patient information.

See [Architecture](docs/ARCHITECTURE.md), [Decisions](docs/DECISIONS.md), and [Roadmap](docs/ROADMAP.md).

## Security notice

This project is not ready for production use. Authentication and tenant isolation have an initial implementation and database-backed checks, but web auth, scheduling, medical records, financial controls, audit history, backups, and production security review are still outstanding. Do not enter or upload real personal, medical, or payment information.

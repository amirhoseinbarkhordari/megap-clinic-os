# MEGAP Clinic OS

MEGAP Clinic OS is a Persian-first, RTL clinic operations platform for beauty and aesthetic clinics. The repository is at the foundation stage; see [Project status](docs/PROJECT_STATUS.md) and the [roadmap](docs/ROADMAP.md) for what is implemented versus planned.

## Product direction

- Multi-tenant SaaS with strict clinic data isolation.
- Persian RTL workflows, Jalali display dates, Asia/Tehran business timezone.
- API-first modular monolith; PostgreSQL as source of truth.
- Sensitive medical and financial records require explicit authorization and auditability.

## Planned stack

pnpm/Turborepo, Next.js, NestJS, Prisma, PostgreSQL, Redis/BullMQ, Docker Compose, and automated CI. Components will be introduced in phases and documented only when actually present.

## Local development

Requirements: Node.js 20.19+ and pnpm 10. Start with the steps in [Local environment](docs/ENVIRONMENT.md), then use `pnpm lint`, `pnpm typecheck`, and `pnpm build` for checks. API docs are served at `/api/docs`; the API health endpoint is `/api/v1/health`.

The web app opens as an interactive preview at `http://localhost:3000`. It uses synthetic data saved to this browser only. Do not enter real patient information; authentication, API persistence, and tenant isolation are not implemented yet.

See [Architecture](docs/ARCHITECTURE.md), [Decisions](docs/DECISIONS.md), and [Roadmap](docs/ROADMAP.md).

## Security notice

This project is not yet ready for real patient data or production use. Do not enter or upload personal, medical, or payment information until the security, authentication, tenant isolation, and operational controls described in the roadmap are implemented and verified.

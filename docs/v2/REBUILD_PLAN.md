# MEGAP Clinic OS v2 — Rebuild plan

Decisions (owner, 2026-11-13): rebuild from scratch in a **new, separate repository**; **same stack** (Next.js + NestJS + Prisma + PostgreSQL 16, pnpm/Turborepo), fresh design; code is written in a session **with network access** so every step is built and tested for real. The current repo stays untouched as reference.

Goal (unchanged): Persian/RTL, Iran-first (Jalali, Asia/Tehran, Rial/Toman) multi-tenant SaaS for beauty/aesthetic clinics: auth, dashboard, appointments, patient CRM, medical records, services/packages, staff, finance, inventory, marketing/SMS, analytics, patient portal, platform admin.

## Carry over as hard-won requirements (re-implement, do not copy blindly)
- Tenant isolation: composite (tenant_id,id) keys, tenant-aware FKs, forced RLS via transaction-local `app.tenant_id`; runtime role without BYPASSRLS; separate admin role for migrations.
- DB invariants: staff appointment overlap exclusion (btree_gist); append-only clinical notes/audit/ledger/inventory movements; non-negative stock; invoice total/balance checks; idempotency keys.
- PHI: AES-256-GCM, versioned keys, AAD binding; access audit on every PHI read.
- Money: integer Rial (BigInt), decimal strings over JSON; ledger entries, never in-place edits.
- Auth: short-lived access JWT in memory, rotating hashed refresh sessions in HttpOnly cookie.
- Tests are run in CI against real Postgres. Nothing is reported as passing unless executed.

## What changes in v2
1. **Module boundaries**: one folder per bounded context (identity, tenancy, scheduling, patients, records, catalog, finance, inventory, marketing, analytics, portal, platform) each with controller/service/repository/dto/tests; shared kernel for tenant tx, money, crypto, audit, errors, pagination.
2. **API contract first**: OpenAPI generated, typed client generated for web; uniform error shape and pagination; idempotency header standard.
3. **Frontend**: design tokens + component library + feature folders; Jalali date picker, Persian digits, RTL tables, loading/empty/error states, keyboard accessible, mobile-first; no giant page files.
4. **Auth completeness from day one**: recovery, phone OTP via SMS provider interface, invitations, roles/permissions UI, rate limiting, session management.
5. **Provider interfaces** (SMS, object storage, payment gateway) with fake adapters for dev/tests; real adapters only after owner picks providers.
6. **Ops**: Dockerfiles + compose + `start-local.sh` from day one; CI = lint, typecheck, build, unit, integration, e2e (Playwright); seed script with synthetic data.

## Phases (each ends with a runnable, tested increment)
0. Repo skeleton, CI, Docker, seed, design tokens.
1. Identity + tenancy + RBAC (+ recovery/OTP/invites/throttle).
2. Patients + services + staff + branches.
3. Scheduling (hours, holidays, availability, buffers, reschedule, waitlist) + calendar UI.
4. Medical records (encrypted notes, consent, audit, private media via provider).
5. Finance (invoices, payments, expenses, refunds) — extended cash register/commissions/partial refunds **after owner rules approved**.
6. Inventory (+ suppliers, POs, treatment consumption).
7. Marketing/SMS, analytics dashboards.
8. Patient portal.
9. Platform admin (**no automatic PHI access**; model approved by owner first).
10. Hardening: security review, backup/restore drill, deployment docs.

## Open owner decisions (answer in kickoff message)
- Partial refund / commission / cash-register rules.
- Platform-admin access model.
- Object storage + SMS provider choices.
- UI approach: custom CSS tokens vs Tailwind/shadcn.

## Kickoff steps for the owner
1. Create an empty GitHub repo (e.g. `megap-clinic-os-v2`).
2. Set the cloud environment **Network access = Trusted**; start a new session attached to the new repo (and mention `megap-clinic-os` branch `master` as reference).
3. Paste the kickoff prompt below with your answers to the open decisions.

### Kickoff prompt
> Build MEGAP Clinic OS v2 from scratch following `docs/v2/REBUILD_PLAN.md` in `amirhoseinbarkhordari/megap-clinic-os` (branch feature/megap-complete-product-development). Use the old repo only as reference. Work phase by phase, run install/build/tests for real, push to a feature branch, and give me a Persian report after each phase. Decisions: [refund/commission rules], [platform-admin model], [storage + SMS providers], [UI approach].

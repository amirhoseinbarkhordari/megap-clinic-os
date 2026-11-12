# Architecture Review

**Verdict: sound foundation; keep and extend, do not rewrite.**

## Keep
- Tenant model: composite PK/FK + forced RLS + `withTenantTransaction`. Every new table must follow the same pattern and get an isolation test.
- DB-level invariants (overlap exclusion, append-only, balance triggers) — new modules (reschedule, refunds, POs) must add invariants in DB, not only in services.
- PHI crypto design; refresh-session design; BigInt Rial.

## Risks / changes proposed
1. **Tests in CI**: add a Postgres service job running migrations + `test:integration`. (Low risk, do first.)
2. **Rate limiting & abuse controls** on auth endpoints (e.g. @nestjs/throttler) — needs new dependency; cannot be installed in this sandbox.
3. **Provider abstractions** (SMS, object storage) as injected interfaces with a fake/dev adapter; no fabricated real integration.
4. **Frontend**: introduce shared API client, component folder and design tokens within existing plain-CSS system before considering Tailwind/shadcn (directive suggestion; adding them is a dependency/visual-system decision to confirm).
5. **Platform admin** must use the admin DB role through a separate module with explicit PHI exclusion; security-boundary decision → requires owner approval before implementation.
6. **Financial changes** (partial refunds, commissions, cash register) alter ledger semantics → owner approval of rules before migration.
7. All schema work via additive migrations only; no destructive migrations.

## Approval gates (stop and ask)
Partial-refund/commission rules; platform-admin access model; media storage provider and retention; any migration dropping/altering existing columns.

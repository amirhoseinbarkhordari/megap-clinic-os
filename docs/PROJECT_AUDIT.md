# Project Audit (Phase 1)

Date: 2026-11-12 · Branch: `feature/megap-complete-product-development` (from `master` @ 236889a, history depth 1 in this clone).

## Method and limits
Static review of the repository tree and docs. `pnpm install` is impossible in the audit sandbox (no network), so **no build, lint, typecheck or test was executed**; nothing below claims a passing result. `docs/PROJECT_STATUS.md` states integration tests passed locally on the owner's machine; that is unverified here.

## Inventory
- Monorepo: pnpm 10 + Turborepo; `apps/api` (NestJS 11, Prisma 6, PostgreSQL 16), `apps/web` (Next.js 16, React 19, plain CSS, RTL, Vazirmatn), `docs/`, `infrastructure/`, `scripts/`, CI (format:check, lint, typecheck, build).
- API modules: auth, patients, scheduling, records, finance, inventory, database, health (~105 tracked files overall).
- Prisma schema: 528 lines, ~24 models, 7 migrations (RLS, composite tenant FKs, triggers).
- Web: landing, login, register, workspace (home, patients, finance, inventory). Finance and inventory pages are ~600/456 lines each in one file.
- Tests: 5 integration files (tenant isolation, scheduling invariants, PHI crypto, medical records, finance/inventory) needing migrated Postgres. No web/unit/e2e tests. CI does not run tests.

## Strengths
Forced RLS with transaction-local tenant id; composite tenant-aware FKs; exclusion constraint against staff double-booking; append-only triggers; AES-256-GCM PHI with versioned keys and AAD; integer-Rial money; idempotency keys; hashed rotating refresh sessions.

## Findings
| # | Severity | Finding |
|---|----------|---------|
| 1 | High | CI never runs tests (including DB isolation tests). |
| 2 | High | No rate limiting, password recovery, phone verification, MFA, invitations or session/device management. |
| 3 | High | Medical records have API but no UI; no private media storage; no retention/export workflow. |
| 4 | Medium | Docs stale: ARCHITECTURE, DATABASE, TESTING, THREAT_MODEL, DEPLOYMENT, DESIGN_SYSTEM, README say features are unimplemented. |
| 5 | Medium | Refunds are full-reversal only; no partial refunds, cash register, commissions. |
| 6 | Medium | No working hours/holidays/reschedule/waitlist; staff and services have API but limited UI. |
| 7 | Medium | Web has no component library, tests, pagination/virtualisation, or shared API client beyond auth context. |
| 8 | Medium | Single runtime DB identity bootstrap is local-only; production least-privilege bootstrap, secrets, TLS, backups unproven. |
| 9 | Low | Large single-file pages (finance, inventory) hinder maintenance. |

## Not found / not verified
No secrets were seen in pasted files; a full secret scan of git history was not possible (shallow clone). CI status on GitHub not checked.

# Testing status

No domain unit or integration tests are configured yet. Later phases must add tests for tenant isolation, appointment conflict handling, financial idempotency and reversal behavior, permissions, and private file access. Only report commands that have actually been run.

## Phase 1 verification (2026-11-10)

- `pnpm format:check` — passed.
- `pnpm lint` — passed for web and API.
- `pnpm typecheck` — passed for web and API.
- `pnpm build` — passed for Next.js and NestJS.
- `pnpm verify:premium` — passed; design tokens match the web stylesheet.
- Built API smoke request `GET /api/v1/health` — returned `{"status":"ok","service":"megap-api"}`.
- Web production smoke request `GET /` — HTTP 200; Persian RTL markup verified.
- `pnpm --filter @megap/api dev` could not start in this environment because Node's `os.userInfo()` fails with `uv_os_get_passwd returned ENOMEM`; the compiled API started and served requests successfully.
- Docker checks were not run: Docker Desktop's engine is inaccessible in this session.

Authentication, database operations, tenant isolation, and clinic workflows are still unimplemented.

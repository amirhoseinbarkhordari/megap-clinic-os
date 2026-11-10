# API foundation

Base path: `/api/v1`. OpenAPI is served at `/api/docs`.

## Public endpoints

- `POST /auth/register` creates a clinic, its owner account, one branch, and a 14-day trial. Provide a clinic name, display name, password (12–128 characters), and at least one email or phone. It returns a short-lived bearer access token and sets the refresh cookie.
- `POST /auth/login` accepts `identifier` and `password`; the first active membership is selected for now.
- `POST /auth/refresh` rotates the HttpOnly refresh cookie and returns a new access token.
- `POST /auth/logout` revokes the refresh session and clears the cookie.
- `GET /health` is a liveness check.

## Clinic endpoints

- `GET /patients?page=1&limit=25&search=...` lists and searches patients in the authenticated clinic.
- `GET /patients/:id` reads one patient in the authenticated clinic.
- `POST /patients` creates a patient and optionally attaches a branch from the same clinic.

These endpoints require the `patients.manage` permission. The API derives tenant scope from the signed membership and checks RLS inside a transaction. Patient update, archive, and visit-history endpoints remain future work.

All other routes are protected by the tenant membership guard unless explicitly marked public. Add new public routes deliberately. Use `CurrentTenant` for the authenticated principal and `withTenantTransaction` for tenant-owned database work.

## Scheduling

Scheduling endpoints require an authenticated tenant and their matching permission.

- `GET /staff`, `POST /staff` — list active staff or add a staff resource (`catalog.manage`).
- `GET /services`, `POST /services` — list active clinic services or create one (`catalog.manage`). Prices are integer Rial amounts represented as decimal strings in JSON.
- `GET /appointments?from=&to=&status=&limit=` — list a bounded set of tenant appointments (`appointments.manage`).
- `POST /appointments` — book a patient with staff and service at an ISO-8601 start time. The server derives the end time from the service duration.
- `PATCH /appointments/:id/status` — move an appointment through the allowed status lifecycle.

PostgreSQL enforces half-open time range exclusion for each staff member (`[start,end)`), so adjacent bookings are allowed and concurrent overlapping requests cannot both succeed. Canceled and no-show bookings release the slot. Tenant RLS and composite foreign keys scope every scheduling record. Working-hour calendars and appointment rescheduling remain outstanding.

The global validation pipe rejects unknown fields. Auth endpoints return generic credential errors. The refresh cookie is scoped to `/api/v1/auth`, HttpOnly, SameSite=Strict, Secure in production, and lasts 30 days. Production web and API must use same-site HTTPS origins for this cookie configuration.

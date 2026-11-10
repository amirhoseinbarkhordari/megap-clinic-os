# MEGAP UX Contract

## Locale and layout

- Default locale is Persian (`fa-IR`) and the application root uses RTL.
- Business scheduling uses `Asia/Tehran`; timestamps are stored in UTC and dates are formatted as Jalali at the presentation boundary.
- Phone numbers, IDs, and other mixed-direction identifiers must be explicitly isolated LTR.

## Navigation

- The current route is represented semantically and visually (`aria-current="page"`).
- Not-yet-implemented modules are rendered as unavailable text controls, never links that lead to dead pages.
- At narrow widths the primary navigation moves to a fixed bottom bar and must not cover content.
- Authentication routes are `/login` and `/register`; authenticated clinic work lives under `/workspace`.
- Page titles use the localized task followed by `| MEGAP`. The workspace title includes the clinic name only when it is available from the authenticated profile.
- Patient search is transient clinical context: keep it in component state, never in the URL, browser history, analytics, or persistent browser storage.

## Data integrity and privacy

- Do not render fabricated patient, medical, appointment, or financial data.
- The interactive preview is an explicit exception: it uses synthetic records, is visibly labelled as a demo, stores them in browser localStorage, and warns users not to enter real patient information. It is not connected to the clinic API.
- Tenant scope is resolved and enforced by the API. The web client cannot grant tenant access.
- Sensitive records require server-side authorization and audit logging before they are exposed.
- The web client keeps access tokens in memory only; refresh credentials are HttpOnly cookies. Never persist credentials or patient data in localStorage/sessionStorage.
- API patient records are fetched only after a valid session is restored. Sign-out and expired sessions clear patient state immediately.

## Preview CRUD

- The preview can create synthetic patients and appointments, search both lists, filter appointments by today/all, and change appointment status.
- Appointment creation checks same-time overlap for a selected staff member in the current browser dataset. This is a preview convenience, not a concurrent booking guarantee.
- The reset action restores the synthetic seed records and does not delete server data.
- Validation errors remain visible in a live status region; successful local changes receive a localized status message.

## Feedback

- API-backed workflows must provide loading, success, error, empty, and stale-session behavior.
- Status must not rely on color alone.
- Form controls must retain focus and layout geometry through validation and loading.
- Auth and patient forms use shared `TextField`/`PasswordField` primitives, inline localized validation, and accessible live feedback; API payloads and stack traces are never shown to users.
- Patient creation is confirmed by the server before the list changes. Search and pagination expose loading, error, empty, and stale-session states without leaking data across sessions.

## Accessibility

- Use semantic controls, visible focus, keyboard operation, reduced-motion support, and readable contrast.
- Progress indicators expose values and accessible names.
- Mobile navigation preserves touch targets and keeps page content clear of the fixed bar.

## Canonical UI Map

| Capability                       | Canonical owner                                                                   | Source of truth                   | Allowed variants                                   | Verification                                         |
| -------------------------------- | --------------------------------------------------------------------------------- | --------------------------------- | -------------------------------------------------- | ---------------------------------------------------- |
| Authentication and session state | `apps/web/src/lib/auth-context.tsx`                                               | `docs/SECURITY.md`                | Login, registration, restoration, expiry, sign-out | `pnpm --filter @megap/web typecheck`; API auth smoke |
| Text input                       | `apps/web/src/components/text-field.tsx`                                          | This contract; `DESIGN.md`        | Labeled, hinted, invalid                           | Keyboard and screen-reader semantics; web lint       |
| Password input                   | `apps/web/src/components/text-field.tsx`                                          | This contract; `DESIGN.md`        | Masked by default; explicit reveal toggle          | Keyboard and accessible name; web lint               |
| Authentication form              | `apps/web/src/components/auth-form.tsx`                                           | `docs/API.md`; this contract      | Login and registration fields                      | Required/invalid/busy states; API auth smoke         |
| Patient workspace                | `apps/web/src/app/workspace/page.tsx`                                             | `docs/API.md`; `docs/SECURITY.md` | Loading, empty, error, data, pagination            | API patient smoke; tenant-isolation test             |
| Navigation                       | Workspace rail and route components in `apps/web/src/app`                         | This contract; `DESIGN.md`        | Active, unavailable, compact                       | Keyboard and route semantics; web lint               |
| Form                             | `apps/web/src/components/auth-form.tsx`; `apps/web/src/components/text-field.tsx` | `docs/API.md`; this contract      | Login, registration, patient create                | Inline validation and busy state; web lint           |
| CRUD                             | `apps/web/src/app/workspace/page.tsx`                                             | `docs/API.md`; `docs/SECURITY.md` | Patient create, list, search, pagination           | Tenant-isolation test; API smoke                     |
| Async resilience                 | `apps/web/src/lib/auth-context.tsx`; `apps/web/src/app/workspace/page.tsx`        | This contract; `docs/SECURITY.md` | Loading, error, retry, expired session             | API smoke; lint and typecheck                        |
| Preview select                   | Native HTML `<select>` in `apps/web/src/app/page.tsx`                             | `DESIGN.md`; this contract        | Preview-only appointment filters                   | Keyboard operation; web lint                         |
| Preview date/time                | Native HTML date/time input in `apps/web/src/app/page.tsx`                        | `DESIGN.md`; this contract        | Preview-only appointment entry                     | Native validity and keyboard operation; web lint     |

Native date/time and select controls are intentional in the synthetic preview. API-backed forms use the shared field primitives where their semantics match.

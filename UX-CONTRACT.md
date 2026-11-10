# MEGAP UX Contract

## Locale and layout

- Default locale is Persian (`fa-IR`) and the application root uses RTL.
- Business scheduling uses `Asia/Tehran`; timestamps are stored in UTC and dates are formatted as Jalali at the presentation boundary.
- Phone numbers, IDs, and other mixed-direction identifiers must be explicitly isolated LTR.

## Navigation

- The current route is represented semantically and visually (`aria-current="page"`).
- Not-yet-implemented modules are rendered as unavailable text controls, never links that lead to dead pages.
- At narrow widths the primary navigation moves to a fixed bottom bar and must not cover content.

## Data integrity and privacy

- Do not render fabricated patient, medical, appointment, or financial data.
- The interactive preview is an explicit exception: it uses synthetic records, is visibly labelled as a demo, stores them in browser localStorage, and warns users not to enter real patient information. It is not connected to the clinic API.
- Tenant scope is resolved and enforced by the API. The web client cannot grant tenant access.
- Sensitive records require server-side authorization and audit logging before they are exposed.

## Preview CRUD

- The preview can create synthetic patients and appointments, search both lists, filter appointments by today/all, and change appointment status.
- Appointment creation checks same-time overlap for a selected staff member in the current browser dataset. This is a preview convenience, not a concurrent booking guarantee.
- The reset action restores the synthetic seed records and does not delete server data.
- Validation errors remain visible in a live status region; successful local changes receive a localized status message.

## Feedback

- API-backed workflows must provide loading, success, error, empty, and stale-session behavior.
- Status must not rely on color alone.
- Form controls must retain focus and layout geometry through validation and loading.

## Accessibility

- Use semantic controls, visible focus, keyboard operation, reduced-motion support, and readable contrast.
- Progress indicators expose values and accessible names.
- Mobile navigation preserves touch targets and keeps page content clear of the fixed bar.

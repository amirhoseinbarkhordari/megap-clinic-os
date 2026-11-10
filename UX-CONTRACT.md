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
- Tenant scope is resolved and enforced by the API. The web client cannot grant tenant access.
- Sensitive records require server-side authorization and audit logging before they are exposed.

## Feedback

- API-backed workflows must provide loading, success, error, empty, and stale-session behavior.
- Status must not rely on color alone.
- Form controls must retain focus and layout geometry through validation and loading.

## Accessibility

- Use semantic controls, visible focus, keyboard operation, reduced-motion support, and readable contrast.
- Progress indicators expose values and accessible names.
- Mobile navigation preserves touch targets and keeps page content clear of the fixed bar.

# Development Roadmap

Ordering favours safety, then user-visible value. Each milestone ends with updated PROJECT_STATUS and only-executed-test reporting.

1. **M1 Hygiene**: CI test job; refresh stale docs; secret scan; branch protections advice.
2. **M2 Auth completion**: password recovery, phone verification via SMS provider interface, invitations, user management, throttling.
3. **M3 Scheduling**: working hours, holidays, availability, buffers, reschedule, waitlist; calendar UI.
4. **M4 Patient & records UI**: patient update/archive/timeline; encounter/note/consent UI; private media (provider interface).
5. **M5 Services/staff UI & packages**.
6. **M6 Finance extensions** (after approval): cash register, partial refunds, commissions.
7. **M7 Inventory extensions**: suppliers, POs, treatment consumption.
8. **M8 Marketing/SMS, analytics, dashboard**.
9. **M9 Patient portal**.
10. **M10 Platform admin** (after approval).
11. **M11 Design system & RTL redesign** applied incrementally alongside M3–M9.
12. **M12 Hardening**: e2e, security review, backups/restore, deployment docs.

Environment caveat: building and testing require network for `pnpm install` and a running Postgres; in a no-network sandbox only static work is possible.

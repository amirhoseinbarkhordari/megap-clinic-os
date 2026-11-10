# Product Requirements Document

## Vision

MEGAP Clinic OS gives Iranian beauty and aesthetic clinics a secure operational workspace for appointments, patient CRM, staff, services, financial operations, and eventually medical records and patient self-service.

## Users

Clinic owners, administrators, receptionists, clinicians, nurses, financial staff, other clinic employees, and patients. A person may have memberships in several independent clinics.

## Product principles

1. Patient privacy and tenant isolation are foundational, not UI conventions.
2. Business rules and authorization live on the API server.
3. Financial amounts use integer minor units with an explicit currency unit; finalized entries are corrected by reversals.
4. Appointment conflicts are protected transactionally at the database boundary.
5. Persian RTL is the default presentation, with Jalali display dates and Asia/Tehran operations.
6. Modules enter scope only when persistence, validation, authorization, error/loading/empty states, and critical tests are present.

## MVP scope

- Clinic workspace registration and authenticated membership.
- Branches, staff, services, business hours.
- Patient directory and profile with permission-scoped data.
- Appointment calendar/list, create/reschedule/cancel and conflict prevention.
- Operational dashboard backed by real API data.
- Secure audit events and tenant-aware access policies.
- Local development infrastructure, migration workflow, CI, API documentation.

## Explicitly deferred

Medical imaging and documents, complete charting/consent workflows, payment gateway processing, ledger/refunds, inventory, SMS campaigns, patient portal, mobile application, subscription billing, platform administration, advanced analytics. These require their own security and business contracts.

## Quality attributes

- Strict clinic-to-clinic isolation, least privilege, auditability.
- Predictable transactional behavior for booking and money.
- Responsive accessible application; keyboard support and clear async states.
- Maintainable modular monolith with versioned REST APIs.
- Recoverable backups and documented deployment before production use.

## Success criteria

An MVP workflow is complete only after its database migration, API, server-side authorization, tenant isolation, connected UI states, critical automated tests, and documentation all work together. No production-readiness claim is made before Phase 9 evidence exists.

# Threat model (initial)

## Assets

Patient identity/contact data, medical history and media, appointment data, staff credentials, clinic configuration, financial ledger, backups and integration secrets.

## Trust boundaries

Browser/mobile clients are untrusted. The API is the authorization boundary. PostgreSQL and private object storage hold sensitive data. Background workers and exports are separate execution paths that must re-establish tenant scope.

## Primary threats

Cross-tenant IDOR; privilege escalation; account takeover; appointment races; duplicate payment processing; unauthorized medical document access; secret leakage; unsafe exports; malicious uploads; backup exposure; worker jobs missing tenant context.

## Required mitigations

Server-side authorization on every endpoint, tenant-aware constraints plus RLS, secure authentication and rate limits, transactional booking/ledger operations, idempotency keys, immutable audit events, private media authorization, upload validation, secret rotation, scoped jobs, encrypted backups and restore exercises.

## Status

Planning artifact, partly implemented: tenant isolation (RLS), PHI encryption, append-only audit and refresh-session hashing exist; rate limiting, account recovery, MFA, object-storage controls and independent review are still open (see PROJECT_AUDIT.md). Mitigation status is not independently verified.

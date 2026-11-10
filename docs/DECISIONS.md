# Architecture Decisions

## ADR-001: Modular monolith

Status: Accepted. Start with one API deployment and explicit domain modules. Avoid microservices until scale or independent ownership justifies them.

## ADR-002: Server-resolved tenant context

Status: Accepted. The authenticated membership establishes the authorized tenant scope; a request tenant selector cannot grant access. Apply query scoping and tenant-aware database constraints, with PostgreSQL RLS as defense in depth.

## ADR-003: UTC persistence, Tehran operations

Status: Accepted. Persist instants in UTC, use Asia/Tehran for business scheduling, and centralize Jalali display formatting.

## ADR-004: Explicit integer money

Status: Accepted. Store integer values and carry explicit denomination (Rial or Toman); never use floating point or silently convert.

## ADR-005: Append-only finalized financial events

Status: Accepted. Correct finalized transactions with linked reversals/adjustments and preserve audit history.

## ADR-006: Private medical media

Status: Accepted. Store private objects behind an authorization-checked download route; never expose public URLs.

## ADR-007: MVP prioritization

Status: Accepted. The first usable product focuses on secure clinic setup and daily operations (staff, patients, services, appointments). Medical records, money movement, inventory, patient portal and integrations follow in later phases.

# Initial database and persistence status

No Prisma schema or database migrations exist yet. Phase 2 must define tenant-aware composite keys and relationships, indexes, soft-delete policy, audit retention, PostgreSQL RLS policies, and scheduling exclusion constraints. Production changes must use reviewed migrations; `prisma db push` is not a production migration strategy.

INSERT INTO "permissions" ("key", "description")
VALUES
  ('appointments.manage', 'Manage clinic appointments'),
  ('catalog.manage', 'Manage clinic staff and services')
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "role_permissions" ("tenant_id", "role_id", "permission_key")
SELECT r."tenant_id", r."id", p."key"
FROM "roles" r
JOIN "permissions" p ON p."key" IN ('appointments.manage', 'catalog.manage')
WHERE r."key" = 'owner'
ON CONFLICT ("tenant_id", "role_id", "permission_key") DO NOTHING;

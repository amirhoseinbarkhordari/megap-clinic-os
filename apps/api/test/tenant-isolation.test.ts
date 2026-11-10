import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { PrismaService } from "../src/modules/database/database.module";
import { withTenantTransaction } from "../src/modules/database/tenant-transaction";

test("RLS prevents a tenant transaction from reading another tenant's patients", async (context) => {
  assert.ok(process.env.DATABASE_URL, "DATABASE_URL must point to a migrated test database");
  const prisma = new PrismaService();
  await prisma.$connect();
  const tenants = [randomUUID(), randomUUID()];
  const marker = randomUUID();

  try {
    for (const [index, id] of tenants.entries()) {
      await withTenantTransaction(prisma, id, async (tx) => {
        await tx.tenant.create({
          data: { id, slug: `test-${marker}-${index}`, name: `Isolation ${index}` },
        });
        await tx.patient.create({ data: { tenantId: id, fullName: `Patient ${marker}` } });
      });
    }

    const visibleFromFirstTenant = await withTenantTransaction(prisma, tenants[0]!, (tx) =>
      tx.patient.findMany({ where: { tenantId: tenants[1], fullName: `Patient ${marker}` } }),
    );
    assert.equal(visibleFromFirstTenant.length, 0);
  } finally {
    for (const id of tenants) {
      await withTenantTransaction(prisma, id, async (tx) => {
        await tx.patient.deleteMany({ where: { tenantId: id, fullName: `Patient ${marker}` } });
        await tx.tenant.deleteMany({ where: { id } });
      });
    }
    await prisma.$disconnect();
  }
});

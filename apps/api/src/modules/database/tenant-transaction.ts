import { Prisma } from "@prisma/client";
import { PrismaService } from "./database.module";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Sets the tenant only inside a database transaction; never pass an unverified client tenant ID. */
export async function withTenantTransaction<T>(
  prisma: PrismaService,
  tenantId: string,
  work: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  if (!UUID_PATTERN.test(tenantId)) throw new Error("Invalid authenticated tenant context.");
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
    return work(tx);
  });
}

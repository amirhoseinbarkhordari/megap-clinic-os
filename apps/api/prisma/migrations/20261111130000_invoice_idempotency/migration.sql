-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "idempotency_key" VARCHAR(128) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "invoices_tenant_id_idempotency_key_key" ON "invoices"("tenant_id", "idempotency_key");

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD', 'TRANSFER', 'ONLINE', 'OTHER');

-- CreateEnum
CREATE TYPE "FinancialEntryKind" AS ENUM ('PAYMENT', 'REFUND', 'EXPENSE');

-- CreateEnum
CREATE TYPE "FinancialDirection" AS ENUM ('INCOME', 'OUTGOING');

-- CreateEnum
CREATE TYPE "InventoryMovementKind" AS ENUM ('OPENING', 'PURCHASE', 'CONSUMPTION', 'ADJUSTMENT');

-- CreateTable
CREATE TABLE "invoices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "created_by_membership_id" UUID NOT NULL,
    "appointment_id" UUID,
    "total_rial" BIGINT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "invoice_lines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "service_id" UUID,
    "description" VARCHAR(240) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price_rial" BIGINT NOT NULL,
    "line_total_rial" BIGINT NOT NULL,

    CONSTRAINT "invoice_lines_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "financial_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "patient_id" UUID,
    "invoice_id" UUID,
    "branch_id" UUID,
    "created_by_membership_id" UUID NOT NULL,
    "kind" "FinancialEntryKind" NOT NULL,
    "direction" "FinancialDirection" NOT NULL,
    "amount_rial" BIGINT NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'IRR',
    "payment_method" "PaymentMethod",
    "idempotency_key" VARCHAR(128) NOT NULL,
    "reverses_entry_id" UUID,
    "memo" VARCHAR(500),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "financial_entries_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "inventory_products" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "sku" VARCHAR(80),
    "name" VARCHAR(160) NOT NULL,
    "category" VARCHAR(120),
    "unit" VARCHAR(24) NOT NULL DEFAULT 'unit',
    "reorder_point" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_products_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "inventory_balances" (
    "tenant_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "quantity_on_hand" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "inventory_balances_pkey" PRIMARY KEY ("tenant_id","branch_id","product_id")
);

-- CreateTable
CREATE TABLE "inventory_movements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "created_by_membership_id" UUID NOT NULL,
    "kind" "InventoryMovementKind" NOT NULL,
    "quantity_delta" INTEGER NOT NULL,
    "unit_cost_rial" BIGINT,
    "idempotency_key" VARCHAR(128) NOT NULL,
    "note" VARCHAR(500),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_movements_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateIndex
CREATE INDEX "invoices_tenant_id_patient_id_created_at_idx" ON "invoices"("tenant_id", "patient_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_tenant_id_appointment_id_key" ON "invoices"("tenant_id", "appointment_id");

-- CreateIndex
CREATE INDEX "invoice_lines_tenant_id_invoice_id_idx" ON "invoice_lines"("tenant_id", "invoice_id");

-- CreateIndex
CREATE INDEX "financial_entries_tenant_id_created_at_idx" ON "financial_entries"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "financial_entries_tenant_id_patient_id_created_at_idx" ON "financial_entries"("tenant_id", "patient_id", "created_at");

-- CreateIndex
CREATE INDEX "financial_entries_tenant_id_invoice_id_created_at_idx" ON "financial_entries"("tenant_id", "invoice_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "financial_entries_tenant_id_idempotency_key_key" ON "financial_entries"("tenant_id", "idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "financial_entries_tenant_id_reverses_entry_id_key" ON "financial_entries"("tenant_id", "reverses_entry_id");

-- CreateIndex
CREATE INDEX "inventory_products_tenant_id_is_active_name_idx" ON "inventory_products"("tenant_id", "is_active", "name");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_products_tenant_id_sku_key" ON "inventory_products"("tenant_id", "sku");

-- CreateIndex
CREATE INDEX "inventory_movements_tenant_id_branch_id_product_id_created__idx" ON "inventory_movements"("tenant_id", "branch_id", "product_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_movements_tenant_id_idempotency_key_key" ON "inventory_movements"("tenant_id", "idempotency_key");

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_tenant_id_patient_id_fkey" FOREIGN KEY ("tenant_id", "patient_id") REFERENCES "patients"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_tenant_id_created_by_membership_id_fkey" FOREIGN KEY ("tenant_id", "created_by_membership_id") REFERENCES "memberships"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_tenant_id_appointment_id_fkey" FOREIGN KEY ("tenant_id", "appointment_id") REFERENCES "appointments"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_tenant_id_invoice_id_fkey" FOREIGN KEY ("tenant_id", "invoice_id") REFERENCES "invoices"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_tenant_id_service_id_fkey" FOREIGN KEY ("tenant_id", "service_id") REFERENCES "clinic_services"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_entries" ADD CONSTRAINT "financial_entries_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_entries" ADD CONSTRAINT "financial_entries_tenant_id_patient_id_fkey" FOREIGN KEY ("tenant_id", "patient_id") REFERENCES "patients"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_entries" ADD CONSTRAINT "financial_entries_tenant_id_invoice_id_fkey" FOREIGN KEY ("tenant_id", "invoice_id") REFERENCES "invoices"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_entries" ADD CONSTRAINT "financial_entries_tenant_id_branch_id_fkey" FOREIGN KEY ("tenant_id", "branch_id") REFERENCES "branches"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_entries" ADD CONSTRAINT "financial_entries_tenant_id_created_by_membership_id_fkey" FOREIGN KEY ("tenant_id", "created_by_membership_id") REFERENCES "memberships"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_entries" ADD CONSTRAINT "financial_entries_tenant_id_reverses_entry_id_fkey" FOREIGN KEY ("tenant_id", "reverses_entry_id") REFERENCES "financial_entries"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_products" ADD CONSTRAINT "inventory_products_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_balances" ADD CONSTRAINT "inventory_balances_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_balances" ADD CONSTRAINT "inventory_balances_tenant_id_branch_id_fkey" FOREIGN KEY ("tenant_id", "branch_id") REFERENCES "branches"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_balances" ADD CONSTRAINT "inventory_balances_tenant_id_product_id_fkey" FOREIGN KEY ("tenant_id", "product_id") REFERENCES "inventory_products"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_tenant_id_branch_id_fkey" FOREIGN KEY ("tenant_id", "branch_id") REFERENCES "branches"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_tenant_id_product_id_fkey" FOREIGN KEY ("tenant_id", "product_id") REFERENCES "inventory_products"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_tenant_id_created_by_membership_id_fkey" FOREIGN KEY ("tenant_id", "created_by_membership_id") REFERENCES "memberships"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "permissions" ("key", "description") VALUES
  ('finance.manage', 'Create invoices, record payments, refunds, and expenses'),
  ('finance.read', 'Read invoices, ledger entries, and finance summaries'),
  ('inventory.manage', 'Manage products and stock movements'),
  ('inventory.read', 'Read inventory balances and movements')
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "role_permissions" ("tenant_id", "role_id", "permission_key")
SELECT r."tenant_id", r."id", p."key"
FROM "roles" r
JOIN "permissions" p ON p."key" IN ('finance.manage', 'finance.read', 'inventory.manage', 'inventory.read')
WHERE r."key" = 'owner'
ON CONFLICT ("tenant_id", "role_id", "permission_key") DO NOTHING;

ALTER TABLE "invoices" ADD CONSTRAINT "invoices_total_positive_check" CHECK ("total_rial" > 0);
ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_amounts_check"
  CHECK ("quantity" > 0 AND "unit_price_rial" > 0 AND "line_total_rial" = "unit_price_rial" * "quantity");
ALTER TABLE "financial_entries" ADD CONSTRAINT "financial_entries_amount_positive_check" CHECK ("amount_rial" > 0);
ALTER TABLE "financial_entries" ADD CONSTRAINT "financial_entries_kind_direction_check" CHECK (
  ("kind" = 'PAYMENT' AND "direction" = 'INCOME' AND "invoice_id" IS NOT NULL AND "patient_id" IS NOT NULL AND "payment_method" IS NOT NULL AND "reverses_entry_id" IS NULL)
  OR ("kind" = 'REFUND' AND "direction" = 'OUTGOING' AND "invoice_id" IS NOT NULL AND "patient_id" IS NOT NULL AND "payment_method" IS NOT NULL AND "reverses_entry_id" IS NOT NULL)
  OR ("kind" = 'EXPENSE' AND "direction" = 'OUTGOING' AND "invoice_id" IS NULL AND "patient_id" IS NULL AND "payment_method" IS NOT NULL AND "reverses_entry_id" IS NULL)
);
ALTER TABLE "inventory_balances" ADD CONSTRAINT "inventory_balances_nonnegative_check" CHECK ("quantity_on_hand" >= 0);
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_nonzero_delta_check" CHECK ("quantity_delta" <> 0);
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_kind_sign_check" CHECK (
  ("kind" IN ('OPENING', 'PURCHASE') AND "quantity_delta" > 0)
  OR ("kind" = 'CONSUMPTION' AND "quantity_delta" < 0)
  OR "kind" = 'ADJUSTMENT'
);
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_cost_nonnegative_check"
  CHECK ("unit_cost_rial" IS NULL OR "unit_cost_rial" >= 0);

ALTER TABLE "invoices" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "invoices" FORCE ROW LEVEL SECURITY;
CREATE POLICY "invoice_tenant_scope" ON "invoices"
  USING ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
ALTER TABLE "invoice_lines" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "invoice_lines" FORCE ROW LEVEL SECURITY;
CREATE POLICY "invoice_line_tenant_scope" ON "invoice_lines"
  USING ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
ALTER TABLE "financial_entries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "financial_entries" FORCE ROW LEVEL SECURITY;
CREATE POLICY "financial_entry_tenant_scope" ON "financial_entries"
  USING ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
ALTER TABLE "inventory_products" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "inventory_products" FORCE ROW LEVEL SECURITY;
CREATE POLICY "inventory_product_tenant_scope" ON "inventory_products"
  USING ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
ALTER TABLE "inventory_balances" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "inventory_balances" FORCE ROW LEVEL SECURITY;
CREATE POLICY "inventory_balance_tenant_scope" ON "inventory_balances"
  USING ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
ALTER TABLE "inventory_movements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "inventory_movements" FORCE ROW LEVEL SECURITY;
CREATE POLICY "inventory_movement_tenant_scope" ON "inventory_movements"
  USING ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE FUNCTION "reject_financial_mutation"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Financial records are immutable; use a refund or adjustment.' USING ERRCODE = '55000';
END;
$$;
CREATE TRIGGER "invoices_append_only" BEFORE UPDATE OR DELETE ON "invoices"
  FOR EACH ROW EXECUTE FUNCTION "reject_financial_mutation"();
CREATE TRIGGER "invoice_lines_append_only" BEFORE UPDATE OR DELETE ON "invoice_lines"
  FOR EACH ROW EXECUTE FUNCTION "reject_financial_mutation"();
CREATE TRIGGER "financial_entries_append_only" BEFORE UPDATE OR DELETE ON "financial_entries"
  FOR EACH ROW EXECUTE FUNCTION "reject_financial_mutation"();
CREATE TRIGGER "inventory_movements_append_only" BEFORE UPDATE OR DELETE ON "inventory_movements"
  FOR EACH ROW EXECUTE FUNCTION "reject_financial_mutation"();

CREATE FUNCTION "verify_invoice_total"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target_tenant uuid; target_invoice uuid; expected_total bigint; line_total bigint;
BEGIN
  target_tenant := COALESCE(NEW."tenant_id", OLD."tenant_id");
  target_invoice := CASE WHEN TG_TABLE_NAME = 'invoices' THEN COALESCE(NEW."id", OLD."id") ELSE COALESCE(NEW."invoice_id", OLD."invoice_id") END;
  SELECT "total_rial" INTO expected_total FROM "invoices" WHERE "tenant_id" = target_tenant AND "id" = target_invoice;
  SELECT COALESCE(SUM("line_total_rial"), 0) INTO line_total FROM "invoice_lines" WHERE "tenant_id" = target_tenant AND "invoice_id" = target_invoice;
  IF expected_total IS NULL OR expected_total <> line_total THEN
    RAISE EXCEPTION 'Invoice total must equal the sum of its immutable lines.' USING ERRCODE = '23514';
  END IF;
  RETURN NULL;
END;
$$;
CREATE CONSTRAINT TRIGGER "invoices_total_matches_lines"
  AFTER INSERT ON "invoices" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "verify_invoice_total"();
CREATE CONSTRAINT TRIGGER "invoice_lines_match_total"
  AFTER INSERT ON "invoice_lines" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "verify_invoice_total"();

CREATE FUNCTION "verify_financial_entry"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE source_entry "financial_entries"%ROWTYPE;
BEGIN
  IF NEW."kind" = 'REFUND' THEN
    SELECT * INTO source_entry FROM "financial_entries"
      WHERE "tenant_id" = NEW."tenant_id" AND "id" = NEW."reverses_entry_id";
    IF source_entry."kind" <> 'PAYMENT'
      OR source_entry."amount_rial" <> NEW."amount_rial"
      OR source_entry."invoice_id" IS DISTINCT FROM NEW."invoice_id"
      OR source_entry."patient_id" IS DISTINCT FROM NEW."patient_id"
      OR source_entry."payment_method" IS DISTINCT FROM NEW."payment_method" THEN
      RAISE EXCEPTION 'Refund must reverse the original payment in full.' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "financial_refund_matches_payment" BEFORE INSERT ON "financial_entries"
  FOR EACH ROW EXECUTE FUNCTION "verify_financial_entry"();

CREATE FUNCTION "verify_invoice_balance"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target_invoice uuid; invoice_total bigint; net_paid bigint;
BEGIN
  target_invoice := NEW."invoice_id";
  IF target_invoice IS NULL THEN RETURN NULL; END IF;
  SELECT "total_rial" INTO invoice_total FROM "invoices"
    WHERE "tenant_id" = NEW."tenant_id" AND "id" = target_invoice;
  SELECT COALESCE(SUM(CASE WHEN "kind" = 'PAYMENT' THEN "amount_rial" ELSE -"amount_rial" END), 0)
    INTO net_paid FROM "financial_entries"
    WHERE "tenant_id" = NEW."tenant_id" AND "invoice_id" = target_invoice AND "kind" IN ('PAYMENT', 'REFUND');
  IF net_paid < 0 OR net_paid > invoice_total THEN
    RAISE EXCEPTION 'Invoice payments cannot be negative or exceed the invoice total.' USING ERRCODE = '23514';
  END IF;
  RETURN NULL;
END;
$$;
CREATE CONSTRAINT TRIGGER "financial_invoice_balance_valid"
  AFTER INSERT ON "financial_entries" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "verify_invoice_balance"();

CREATE FUNCTION "apply_inventory_movement"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE "inventory_balances"
    SET "quantity_on_hand" = "quantity_on_hand" + NEW."quantity_delta", "updated_at" = CURRENT_TIMESTAMP
    WHERE "tenant_id" = NEW."tenant_id" AND "branch_id" = NEW."branch_id" AND "product_id" = NEW."product_id"
      AND "quantity_on_hand" + NEW."quantity_delta" >= 0;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Stock cannot become negative and its branch balance must exist.' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "inventory_movement_updates_balance" AFTER INSERT ON "inventory_movements"
  FOR EACH ROW EXECUTE FUNCTION "apply_inventory_movement"();

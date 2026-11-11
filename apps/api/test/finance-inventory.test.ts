import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { ConflictException } from "@nestjs/common";
import { FinancialEntryKind, InventoryMovementKind, PaymentMethod } from "@prisma/client";
import test from "node:test";
import { PrismaService } from "../src/modules/database/database.module";
import { withTenantTransaction } from "../src/modules/database/tenant-transaction";
import { FinanceService } from "../src/modules/finance/finance.service";
import { InventoryService } from "../src/modules/inventory/inventory.service";

test("finance is integer-rial, idempotent, reversible, immutable; inventory is tenant and branch scoped", async () => {
  assert.ok(process.env.DATABASE_URL, "DATABASE_URL must point to a migrated test database");
  assert.ok(process.env.DIRECT_URL, "DIRECT_URL must point to a migration/admin database role");
  const runtime = new PrismaService();
  const admin = new PrismaService({ datasourceUrl: process.env.DIRECT_URL });
  await Promise.all([runtime.$connect(), admin.$connect()]);
  const tenantId = randomUUID();
  const otherTenantId = randomUUID();
  const marker = randomUUID();
  let branchId = "";
  let patientId = "";
  let invoiceId = "";
  let paymentId = "";
  let productId = "";

  try {
    await withTenantTransaction(runtime, otherTenantId, (tx) =>
      tx.tenant.create({
        data: { id: otherTenantId, slug: `finance-other-${marker}`, name: "Finance other tenant" },
      }),
    );
    const fixture = await withTenantTransaction(runtime, tenantId, async (tx) => {
      await tx.tenant.create({
        data: { id: tenantId, slug: `finance-${marker}`, name: "Finance test tenant" },
      });
      const user = await tx.user.create({
        data: { displayName: `Finance tester ${marker}`, passwordHash: "test-only" },
        select: { id: true },
      });
      const role = await tx.role.create({
        data: { tenantId, name: "Owner", key: `owner-${marker}` },
        select: { id: true },
      });
      const membership = await tx.membership.create({
        data: { tenantId, userId: user.id, roleId: role.id },
        select: { id: true },
      });
      const branch = await tx.branch.create({
        data: { tenantId, name: `Finance branch ${marker}` },
        select: { id: true },
      });
      await tx.branch.create({ data: { tenantId, name: `Other branch ${marker}` } });
      const patient = await tx.patient.create({
        data: { tenantId, fullName: `Finance patient ${marker}` },
        select: { id: true },
      });
      return {
        userId: user.id,
        membershipId: membership.id,
        branchId: branch.id,
        patientId: patient.id,
      };
    });
    branchId = fixture.branchId;
    patientId = fixture.patientId;
    const principal = {
      userId: fixture.userId,
      tenantId,
      membershipId: fixture.membershipId,
      roleKey: "owner",
      permissions: ["finance.manage", "finance.read", "inventory.manage", "inventory.read"],
    };
    const finance = new FinanceService(runtime);
    const inventory = new InventoryService(runtime);

    const invoiceInput = {
      patientId,
      idempotencyKey: `invoice-${marker}-one`,
      lines: [
        { description: `Consultation ${marker}`, quantity: 1, unitPriceRial: "20000" },
        { description: `Product ${marker}`, quantity: 3, unitPriceRial: "5000" },
      ],
    };
    const invoice = await finance.createInvoice(principal, invoiceInput);
    invoiceId = invoice.id;
    assert.equal(invoice.totalRial, "35000");
    assert.equal(invoice.balanceRial, "35000");
    assert.equal((await finance.createInvoice(principal, invoiceInput)).id, invoice.id);
    await assert.rejects(
      finance.createInvoice(principal, {
        ...invoiceInput,
        lines: [{ description: "Different invoice", quantity: 1, unitPriceRial: "35000" }],
      }),
      (error: unknown) => error instanceof ConflictException,
    );

    const firstPaymentInput = {
      invoiceId,
      amountRial: "10000",
      paymentMethod: PaymentMethod.CASH,
      idempotencyKey: `payment-${marker}-first`,
    };
    const payment = await finance.createPayment(principal, firstPaymentInput);
    paymentId = payment.id;
    const paymentRetry = await finance.createPayment(principal, firstPaymentInput);
    assert.equal(
      paymentRetry.id,
      paymentId,
      "a repeated payment request must return the original ledger entry",
    );

    const contested = await Promise.allSettled(
      ["one", "two"].map((suffix) =>
        finance.createPayment(principal, {
          invoiceId,
          amountRial: "15000",
          paymentMethod: PaymentMethod.CARD,
          idempotencyKey: `payment-${marker}-${suffix}`,
        }),
      ),
    );
    assert.equal(contested.filter((result) => result.status === "fulfilled").length, 1);
    assert.equal(contested.filter((result) => result.status === "rejected").length, 1);
    const rejectedPayment = contested.find((result) => result.status === "rejected");
    assert.ok(rejectedPayment && rejectedPayment.status === "rejected");
    assert.ok(rejectedPayment.reason instanceof ConflictException);

    const refundInput = { paymentEntryId: paymentId, idempotencyKey: `refund-${marker}-one` };
    const refund = await finance.refundPayment(principal, refundInput);
    assert.equal(refund.kind, FinancialEntryKind.REFUND);
    assert.equal(refund.amountRial, "10000");
    assert.equal((await finance.refundPayment(principal, refundInput)).id, refund.id);
    await assert.rejects(
      finance.refundPayment(principal, {
        paymentEntryId: paymentId,
        idempotencyKey: `refund-${marker}-two`,
      }),
      (error: unknown) => error instanceof ConflictException,
    );

    const expenseInput = {
      description: `Clinic supplies ${marker}`,
      amountRial: "5000",
      paymentMethod: PaymentMethod.CASH,
      idempotencyKey: `expense-${marker}-one`,
      branchId,
    };
    const expense = await finance.createExpense(principal, expenseInput);
    assert.equal((await finance.createExpense(principal, expenseInput)).id, expense.id);
    const summary = await finance.summary(principal, {});
    assert.equal(summary.incomeRial, "25000");
    assert.equal(summary.outgoingRial, "15000");
    assert.equal(summary.netRial, "10000");

    const product = await inventory.createProduct(principal, {
      sku: `sku-${marker}`,
      name: `Serum ${marker}`,
      category: "Skincare",
      unit: "bottle",
      reorderPoint: 2,
    });
    productId = product.id;
    const noStockAlert = await inventory.listProducts(principal, { branchId });
    assert.equal(noStockAlert[0]?.branches[0]?.quantityOnHand, 0);
    assert.equal(noStockAlert[0]?.branches[0]?.lowStock, true);
    const purchaseInput = {
      branchId,
      productId,
      kind: InventoryMovementKind.PURCHASE,
      quantityDelta: 10,
      unitCostRial: "12000",
      idempotencyKey: `stock-${marker}-purchase`,
    };
    const purchase = await inventory.createMovement(principal, purchaseInput);
    assert.equal(purchase.quantityOnHand, 10);
    assert.equal((await inventory.createMovement(principal, purchaseInput)).id, purchase.id);
    const consumption = await inventory.createMovement(principal, {
      branchId,
      productId,
      kind: InventoryMovementKind.CONSUMPTION,
      quantityDelta: -7,
      idempotencyKey: `stock-${marker}-consume`,
    });
    assert.equal(consumption.quantityOnHand, 3);

    const concurrentConsumption = await Promise.allSettled(
      ["a", "b"].map((suffix) =>
        inventory.createMovement(principal, {
          branchId,
          productId,
          kind: InventoryMovementKind.CONSUMPTION,
          quantityDelta: -2,
          idempotencyKey: `stock-${marker}-race-${suffix}`,
        }),
      ),
    );
    assert.equal(concurrentConsumption.filter((result) => result.status === "fulfilled").length, 1);
    assert.equal(concurrentConsumption.filter((result) => result.status === "rejected").length, 1);
    const stock = await inventory.listProducts(principal, {});
    const primaryStock = stock[0]?.branches.find((branch) => branch.branchId === branchId);
    assert.equal(primaryStock?.quantityOnHand, 1);
    assert.equal(primaryStock?.lowStock, true);
    const otherBranchStock = stock[0]?.branches.find(
      (branch) => branch.branchName === `Other branch ${marker}`,
    );
    assert.equal(otherBranchStock?.quantityOnHand, 0);

    const otherTenantEntries = await withTenantTransaction(runtime, otherTenantId, (tx) =>
      tx.financialEntry.findMany({ where: { tenantId } }),
    );
    const otherTenantProducts = await withTenantTransaction(runtime, otherTenantId, (tx) =>
      tx.inventoryProduct.findMany({ where: { tenantId } }),
    );
    assert.equal(otherTenantEntries.length, 0);
    assert.equal(otherTenantProducts.length, 0);

    await assert.rejects(
      withTenantTransaction(runtime, tenantId, (tx) =>
        tx.financialEntry.delete({ where: { tenantId_id: { tenantId, id: paymentId } } }),
      ),
    );
    await assert.rejects(
      withTenantTransaction(runtime, tenantId, (tx) =>
        tx.inventoryMovement.delete({ where: { tenantId_id: { tenantId, id: purchase.id } } }),
      ),
    );
  } finally {
    await admin.$transaction(async (tx) => {
      await tx.$executeRawUnsafe('ALTER TABLE "invoices" DISABLE TRIGGER "invoices_append_only"');
      await tx.$executeRawUnsafe(
        'ALTER TABLE "invoice_lines" DISABLE TRIGGER "invoice_lines_append_only"',
      );
      await tx.$executeRawUnsafe(
        'ALTER TABLE "financial_entries" DISABLE TRIGGER "financial_entries_append_only"',
      );
      await tx.$executeRawUnsafe(
        'ALTER TABLE "inventory_movements" DISABLE TRIGGER "inventory_movements_append_only"',
      );
      try {
        await tx.financialEntry.deleteMany({ where: { tenantId } });
        await tx.invoiceLine.deleteMany({ where: { tenantId } });
        await tx.invoice.deleteMany({ where: { tenantId } });
        await tx.inventoryMovement.deleteMany({ where: { tenantId } });
        await tx.inventoryBalance.deleteMany({ where: { tenantId } });
        await tx.inventoryProduct.deleteMany({ where: { tenantId } });
        await tx.branch.deleteMany({ where: { tenantId } });
        await tx.patient.deleteMany({ where: { tenantId } });
        await tx.membership.deleteMany({ where: { tenantId } });
        await tx.role.deleteMany({ where: { tenantId } });
        await tx.user.deleteMany({ where: { displayName: `Finance tester ${marker}` } });
        await tx.tenant.deleteMany({ where: { id: { in: [tenantId, otherTenantId] } } });
      } finally {
        await tx.$executeRawUnsafe('ALTER TABLE "invoices" ENABLE TRIGGER "invoices_append_only"');
        await tx.$executeRawUnsafe(
          'ALTER TABLE "invoice_lines" ENABLE TRIGGER "invoice_lines_append_only"',
        );
        await tx.$executeRawUnsafe(
          'ALTER TABLE "financial_entries" ENABLE TRIGGER "financial_entries_append_only"',
        );
        await tx.$executeRawUnsafe(
          'ALTER TABLE "inventory_movements" ENABLE TRIGGER "inventory_movements_append_only"',
        );
      }
    });
    await Promise.all([runtime.$disconnect(), admin.$disconnect()]);
  }
});

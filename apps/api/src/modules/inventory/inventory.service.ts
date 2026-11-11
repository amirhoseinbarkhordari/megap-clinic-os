import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InventoryMovementKind, Prisma } from "@prisma/client";
import { TenantPrincipal } from "../auth/tenant-context";
import { PrismaService } from "../database/database.module";
import { withTenantTransaction } from "../database/tenant-transaction";
import {
  CreateInventoryProductDto,
  CreateStockMovementDto,
  InventoryListQuery,
} from "./inventory.dto";

const MAX_INT64 = 9_223_372_036_854_775_807n;

function boundedLimit(value: string | undefined, fallback: number, maximum: number) {
  const parsed = Number(value ?? fallback);
  if (!Number.isInteger(parsed) || parsed < 1)
    throw new BadRequestException("limit must be a positive integer.");
  return Math.min(parsed, maximum);
}

@Injectable()
export class InventoryService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  listBranches(principal: TenantPrincipal) {
    return withTenantTransaction(this.prisma, principal.tenantId, (tx) =>
      tx.branch.findMany({
        where: { tenantId: principal.tenantId, isActive: true },
        orderBy: [{ name: "asc" }, { id: "asc" }],
        select: { id: true, name: true },
      }),
    );
  }

  async createProduct(principal: TenantPrincipal, input: CreateInventoryProductDto) {
    try {
      return await withTenantTransaction(this.prisma, principal.tenantId, (tx) =>
        tx.inventoryProduct.create({
          data: {
            tenantId: principal.tenantId,
            sku: input.sku?.trim() || null,
            name: input.name.trim(),
            category: input.category?.trim() || null,
            unit: input.unit?.trim() || "unit",
            reorderPoint: input.reorderPoint ?? 0,
          },
          select: {
            id: true,
            sku: true,
            name: true,
            category: true,
            unit: true,
            reorderPoint: true,
            isActive: true,
          },
        }),
      );
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictException("This SKU is already registered in the clinic.");
      }
      throw error;
    }
  }

  listProducts(principal: TenantPrincipal, query: InventoryListQuery) {
    return withTenantTransaction(this.prisma, principal.tenantId, async (tx) => {
      if (query.branchId) {
        const branch = await tx.branch.findUnique({
          where: { tenantId_id: { tenantId: principal.tenantId, id: query.branchId } },
          select: { id: true },
        });
        if (!branch) throw new NotFoundException("Branch not found in this clinic.");
      }
      const [products, branches] = await Promise.all([
        tx.inventoryProduct.findMany({
          where: { tenantId: principal.tenantId, isActive: true },
          orderBy: [{ name: "asc" }, { id: "asc" }],
          take: boundedLimit(query.limit, 100, 500),
          include: {
            balances: {
              where: {
                tenantId: principal.tenantId,
                ...(query.branchId ? { branchId: query.branchId } : {}),
              },
            },
          },
        }),
        tx.branch.findMany({
          where: {
            tenantId: principal.tenantId,
            isActive: true,
            ...(query.branchId ? { id: query.branchId } : {}),
          },
          orderBy: [{ name: "asc" }, { id: "asc" }],
          select: { id: true, name: true },
        }),
      ]);
      return products.map((product) => ({
        id: product.id,
        sku: product.sku,
        name: product.name,
        category: product.category,
        unit: product.unit,
        reorderPoint: product.reorderPoint,
        branches: branches.map((branch) => {
          const balance = product.balances.find((item) => item.branchId === branch.id);
          const quantityOnHand = balance?.quantityOnHand ?? 0;
          return {
            branchId: branch.id,
            branchName: branch.name,
            quantityOnHand,
            lowStock: quantityOnHand <= product.reorderPoint,
          };
        }),
      }));
    });
  }

  async createMovement(principal: TenantPrincipal, input: CreateStockMovementDto) {
    if (input.quantityDelta === 0)
      throw new BadRequestException("Stock movement quantity cannot be zero.");
    if (
      (input.kind === InventoryMovementKind.OPENING ||
        input.kind === InventoryMovementKind.PURCHASE) &&
      input.quantityDelta < 1
    ) {
      throw new BadRequestException("Opening and purchase movements must add stock.");
    }
    if (input.kind === InventoryMovementKind.CONSUMPTION && input.quantityDelta > -1) {
      throw new BadRequestException("Consumption movements must remove stock.");
    }
    const unitCostRial = input.unitCostRial ? BigInt(input.unitCostRial) : null;
    if (unitCostRial !== null && (unitCostRial < 1n || unitCostRial > MAX_INT64)) {
      throw new BadRequestException("Unit cost must be a positive Rial integer.");
    }
    try {
      return await withTenantTransaction(this.prisma, principal.tenantId, async (tx) => {
        const existing = await tx.inventoryMovement.findUnique({
          where: {
            tenantId_idempotencyKey: {
              tenantId: principal.tenantId,
              idempotencyKey: input.idempotencyKey,
            },
          },
        });
        if (existing) {
          const same =
            existing.branchId === input.branchId &&
            existing.productId === input.productId &&
            existing.kind === input.kind &&
            existing.quantityDelta === input.quantityDelta &&
            existing.unitCostRial === unitCostRial &&
            existing.note === (input.note?.trim() || null);
          if (!same)
            throw new ConflictException(
              "Idempotency key was already used for a different stock movement.",
            );
          const balance = await tx.inventoryBalance.findUnique({
            where: {
              tenantId_branchId_productId: {
                tenantId: principal.tenantId,
                branchId: input.branchId,
                productId: input.productId,
              },
            },
            select: { quantityOnHand: true },
          });
          return {
            ...existing,
            unitCostRial: existing.unitCostRial?.toString() ?? null,
            quantityOnHand: balance?.quantityOnHand ?? 0,
          };
        }

        const [branch, product] = await Promise.all([
          tx.branch.findUnique({
            where: { tenantId_id: { tenantId: principal.tenantId, id: input.branchId } },
            select: { id: true, isActive: true },
          }),
          tx.inventoryProduct.findUnique({
            where: { tenantId_id: { tenantId: principal.tenantId, id: input.productId } },
            select: { id: true, isActive: true },
          }),
        ]);
        if (!branch?.isActive)
          throw new NotFoundException("Active branch was not found in this clinic.");
        if (!product?.isActive)
          throw new NotFoundException("Active inventory product was not found in this clinic.");

        await tx.inventoryBalance.createMany({
          data: [
            {
              tenantId: principal.tenantId,
              branchId: input.branchId,
              productId: input.productId,
              quantityOnHand: 0,
            },
          ],
          skipDuplicates: true,
        });
        const [balance] = await tx.$queryRaw<Array<{ quantity_on_hand: number }>>`
          SELECT quantity_on_hand FROM inventory_balances
          WHERE tenant_id = ${principal.tenantId}::uuid
            AND branch_id = ${input.branchId}::uuid
            AND product_id = ${input.productId}::uuid
          FOR UPDATE
        `;
        if (!balance) throw new NotFoundException("Inventory balance is unavailable.");
        const retry = await tx.inventoryMovement.findUnique({
          where: {
            tenantId_idempotencyKey: {
              tenantId: principal.tenantId,
              idempotencyKey: input.idempotencyKey,
            },
          },
        });
        if (retry) {
          const same =
            retry.branchId === input.branchId &&
            retry.productId === input.productId &&
            retry.kind === input.kind &&
            retry.quantityDelta === input.quantityDelta &&
            retry.unitCostRial === unitCostRial &&
            retry.note === (input.note?.trim() || null);
          if (!same)
            throw new ConflictException(
              "Idempotency key was already used for a different stock movement.",
            );
          return {
            ...retry,
            unitCostRial: retry.unitCostRial?.toString() ?? null,
            quantityOnHand: balance.quantity_on_hand,
          };
        }
        const nextQuantity = balance.quantity_on_hand + input.quantityDelta;
        if (nextQuantity < 0)
          throw new ConflictException("Stock movement would make branch inventory negative.");
        if (!Number.isSafeInteger(nextQuantity))
          throw new BadRequestException("Inventory quantity exceeds the supported range.");

        const movement = await tx.inventoryMovement.create({
          data: {
            tenantId: principal.tenantId,
            branchId: input.branchId,
            productId: input.productId,
            createdByMembershipId: principal.membershipId,
            kind: input.kind,
            quantityDelta: input.quantityDelta,
            unitCostRial,
            idempotencyKey: input.idempotencyKey,
            note: input.note?.trim() || null,
          },
        });
        return {
          ...movement,
          unitCostRial: movement.unitCostRial?.toString() ?? null,
          quantityOnHand: nextQuantity,
        };
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictException("Idempotency key was already used for another stock movement.");
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
        throw new NotFoundException("Branch or product does not belong to this clinic.");
      }
      throw error;
    }
  }

  listMovements(principal: TenantPrincipal, query: InventoryListQuery) {
    return withTenantTransaction(this.prisma, principal.tenantId, async (tx) => {
      const movements = await tx.inventoryMovement.findMany({
        where: {
          tenantId: principal.tenantId,
          ...(query.branchId ? { branchId: query.branchId } : {}),
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: boundedLimit(query.limit, 100, 500),
        include: {
          product: { select: { name: true, sku: true, unit: true } },
          branch: { select: { name: true } },
          createdBy: { select: { user: { select: { displayName: true } } } },
        },
      });
      return movements.map((movement) => ({
        ...movement,
        unitCostRial: movement.unitCostRial?.toString() ?? null,
      }));
    });
  }
}

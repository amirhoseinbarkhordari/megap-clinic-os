import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { FinancialDirection, FinancialEntryKind, Prisma } from "@prisma/client";
import { TenantPrincipal } from "../auth/tenant-context";
import { PrismaService } from "../database/database.module";
import { withTenantTransaction } from "../database/tenant-transaction";
import {
  CreateExpenseDto,
  CreateInvoiceDto,
  CreatePaymentDto,
  FinanceListQuery,
  RefundPaymentDto,
} from "./finance.dto";

const MAX_INT64 = 9_223_372_036_854_775_807n;

function boundedLimit(value: string | undefined, fallback: number, maximum: number) {
  const parsed = Number(value ?? fallback);
  if (!Number.isInteger(parsed) || parsed < 1)
    throw new BadRequestException("limit must be a positive integer.");
  return Math.min(parsed, maximum);
}

function parseRial(value: string, label = "amountRial"): bigint {
  const amount = BigInt(value);
  if (amount <= 0n || amount > MAX_INT64) {
    throw new BadRequestException(`${label} must be a positive Rial integer in range.`);
  }
  return amount;
}

function serializeEntry<T extends { amountRial: bigint }>(entry: T) {
  return { ...entry, amountRial: entry.amountRial.toString() };
}

function sameInvoiceLines(
  existing: Array<{
    serviceId: string | null;
    description: string;
    quantity: number;
    unitPriceRial: bigint;
  }>,
  requested: Array<{
    serviceId?: string;
    description: string;
    quantity: number;
    unitPriceRial: bigint;
  }>,
) {
  const normalize = (
    lines: Array<{
      serviceId?: string | null;
      description: string;
      quantity: number;
      unitPriceRial: bigint;
    }>,
  ) =>
    lines
      .map((line) =>
        JSON.stringify([
          line.serviceId ?? null,
          line.description.trim(),
          line.quantity,
          line.unitPriceRial.toString(),
        ]),
      )
      .sort();
  return JSON.stringify(normalize(existing)) === JSON.stringify(normalize(requested));
}

function serializeInvoice(invoice: {
  id: string;
  patientId: string;
  appointmentId: string | null;
  totalRial: bigint;
  createdAt: Date;
  patient: { fullName: string };
  lines: Array<{
    id: string;
    serviceId: string | null;
    description: string;
    quantity: number;
    unitPriceRial: bigint;
    lineTotalRial: bigint;
  }>;
  entries: Array<{ id: string; kind: FinancialEntryKind; amountRial: bigint }>;
}) {
  const paidRial = invoice.entries.reduce(
    (sum, entry) =>
      sum +
      (entry.kind === FinancialEntryKind.PAYMENT
        ? entry.amountRial
        : entry.kind === FinancialEntryKind.REFUND
          ? -entry.amountRial
          : 0n),
    0n,
  );
  const balanceRial = invoice.totalRial - paidRial;
  return {
    id: invoice.id,
    patientId: invoice.patientId,
    patientName: invoice.patient.fullName,
    appointmentId: invoice.appointmentId,
    totalRial: invoice.totalRial.toString(),
    paidRial: paidRial.toString(),
    balanceRial: balanceRial.toString(),
    status: balanceRial === 0n ? "PAID" : paidRial > 0n ? "PARTIAL" : "OPEN",
    createdAt: invoice.createdAt,
    lines: invoice.lines.map((line) => ({
      ...line,
      unitPriceRial: line.unitPriceRial.toString(),
      lineTotalRial: line.lineTotalRial.toString(),
    })),
  };
}

@Injectable()
export class FinanceService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  listPatients(principal: TenantPrincipal) {
    return withTenantTransaction(this.prisma, principal.tenantId, (tx) =>
      tx.patient.findMany({
        where: { tenantId: principal.tenantId },
        orderBy: [{ fullName: "asc" }, { id: "asc" }],
        take: 250,
        select: { id: true, fullName: true },
      }),
    );
  }

  async createInvoice(principal: TenantPrincipal, input: CreateInvoiceDto) {
    const lines = input.lines.map((line) => {
      const unitPriceRial = parseRial(line.unitPriceRial, "unitPriceRial");
      const lineTotalRial = unitPriceRial * BigInt(line.quantity);
      if (lineTotalRial > MAX_INT64)
        throw new BadRequestException("Invoice line total is too large.");
      return { ...line, unitPriceRial, lineTotalRial };
    });
    const totalRial = lines.reduce((sum, line) => sum + line.lineTotalRial, 0n);
    if (totalRial > MAX_INT64) throw new BadRequestException("Invoice total is too large.");

    try {
      return await withTenantTransaction(this.prisma, principal.tenantId, async (tx) => {
        const existing = await tx.invoice.findUnique({
          where: {
            tenantId_idempotencyKey: {
              tenantId: principal.tenantId,
              idempotencyKey: input.idempotencyKey,
            },
          },
          include: { patient: { select: { fullName: true } }, lines: true, entries: true },
        });
        if (existing) {
          if (
            existing.patientId !== input.patientId ||
            existing.appointmentId !== (input.appointmentId ?? null) ||
            existing.totalRial !== totalRial ||
            !sameInvoiceLines(existing.lines, lines)
          ) {
            throw new ConflictException(
              "Idempotency key was already used for a different invoice.",
            );
          }
          return serializeInvoice(existing);
        }
        const patient = await tx.patient.findUnique({
          where: { tenantId_id: { tenantId: principal.tenantId, id: input.patientId } },
          select: { id: true },
        });
        if (!patient) throw new NotFoundException("Patient not found in this clinic.");
        if (input.appointmentId) {
          const appointment = await tx.appointment.findUnique({
            where: { tenantId_id: { tenantId: principal.tenantId, id: input.appointmentId } },
            select: { patientId: true },
          });
          if (!appointment || appointment.patientId !== input.patientId) {
            throw new BadRequestException(
              "Invoice appointment must belong to the selected patient.",
            );
          }
        }
        for (const line of lines) {
          if (line.serviceId) {
            const service = await tx.clinicService.findUnique({
              where: { tenantId_id: { tenantId: principal.tenantId, id: line.serviceId } },
              select: { id: true, isActive: true },
            });
            if (!service?.isActive)
              throw new BadRequestException("Invoice service is not active in this clinic.");
          }
        }
        const invoice = await tx.invoice.create({
          data: {
            tenantId: principal.tenantId,
            patientId: input.patientId,
            appointmentId: input.appointmentId,
            idempotencyKey: input.idempotencyKey,
            createdByMembershipId: principal.membershipId,
            totalRial,
            lines: {
              create: lines.map(
                ({ serviceId, description, quantity, unitPriceRial, lineTotalRial }) => ({
                  serviceId,
                  description: description.trim(),
                  quantity,
                  unitPriceRial,
                  lineTotalRial,
                }),
              ),
            },
          },
          include: { patient: { select: { fullName: true } }, lines: true, entries: true },
        });
        return serializeInvoice(invoice);
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const existing = await withTenantTransaction(this.prisma, principal.tenantId, (tx) =>
          tx.invoice.findUnique({
            where: {
              tenantId_idempotencyKey: {
                tenantId: principal.tenantId,
                idempotencyKey: input.idempotencyKey,
              },
            },
            include: { patient: { select: { fullName: true } }, lines: true, entries: true },
          }),
        );
        if (
          existing &&
          existing.patientId === input.patientId &&
          existing.appointmentId === (input.appointmentId ?? null) &&
          existing.totalRial === totalRial &&
          sameInvoiceLines(existing.lines, lines)
        )
          return serializeInvoice(existing);
        throw new ConflictException(
          "Invoice was already created or the idempotency key was reused.",
        );
      }
      throw error;
    }
  }

  async listInvoices(principal: TenantPrincipal, query: FinanceListQuery) {
    const take = boundedLimit(query.limit, 50, 100);
    const invoices = await withTenantTransaction(this.prisma, principal.tenantId, (tx) =>
      tx.invoice.findMany({
        where: {
          tenantId: principal.tenantId,
          ...(query.from || query.to
            ? {
                createdAt: {
                  ...(query.from ? { gte: this.parseDate(query.from, "from") } : {}),
                  ...(query.to ? { lte: this.parseDate(query.to, "to") } : {}),
                },
              }
            : {}),
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take,
        include: { patient: { select: { fullName: true } }, lines: true, entries: true },
      }),
    );
    return invoices.map(serializeInvoice);
  }

  async createPayment(principal: TenantPrincipal, input: CreatePaymentDto) {
    const amountRial = parseRial(input.amountRial);
    try {
      return await withTenantTransaction(this.prisma, principal.tenantId, async (tx) => {
        const existing = await tx.financialEntry.findUnique({
          where: {
            tenantId_idempotencyKey: {
              tenantId: principal.tenantId,
              idempotencyKey: input.idempotencyKey,
            },
          },
        });
        if (existing) {
          if (
            existing.kind !== FinancialEntryKind.PAYMENT ||
            existing.invoiceId !== input.invoiceId ||
            existing.amountRial !== amountRial ||
            existing.paymentMethod !== input.paymentMethod
          ) {
            throw new ConflictException(
              "Idempotency key was already used for a different financial operation.",
            );
          }
          return serializeEntry(existing);
        }
        const [locked] = await tx.$queryRaw<Array<{ id: string }>>`
          SELECT id FROM invoices
          WHERE tenant_id = ${principal.tenantId}::uuid AND id = ${input.invoiceId}::uuid
          FOR UPDATE
        `;
        if (!locked) throw new NotFoundException("Invoice not found in this clinic.");
        const retry = await tx.financialEntry.findUnique({
          where: {
            tenantId_idempotencyKey: {
              tenantId: principal.tenantId,
              idempotencyKey: input.idempotencyKey,
            },
          },
        });
        if (retry) {
          if (
            retry.kind !== FinancialEntryKind.PAYMENT ||
            retry.invoiceId !== input.invoiceId ||
            retry.amountRial !== amountRial ||
            retry.paymentMethod !== input.paymentMethod
          )
            throw new ConflictException(
              "Idempotency key was already used for a different financial operation.",
            );
          return serializeEntry(retry);
        }
        const invoice = await tx.invoice.findUniqueOrThrow({
          where: { tenantId_id: { tenantId: principal.tenantId, id: input.invoiceId } },
          select: { patientId: true, totalRial: true },
        });
        const entries = await tx.financialEntry.findMany({
          where: {
            tenantId: principal.tenantId,
            invoiceId: input.invoiceId,
            kind: { in: [FinancialEntryKind.PAYMENT, FinancialEntryKind.REFUND] },
          },
          select: { kind: true, amountRial: true },
        });
        const paid = entries.reduce(
          (sum, entry) =>
            sum +
            (entry.kind === FinancialEntryKind.PAYMENT ? entry.amountRial : -entry.amountRial),
          0n,
        );
        if (amountRial > invoice.totalRial - paid)
          throw new ConflictException("Payment exceeds the outstanding invoice balance.");
        const entry = await tx.financialEntry.create({
          data: {
            tenantId: principal.tenantId,
            patientId: invoice.patientId,
            invoiceId: input.invoiceId,
            createdByMembershipId: principal.membershipId,
            kind: FinancialEntryKind.PAYMENT,
            direction: FinancialDirection.INCOME,
            amountRial,
            paymentMethod: input.paymentMethod,
            idempotencyKey: input.idempotencyKey,
            memo: input.memo?.trim() || null,
          },
        });
        return serializeEntry(entry);
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const existing = await this.findByIdempotencyKey(principal.tenantId, input.idempotencyKey);
        if (
          existing &&
          existing.kind === FinancialEntryKind.PAYMENT &&
          existing.invoiceId === input.invoiceId &&
          existing.amountRial === amountRial &&
          existing.paymentMethod === input.paymentMethod
        )
          return serializeEntry(existing);
        throw new ConflictException(
          "Idempotency key was already used for another financial operation.",
        );
      }
      throw error;
    }
  }

  async refundPayment(principal: TenantPrincipal, input: RefundPaymentDto) {
    try {
      return await withTenantTransaction(this.prisma, principal.tenantId, async (tx) => {
        const existing = await tx.financialEntry.findUnique({
          where: {
            tenantId_idempotencyKey: {
              tenantId: principal.tenantId,
              idempotencyKey: input.idempotencyKey,
            },
          },
        });
        if (existing) {
          if (
            existing.kind !== FinancialEntryKind.REFUND ||
            existing.reversesEntryId !== input.paymentEntryId
          )
            throw new ConflictException(
              "Idempotency key was already used for a different financial operation.",
            );
          return serializeEntry(existing);
        }
        const payment = await tx.financialEntry.findUnique({
          where: { tenantId_id: { tenantId: principal.tenantId, id: input.paymentEntryId } },
        });
        if (!payment || payment.kind !== FinancialEntryKind.PAYMENT)
          throw new NotFoundException("Payment was not found.");
        if (payment.invoiceId) {
          await tx.$queryRaw`SELECT id FROM invoices WHERE tenant_id = ${principal.tenantId}::uuid AND id = ${payment.invoiceId}::uuid FOR UPDATE`;
        }
        const priorRefund = await tx.financialEntry.findUnique({
          where: {
            tenantId_reversesEntryId: { tenantId: principal.tenantId, reversesEntryId: payment.id },
          },
          select: { id: true },
        });
        if (priorRefund)
          throw new ConflictException("This payment has already been fully refunded.");
        const refund = await tx.financialEntry.create({
          data: {
            tenantId: principal.tenantId,
            patientId: payment.patientId,
            invoiceId: payment.invoiceId,
            branchId: payment.branchId,
            createdByMembershipId: principal.membershipId,
            kind: FinancialEntryKind.REFUND,
            direction: FinancialDirection.OUTGOING,
            amountRial: payment.amountRial,
            currency: payment.currency,
            paymentMethod: payment.paymentMethod,
            idempotencyKey: input.idempotencyKey,
            reversesEntryId: payment.id,
            memo: input.memo?.trim() || "Refund",
          },
        });
        return serializeEntry(refund);
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const retry = await this.findByIdempotencyKey(principal.tenantId, input.idempotencyKey);
        if (
          retry &&
          retry.kind === FinancialEntryKind.REFUND &&
          retry.reversesEntryId === input.paymentEntryId
        )
          return serializeEntry(retry);
        throw new ConflictException(
          "This payment has already been refunded or the idempotency key was reused.",
        );
      }
      throw error;
    }
  }

  async createExpense(principal: TenantPrincipal, input: CreateExpenseDto) {
    const amountRial = parseRial(input.amountRial);
    try {
      return await withTenantTransaction(this.prisma, principal.tenantId, async (tx) => {
        const existing = await tx.financialEntry.findUnique({
          where: {
            tenantId_idempotencyKey: {
              tenantId: principal.tenantId,
              idempotencyKey: input.idempotencyKey,
            },
          },
        });
        if (existing) {
          if (
            existing.kind !== FinancialEntryKind.EXPENSE ||
            existing.amountRial !== amountRial ||
            existing.memo !== input.description.trim() ||
            existing.branchId !== (input.branchId ?? null) ||
            existing.paymentMethod !== input.paymentMethod
          )
            throw new ConflictException(
              "Idempotency key was already used for a different financial operation.",
            );
          return serializeEntry(existing);
        }
        if (input.branchId) {
          const branch = await tx.branch.findUnique({
            where: { tenantId_id: { tenantId: principal.tenantId, id: input.branchId } },
            select: { isActive: true },
          });
          if (!branch?.isActive)
            throw new NotFoundException("Active branch was not found in this clinic.");
        }
        const entry = await tx.financialEntry.create({
          data: {
            tenantId: principal.tenantId,
            branchId: input.branchId,
            createdByMembershipId: principal.membershipId,
            kind: FinancialEntryKind.EXPENSE,
            direction: FinancialDirection.OUTGOING,
            amountRial,
            paymentMethod: input.paymentMethod,
            idempotencyKey: input.idempotencyKey,
            memo: input.description.trim(),
          },
        });
        return serializeEntry(entry);
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const existing = await this.findByIdempotencyKey(principal.tenantId, input.idempotencyKey);
        if (
          existing &&
          existing.kind === FinancialEntryKind.EXPENSE &&
          existing.amountRial === amountRial &&
          existing.memo === input.description.trim() &&
          existing.branchId === (input.branchId ?? null) &&
          existing.paymentMethod === input.paymentMethod
        )
          return serializeEntry(existing);
        throw new ConflictException(
          "Idempotency key was already used for another financial operation.",
        );
      }
      throw error;
    }
  }

  async listEntries(principal: TenantPrincipal, query: FinanceListQuery) {
    const take = boundedLimit(query.limit, 100, 500);
    const entries = await withTenantTransaction(this.prisma, principal.tenantId, (tx) =>
      tx.financialEntry.findMany({
        where: {
          tenantId: principal.tenantId,
          ...(query.from || query.to
            ? {
                createdAt: {
                  ...(query.from ? { gte: this.parseDate(query.from, "from") } : {}),
                  ...(query.to ? { lte: this.parseDate(query.to, "to") } : {}),
                },
              }
            : {}),
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take,
        include: {
          patient: { select: { fullName: true } },
          branch: { select: { name: true } },
          _count: { select: { reverseEntries: true } },
        },
      }),
    );
    return entries.map((entry) => ({
      ...serializeEntry(entry),
      reverseCount: entry._count.reverseEntries,
    }));
  }

  async summary(principal: TenantPrincipal, query: FinanceListQuery) {
    const where: Prisma.FinancialEntryWhereInput = {
      tenantId: principal.tenantId,
      ...(query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: this.parseDate(query.from, "from") } : {}),
              ...(query.to ? { lte: this.parseDate(query.to, "to") } : {}),
            },
          }
        : {}),
    };
    const groups = await withTenantTransaction(this.prisma, principal.tenantId, (tx) =>
      tx.financialEntry.groupBy({
        by: ["direction"],
        where,
        _sum: { amountRial: true },
        _count: true,
      }),
    );
    const income =
      groups.find((group) => group.direction === FinancialDirection.INCOME)?._sum.amountRial ?? 0n;
    const outgoing =
      groups.find((group) => group.direction === FinancialDirection.OUTGOING)?._sum.amountRial ??
      0n;
    return {
      incomeRial: income.toString(),
      outgoingRial: outgoing.toString(),
      netRial: (income - outgoing).toString(),
      currency: "IRR",
    };
  }

  private findByIdempotencyKey(tenantId: string, idempotencyKey: string) {
    return withTenantTransaction(this.prisma, tenantId, (tx) =>
      tx.financialEntry.findUnique({
        where: { tenantId_idempotencyKey: { tenantId, idempotencyKey } },
      }),
    );
  }

  private parseDate(value: string, label: string): Date {
    const date = new Date(value);
    if (Number.isNaN(date.getTime()))
      throw new BadRequestException(`${label} must be an ISO-8601 date.`);
    return date;
  }
}

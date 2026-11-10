import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../database/database.module";
import { withTenantTransaction } from "../database/tenant-transaction";
import { TenantPrincipal } from "../auth/tenant-context";
import { CreatePatientDto, PatientListQuery } from "./patients.dto";
import { normalizePhone, normalizeSearchPhone } from "../../common/normalize-phone";

@Injectable()
export class PatientsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async list(principal: TenantPrincipal, query: PatientListQuery) {
    const where: Prisma.PatientWhereInput = {
      tenantId: principal.tenantId,
      ...(query.search
        ? {
            OR: [
              { fullName: { contains: query.search.trim(), mode: "insensitive" } },
              { phone: { contains: normalizeSearchPhone(query.search) } },
            ],
          }
        : {}),
    };
    return withTenantTransaction(this.prisma, principal.tenantId, async (tx) => {
      const [items, total] = await Promise.all([
        tx.patient.findMany({
          where,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          skip: (query.page - 1) * query.limit,
          take: query.limit,
          select: { id: true, fullName: true, phone: true, branchId: true, createdAt: true },
        }),
        tx.patient.count({ where }),
      ]);
      return { items, page: query.page, limit: query.limit, total };
    });
  }

  async get(principal: TenantPrincipal, id: string) {
    return withTenantTransaction(this.prisma, principal.tenantId, async (tx) => {
      const patient = await tx.patient.findUnique({
        where: { tenantId_id: { tenantId: principal.tenantId, id } },
        select: { id: true, fullName: true, phone: true, branchId: true, createdAt: true },
      });
      if (!patient) throw new NotFoundException("مراجع پیدا نشد.");
      return patient;
    });
  }

  async create(principal: TenantPrincipal, input: CreatePatientDto) {
    const phone = normalizePhone(input.phone);
    try {
      return await withTenantTransaction(this.prisma, principal.tenantId, (tx) =>
        tx.patient.create({
          data: {
            tenantId: principal.tenantId,
            fullName: input.fullName.trim(),
            phone,
            branchId: input.branchId || null,
          },
          select: { id: true, fullName: true, phone: true, branchId: true, createdAt: true },
        }),
      );
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002")
          throw new ConflictException("شماره تماس در این کلینیک ثبت شده است.");
        if (error.code === "P2003") throw new NotFoundException("شعبه متعلق به این کلینیک نیست.");
      }
      throw error;
    }
  }
}

import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AppointmentStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../database/database.module";
import { withTenantTransaction } from "../database/tenant-transaction";
import { TenantPrincipal } from "../auth/tenant-context";
import {
  AppointmentListQuery,
  CreateAppointmentDto,
  CreateClinicServiceDto,
  CreateStaffDto,
  UpdateAppointmentStatusDto,
} from "./scheduling.dto";

const appointmentSelect = {
  id: true,
  branchId: true,
  startsAt: true,
  endsAt: true,
  status: true,
  note: true,
  patient: { select: { id: true, fullName: true, phone: true } },
  staff: { select: { id: true, displayName: true } },
  service: { select: { id: true, name: true, durationMinutes: true } },
} satisfies Prisma.AppointmentSelect;

function isStaffOverlap(error: unknown): boolean {
  return (
    (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2004") ||
    (error instanceof Prisma.PrismaClientUnknownRequestError &&
      error.message.includes("appointments_staff_no_overlap"))
  );
}

@Injectable()
export class SchedulingService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  createStaff(principal: TenantPrincipal, input: CreateStaffDto) {
    return withTenantTransaction(this.prisma, principal.tenantId, async (tx) => {
      if (input.branchId) {
        const branch = await tx.branch.findUnique({
          where: { tenantId_id: { tenantId: principal.tenantId, id: input.branchId } },
          select: { id: true, isActive: true },
        });
        if (!branch?.isActive) throw new NotFoundException("شعبه فعال پیدا نشد.");
      }
      return tx.staff.create({
        data: {
          tenantId: principal.tenantId,
          displayName: input.displayName.trim(),
          branchId: input.branchId,
        },
        select: { id: true, displayName: true, branchId: true, isActive: true },
      });
    });
  }

  listStaff(principal: TenantPrincipal) {
    return withTenantTransaction(this.prisma, principal.tenantId, (tx) =>
      tx.staff.findMany({
        where: { tenantId: principal.tenantId, isActive: true },
        orderBy: { displayName: "asc" },
        select: { id: true, displayName: true, branchId: true },
      }),
    );
  }

  async createService(principal: TenantPrincipal, input: CreateClinicServiceDto) {
    const service = await withTenantTransaction(this.prisma, principal.tenantId, (tx) =>
      tx.clinicService.create({
        data: {
          tenantId: principal.tenantId,
          name: input.name.trim(),
          durationMinutes: input.durationMinutes,
          priceRial: BigInt(input.priceRial ?? "0"),
        },
        select: { id: true, name: true, durationMinutes: true, priceRial: true },
      }),
    );
    return { ...service, priceRial: service.priceRial.toString() };
  }

  async listServices(principal: TenantPrincipal) {
    const services = await withTenantTransaction(this.prisma, principal.tenantId, (tx) =>
      tx.clinicService.findMany({
        where: { tenantId: principal.tenantId, isActive: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true, durationMinutes: true, priceRial: true },
      }),
    );
    return services.map((service) => ({ ...service, priceRial: service.priceRial.toString() }));
  }

  listAppointments(principal: TenantPrincipal, query: AppointmentListQuery) {
    const from = query.from ? new Date(query.from) : undefined;
    const to = query.to ? new Date(query.to) : undefined;
    if (from && to && from >= to) throw new BadRequestException("بازه زمانی معتبر نیست.");
    return withTenantTransaction(this.prisma, principal.tenantId, (tx) =>
      tx.appointment.findMany({
        where: {
          tenantId: principal.tenantId,
          ...(query.status ? { status: query.status as AppointmentStatus } : {}),
          ...(from || to
            ? { startsAt: { ...(from ? { gte: from } : {}), ...(to ? { lt: to } : {}) } }
            : {}),
        },
        orderBy: { startsAt: "asc" },
        take: query.limit,
        select: appointmentSelect,
      }),
    );
  }

  async createAppointment(principal: TenantPrincipal, input: CreateAppointmentDto) {
    try {
      return await withTenantTransaction(
        this.prisma,
        principal.tenantId,
        async (tx) => {
          const startsAt = new Date(input.startsAt);
          if (!Number.isFinite(startsAt.getTime()))
            throw new BadRequestException("زمان شروع معتبر نیست.");
          const [patient, staff, service] = await Promise.all([
            tx.patient.findUnique({
              where: { tenantId_id: { tenantId: principal.tenantId, id: input.patientId } },
              select: { id: true, branchId: true },
            }),
            tx.staff.findUnique({
              where: { tenantId_id: { tenantId: principal.tenantId, id: input.staffId } },
              select: { id: true, branchId: true, isActive: true },
            }),
            tx.clinicService.findUnique({
              where: { tenantId_id: { tenantId: principal.tenantId, id: input.serviceId } },
              select: { id: true, durationMinutes: true, isActive: true },
            }),
          ]);
          if (!patient) throw new NotFoundException("مراجع این کلینیک پیدا نشد.");
          if (!staff?.isActive) throw new NotFoundException("درمانگر فعال پیدا نشد.");
          if (!service?.isActive) throw new NotFoundException("خدمت فعال پیدا نشد.");
          const branchId = input.branchId ?? staff.branchId ?? patient.branchId;
          if (staff.branchId && branchId !== staff.branchId) {
            throw new BadRequestException("درمانگر به این شعبه تعلق ندارد.");
          }
          if (patient.branchId && branchId && patient.branchId !== branchId) {
            throw new BadRequestException("مراجع به این شعبه تعلق ندارد.");
          }
          if (branchId) {
            const branch = await tx.branch.findUnique({
              where: { tenantId_id: { tenantId: principal.tenantId, id: branchId } },
              select: { isActive: true },
            });
            if (!branch?.isActive) throw new NotFoundException("شعبه فعال پیدا نشد.");
          }
          const endsAt = new Date(startsAt.getTime() + service.durationMinutes * 60_000);
          if (endsAt <= startsAt) throw new BadRequestException("بازه نوبت معتبر نیست.");
          return tx.appointment.create({
            data: {
              tenantId: principal.tenantId,
              branchId,
              patientId: patient.id,
              staffId: staff.id,
              serviceId: service.id,
              startsAt,
              endsAt,
              note: input.note?.trim(),
            },
            select: appointmentSelect,
          });
        },
        { timeout: 15_000 },
      );
    } catch (error) {
      if (isStaffOverlap(error)) {
        throw new ConflictException("این بازه برای درمانگر قبلاً رزرو شده است.");
      }
      throw error;
    }
  }

  async updateStatus(principal: TenantPrincipal, id: string, input: UpdateAppointmentStatusDto) {
    try {
      return await withTenantTransaction(this.prisma, principal.tenantId, async (tx) => {
        const existing = await tx.appointment.findUnique({
          where: { tenantId_id: { tenantId: principal.tenantId, id } },
          select: { status: true },
        });
        if (!existing) throw new NotFoundException("نوبت پیدا نشد.");
        const transitions: Record<AppointmentStatus, AppointmentStatus[]> = {
          BOOKED: [AppointmentStatus.CONFIRMED, AppointmentStatus.CANCELED],
          CONFIRMED: [
            AppointmentStatus.COMPLETED,
            AppointmentStatus.CANCELED,
            AppointmentStatus.NO_SHOW,
          ],
          COMPLETED: [],
          CANCELED: [],
          NO_SHOW: [],
        };
        if (!transitions[existing.status].includes(input.status)) {
          throw new BadRequestException("تغییر وضعیت نوبت مجاز نیست.");
        }
        const changed = await tx.appointment.updateMany({
          where: { tenantId: principal.tenantId, id, status: existing.status },
          data: { status: input.status },
        });
        if (changed.count !== 1) {
          throw new ConflictException("وضعیت نوبت هم‌زمان تغییر کرده است.");
        }
        return tx.appointment.findUniqueOrThrow({
          where: { tenantId_id: { tenantId: principal.tenantId, id } },
          select: appointmentSelect,
        });
      });
    } catch (error) {
      if (isStaffOverlap(error)) {
        throw new ConflictException("این بازه برای درمانگر قبلاً رزرو شده است.");
      }
      throw error;
    }
  }
}

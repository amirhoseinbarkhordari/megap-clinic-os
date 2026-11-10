import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { EncounterStatus, Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { PhiCryptoService } from "../../common/phi-crypto";
import { TenantPrincipal } from "../auth/tenant-context";
import { PrismaService } from "../database/database.module";
import { withTenantTransaction } from "../database/tenant-transaction";
import { CreateClinicalNoteDto, CreatePatientConsentDto, OpenEncounterDto } from "./records.dto";

@Injectable()
export class RecordsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(PhiCryptoService) private readonly crypto: PhiCryptoService,
  ) {}

  async listPatientRecords(principal: TenantPrincipal, patientId: string) {
    const result = await withTenantTransaction(this.prisma, principal.tenantId, async (tx) => {
      const patient = await tx.patient.findUnique({
        where: { tenantId_id: { tenantId: principal.tenantId, id: patientId } },
        select: { id: true },
      });
      if (!patient) throw new NotFoundException("مراجع این کلینیک پیدا نشد.");
      const [encounters, consents] = await Promise.all([
        tx.clinicalEncounter.findMany({
          where: { tenantId: principal.tenantId, patientId },
          orderBy: { startedAt: "desc" },
          take: 100,
          select: {
            id: true,
            status: true,
            startedAt: true,
            endedAt: true,
            staff: { select: { id: true, displayName: true } },
            appointmentId: true,
            notes: {
              orderBy: { createdAt: "asc" },
              select: {
                id: true,
                kind: true,
                ciphertext: true,
                nonce: true,
                authTag: true,
                keyVersion: true,
                createdAt: true,
                authorMembership: {
                  select: { user: { select: { displayName: true } } },
                },
              },
            },
          },
        }),
        tx.patientConsent.findMany({
          where: { tenantId: principal.tenantId, patientId },
          orderBy: { grantedAt: "desc" },
          select: {
            id: true,
            kind: true,
            documentVersion: true,
            grantedAt: true,
            revokedAt: true,
            recordedBy: { select: { user: { select: { displayName: true } } } },
          },
        }),
      ]);
      await this.writeAudit(
        tx,
        principal,
        patientId,
        "clinical.records.read",
        "patient",
        patientId,
      );
      return { encounters, consents };
    });

    return {
      encounters: result.encounters.map((encounter) => ({
        ...encounter,
        notes: encounter.notes.map((note) => ({
          id: note.id,
          kind: note.kind,
          body: this.crypto.decrypt(
            note,
            `${principal.tenantId}:${patientId}:${encounter.id}:${note.id}`,
          ),
          createdAt: note.createdAt,
          authorName: note.authorMembership.user.displayName,
        })),
      })),
      consents: result.consents.map((consent) => ({
        ...consent,
        recordedByName: consent.recordedBy.user.displayName,
      })),
    };
  }

  async openEncounter(principal: TenantPrincipal, patientId: string, input: OpenEncounterDto) {
    try {
      return await withTenantTransaction(this.prisma, principal.tenantId, async (tx) => {
        const [patient, staff] = await Promise.all([
          tx.patient.findUnique({
            where: { tenantId_id: { tenantId: principal.tenantId, id: patientId } },
            select: { id: true, branchId: true },
          }),
          tx.staff.findUnique({
            where: { tenantId_id: { tenantId: principal.tenantId, id: input.staffId } },
            select: { id: true, branchId: true, isActive: true },
          }),
        ]);
        if (!patient) throw new NotFoundException("مراجع این کلینیک پیدا نشد.");
        if (!staff?.isActive) throw new NotFoundException("درمانگر فعال پیدا نشد.");
        if (patient.branchId && staff.branchId && patient.branchId !== staff.branchId) {
          throw new BadRequestException("مراجع و درمانگر به شعبه‌های متفاوت تعلق دارند.");
        }

        if (input.appointmentId) {
          const appointment = await tx.appointment.findUnique({
            where: { tenantId_id: { tenantId: principal.tenantId, id: input.appointmentId } },
            select: { patientId: true, staffId: true, status: true },
          });
          if (!appointment) throw new NotFoundException("نوبت این کلینیک پیدا نشد.");
          if (
            appointment.patientId !== patientId ||
            appointment.staffId !== staff.id ||
            !["BOOKED", "CONFIRMED"].includes(appointment.status)
          ) {
            throw new BadRequestException("نوبت با مراجع یا درمانگر انتخاب‌شده هم‌خوانی ندارد.");
          }
        }

        const encounter = await tx.clinicalEncounter.create({
          data: {
            tenantId: principal.tenantId,
            patientId,
            staffId: staff.id,
            appointmentId: input.appointmentId,
          },
          select: {
            id: true,
            status: true,
            startedAt: true,
            staff: { select: { displayName: true } },
          },
        });
        await this.writeAudit(
          tx,
          principal,
          patientId,
          "clinical.encounter.created",
          "encounter",
          encounter.id,
        );
        return encounter;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictException("برای این نوبت پروندهٔ درمانی ثبت شده است.");
      }
      throw error;
    }
  }

  async createNote(
    principal: TenantPrincipal,
    patientId: string,
    encounterId: string,
    input: CreateClinicalNoteDto,
  ) {
    const noteId = randomUUID();
    const encrypted = this.crypto.encrypt(
      input.body.trim(),
      `${principal.tenantId}:${patientId}:${encounterId}:${noteId}`,
    );
    return withTenantTransaction(this.prisma, principal.tenantId, async (tx) => {
      const encounter = await tx.clinicalEncounter.findUnique({
        where: { tenantId_id: { tenantId: principal.tenantId, id: encounterId } },
        select: { patientId: true, status: true },
      });
      if (!encounter || encounter.patientId !== patientId) {
        throw new NotFoundException("جلسهٔ درمانی این مراجع پیدا نشد.");
      }
      if (encounter.status !== EncounterStatus.OPEN) {
        throw new ConflictException("جلسه بسته شده است؛ برای اصلاح، یادداشت الحاقی ثبت کنید.");
      }
      const note = await tx.clinicalNote.create({
        data: {
          id: noteId,
          tenantId: principal.tenantId,
          encounterId,
          authorMembershipId: principal.membershipId,
          kind: input.kind,
          ...encrypted,
        },
        select: { id: true, kind: true, createdAt: true },
      });
      await this.writeAudit(
        tx,
        principal,
        patientId,
        "clinical.note.created",
        "clinical_note",
        note.id,
      );
      return { ...note, body: input.body.trim() };
    });
  }

  async closeEncounter(principal: TenantPrincipal, patientId: string, encounterId: string) {
    return withTenantTransaction(this.prisma, principal.tenantId, async (tx) => {
      const encounter = await tx.clinicalEncounter.findUnique({
        where: { tenantId_id: { tenantId: principal.tenantId, id: encounterId } },
        select: { patientId: true, status: true },
      });
      if (!encounter || encounter.patientId !== patientId) {
        throw new NotFoundException("جلسهٔ درمانی این مراجع پیدا نشد.");
      }
      if (encounter.status !== EncounterStatus.OPEN) {
        throw new ConflictException("جلسه قبلاً بسته شده است.");
      }
      const now = new Date();
      const changed = await tx.clinicalEncounter.updateMany({
        where: { tenantId: principal.tenantId, id: encounterId, status: EncounterStatus.OPEN },
        data: { status: EncounterStatus.CLOSED, endedAt: now },
      });
      if (changed.count !== 1) throw new ConflictException("وضعیت جلسه هم‌زمان تغییر کرده است.");
      await this.writeAudit(
        tx,
        principal,
        patientId,
        "clinical.encounter.closed",
        "encounter",
        encounterId,
      );
      return { id: encounterId, status: EncounterStatus.CLOSED, endedAt: now };
    });
  }

  async grantConsent(
    principal: TenantPrincipal,
    patientId: string,
    input: CreatePatientConsentDto,
  ) {
    try {
      return await withTenantTransaction(this.prisma, principal.tenantId, async (tx) => {
        const patient = await tx.patient.findUnique({
          where: { tenantId_id: { tenantId: principal.tenantId, id: patientId } },
          select: { id: true },
        });
        if (!patient) throw new NotFoundException("مراجع این کلینیک پیدا نشد.");
        const consent = await tx.patientConsent.create({
          data: {
            tenantId: principal.tenantId,
            patientId,
            recordedByMemberId: principal.membershipId,
            kind: input.kind,
            documentVersion: input.documentVersion.trim(),
          },
          select: { id: true, kind: true, documentVersion: true, grantedAt: true, revokedAt: true },
        });
        await this.writeAudit(
          tx,
          principal,
          patientId,
          "consent.granted",
          "patient_consent",
          consent.id,
        );
        return consent;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictException("برای این نوع، رضایت فعال از قبل ثبت شده است.");
      }
      throw error;
    }
  }

  async revokeConsent(principal: TenantPrincipal, patientId: string, consentId: string) {
    return withTenantTransaction(this.prisma, principal.tenantId, async (tx) => {
      const changed = await tx.patientConsent.updateMany({
        where: { tenantId: principal.tenantId, patientId, id: consentId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      if (changed.count !== 1) {
        const exists = await tx.patientConsent.findFirst({
          where: { tenantId: principal.tenantId, patientId, id: consentId },
          select: { id: true },
        });
        if (!exists) throw new NotFoundException("رضایت این مراجع پیدا نشد.");
        throw new ConflictException("این رضایت قبلاً لغو شده است.");
      }
      const consent = await tx.patientConsent.findUniqueOrThrow({
        where: { tenantId_id: { tenantId: principal.tenantId, id: consentId } },
        select: { id: true, kind: true, documentVersion: true, grantedAt: true, revokedAt: true },
      });
      await this.writeAudit(
        tx,
        principal,
        patientId,
        "consent.revoked",
        "patient_consent",
        consent.id,
      );
      return consent;
    });
  }

  listPatientAudit(principal: TenantPrincipal, patientId: string) {
    return withTenantTransaction(this.prisma, principal.tenantId, async (tx) => {
      const patient = await tx.patient.findUnique({
        where: { tenantId_id: { tenantId: principal.tenantId, id: patientId } },
        select: { id: true },
      });
      if (!patient) throw new NotFoundException("مراجع این کلینیک پیدا نشد.");
      await this.writeAudit(tx, principal, patientId, "audit.read", "access_audit", patientId);
      return tx.accessAudit.findMany({
        where: { tenantId: principal.tenantId, patientId },
        orderBy: { occurredAt: "desc" },
        take: 100,
        select: {
          id: true,
          action: true,
          resourceType: true,
          resourceId: true,
          occurredAt: true,
          actorMembership: { select: { user: { select: { displayName: true } } } },
        },
      });
    });
  }

  private writeAudit(
    tx: Prisma.TransactionClient,
    principal: TenantPrincipal,
    patientId: string,
    action: string,
    resourceType: string,
    resourceId: string,
  ) {
    return tx.accessAudit.create({
      data: {
        tenantId: principal.tenantId,
        patientId,
        actorMembershipId: principal.membershipId,
        action,
        resourceType,
        resourceId,
      },
      select: { id: true },
    });
  }
}

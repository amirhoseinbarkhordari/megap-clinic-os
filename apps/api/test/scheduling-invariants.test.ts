import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { ConflictException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { SchedulingService } from "../src/modules/scheduling/scheduling.service";
import { PrismaService } from "../src/modules/database/database.module";
import { withTenantTransaction } from "../src/modules/database/tenant-transaction";

test("PostgreSQL prevents overlapping bookings for the same staff member", async () => {
  assert.ok(process.env.DATABASE_URL, "DATABASE_URL must point to a migrated test database");
  const prisma = new PrismaService();
  await prisma.$connect();
  const tenantId = randomUUID();
  const marker = randomUUID();

  try {
    const records = await withTenantTransaction(prisma, tenantId, async (tx) => {
      await tx.tenant.create({
        data: { id: tenantId, slug: `schedule-${marker}`, name: "Schedule test" },
      });
      const branch = await tx.branch.create({ data: { tenantId, name: `Branch ${marker}` } });
      const patients = await Promise.all(
        [0, 1].map((index) =>
          tx.patient.create({
            data: { tenantId, branchId: branch.id, fullName: `Patient ${marker}-${index}` },
          }),
        ),
      );
      const staff = await tx.staff.create({
        data: { tenantId, branchId: branch.id, displayName: `Staff ${marker}` },
      });
      const service = await tx.clinicService.create({
        data: { tenantId, name: `Service ${marker}`, durationMinutes: 30 },
      });
      return { branch, patients, staff, service };
    });

    const start = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const create = (patientId: string) =>
      withTenantTransaction(prisma, tenantId, (tx) =>
        tx.appointment.create({
          data: {
            tenantId,
            branchId: records.branch.id,
            patientId,
            staffId: records.staff.id,
            serviceId: records.service.id,
            startsAt: start,
            endsAt: new Date(start.getTime() + 30 * 60 * 1000),
          },
        }),
      );

    const attempts = await Promise.allSettled(
      records.patients.map((patient) => create(patient.id)),
    );
    assert.equal(attempts.filter((attempt) => attempt.status === "fulfilled").length, 1);
    assert.equal(attempts.filter((attempt) => attempt.status === "rejected").length, 1);
    const rejected = attempts.find((attempt) => attempt.status === "rejected");
    assert.ok(rejected && rejected.status === "rejected");
    assert.ok(rejected.reason instanceof Prisma.PrismaClientUnknownRequestError);
    assert.match(rejected.reason.message, /appointments_staff_no_overlap/);

    const bookedAttempt = attempts.find((attempt) => attempt.status === "fulfilled");
    assert.ok(bookedAttempt && bookedAttempt.status === "fulfilled");
    const bookedIndex = attempts.indexOf(bookedAttempt);
    const waitingPatient = records.patients[bookedIndex === 0 ? 1 : 0]!;
    const scheduling = new SchedulingService(prisma);
    const principal = {
      userId: randomUUID(),
      tenantId,
      membershipId: randomUUID(),
      roleKey: "owner",
      permissions: ["appointments.manage"],
    };
    const pendingBooking = {
      patientId: waitingPatient.id,
      staffId: records.staff.id,
      serviceId: records.service.id,
      startsAt: start.toISOString(),
    };
    await assert.rejects(
      scheduling.createAppointment(principal, pendingBooking),
      (error: unknown) => error instanceof ConflictException && error.getStatus() === 409,
    );
    await scheduling.updateStatus(principal, bookedAttempt.value.id, { status: "CANCELED" });
    const replacement = await scheduling.createAppointment(principal, pendingBooking);
    assert.equal(replacement.patient.id, waitingPatient.id);
    assert.equal(replacement.status, "BOOKED");
  } finally {
    await withTenantTransaction(prisma, tenantId, async (tx) => {
      await tx.appointment.deleteMany({ where: { tenantId } });
      await tx.patient.deleteMany({ where: { tenantId, fullName: { contains: marker } } });
      await tx.staff.deleteMany({ where: { tenantId, displayName: { contains: marker } } });
      await tx.clinicService.deleteMany({ where: { tenantId, name: { contains: marker } } });
      await tx.branch.deleteMany({ where: { tenantId, name: { contains: marker } } });
      await tx.tenant.deleteMany({ where: { id: tenantId } });
    });
    await prisma.$disconnect();
  }
});

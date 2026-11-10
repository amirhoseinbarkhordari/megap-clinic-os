import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { ConflictException } from "@nestjs/common";
import { ClinicalNoteType, ConsentKind } from "@prisma/client";
import test from "node:test";
import { PhiCryptoService } from "../src/common/phi-crypto";
import { PrismaService } from "../src/modules/database/database.module";
import { withTenantTransaction } from "../src/modules/database/tenant-transaction";
import { RecordsService } from "../src/modules/records/records.service";

test("medical records are encrypted, permission-ready, audited, and append-only", async () => {
  assert.ok(process.env.DATABASE_URL, "DATABASE_URL must point to a migrated test database");
  assert.ok(process.env.DIRECT_URL, "DIRECT_URL must point to a migration/admin database role");
  const runtime = new PrismaService();
  const admin = new PrismaService({ datasourceUrl: process.env.DIRECT_URL });
  await Promise.all([runtime.$connect(), admin.$connect()]);
  const tenantId = randomUUID();
  const otherTenantId = randomUUID();
  const marker = randomUUID();
  let membershipId = "";
  let patientId = "";
  let noteId = "";
  let consentId = "";

  try {
    await withTenantTransaction(runtime, otherTenantId, (tx) =>
      tx.tenant.create({
        data: { id: otherTenantId, slug: `records-other-${marker}`, name: `Other ${marker}` },
      }),
    );
    const fixture = await withTenantTransaction(runtime, tenantId, async (tx) => {
      await tx.tenant.create({
        data: { id: tenantId, slug: `records-${marker}`, name: `Records test ${marker}` },
      });
      const user = await tx.user.create({
        data: { displayName: `Tester ${marker}`, passwordHash: "test-only" },
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
      const patient = await tx.patient.create({
        data: { tenantId, fullName: `Patient ${marker}` },
        select: { id: true },
      });
      const staff = await tx.staff.create({
        data: { tenantId, displayName: `Clinician ${marker}` },
        select: { id: true },
      });
      return {
        userId: user.id,
        roleId: role.id,
        membershipId: membership.id,
        patientId: patient.id,
        staffId: staff.id,
      };
    });
    membershipId = fixture.membershipId;
    patientId = fixture.patientId;
    const principal = {
      userId: fixture.userId,
      tenantId,
      membershipId,
      roleKey: "owner",
      permissions: ["records.manage", "consent.manage", "audit.read"],
    };
    const records = new RecordsService(runtime, new PhiCryptoService());

    const encounter = await records.openEncounter(principal, patientId, {
      staffId: fixture.staffId,
    });
    const createdNote = await records.createNote(principal, patientId, encounter.id, {
      kind: ClinicalNoteType.GENERAL,
      body: `Synthetic note ${marker}`,
    });
    noteId = createdNote.id;
    const storedNote = await withTenantTransaction(runtime, tenantId, (tx) =>
      tx.clinicalNote.findUniqueOrThrow({ where: { tenantId_id: { tenantId, id: noteId } } }),
    );
    assert.notEqual(storedNote.ciphertext, `Synthetic note ${marker}`);
    assert.match(storedNote.ciphertext, /^[A-Za-z0-9+/]+=*$/);

    const recordList = await records.listPatientRecords(principal, patientId);
    assert.equal(recordList.encounters[0]?.notes[0]?.body, `Synthetic note ${marker}`);
    const consent = await records.grantConsent(principal, patientId, {
      kind: ConsentKind.TREATMENT,
      documentVersion: "treatment-v1",
    });
    consentId = consent.id;
    await assert.rejects(
      records.grantConsent(principal, patientId, {
        kind: ConsentKind.TREATMENT,
        documentVersion: "treatment-v1",
      }),
      (error: unknown) => error instanceof ConflictException && error.getStatus() === 409,
    );
    const revoked = await records.revokeConsent(principal, patientId, consent.id);
    assert.ok(revoked.revokedAt);
    const renewedConsent = await records.grantConsent(principal, patientId, {
      kind: ConsentKind.TREATMENT,
      documentVersion: "treatment-v1",
    });
    assert.notEqual(renewedConsent.id, consent.id);
    await records.closeEncounter(principal, patientId, encounter.id);
    await assert.rejects(
      records.createNote(principal, patientId, encounter.id, {
        kind: ClinicalNoteType.ADDENDUM,
        body: "This should not be added to a closed encounter.",
      }),
      (error: unknown) => error instanceof ConflictException && error.getStatus() === 409,
    );

    const audit = await records.listPatientAudit(principal, patientId);
    assert.ok(audit.some((event) => event.action === "clinical.records.read"));
    assert.ok(audit.some((event) => event.action === "clinical.note.created"));
    const hiddenFromOtherTenant = await withTenantTransaction(runtime, otherTenantId, (tx) =>
      tx.accessAudit.findMany({ where: { tenantId } }),
    );
    assert.equal(hiddenFromOtherTenant.length, 0);
    await assert.rejects(
      withTenantTransaction(runtime, tenantId, (tx) =>
        tx.clinicalNote.delete({ where: { tenantId_id: { tenantId, id: noteId } } }),
      ),
    );
    await assert.rejects(
      withTenantTransaction(runtime, tenantId, (tx) =>
        tx.patientConsent.update({
          where: { tenantId_id: { tenantId, id: consentId } },
          data: { documentVersion: "tampered" },
        }),
      ),
    );
  } finally {
    await admin.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(
        'ALTER TABLE "clinical_notes" DISABLE TRIGGER "clinical_notes_append_only"',
      );
      await tx.$executeRawUnsafe(
        'ALTER TABLE "access_audit" DISABLE TRIGGER "access_audit_append_only"',
      );
      await tx.$executeRawUnsafe(
        'ALTER TABLE "patient_consents" DISABLE TRIGGER "patient_consents_revoke_only"',
      );
      try {
        await tx.accessAudit.deleteMany({ where: { tenantId: { in: [tenantId, otherTenantId] } } });
        await tx.clinicalNote.deleteMany({ where: { tenantId } });
        await tx.patientConsent.deleteMany({ where: { tenantId } });
        await tx.clinicalEncounter.deleteMany({ where: { tenantId } });
        await tx.staff.deleteMany({ where: { tenantId } });
        await tx.patient.deleteMany({ where: { tenantId } });
        await tx.membership.deleteMany({ where: { tenantId } });
        await tx.role.deleteMany({ where: { tenantId } });
        await tx.user.deleteMany({ where: { displayName: `Tester ${marker}` } });
        await tx.tenant.deleteMany({ where: { id: { in: [tenantId, otherTenantId] } } });
      } finally {
        await tx.$executeRawUnsafe(
          'ALTER TABLE "clinical_notes" ENABLE TRIGGER "clinical_notes_append_only"',
        );
        await tx.$executeRawUnsafe(
          'ALTER TABLE "access_audit" ENABLE TRIGGER "access_audit_append_only"',
        );
        await tx.$executeRawUnsafe(
          'ALTER TABLE "patient_consents" ENABLE TRIGGER "patient_consents_revoke_only"',
        );
      }
    });
    await Promise.all([runtime.$disconnect(), admin.$disconnect()]);
  }
});

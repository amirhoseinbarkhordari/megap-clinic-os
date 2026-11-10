-- CreateEnum
CREATE TYPE "EncounterStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "ClinicalNoteType" AS ENUM ('GENERAL', 'EXAMINATION', 'TREATMENT', 'ADDENDUM');

-- CreateEnum
CREATE TYPE "ConsentKind" AS ENUM ('TREATMENT', 'PRIVACY', 'COMMUNICATION');

-- CreateTable
CREATE TABLE "clinical_encounters" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "staff_id" UUID NOT NULL,
    "appointment_id" UUID,
    "status" "EncounterStatus" NOT NULL DEFAULT 'OPEN',
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clinical_encounters_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "clinical_notes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "encounter_id" UUID NOT NULL,
    "author_membership_id" UUID NOT NULL,
    "kind" "ClinicalNoteType" NOT NULL DEFAULT 'GENERAL',
    "ciphertext" TEXT NOT NULL,
    "nonce" VARCHAR(24) NOT NULL,
    "auth_tag" VARCHAR(24) NOT NULL,
    "key_version" VARCHAR(32) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clinical_notes_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "patient_consents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "recorded_by_member_id" UUID NOT NULL,
    "kind" "ConsentKind" NOT NULL,
    "document_version" VARCHAR(80) NOT NULL,
    "granted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMPTZ(6),

    CONSTRAINT "patient_consents_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "access_audit" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "actor_membership_id" UUID NOT NULL,
    "action" VARCHAR(80) NOT NULL,
    "resource_type" VARCHAR(80) NOT NULL,
    "resource_id" UUID,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "access_audit_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateIndex
CREATE INDEX "clinical_encounters_tenant_id_patient_id_started_at_idx" ON "clinical_encounters"("tenant_id", "patient_id", "started_at");

-- CreateIndex
CREATE UNIQUE INDEX "clinical_encounters_tenant_id_appointment_id_key" ON "clinical_encounters"("tenant_id", "appointment_id");

-- CreateIndex
CREATE UNIQUE INDEX "clinical_encounters_tenant_id_appointment_id_patient_id_sta_key" ON "clinical_encounters"("tenant_id", "appointment_id", "patient_id", "staff_id");

-- CreateIndex
CREATE INDEX "clinical_notes_tenant_id_encounter_id_created_at_idx" ON "clinical_notes"("tenant_id", "encounter_id", "created_at");

-- CreateIndex
CREATE INDEX "patient_consents_tenant_id_patient_id_kind_granted_at_idx" ON "patient_consents"("tenant_id", "patient_id", "kind", "granted_at");

-- CreateIndex
CREATE INDEX "access_audit_tenant_id_patient_id_occurred_at_idx" ON "access_audit"("tenant_id", "patient_id", "occurred_at");

-- CreateIndex
CREATE UNIQUE INDEX "appointments_tenant_id_id_patient_id_staff_id_key" ON "appointments"("tenant_id", "id", "patient_id", "staff_id");

-- AddForeignKey
ALTER TABLE "clinical_encounters" ADD CONSTRAINT "clinical_encounters_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_encounters" ADD CONSTRAINT "clinical_encounters_tenant_id_patient_id_fkey" FOREIGN KEY ("tenant_id", "patient_id") REFERENCES "patients"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_encounters" ADD CONSTRAINT "clinical_encounters_tenant_id_staff_id_fkey" FOREIGN KEY ("tenant_id", "staff_id") REFERENCES "staff"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_encounters" ADD CONSTRAINT "clinical_encounters_tenant_id_appointment_id_patient_id_st_fkey" FOREIGN KEY ("tenant_id", "appointment_id", "patient_id", "staff_id") REFERENCES "appointments"("tenant_id", "id", "patient_id", "staff_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_notes" ADD CONSTRAINT "clinical_notes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_notes" ADD CONSTRAINT "clinical_notes_tenant_id_encounter_id_fkey" FOREIGN KEY ("tenant_id", "encounter_id") REFERENCES "clinical_encounters"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_notes" ADD CONSTRAINT "clinical_notes_tenant_id_author_membership_id_fkey" FOREIGN KEY ("tenant_id", "author_membership_id") REFERENCES "memberships"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_consents" ADD CONSTRAINT "patient_consents_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_consents" ADD CONSTRAINT "patient_consents_tenant_id_patient_id_fkey" FOREIGN KEY ("tenant_id", "patient_id") REFERENCES "patients"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_consents" ADD CONSTRAINT "patient_consents_tenant_id_recorded_by_member_id_fkey" FOREIGN KEY ("tenant_id", "recorded_by_member_id") REFERENCES "memberships"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_audit" ADD CONSTRAINT "access_audit_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_audit" ADD CONSTRAINT "access_audit_tenant_id_patient_id_fkey" FOREIGN KEY ("tenant_id", "patient_id") REFERENCES "patients"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_audit" ADD CONSTRAINT "access_audit_tenant_id_actor_membership_id_fkey" FOREIGN KEY ("tenant_id", "actor_membership_id") REFERENCES "memberships"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "permissions" ("key", "description")
VALUES
  ('records.manage', 'Read and create clinical records'),
  ('consent.manage', 'Record and revoke patient consent'),
  ('audit.read', 'Read patient access audit events')
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "role_permissions" ("tenant_id", "role_id", "permission_key")
SELECT r."tenant_id", r."id", p."key"
FROM "roles" r
JOIN "permissions" p ON p."key" IN ('records.manage', 'consent.manage', 'audit.read')
WHERE r."key" = 'owner'
ON CONFLICT ("tenant_id", "role_id", "permission_key") DO NOTHING;

ALTER TABLE "clinical_encounters"
  ADD CONSTRAINT "clinical_encounters_lifecycle_check"
  CHECK (("status" = 'OPEN' AND "ended_at" IS NULL) OR ("status" = 'CLOSED' AND "ended_at" IS NOT NULL));
ALTER TABLE "patient_consents"
  ADD CONSTRAINT "patient_consents_revoked_after_grant_check"
  CHECK ("revoked_at" IS NULL OR "revoked_at" >= "granted_at");
CREATE UNIQUE INDEX "patient_consents_one_active_per_kind_idx"
  ON "patient_consents"("tenant_id", "patient_id", "kind")
  WHERE "revoked_at" IS NULL;

ALTER TABLE "clinical_encounters" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "clinical_encounters" FORCE ROW LEVEL SECURITY;
CREATE POLICY "clinical_encounter_tenant_scope" ON "clinical_encounters"
  USING ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "clinical_notes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "clinical_notes" FORCE ROW LEVEL SECURITY;
CREATE POLICY "clinical_note_tenant_scope" ON "clinical_notes"
  USING ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "patient_consents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "patient_consents" FORCE ROW LEVEL SECURITY;
CREATE POLICY "patient_consent_tenant_scope" ON "patient_consents"
  USING ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "access_audit" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "access_audit" FORCE ROW LEVEL SECURITY;
CREATE POLICY "access_audit_tenant_scope" ON "access_audit"
  USING ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE FUNCTION "reject_append_only_mutation"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'This record is append-only.' USING ERRCODE = '55000';
END;
$$;
CREATE TRIGGER "clinical_notes_append_only"
  BEFORE UPDATE OR DELETE ON "clinical_notes"
  FOR EACH ROW EXECUTE FUNCTION "reject_append_only_mutation"();
CREATE TRIGGER "access_audit_append_only"
  BEFORE UPDATE OR DELETE ON "access_audit"
  FOR EACH ROW EXECUTE FUNCTION "reject_append_only_mutation"();

CREATE FUNCTION "allow_consent_revocation_only"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP <> 'UPDATE'
    OR OLD."revoked_at" IS NOT NULL
    OR NEW."revoked_at" IS NULL
    OR (to_jsonb(NEW) - 'revoked_at') IS DISTINCT FROM (to_jsonb(OLD) - 'revoked_at') THEN
    RAISE EXCEPTION 'Consent records can only be revoked once.' USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "patient_consents_revoke_only"
  BEFORE UPDATE OR DELETE ON "patient_consents"
  FOR EACH ROW EXECUTE FUNCTION "allow_consent_revocation_only"();

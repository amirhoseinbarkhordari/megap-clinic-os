import { Body, Controller, Get, Inject, Param, ParseUUIDPipe, Patch, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentTenant, RequirePermissions, TenantPrincipal } from "../auth/tenant-context";
import { CreateClinicalNoteDto, CreatePatientConsentDto, OpenEncounterDto } from "./records.dto";
import { RecordsService } from "./records.service";

@ApiTags("medical-records")
@ApiBearerAuth()
@Controller("patients/:patientId/records")
export class RecordsController {
  constructor(@Inject(RecordsService) private readonly records: RecordsService) {}

  @Get()
  @RequirePermissions("records.manage")
  @ApiOperation({ summary: "Read encrypted patient encounters and consent history" })
  list(
    @CurrentTenant() principal: TenantPrincipal,
    @Param("patientId", ParseUUIDPipe) patientId: string,
  ) {
    return this.records.listPatientRecords(principal, patientId);
  }

  @Post("encounters")
  @RequirePermissions("records.manage")
  openEncounter(
    @CurrentTenant() principal: TenantPrincipal,
    @Param("patientId", ParseUUIDPipe) patientId: string,
    @Body() body: OpenEncounterDto,
  ) {
    return this.records.openEncounter(principal, patientId, body);
  }

  @Post("encounters/:encounterId/notes")
  @RequirePermissions("records.manage")
  createNote(
    @CurrentTenant() principal: TenantPrincipal,
    @Param("patientId", ParseUUIDPipe) patientId: string,
    @Param("encounterId", ParseUUIDPipe) encounterId: string,
    @Body() body: CreateClinicalNoteDto,
  ) {
    return this.records.createNote(principal, patientId, encounterId, body);
  }

  @Post("encounters/:encounterId/close")
  @RequirePermissions("records.manage")
  closeEncounter(
    @CurrentTenant() principal: TenantPrincipal,
    @Param("patientId", ParseUUIDPipe) patientId: string,
    @Param("encounterId", ParseUUIDPipe) encounterId: string,
  ) {
    return this.records.closeEncounter(principal, patientId, encounterId);
  }

  @Post("consents")
  @RequirePermissions("consent.manage")
  grantConsent(
    @CurrentTenant() principal: TenantPrincipal,
    @Param("patientId", ParseUUIDPipe) patientId: string,
    @Body() body: CreatePatientConsentDto,
  ) {
    return this.records.grantConsent(principal, patientId, body);
  }

  @Patch("consents/:consentId/revoke")
  @RequirePermissions("consent.manage")
  revokeConsent(
    @CurrentTenant() principal: TenantPrincipal,
    @Param("patientId", ParseUUIDPipe) patientId: string,
    @Param("consentId", ParseUUIDPipe) consentId: string,
  ) {
    return this.records.revokeConsent(principal, patientId, consentId);
  }

  @Get("audit")
  @RequirePermissions("audit.read")
  @ApiOperation({ summary: "Read the append-only access audit for a patient" })
  audit(
    @CurrentTenant() principal: TenantPrincipal,
    @Param("patientId", ParseUUIDPipe) patientId: string,
  ) {
    return this.records.listPatientAudit(principal, patientId);
  }
}

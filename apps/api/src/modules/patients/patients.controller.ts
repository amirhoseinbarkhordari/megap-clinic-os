import { Body, Controller, Get, Inject, Param, ParseUUIDPipe, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentTenant, RequirePermissions, TenantPrincipal } from "../auth/tenant-context";
import { CreatePatientDto, PatientListQuery } from "./patients.dto";
import { PatientsService } from "./patients.service";

@ApiTags("patients")
@ApiBearerAuth()
@RequirePermissions("patients.manage")
@Controller("patients")
export class PatientsController {
  constructor(@Inject(PatientsService) private readonly patients: PatientsService) {}

  @Get()
  @ApiOperation({ summary: "List patients in the authenticated clinic" })
  list(@CurrentTenant() principal: TenantPrincipal, @Query() query: PatientListQuery) {
    return this.patients.list(principal, query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Read a patient in the authenticated clinic" })
  get(@CurrentTenant() principal: TenantPrincipal, @Param("id", ParseUUIDPipe) id: string) {
    return this.patients.get(principal, id);
  }

  @Post()
  @ApiOperation({ summary: "Create a patient in the authenticated clinic" })
  create(@CurrentTenant() principal: TenantPrincipal, @Body() body: CreatePatientDto) {
    return this.patients.create(principal, body);
  }
}

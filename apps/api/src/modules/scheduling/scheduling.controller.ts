import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentTenant, RequirePermissions, TenantPrincipal } from "../auth/tenant-context";
import {
  AppointmentListQuery,
  CreateAppointmentDto,
  CreateClinicServiceDto,
  CreateStaffDto,
  UpdateAppointmentStatusDto,
} from "./scheduling.dto";
import { SchedulingService } from "./scheduling.service";

@ApiTags("scheduling")
@ApiBearerAuth()
@RequirePermissions("appointments.manage")
@Controller("appointments")
export class AppointmentsController {
  constructor(@Inject(SchedulingService) private readonly scheduling: SchedulingService) {}

  @Get()
  list(@CurrentTenant() principal: TenantPrincipal, @Query() query: AppointmentListQuery) {
    return this.scheduling.listAppointments(principal, query);
  }

  @Post()
  @ApiOperation({ summary: "Book a tenant-scoped appointment with database conflict protection" })
  create(@CurrentTenant() principal: TenantPrincipal, @Body() body: CreateAppointmentDto) {
    return this.scheduling.createAppointment(principal, body);
  }

  @Patch(":id/status")
  updateStatus(
    @CurrentTenant() principal: TenantPrincipal,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: UpdateAppointmentStatusDto,
  ) {
    return this.scheduling.updateStatus(principal, id, body);
  }
}

@ApiTags("scheduling")
@ApiBearerAuth()
@RequirePermissions("catalog.manage")
@Controller("staff")
export class StaffController {
  constructor(@Inject(SchedulingService) private readonly scheduling: SchedulingService) {}

  @Get()
  list(@CurrentTenant() principal: TenantPrincipal) {
    return this.scheduling.listStaff(principal);
  }

  @Post()
  create(@CurrentTenant() principal: TenantPrincipal, @Body() body: CreateStaffDto) {
    return this.scheduling.createStaff(principal, body);
  }
}

@ApiTags("scheduling")
@ApiBearerAuth()
@RequirePermissions("catalog.manage")
@Controller("services")
export class ClinicServicesController {
  constructor(@Inject(SchedulingService) private readonly scheduling: SchedulingService) {}

  @Get()
  list(@CurrentTenant() principal: TenantPrincipal) {
    return this.scheduling.listServices(principal);
  }

  @Post()
  create(@CurrentTenant() principal: TenantPrincipal, @Body() body: CreateClinicServiceDto) {
    return this.scheduling.createService(principal, body);
  }
}

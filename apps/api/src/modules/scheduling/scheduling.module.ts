import { Module } from "@nestjs/common";
import { SchedulingService } from "./scheduling.service";
import {
  AppointmentsController,
  ClinicServicesController,
  StaffController,
} from "./scheduling.controller";

@Module({
  controllers: [AppointmentsController, StaffController, ClinicServicesController],
  providers: [SchedulingService],
})
export class SchedulingModule {}

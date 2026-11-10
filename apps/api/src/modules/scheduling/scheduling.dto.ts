import { Type } from "class-transformer";
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
  Matches,
} from "class-validator";

export class CreateStaffDto {
  @IsString()
  @Length(2, 160)
  displayName!: string;

  @IsOptional()
  @IsUUID()
  branchId?: string;
}

export class CreateClinicServiceDto {
  @IsString()
  @Length(2, 160)
  name!: string;

  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(1440)
  durationMinutes!: number;

  @IsOptional()
  @IsString()
  @Matches(/^\d{1,15}$/)
  priceRial?: string;
}

export class CreateAppointmentDto {
  @IsUUID()
  patientId!: string;

  @IsUUID()
  staffId!: string;

  @IsUUID()
  serviceId!: string;

  @IsDateString()
  startsAt!: string;

  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsString()
  @Length(1, 500)
  note?: string;
}

export class AppointmentListQuery {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsIn(["BOOKED", "CONFIRMED", "COMPLETED", "CANCELED", "NO_SHOW"])
  status?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 50;
}

export class UpdateAppointmentStatusDto {
  @IsIn(["CONFIRMED", "COMPLETED", "CANCELED", "NO_SHOW"])
  status!: "CONFIRMED" | "COMPLETED" | "CANCELED" | "NO_SHOW";
}

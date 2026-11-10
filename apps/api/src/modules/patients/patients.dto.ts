import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, IsUUID, Length, Max, Min } from "class-validator";

export class CreatePatientDto {
  @IsString()
  @Length(2, 160)
  fullName!: string;

  @IsOptional()
  @IsString()
  @Length(7, 32)
  phone?: string;

  @IsOptional()
  @IsUUID()
  branchId?: string;
}

export class PatientListQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100000)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 25;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  search?: string;
}

import { IsEnum, IsOptional, IsString, IsUUID, Length } from "class-validator";
import { ClinicalNoteType, ConsentKind } from "@prisma/client";

export class OpenEncounterDto {
  @IsUUID()
  staffId!: string;

  @IsOptional()
  @IsUUID()
  appointmentId?: string;
}

export class CreateClinicalNoteDto {
  @IsEnum(ClinicalNoteType)
  kind!: ClinicalNoteType;

  @IsString()
  @Length(1, 20_000)
  body!: string;
}

export class CreatePatientConsentDto {
  @IsEnum(ConsentKind)
  kind!: ConsentKind;

  @IsString()
  @Length(1, 80)
  documentVersion!: string;
}

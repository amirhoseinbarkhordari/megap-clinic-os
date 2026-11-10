import {
  IsEmail,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  MinLength,
  ValidateIf,
} from "class-validator";

export class RegisterDto {
  @IsString()
  @Length(2, 160)
  clinicName!: string;

  @IsString()
  @Length(2, 160)
  displayName!: string;

  @ValidateIf((value: RegisterDto) => !value.phone)
  @IsEmail()
  @MaxLength(254)
  email?: string;

  @IsOptional()
  @IsString()
  @Length(8, 32)
  phone?: string;

  @IsString()
  @MinLength(12)
  @MaxLength(128)
  password!: string;
}

export class LoginDto {
  @IsString()
  @Length(3, 254)
  identifier!: string;

  @IsString()
  @MinLength(12)
  @MaxLength(128)
  password!: string;
}

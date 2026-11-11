import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  Min,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { PaymentMethod } from "@prisma/client";
const INTEGER_RIAL = /^\d{1,18}$/;
const IDEMPOTENCY_KEY = /^[A-Za-z0-9._:-]{8,128}$/;

export class InvoiceLineDto {
  @IsOptional()
  @IsUUID()
  serviceId?: string;

  @IsString()
  @Length(2, 240)
  description!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100_000)
  quantity!: number;

  @IsString()
  @Matches(INTEGER_RIAL)
  unitPriceRial!: string;
}

export class CreateInvoiceDto {
  @IsUUID()
  patientId!: string;

  @IsOptional()
  @IsUUID()
  appointmentId?: string;

  @IsString()
  @Matches(IDEMPOTENCY_KEY)
  idempotencyKey!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => InvoiceLineDto)
  lines!: InvoiceLineDto[];
}

export class CreatePaymentDto {
  @IsUUID()
  invoiceId!: string;

  @IsString()
  @Matches(INTEGER_RIAL)
  amountRial!: string;

  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;

  @IsString()
  @Matches(IDEMPOTENCY_KEY)
  idempotencyKey!: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  memo?: string;
}

export class RefundPaymentDto {
  @IsUUID()
  paymentEntryId!: string;

  @IsString()
  @Matches(IDEMPOTENCY_KEY)
  idempotencyKey!: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  memo?: string;
}

export class CreateExpenseDto {
  @IsString()
  @Length(2, 240)
  description!: string;

  @IsString()
  @Matches(INTEGER_RIAL)
  amountRial!: string;

  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;

  @IsString()
  @Matches(IDEMPOTENCY_KEY)
  idempotencyKey!: string;

  @IsOptional()
  @IsUUID()
  branchId?: string;
}

export class FinanceListQuery {
  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;

  @IsOptional()
  @IsString()
  limit?: string;
}

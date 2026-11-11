import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  Min,
} from "class-validator";
import { Type } from "class-transformer";
import { InventoryMovementKind } from "@prisma/client";

export class CreateInventoryProductDto {
  @IsOptional()
  @IsString()
  @Length(1, 80)
  sku?: string;

  @IsString()
  @Length(2, 160)
  name!: string;

  @IsOptional()
  @IsString()
  @Length(1, 120)
  category?: string;

  @IsOptional()
  @IsString()
  @Length(1, 24)
  unit?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(2_000_000_000)
  reorderPoint?: number;
}

export class CreateStockMovementDto {
  @IsUUID()
  branchId!: string;

  @IsUUID()
  productId!: string;

  @IsEnum(InventoryMovementKind)
  kind!: InventoryMovementKind;

  @Type(() => Number)
  @IsInt()
  @Min(-2_000_000_000)
  @Max(2_000_000_000)
  quantityDelta!: number;

  @IsOptional()
  @IsString()
  @Matches(/^\d{1,18}$/)
  unitCostRial?: string;

  @IsString()
  @Matches(/^[A-Za-z0-9._:-]{8,128}$/)
  idempotencyKey!: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  note?: string;
}

export class InventoryListQuery {
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsString()
  limit?: string;
}

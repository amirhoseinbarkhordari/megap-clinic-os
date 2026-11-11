import { Body, Controller, Get, Inject, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentTenant, RequirePermissions, TenantPrincipal } from "../auth/tenant-context";
import {
  CreateInventoryProductDto,
  CreateStockMovementDto,
  InventoryListQuery,
} from "./inventory.dto";
import { InventoryService } from "./inventory.service";

@ApiTags("inventory")
@ApiBearerAuth()
@Controller("inventory")
export class InventoryController {
  constructor(@Inject(InventoryService) private readonly inventory: InventoryService) {}

  @Get("branches")
  @RequirePermissions("inventory.read")
  listBranches(@CurrentTenant() principal: TenantPrincipal) {
    return this.inventory.listBranches(principal);
  }

  @Get("products")
  @RequirePermissions("inventory.read")
  listProducts(@CurrentTenant() principal: TenantPrincipal, @Query() query: InventoryListQuery) {
    return this.inventory.listProducts(principal, query);
  }

  @Post("products")
  @RequirePermissions("inventory.manage")
  createProduct(
    @CurrentTenant() principal: TenantPrincipal,
    @Body() body: CreateInventoryProductDto,
  ) {
    return this.inventory.createProduct(principal, body);
  }

  @Post("movements")
  @RequirePermissions("inventory.manage")
  @ApiOperation({ summary: "Record an idempotent, append-only stock movement" })
  createMovement(
    @CurrentTenant() principal: TenantPrincipal,
    @Body() body: CreateStockMovementDto,
  ) {
    return this.inventory.createMovement(principal, body);
  }

  @Get("movements")
  @RequirePermissions("inventory.read")
  listMovements(@CurrentTenant() principal: TenantPrincipal, @Query() query: InventoryListQuery) {
    return this.inventory.listMovements(principal, query);
  }
}

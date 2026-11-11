import { Body, Controller, Get, Inject, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentTenant, RequirePermissions, TenantPrincipal } from "../auth/tenant-context";
import {
  CreateExpenseDto,
  CreateInvoiceDto,
  CreatePaymentDto,
  FinanceListQuery,
  RefundPaymentDto,
} from "./finance.dto";
import { FinanceService } from "./finance.service";

@ApiTags("finance")
@ApiBearerAuth()
@Controller("finance")
export class FinanceController {
  constructor(@Inject(FinanceService) private readonly finance: FinanceService) {}

  @Get("patients")
  @RequirePermissions("finance.read")
  listPatients(@CurrentTenant() principal: TenantPrincipal) {
    return this.finance.listPatients(principal);
  }

  @Get("invoices")
  @RequirePermissions("finance.read")
  listInvoices(@CurrentTenant() principal: TenantPrincipal, @Query() query: FinanceListQuery) {
    return this.finance.listInvoices(principal, query);
  }

  @Post("invoices")
  @RequirePermissions("finance.manage")
  @ApiOperation({ summary: "Create an immutable invoice with integer Rial amounts" })
  createInvoice(@CurrentTenant() principal: TenantPrincipal, @Body() body: CreateInvoiceDto) {
    return this.finance.createInvoice(principal, body);
  }

  @Post("payments")
  @RequirePermissions("finance.manage")
  createPayment(@CurrentTenant() principal: TenantPrincipal, @Body() body: CreatePaymentDto) {
    return this.finance.createPayment(principal, body);
  }

  @Post("refunds")
  @RequirePermissions("finance.manage")
  refundPayment(@CurrentTenant() principal: TenantPrincipal, @Body() body: RefundPaymentDto) {
    return this.finance.refundPayment(principal, body);
  }

  @Post("expenses")
  @RequirePermissions("finance.manage")
  createExpense(@CurrentTenant() principal: TenantPrincipal, @Body() body: CreateExpenseDto) {
    return this.finance.createExpense(principal, body);
  }

  @Get("ledger")
  @RequirePermissions("finance.read")
  listEntries(@CurrentTenant() principal: TenantPrincipal, @Query() query: FinanceListQuery) {
    return this.finance.listEntries(principal, query);
  }

  @Get("summary")
  @RequirePermissions("finance.read")
  summary(@CurrentTenant() principal: TenantPrincipal, @Query() query: FinanceListQuery) {
    return this.finance.summary(principal, query);
  }
}

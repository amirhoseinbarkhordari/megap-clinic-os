import { Module } from "@nestjs/common";
import { HealthModule } from "./health/health.module";
import { DatabaseModule } from "./database/database.module";
import { AuthModule } from "./auth/auth.module";
import { APP_GUARD } from "@nestjs/core";
import { TenantContextGuard } from "./auth/tenant-context";
import { PatientsModule } from "./patients/patients.module";
import { SchedulingModule } from "./scheduling/scheduling.module";
import { RecordsModule } from "./records/records.module";
import { FinanceModule } from "./finance/finance.module";
import { InventoryModule } from "./inventory/inventory.module";

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    HealthModule,
    PatientsModule,
    SchedulingModule,
    RecordsModule,
    FinanceModule,
    InventoryModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: TenantContextGuard }],
})
export class AppModule {}

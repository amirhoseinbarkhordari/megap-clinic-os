import { Controller, Get } from "@nestjs/common";
import { Public } from "../auth/tenant-context";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

@ApiTags("health")
@Controller("health")
export class HealthController {
  @Get()
  @Public()
  @ApiOperation({ summary: "Check API process health" })
  check(): { status: "ok"; service: "megap-api" } {
    return { status: "ok", service: "megap-api" };
  }
}

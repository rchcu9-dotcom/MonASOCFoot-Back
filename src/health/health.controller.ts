import { Controller, Get } from "@nestjs/common";
import { HealthService } from "./health.service";
import type { HealthPayload } from "./health.service";

@Controller("health")
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  check(): HealthPayload {
    return this.healthService.check();
  }
}

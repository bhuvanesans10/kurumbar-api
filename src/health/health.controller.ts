import { Controller } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { HealthControllerBase } from "./core/health.controller.base";
import { HealthService } from "./health.service";

@ApiTags("Health and Time APIs")
@Controller("_health")
export class HealthController extends HealthControllerBase {
  constructor(protected readonly healthService: HealthService) {
    super(healthService);
  }
}

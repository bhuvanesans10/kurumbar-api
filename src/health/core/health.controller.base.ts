import { Get, HttpStatus, Res } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { FastifyReply } from "fastify";
import { HealthService } from "../health.service";

@ApiTags("Service Health Controller")
export class HealthControllerBase {
  constructor(protected readonly healthService: HealthService) {}
  @ApiOperation({ summary: "Endpoint to check if the service is live" })
  @Get("live")
  healthLive(@Res() response: FastifyReply): FastifyReply {
    return response.status(HttpStatus.NO_CONTENT).send();
  }
  @ApiOperation({
    summary: "Endpoint to check the health of the service",
  })
  @Get("ready")
  async healthReady(@Res() response: FastifyReply): Promise<FastifyReply> {
    const dbConnection = await this.healthService.isDbReady();
    if (!dbConnection) {
      return response.status(HttpStatus.NOT_FOUND).send();
    }
    return response.status(HttpStatus.NO_CONTENT).send();
  }
  @ApiOperation({
    summary: "Endpoint to fetch the server time for the frontend",
  })
  @Get("time-sync")
  getCurrentUTCTime(@Res() response: FastifyReply): FastifyReply {
    const utcTime = new Date().toISOString();
    return response.status(HttpStatus.OK).send({ utcTime });
  }

  @Get("ping")
  getApplicationPing(@Res() response: FastifyReply): FastifyReply {
    return response.status(HttpStatus.NO_CONTENT).send();
  }
}

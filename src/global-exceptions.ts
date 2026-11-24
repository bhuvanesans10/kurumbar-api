import { SentryExceptionCaptured } from "@sentry/nestjs";
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  InternalServerErrorException,
} from "@nestjs/common";
import { FastifyRequest, FastifyReply } from "fastify";
import { ConfigService } from "@nestjs/config";

@Catch()
export class GlobalBadRequestFilter implements ExceptionFilter {
  private static corsEnv: string;

  constructor(private readonly configService: ConfigService) {
    const corsEnvValue = this.configService.get<string>("CORS_ENV");

    if (!corsEnvValue) {
      throw new InternalServerErrorException(
        "CORS_ENV is not defined in environment variables",
      );
    } else {
      GlobalBadRequestFilter.corsEnv = corsEnvValue;
    }
  }

  @SentryExceptionCaptured()
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();

    // If the exception is already an HttpException (like 400 or 404), handle it
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const message = exception.getResponse() as object;

      // If in DEV environment, show detailed error info
      if (GlobalBadRequestFilter.corsEnv === "DEV") {
        response.status(status).send({
          ...message,
          timestamp: new Date().toISOString(),
          path: request.url,
        });
      } else {
        // In non-DEV environments, show limited info
        response.status(status).send({
          ...message,
        });
      }
    } else {
      // For non-http exceptions, default to 400 status code
      const status = 500;
      const errorMessage =
        exception instanceof Error ? exception.message : "Unknown error";

      const stack =
        exception instanceof Error
          ? exception.stack
          : "No stack trace available";

      console.error("Unhandled non-HTTP exception:", exception);

      if (GlobalBadRequestFilter.corsEnv === "DEV") {
        // In DEV environment, show detailed error info
        response.status(status).send({
          statusCode: status,
          message: "Bad Request",
          error: errorMessage, // Include the actual error message
          stack: stack, // Provide the stack trace
          timestamp: new Date().toISOString(),
          path: request.url,
        });
      } else {
        // In non-DEV environments, show limited info
        response.status(status).send({
          statusCode: status,
          message: "Bad Request",
        });
      }
    }
  }
}

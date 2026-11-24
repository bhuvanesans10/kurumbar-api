import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { shouldExcludeLog } from "./logger-exclusion.config";

@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const contextType = context.getType();
    if (contextType !== "http") {
      return next.handle();
    }

    const httpContext = context.switchToHttp();
    const req = httpContext.getRequest();
    const controller = context.getClass();

    if (shouldExcludeLog(controller.name)) {
      req.shouldExcludeLog = true;
    } else {
      req.shouldExcludeLog = false;
      const { method, url, ip, query, body } = req;
      Logger.log(`--> ${method} ${url} - IP: ${ip}`, "HTTP");

      const logDetails: any = {};
      if (query && Object.keys(query).length > 0) {
        logDetails.query = query;
      }
      if (body && Object.keys(body as any).length > 0) {
        logDetails.body = body;
      }
      if (Object.keys(logDetails).length > 0) {
        Logger.log(
          {
            message: `Request Details: ${method} ${url}`,
            ...logDetails,
          },
          "HTTP",
        );
      }
    }

    return next.handle();
  }
}

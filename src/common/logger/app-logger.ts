import {
  ConsoleLogger,
  Injectable,
  Optional,
  Inject,
  InternalServerErrorException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { traceStore } from "./trace-store";
import { sanitize } from "./pii-sanitizer";

type LogLevel = "verbose" | "debug" | "log" | "warn" | "error" | "fatal";

const LEVEL_VALUES: Record<LogLevel, number> = {
  verbose: 0,
  debug: 1,
  log: 2,
  warn: 3,
  error: 4,
  fatal: 5,
};

function getLevelValue(level: string): number {
  const normalized = level.toLowerCase();
  if (normalized === "info") return LEVEL_VALUES.log;
  return (LEVEL_VALUES as any)[normalized] ?? LEVEL_VALUES.log;
}

@Injectable()
export class AppLogger extends ConsoleLogger {
  private isProduction = process.env.CORS_ENV !== "DEV";
  private logLevel = process.env.LOG_LEVEL || "log";
  private maxLevelValue = getLevelValue(this.logLevel);

  constructor(
    @Optional() context?: string,
    @Optional()
    @Inject(ConfigService)
    private readonly configService?: ConfigService,
  ) {
    super(context || "");

    const envLogLevel = process.env.LOG_LEVEL || "log";
    this.validateLogLevel(envLogLevel);
    this.logLevel = envLogLevel;
    this.maxLevelValue = getLevelValue(envLogLevel);

    if (this.configService) {
      const corsEnv = this.configService.get<string>("CORS_ENV");
      if (corsEnv) {
        this.isProduction = corsEnv !== "DEV";
      }
      const logLevel = this.configService.get<string>("LOG_LEVEL");
      if (logLevel) {
        this.validateLogLevel(logLevel);
        this.logLevel = logLevel;
        this.maxLevelValue = getLevelValue(logLevel);
      }
    }
  }

  private validateLogLevel(level: string) {
    const allowedLogLevels = [
      "verbose",
      "debug",
      "log",
      "info",
      "warn",
      "error",
      "fatal",
    ];
    if (!allowedLogLevels.includes(level.toLowerCase())) {
      throw new InternalServerErrorException(
        `Invalid LOG_LEVEL configuration: ${level}. Allowed values are: ${allowedLogLevels.join(", ")}`,
      );
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return LEVEL_VALUES[level] >= this.maxLevelValue;
  }

  override log(message: any, context?: string) {
    if (!this.shouldLog("log")) return;
    const sanitized = sanitize(message);
    if (this.isProduction) {
      this.printJson("info", sanitized, context);
    } else {
      super.log(this.prependTraceId(sanitized), context || this.context);
    }
  }

  override error(message: any, stack?: string, context?: string) {
    if (!this.shouldLog("error")) return;
    const sanitizedMsg = sanitize(message);
    const sanitizedStack = stack ? sanitize(stack) : undefined;
    if (this.isProduction) {
      this.printJson("error", sanitizedMsg, context, sanitizedStack);
    } else {
      super.error(
        this.prependTraceId(sanitizedMsg),
        sanitizedStack,
        context || this.context,
      );
    }
  }

  override warn(message: any, context?: string) {
    if (!this.shouldLog("warn")) return;
    const sanitized = sanitize(message);
    if (this.isProduction) {
      this.printJson("warn", sanitized, context);
    } else {
      super.warn(this.prependTraceId(sanitized), context || this.context);
    }
  }

  override debug(message: any, context?: string) {
    if (!this.shouldLog("debug")) return;
    const sanitized = sanitize(message);
    if (this.isProduction) {
      this.printJson("debug", sanitized, context);
    } else {
      super.debug(this.prependTraceId(sanitized), context || this.context);
    }
  }

  override verbose(message: any, context?: string) {
    if (!this.shouldLog("verbose")) return;
    const sanitized = sanitize(message);
    if (this.isProduction) {
      this.printJson("verbose", sanitized, context);
    } else {
      super.verbose(this.prependTraceId(sanitized), context || this.context);
    }
  }

  override fatal(message: any, context?: string) {
    if (!this.shouldLog("fatal")) return;
    const sanitized = sanitize(message);
    if (this.isProduction) {
      this.printJson("fatal", sanitized, context);
    } else {
      super.fatal(this.prependTraceId(sanitized), context || this.context);
    }
  }

  private prependTraceId(message: any): any {
    const traceId = traceStore.getStore()?.traceId;
    if (!traceId) {
      return message;
    }
    if (typeof message === "string") {
      return `[TraceId: ${traceId}] ${message}`;
    }
    if (typeof message === "object" && message !== null) {
      return { traceId, ...message };
    }
    return `[TraceId: ${traceId}] ${String(message)}`;
  }

  private printJson(
    level: string,
    message: any,
    context?: string,
    stack?: string,
  ) {
    const traceId = traceStore.getStore()?.traceId;
    const logObject = {
      level,
      timestamp: new Date().toISOString(),
      traceId,
      context: context || this.context,
      message,
      ...(stack ? { stack } : {}),
    };

    const jsonString = JSON.stringify(logObject);
    if (level === "error" || level === "fatal") {
      console.error(jsonString);
    } else {
      console.log(jsonString);
    }
  }
}

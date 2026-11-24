import "./sentry-setup/instrument";
import * as dns from "dns";
dns.setDefaultResultOrder("ipv4first");

import {
  InternalServerErrorException,
  ValidationPipe,
  NestApplicationOptions,
  Logger,
} from "@nestjs/common";
import { AppLogger } from "./common/logger/app-logger";
import { traceStore } from "./common/logger/trace-store";
import { shouldExcludeLogByUrl } from "./common/logger/logger-exclusion.config";
import { createId as createCuid } from "@paralleldrive/cuid2";
import { jsonDepthExceeds } from "./util/json-depth";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { HttpAdapterHost, NestFactory } from "@nestjs/core";
import { OpenAPIObject, SwaggerModule } from "@nestjs/swagger";
import { HttpExceptionFilter } from "./filters/HttpExceptions.filter";
import { AppModule } from "./app.module";
import { readFileSync } from "fs";
import {
  swaggerPath,
  swaggerDocumentOptions,
  swaggerSetupOptions,
} from "./swagger";
import fastifyCompress from "@fastify/compress";
import * as zlib from "zlib";
import { GlobalBadRequestFilter } from "./global-exceptions";
import EventEmitter from "events";
import { ConfigService } from "@nestjs/config";
import fastifyCookie from "@fastify/cookie";
import fastifyHelmet from "@fastify/helmet";
import { ShutdownObserver } from "./util/middlewares/shutdown-observer";

async function main(
  fastifyAdapter: FastifyAdapter,
): Promise<NestFastifyApplication> {
  const bootstrapLogger = new AppLogger("Bootstrap");
  const nestOptions: NestApplicationOptions = {
    rawBody: true,
    bodyParser: false,
    logger: bootstrapLogger,
  };

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    fastifyAdapter,
    nestOptions,
  );

  await app.register(fastifyCompress, {
    encodings: ["gzip", "deflate", "br"],
    threshold: 1024,
    zlibOptions: {
      level: 6,
    },
    brotliOptions: {
      params: {
        [zlib.constants.BROTLI_PARAM_QUALITY]: 4,
        [zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_GENERIC,
      },
    },
  });

  const configService = app.get(ConfigService);
  const globalAppPrefix =
    configService.get<string>("GLOBAL_APP_PREFIX") ?? "api";

  const isSwaggerValue = configService.get<string>("IS_SWAGGER");
  const corsEnvValue = configService.get<string>("CORS_ENV");
  const cookieSignSecretValue = configService.get<string>("COOKIE_SIGN_SECRET");
  const primaryDbUrl = configService.get<string>("POSTGRES_PRIMARY_DB_URL");
  const readReplicaDbUrl = configService.get<string>(
    "POSTGRES_READ_REPLICA_DB_URL",
  );

  if (!isSwaggerValue) {
    throw new InternalServerErrorException(
      "IS_SWAGGER is not defined in environment variables",
    );
  }
  const isSwagger = isSwaggerValue === "true";

  if (!corsEnvValue) {
    throw new InternalServerErrorException(
      "CORS_ENV is not defined in environment variables",
    );
  }
  const corsEnv = corsEnvValue;

  if (!cookieSignSecretValue) {
    throw new InternalServerErrorException(
      "COOKIE_SIGN_SECRET is not defined in environment variables",
    );
  }
  const cookieSignSecret = cookieSignSecretValue;

  if (!primaryDbUrl) {
    throw new InternalServerErrorException(
      "POSTGRES_PRIMARY_DB_URL is not defined in environment variables",
    );
  }

  if (!readReplicaDbUrl) {
    throw new InternalServerErrorException(
      "POSTGRES_READ_REPLICA_DB_URL is not defined in environment variables",
    );
  }

  try {
    let origin: string[];
    switch (corsEnv) {
      case "PROD": {
        origin = [
          "https://kurumbar.org",
          "https://www.kurumbar.org",
          "https://admin.kurumbar.org",
        ];
        break;
      }
      case "STG": {
        origin = ["https://stg.kurumbar.org", "https://stg-admin.kurumbar.org"];
        break;
      }
      case "DEV": {
        origin = ["http://localhost:3000", "http://localhost:5173"];
        break;
      }
      default:
        throw new Error("Invalid CORS environment configuration.");
    }
    app.enableCors({
      origin,
      methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
      credentials: true,
      maxAge: 86400,
    });
  } catch (error) {
    if (error instanceof Error) {
      Logger.error("CORS configuration error: ", error.message, "Bootstrap");
    } else {
      Logger.error("CORS configuration error: ", error, "Bootstrap");
    }
    process.exit(1);
  }

  app.setGlobalPrefix(globalAppPrefix);

  await app.register(fastifyCookie, {
    secret: cookieSignSecret,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidUnknownValues: false,
    }),
  );

  EventEmitter.setMaxListeners(12);
  app.useGlobalFilters(new GlobalBadRequestFilter(configService));

  if (corsEnv === "PROD" || corsEnv === "STG" || corsEnv === "DEV") {
    await app.register(fastifyHelmet, {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: [
            "'self'",
            "'unsafe-inline'",
            "https://fonts.googleapis.com",
          ],
          imgSrc: ["'self'", "data:", "https:"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          connectSrc: [
            "'self'",
            "https://*.kurumbar.org",
            "https://*.sentry.io",
            "https://*.ingest.sentry.io",
          ],
          frameSrc: ["'self'"],
        },
      },
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: false,
    });
  }

  if (isSwagger) {
    const document = SwaggerModule.createDocument(app, swaggerDocumentOptions);
    Object.values((document as OpenAPIObject).paths).forEach((path: any) => {
      Object.values(path).forEach((method: any) => {
        if (
          Array.isArray(method.security) &&
          method.security.includes("isPublic")
        ) {
          method.security = [];
        }
      });
    });
    SwaggerModule.setup(swaggerPath, app, document, swaggerSetupOptions);
  }

  const { httpAdapter } = app.get(HttpAdapterHost);
  app.useGlobalFilters(new HttpExceptionFilter(httpAdapter));

  return app;
}

async function bootstrap() {
  try {
    let configService = new ConfigService();
    const isHttps =
      configService.get<string>("IS_BACKEND_APP_ON_HTTPS") === "true";

    let httpsOptions: any = undefined;
    if (isHttps) {
      const certPath = configService.get<string>(
        "IS_BACKEND_APP_ON_HTTPS_CERT_PATH",
      );
      const keyPath = configService.get<string>(
        "IS_BACKEND_APP_ON_HTTPS_KEY_PATH",
      );

      if (!certPath) {
        throw new InternalServerErrorException(
          "IS_BACKEND_APP_ON_HTTPS_CERT_PATH is required when HTTPS is enabled",
        );
      }
      if (!keyPath) {
        throw new InternalServerErrorException(
          "IS_BACKEND_APP_ON_HTTPS_KEY_PATH is required when HTTPS is enabled",
        );
      }

      try {
        httpsOptions = {
          key: readFileSync(keyPath),
          cert: readFileSync(certPath),
        };
      } catch (e: any) {
        throw new InternalServerErrorException(
          `Failed to load SSL certs: ${e.message}`,
        );
      }
    }

    const adapter = new FastifyAdapter({
      trustProxy: true,
      bodyLimit: 10485760, // 10MB
      https: httpsOptions,
    });

    const app = await main(adapter);
    const appLogger = app.get(AppLogger);
    app.useLogger(appLogger);

    const fastifyInstance = adapter.getInstance();

    // Disable default body parser to prevent stack overflow / prototype pollution from deep JSON payloads
    fastifyInstance.removeAllContentTypeParsers();

    fastifyInstance.addContentTypeParser(
      "application/json",
      { parseAs: "buffer" },
      function (req, body: Buffer, done) {
        try {
          if (!body || body.length === 0) {
            (req as any).rawBody = Buffer.alloc(0);
            return done(null, {});
          }
          (req as any).rawBody = body;

          const json = JSON.parse(body.toString());
          const MAX_JSON_BODY_DEPTH = 32;
          if (jsonDepthExceeds(json, MAX_JSON_BODY_DEPTH)) {
            const err: any = new Error(
              `Payload exceeds maximum allowed depth of ${MAX_JSON_BODY_DEPTH}`,
            );
            err.statusCode = 400;
            return done(err, undefined);
          }

          done(null, json);
        } catch (err: any) {
          err.statusCode = 400;
          done(err, undefined);
        }
      },
    );

    configService = app.get(ConfigService);
    const port = Number(configService.get<string>("PORT") ?? 3005);

    fastifyInstance.addHook("onRequest", (req, reply, next) => {
      (req as any).startTime = Date.now();
      const correlationIdHeader = req.headers["x-correlation-id"];
      const requestIdHeader = req.headers["x-request-id"];
      const traceId =
        (Array.isArray(correlationIdHeader)
          ? correlationIdHeader[0]
          : correlationIdHeader) ||
        (Array.isArray(requestIdHeader)
          ? requestIdHeader[0]
          : requestIdHeader) ||
        createCuid();

      reply.header("x-correlation-id", traceId);
      (req as any).traceId = traceId;

      traceStore.run({ traceId }, () => {
        next();
      });
    });

    fastifyInstance.addHook("onResponse", (req, reply, next) => {
      const traceId = (req as any).traceId || createCuid();

      traceStore.run({ traceId }, () => {
        const startTime = (req as any).startTime || Date.now();
        const duration = Date.now() - startTime;
        const { method, url, ip } = req;
        const statusCode = reply.statusCode;

        const message = `<-- ${method} ${url} ${statusCode} - ${duration}ms - IP: ${ip}`;
        if (!(req as any).shouldExcludeLog && !shouldExcludeLogByUrl(url)) {
          if (statusCode >= 500) {
            Logger.error(message, undefined, "HTTP");
          } else if (statusCode >= 400) {
            Logger.warn(message, "HTTP");
          } else {
            Logger.log(message, "HTTP");
          }
        }
        next();
      });
    });

    const mainServer = adapter.getHttpServer();

    await app.init();
    await fastifyInstance.ready();

    mainServer.listen(port, () => {
      Logger.log(`Main server listening on port ${port}`, "Bootstrap");
    });

    const shutdownObserver = app.get(ShutdownObserver);
    shutdownObserver.addHttpServer(mainServer);

    const signals = ["SIGTERM", "SIGINT"];
    signals.forEach((signal) => {
      process.on(signal as any, async () => {
        Logger.log(
          `\n[Bootstrap] Received ${signal}. Starting graceful shutdown...`,
          "Bootstrap",
        );
        try {
          await app.close();
          Logger.log(
            "[Bootstrap] Graceful shutdown complete. Exiting.",
            "Bootstrap",
          );
          process.exit(0);
        } catch (err) {
          Logger.error("[Bootstrap] Error during shutdown:", err, "Bootstrap");
          process.exit(1);
        }
      });
    });
  } catch (error: any) {
    Logger.error(
      "Fatal error during bootstrap: " + error.message,
      error.stack,
      "Bootstrap",
    );
    process.exit(1);
  }
}

process.on("unhandledRejection", (reason, _promise) => {
  Logger.error("Unhandled Rejection:", reason, "Bootstrap");
});
process.on("uncaughtException", (err) => {
  Logger.error("Uncaught Exception:", err, "Bootstrap");
});

bootstrap();

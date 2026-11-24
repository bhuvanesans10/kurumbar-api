import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { SentryModule } from "@sentry/nestjs/setup";
import { LoggerModule } from "./common/logger/logger.module";
import { HealthModule } from "./health/health.module";
import { PrismaModule } from "./prisma/prisma.module";
import { ShutdownObserver } from "./util/middlewares/shutdown-observer";

@Module({
  imports: [
    LoggerModule,
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    HealthModule,
    SentryModule.forRoot(),
  ],
  providers: [ShutdownObserver],
})
export class AppModule {}

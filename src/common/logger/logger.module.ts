import { Global, Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { AppLogger } from "./app-logger";
import { HttpLoggingInterceptor } from "./http-logging.interceptor";

@Global()
@Module({
  providers: [
    AppLogger,
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpLoggingInterceptor,
    },
  ],
  exports: [AppLogger],
})
export class LoggerModule {}

import { Global, Module, InternalServerErrorException } from "@nestjs/common";
import { PrismaService } from "./prisma.service";
import { PrismaFactory } from "./prisma.factory";
import { ConfigModule, ConfigService } from "@nestjs/config";

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: PrismaService,
      useFactory: (configService: ConfigService) => {
        const primaryUrl = configService.get<string>("POSTGRES_PRIMARY_DB_URL");
        const replicaUrl = configService.get<string>(
          "POSTGRES_READ_REPLICA_DB_URL",
        );
        if (!replicaUrl) {
          throw new InternalServerErrorException(
            "POSTGRES_READ_REPLICA_DB_URL is not set in environment variables.",
          );
        }
        if (!primaryUrl) {
          throw new InternalServerErrorException(
            "POSTGRES_PRIMARY_DB_URL is not set in environment variables.",
          );
        }
        return PrismaFactory(primaryUrl, replicaUrl);
      },
      inject: [ConfigService],
    },
  ],
  exports: [PrismaService],
})
export class PrismaModule {}

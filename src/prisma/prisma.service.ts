import {
  Injectable,
  Logger,
  OnApplicationShutdown,
  OnModuleInit,
  InternalServerErrorException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaClient } from "src/prisma/generated/client";
import { ExtendedPrismaClientType } from "./prisma.factory";
import { readReplicas } from "@prisma/extension-read-replicas";

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnApplicationShutdown
{
  private static readonly logger = new Logger(PrismaService.name, {
    timestamp: true,
  });

  private readonly replicaUrl: string;

  constructor(private readonly configService: ConfigService) {
    super(undefined as any);
    const url = this.configService.get<string>("POSTGRES_READ_REPLICA_DB_URL");
    if (!url) {
      const errorMessage =
        "POSTGRES_READ_REPLICA_DB_URL environment variable is missing.";
      PrismaService.logger.error(errorMessage);
      throw new InternalServerErrorException(errorMessage);
    }
    this.replicaUrl = url;
  }

  async onModuleInit(): Promise<void> {
    PrismaService.logger.log("⚡️ PrismaService initialized");
    await this.$connect();
    PrismaService.logger.log("⚙️ DB connection established");
  }

  $primary(): ExtendedPrismaClientType {
    return this.$extends(
      readReplicas({
        replicas: [
          new PrismaClient({
            datasources: {
              db: {
                url: this.replicaUrl,
              },
            },
          } as any),
        ],
      }),
    );
  }
  $replica(): ExtendedPrismaClientType {
    return this.$extends(
      readReplicas({
        replicas: [
          new PrismaClient({
            datasources: {
              db: {
                url: this.replicaUrl,
              },
            },
          } as any),
        ],
      }),
    );
  }

  async onApplicationShutdown(): Promise<void> {
    await this.$disconnect();
    PrismaService.logger.log(`✅ DB connection closed`);
  }
}

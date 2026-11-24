import { PrismaClient } from "src/prisma/generated/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { readReplicas } from "@prisma/extension-read-replicas";

const PrismaFactory = (primaryUrl: string, replicaUrl?: string) => {
  // Primary client (driver adapter)
  const primary = new PrismaClient({
    adapter: new PrismaPg({ connectionString: primaryUrl }),
  });

  // If no replica URL, just return the primary as-is
  if (!replicaUrl) {
    void primary.$connect();
    return primary;
  }

  // Replica client (its own driver adapter)
  const replica = new PrismaClient({
    adapter: new PrismaPg({ connectionString: replicaUrl }),
  });

  // IMPORTANT: pass the REPLICA **CLIENT**, not the adapter/url
  const client = primary.$extends(
    readReplicas({
      replicas: [replica],
    }),
  );

  void Promise.all([client.$connect(), replica.$connect()]); // safe to connect both

  return client;
};

export type ExtendedPrismaClientType = ReturnType<typeof PrismaFactory>;
export { PrismaFactory };

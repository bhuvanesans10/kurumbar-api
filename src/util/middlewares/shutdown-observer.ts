import { Injectable, Logger, OnApplicationShutdown } from "@nestjs/common";
import * as http from "http";
import * as https from "https";

@Injectable()
export class ShutdownObserver implements OnApplicationShutdown {
  private static readonly logger = new Logger(ShutdownObserver.name, {
    timestamp: true,
  });
  private httpServers: (http.Server | https.Server)[] = [];

  public addHttpServer(server: http.Server | https.Server): void {
    this.httpServers.push(server);
  }

  public async onApplicationShutdown(): Promise<void> {
    ShutdownObserver.logger.log("Closing HTTP servers...");

    await Promise.all(
      this.httpServers.map(
        (server) =>
          new Promise((resolve) => {
            // 1. Safety Check: Don't close if not listening
            if (!server.listening) {
              return resolve(null);
            }

            // 2. Force close idle connections, keep active ones
            server.closeIdleConnections();

            // 3. Stop accepting new connections
            server.close((error) => {
              if (error) {
                // Ignore "Not running" errors gracefully
                if (error.message !== "Server is not running.") {
                  ShutdownObserver.logger.error("Error closing server:", error);
                }
              }
              resolve(null);
            });
          }),
      ),
    );
  }
}

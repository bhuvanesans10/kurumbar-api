import * as Sentry from "@sentry/nestjs";
import { nodeProfilingIntegration } from "@sentry/profiling-node";

const dsn = process.env.PROJECT_SENTRY_DSN;

if (dsn) {
  // Ensure to call this before requiring any other modules!
  Sentry.init({
    dsn: process.env.PROJECT_SENTRY_DSN,
    integrations: [nodeProfilingIntegration()],
    // Tracing — configurable per environment (dev=0.3, staging=0.2, prod=0.1)
    tracesSampleRate: parseFloat(
      process.env.SENTRY_TRACES_SAMPLE_RATE || "0.1",
    ),
    // Profiling disabled to prevent CPU overhead. Enable temporarily for perf debugging.
    profilesSampleRate: 0.0,
  });
}

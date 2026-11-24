import { ConsoleLogger } from "@nestjs/common";
import { AppLogger } from "./app-logger";
import { traceStore } from "./trace-store";
import { ConfigService } from "@nestjs/config";

describe("AppLogger", () => {
  let logger: AppLogger;
  let logSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  let debugSpy: jest.SpyInstance;
  let verboseSpy: jest.SpyInstance;

  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    // Reset env configuration
    process.env.CORS_ENV = "DEV";
    delete process.env.LOG_LEVEL;

    // Spy on base class methods to prevent actual console output and check arguments
    logSpy = jest.spyOn(ConsoleLogger.prototype, "log").mockImplementation();
    errorSpy = jest
      .spyOn(ConsoleLogger.prototype, "error")
      .mockImplementation();
    warnSpy = jest.spyOn(ConsoleLogger.prototype, "warn").mockImplementation();
    debugSpy = jest
      .spyOn(ConsoleLogger.prototype, "debug")
      .mockImplementation();
    verboseSpy = jest
      .spyOn(ConsoleLogger.prototype, "verbose")
      .mockImplementation();

    consoleLogSpy = jest.spyOn(console, "log").mockImplementation();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

    logger = new AppLogger("TestContext");
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("DEV Environment (Human-Readable Mode)", () => {
    it("should call base log with context and message", () => {
      logger.log("Hello World");
      expect(logSpy).toHaveBeenCalledWith("Hello World", "TestContext");
    });

    it("should prepend trace ID if traceStore context exists", () => {
      traceStore.run({ traceId: "dev-trace-id" }, () => {
        logger.log("Hello World");
      });
      expect(logSpy).toHaveBeenCalledWith(
        "[TraceId: dev-trace-id] Hello World",
        "TestContext",
      );
    });

    it("should sanitize PII in message strings", () => {
      logger.log("User email is user@example.com");
      expect(logSpy).toHaveBeenCalledWith(
        "User email is [MASKED_EMAIL]",
        "TestContext",
      );
    });

    it("should sanitize PII in logged objects and keep traceId", () => {
      traceStore.run({ traceId: "dev-trace-id" }, () => {
        logger.log({ email: "user@example.com", key: "value" });
      });
      expect(logSpy).toHaveBeenCalledWith(
        {
          traceId: "dev-trace-id",
          email: "[MASKED]",
          key: "value",
        },
        "TestContext",
      );
    });

    it("should call base error and pass stack", () => {
      const errorStack = "Error stack trace";
      logger.error("Something went wrong", errorStack);
      expect(errorSpy).toHaveBeenCalledWith(
        "Something went wrong",
        errorStack,
        "TestContext",
      );
    });
  });

  describe("Non-DEV Environment (Structured JSON Mode)", () => {
    beforeEach(() => {
      process.env.CORS_ENV = "PROD";
      logger = new AppLogger("TestContext");
    });

    it("should write structured JSON to console.log", () => {
      logger.log("Hello JSON");

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      expect(output).toEqual(
        expect.objectContaining({
          level: "info",
          context: "TestContext",
          message: "Hello JSON",
          timestamp: expect.any(String),
        }),
      );
      expect(logSpy).not.toHaveBeenCalled();
    });

    it("should write structured JSON with traceId to console.log", () => {
      traceStore.run({ traceId: "prod-trace-id" }, () => {
        logger.log("Hello JSON with Trace");
      });

      const output = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      expect(output.traceId).toBe("prod-trace-id");
      expect(output.message).toBe("Hello JSON with Trace");
    });

    it("should mask PII in JSON output", () => {
      logger.log({ email: "user@example.com", phone: "9876543210" });

      const output = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      expect(output.message).toEqual({
        email: "[MASKED]",
        phone: "[MASKED]",
      });
    });

    it("should write error logs to console.error with stack traces", () => {
      logger.error("Fatal exception", "Stack trace details");

      expect(consoleErrorSpy).toHaveBeenCalled();
      const output = JSON.parse(consoleErrorSpy.mock.calls[0][0]);
      expect(output).toEqual(
        expect.objectContaining({
          level: "error",
          context: "TestContext",
          message: "Fatal exception",
          stack: "Stack trace details",
        }),
      );
      expect(errorSpy).not.toHaveBeenCalled();
    });
  });

  describe("Log Level Filtering", () => {
    it("should suppress logs with lower level than LOG_LEVEL", () => {
      process.env.LOG_LEVEL = "warn";
      const warnLogger = new AppLogger("TestContext");

      warnLogger.verbose("verbose log");
      warnLogger.debug("debug log");
      warnLogger.log("info log");
      warnLogger.warn("warn log");
      warnLogger.error("error log");

      expect(verboseSpy).not.toHaveBeenCalled();
      expect(debugSpy).not.toHaveBeenCalled();
      expect(logSpy).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalled();
    });

    it("should allow all logs if LOG_LEVEL is verbose", () => {
      process.env.LOG_LEVEL = "verbose";
      const verboseLogger = new AppLogger("TestContext");

      verboseLogger.verbose("verbose log");
      verboseLogger.debug("debug log");
      verboseLogger.log("info log");

      expect(verboseSpy).toHaveBeenCalled();
      expect(debugSpy).toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalled();
    });

    it("should throw error if invalid LOG_LEVEL is configured", () => {
      process.env.LOG_LEVEL = "invalid-level";
      expect(() => new AppLogger("TestContext")).toThrow(
        "Invalid LOG_LEVEL configuration",
      );
    });
  });

  describe("ConfigService Initialization", () => {
    it("should load configuration from ConfigService when provided", () => {
      const mockConfigService = {
        get: jest.fn((key: string) => {
          if (key === "CORS_ENV") return "PROD";
          if (key === "LOG_LEVEL") return "warn";
          return undefined;
        }),
      } as unknown as ConfigService;

      const diLogger = new AppLogger("TestContext", mockConfigService);

      diLogger.log("info log");
      diLogger.warn("warn log");

      expect(consoleLogSpy).toHaveBeenCalledTimes(1); // Only warn log should execute in JSON mode
      const output = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      expect(output.level).toBe("warn");
    });

    it("should throw if ConfigService has invalid LOG_LEVEL", () => {
      const mockConfigService = {
        get: jest.fn((key: string) => {
          if (key === "LOG_LEVEL") return "garbage";
          return undefined;
        }),
      } as unknown as ConfigService;

      expect(() => new AppLogger("TestContext", mockConfigService)).toThrow(
        "Invalid LOG_LEVEL configuration",
      );
    });
  });
});

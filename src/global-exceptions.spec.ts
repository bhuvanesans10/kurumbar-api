import {
  HttpException,
  HttpStatus,
  InternalServerErrorException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { GlobalBadRequestFilter } from "./global-exceptions";

describe("GlobalBadRequestFilter", () => {
  let mockConfigService: Partial<ConfigService>;
  let mockResponse: any;
  let mockRequest: any;
  let mockHost: any;

  beforeEach(() => {
    mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === "CORS_ENV") return "DEV";
        return null;
      }),
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };

    mockRequest = {
      url: "/api/test",
    };

    mockHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    };
  });

  describe("Constructor", () => {
    it("should throw InternalServerErrorException if CORS_ENV is missing", () => {
      const emptyConfig = { get: jest.fn().mockReturnValue(null) };
      expect(() => new GlobalBadRequestFilter(emptyConfig as any)).toThrow(
        InternalServerErrorException,
      );
    });

    it("should set corsEnv when CORS_ENV is present", () => {
      const filter = new GlobalBadRequestFilter(mockConfigService as any);
      expect(filter).toBeDefined();
    });
  });

  describe("catch - HttpException", () => {
    it("handles HttpException in DEV environment with timestamp and path", () => {
      mockConfigService.get = jest.fn().mockReturnValue("DEV");
      const filter = new GlobalBadRequestFilter(mockConfigService as any);

      const exception = new HttpException(
        { message: "Invalid payload", error: "Bad Request" },
        HttpStatus.BAD_REQUEST,
      );

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.send).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Invalid payload",
          error: "Bad Request",
          path: "/api/test",
          timestamp: expect.any(String),
        }),
      );
    });

    it("handles HttpException in PROD environment without extra debug info", () => {
      mockConfigService.get = jest.fn().mockReturnValue("PROD");
      const filter = new GlobalBadRequestFilter(mockConfigService as any);

      const exception = new HttpException(
        { message: "Forbidden resource" },
        HttpStatus.FORBIDDEN,
      );

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.send).toHaveBeenCalledWith({
        message: "Forbidden resource",
      });
    });
  });

  describe("catch - non-HttpException", () => {
    it("handles standard Error instance in DEV environment", () => {
      mockConfigService.get = jest.fn().mockReturnValue("DEV");
      const filter = new GlobalBadRequestFilter(mockConfigService as any);

      const error = new Error("Database connection lost");
      filter.catch(error, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.send).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 500,
          message: "Bad Request",
          error: "Database connection lost",
          stack: expect.any(String),
          path: "/api/test",
          timestamp: expect.any(String),
        }),
      );
    });

    it("handles non-Error primitive thrown in DEV environment", () => {
      mockConfigService.get = jest.fn().mockReturnValue("DEV");
      const filter = new GlobalBadRequestFilter(mockConfigService as any);

      filter.catch("String error exception", mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.send).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 500,
          message: "Bad Request",
          error: "Unknown error",
          stack: "No stack trace available",
          path: "/api/test",
        }),
      );
    });

    it("handles non-HttpException in non-DEV environment", () => {
      mockConfigService.get = jest.fn().mockReturnValue("PROD");
      const filter = new GlobalBadRequestFilter(mockConfigService as any);

      const error = new Error("Internal failure");
      filter.catch(error, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.send).toHaveBeenCalledWith({
        statusCode: 500,
        message: "Bad Request",
      });
    });
  });
});

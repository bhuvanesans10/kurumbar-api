import { HttpExceptionFilter } from "./HttpExceptions.filter";
import { ArgumentsHost, HttpStatus } from "@nestjs/common";
import { Prisma } from "src/prisma/generated/client";

describe("HttpExceptionFilter", () => {
  let filter: HttpExceptionFilter;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
  });

  it("should be defined", () => {
    expect(filter).toBeDefined();
  });

  it("should catch P2000 and return BAD_REQUEST", () => {
    const mockJson = jest.fn();
    const mockStatus = jest.fn().mockReturnValue({ send: mockJson });
    const mockGetResponse = jest.fn().mockReturnValue({ status: mockStatus });
    const mockHttpArgumentsHost = {
      getResponse: mockGetResponse,
      getRequest: jest.fn(),
    };

    const mockArgumentsHost = {
      switchToHttp: jest.fn().mockReturnValue(mockHttpArgumentsHost),
      getType: jest.fn().mockReturnValue("http"),
    } as unknown as ArgumentsHost;

    const exception = {
      code: "P2000",
      message: "Input too long → Some details\nMore details",
      clientVersion: "2.0",
      meta: {},
    } as unknown as Prisma.PrismaClientKnownRequestError;

    filter.catch(exception, mockArgumentsHost);

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.BAD_REQUEST,
      }),
    );
  });

  it("should catch P2002 and return CONFLICT with custom message", () => {
    const mockJson = jest.fn();
    const mockStatus = jest.fn().mockReturnValue({ send: mockJson });
    const mockGetResponse = jest.fn().mockReturnValue({ status: mockStatus });
    const mockHttpArgumentsHost = {
      getResponse: mockGetResponse,
      getRequest: jest.fn(),
    };

    const mockArgumentsHost = {
      switchToHttp: jest.fn().mockReturnValue(mockHttpArgumentsHost),
      getType: jest.fn().mockReturnValue("http"),
    } as unknown as ArgumentsHost;

    const exception = {
      code: "P2002",
      message: "Unique constraint failed",
      clientVersion: "2.0",
      meta: { target: ["email"] },
    } as unknown as Prisma.PrismaClientKnownRequestError;

    filter.catch(exception, mockArgumentsHost);

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining(
          "Another record with the requested (email) already exists",
        ),
      }),
    );
  });

  it("should catch P2025 and return NOT_FOUND", () => {
    const mockJson = jest.fn();
    const mockStatus = jest.fn().mockReturnValue({ send: mockJson });
    const mockGetResponse = jest.fn().mockReturnValue({ status: mockStatus });
    const mockHttpArgumentsHost = {
      getResponse: mockGetResponse,
      getRequest: jest.fn(),
    };

    const mockArgumentsHost = {
      switchToHttp: jest.fn().mockReturnValue(mockHttpArgumentsHost),
      getType: jest.fn().mockReturnValue("http"),
    } as unknown as ArgumentsHost;

    const exception = {
      code: "P2025",
      message: "Record not found → Details\n",
    } as unknown as Prisma.PrismaClientKnownRequestError;

    filter.catch(exception, mockArgumentsHost);

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
  });
});

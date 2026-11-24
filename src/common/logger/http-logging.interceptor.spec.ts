import { HttpLoggingInterceptor } from "./http-logging.interceptor";
import { ExecutionContext, CallHandler } from "@nestjs/common";
import { of } from "rxjs";

describe("HttpLoggingInterceptor", () => {
  let interceptor: HttpLoggingInterceptor;

  beforeEach(() => {
    interceptor = new HttpLoggingInterceptor();
  });

  it("should be defined", () => {
    expect(interceptor).toBeDefined();
  });

  it("should bypass non-http contexts", async () => {
    const mockContext = {
      getType: () => "rpc",
    } as unknown as ExecutionContext;

    const mockHandler = {
      handle: () => of("test"),
    } as unknown as CallHandler;

    const result = await interceptor
      .intercept(mockContext, mockHandler)
      .toPromise();
    expect(result).toBe("test");
  });

  it("should intercept http request and set shouldExcludeLog for excluded controllers", async () => {
    const mockRequest: any = {
      method: "GET",
      url: "/health",
      ip: "127.0.0.1",
    };
    const mockContext = {
      getType: () => "http",
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => ({}),
      }),
      getClass: () => ({
        name: "HealthController",
      }),
    } as unknown as ExecutionContext;

    const mockHandler = {
      handle: () => of("test"),
    } as unknown as CallHandler;

    const result = await interceptor
      .intercept(mockContext, mockHandler)
      .toPromise();
    expect(result).toBe("test");
    expect(mockRequest.shouldExcludeLog).toBe(true);
  });

  it("should intercept http request and log for non-excluded controllers", async () => {
    const mockRequest: any = {
      method: "GET",
      url: "/api/users",
      ip: "127.0.0.1",
    };
    const mockContext = {
      getType: () => "http",
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => ({}),
      }),
      getClass: () => ({
        name: "UsersController",
      }),
    } as unknown as ExecutionContext;

    const mockHandler = {
      handle: () => of("test"),
    } as unknown as CallHandler;

    const result = await interceptor
      .intercept(mockContext, mockHandler)
      .toPromise();
    expect(result).toBe("test");
    expect(mockRequest.shouldExcludeLog).toBe(false);
  });
});

import {
  shouldExcludeLog,
  shouldExcludeLogByUrl,
} from "./logger-exclusion.config";

describe("shouldExcludeLog", () => {
  it("should return true for excluded controllers", () => {
    expect(shouldExcludeLog("HealthController")).toBe(true);
    expect(shouldExcludeLog("McpController")).toBe(true);
    expect(shouldExcludeLog("LiveKitWebhooksController")).toBe(true);
    expect(shouldExcludeLog("PrometheusController")).toBe(true);
  });

  it("should return false for non-excluded controllers", () => {
    expect(shouldExcludeLog("UsersController")).toBe(false);
    expect(shouldExcludeLog("OrdersController")).toBe(false);
    expect(shouldExcludeLog("")).toBe(false);
  });
});

describe("shouldExcludeLogByUrl", () => {
  it("should return true for excluded URLs", () => {
    expect(shouldExcludeLogByUrl("/health")).toBe(true);
    expect(shouldExcludeLogByUrl("/_health")).toBe(true);
    expect(shouldExcludeLogByUrl("/ping")).toBe(true);
    expect(shouldExcludeLogByUrl("/metrics")).toBe(true);
    expect(shouldExcludeLogByUrl("/api/metrics")).toBe(true);
  });

  it("should return false for non-excluded URLs", () => {
    expect(shouldExcludeLogByUrl("/")).toBe(false);
    expect(shouldExcludeLogByUrl("/api/users")).toBe(false);
    expect(shouldExcludeLogByUrl("")).toBe(false);
  });
});

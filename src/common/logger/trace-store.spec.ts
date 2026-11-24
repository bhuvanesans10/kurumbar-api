import { traceStore } from "./trace-store";

describe("traceStore", () => {
  it("should be undefined when outside context", () => {
    expect(traceStore.getStore()).toBeUndefined();
  });

  it("should retrieve stored traceId inside run context", () => {
    traceStore.run({ traceId: "test-trace-123" }, () => {
      expect(traceStore.getStore()).toEqual({ traceId: "test-trace-123" });
    });
  });

  it("should maintain isolated contexts across asynchronous operations", async () => {
    const runInContext = (id: string, delayMs: number) => {
      return new Promise<void>((resolve) => {
        traceStore.run({ traceId: id }, () => {
          setTimeout(() => {
            expect(traceStore.getStore()?.traceId).toBe(id);
            resolve();
          }, delayMs);
        });
      });
    };

    await Promise.all([
      runInContext("trace-a", 10),
      runInContext("trace-b", 5),
      runInContext("trace-c", 15),
    ]);
  });
});

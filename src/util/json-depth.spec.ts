import { jsonDepthExceeds } from "./json-depth";

describe("jsonDepthExceeds", () => {
  it("returns false for shallow objects", () => {
    expect(jsonDepthExceeds({ a: 1, b: "two", c: [1, 2, 3] }, 32)).toBe(false);
  });

  it("returns false for null and primitive values", () => {
    expect(jsonDepthExceeds(null, 32)).toBe(false);
    expect(jsonDepthExceeds("string", 32)).toBe(false);
    expect(jsonDepthExceeds(123, 32)).toBe(false);
  });

  it("returns true when depth exceeds maxDepth", () => {
    const deepObj: any = {};
    let curr = deepObj;
    for (let i = 0; i < 35; i++) {
      curr.nested = {};
      curr = curr.nested;
    }
    expect(jsonDepthExceeds(deepObj, 32)).toBe(true);
  });
});

import { sanitize, sanitizeString } from "./pii-sanitizer";

describe("pii-sanitizer", () => {
  describe("sanitizeString", () => {
    it("should mask email addresses in text", () => {
      const input = "User requested login for john.doe@example.com yesterday.";
      expect(sanitizeString(input)).toBe(
        "User requested login for [MASKED_EMAIL] yesterday.",
      );
    });

    it("should mask Bearer tokens in headers", () => {
      const input = "Authorization header: Bearer abc123xyz.token.value";
      expect(sanitizeString(input)).toBe(
        "Authorization header: Bearer [MASKED_TOKEN]",
      );
    });

    it("should mask 10-digit phone numbers in strings", () => {
      const input = "Contact us at 9876543210 or +919876543210 for support.";
      expect(sanitizeString(input)).toBe(
        "Contact us at [MASKED_PHONE] or [MASKED_PHONE] for support.",
      );
    });

    it("should not mask standard numbers or short codes", () => {
      const input = "Order total is 100.50 and item quantity is 5.";
      expect(sanitizeString(input)).toBe(input);
    });
  });

  describe("sanitize (Object / Array / Mixed)", () => {
    it("should return null, undefined, or primitive values unchanged if not sensitive", () => {
      expect(sanitize(null)).toBeNull();
      expect(sanitize(undefined)).toBeUndefined();
      expect(sanitize(123)).toBe(123);
      expect(sanitize(true)).toBe(true);
    });

    it("should mask sensitive keys in an object case-insensitively", () => {
      const input = {
        email: "test@test.com",
        password: "my-password-123",
        username: "testuser",
        nonSensitive: "keep-this-value",
        nested: {
          token: "secret-token",
          latitude: 12.345,
          longitude: 67.89,
          okValue: "allowed",
        },
      };

      const expected = {
        email: "[MASKED]",
        password: "[MASKED]",
        username: "[MASKED]",
        nonSensitive: "keep-this-value",
        nested: {
          token: "[MASKED]",
          latitude: "[MASKED]",
          longitude: "[MASKED]",
          okValue: "allowed",
        },
      };

      expect(sanitize(input)).toEqual(expected);
    });

    it("should sanitize array items correctly", () => {
      const input = [
        { email: "john@example.com" },
        { phone: "9876543210" },
        "Contact info john.doe@example.com",
      ];

      const expected = [
        { email: "[MASKED]" },
        { phone: "[MASKED]" },
        "Contact info [MASKED_EMAIL]",
      ];

      expect(sanitize(input)).toEqual(expected);
    });

    it("should preserve special objects like Dates and Buffers", () => {
      const date = new Date();
      const buffer = Buffer.from("hello");
      const obj = {
        createdAt: date,
        data: buffer,
        email: "test@test.com",
      };

      const result = sanitize(obj);
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.createdAt.getTime()).toBe(date.getTime());
      expect(Buffer.isBuffer(result.data)).toBe(true);
      expect(result.email).toBe("[MASKED]");
    });

    it("should sanitize Error objects recursively preserving stack structure", () => {
      const error = new Error("Failed validation for john@example.com");
      error.stack = "Error at test.ts:10:5 with token Bearer xyz";

      const result = sanitize(error);
      expect(result.message).toBe("Failed validation for [MASKED_EMAIL]");
      expect(result.stack).toBe(
        "Error at test.ts:10:5 with token Bearer [MASKED_TOKEN]",
      );
    });

    it("should handle circular references without stack overflow", () => {
      const obj: any = { name: "test" };
      obj.self = obj;

      const result = sanitize(obj);
      expect(result.name).toBe("test");
      expect(result.self).toBe("[Circular]");
    });

    it("should handle nested depth limit of 8", () => {
      // 9 levels deep
      const deepObj: any = {
        level1: {
          level2: {
            level3: {
              level4: {
                level5: {
                  level6: {
                    level7: {
                      level8: {
                        level9: "too-deep",
                      },
                    },
                  },
                },
              },
            },
          },
        },
      };

      const result = sanitize(deepObj);
      expect(
        result.level1.level2.level3.level4.level5.level6.level7.level8,
      ).toBe("[MaxDepthReached]");
    });

    it("should truncate long strings except stack properties", () => {
      const longStr = "a".repeat(1100);
      const input = {
        normalField: longStr,
        stack: longStr,
      };

      const result = sanitize(input);
      expect(result.normalField).toHaveLength(1015); // 1000 + "... (truncated)".length
      expect(result.normalField.endsWith("... (truncated)")).toBe(true);
      expect(result.stack).toHaveLength(1100);
    });
  });
});

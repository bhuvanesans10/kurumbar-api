const PII_KEYS = new Set([
  "email",
  "phone",
  "phonenumber",
  "password",
  "pin",
  "token",
  "authorization",
  "cookie",
  "accesstoken",
  "refreshtoken",
  "address",
  "latitude",
  "longitude",
  "lat",
  "lng",
  "cvv",
  "cardnumber",
  "firstname",
  "lastname",
  "fullname",
  "customername",
  "username",
]);

export function sanitizeString(val: string): string {
  let cleaned = val;
  // Mask Emails
  cleaned = cleaned.replace(
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    "[MASKED_EMAIL]",
  );
  // Mask Bearer tokens
  cleaned = cleaned.replace(
    /bearer\s+[a-zA-Z0-9\-._~+/]+=*/gi,
    "Bearer [MASKED_TOKEN]",
  );
  // Mask 10-digit phone numbers (with optional country code boundaries)
  cleaned = cleaned.replace(/\+?\b(?:91|0)?\d{10}\b/g, "[MASKED_PHONE]");
  return cleaned;
}

const MAX_DEPTH = 8;
const MAX_STRING_LENGTH = 1000;

export function sanitize(val: any): any {
  return sanitizeInternal(val, 0, new WeakSet(), true);
}

function sanitizeInternal(
  val: any,
  depth: number,
  visited: WeakSet<any>,
  truncateStrings: boolean,
): any {
  if (val === null || val === undefined) {
    return val;
  }

  const type = typeof val;

  if (type === "string") {
    const sanitized = sanitizeString(val);
    if (truncateStrings && sanitized.length > MAX_STRING_LENGTH) {
      return sanitized.slice(0, MAX_STRING_LENGTH) + "... (truncated)";
    }
    return sanitized;
  }

  if (type !== "object") {
    return val;
  }

  // Handle special object types (Date, RegExp, Buffer, etc.)
  if (val instanceof Date) {
    return val;
  }
  if (val instanceof RegExp) {
    return val;
  }
  if (Buffer.isBuffer(val)) {
    return val;
  }

  // Circular reference protection
  if (visited.has(val)) {
    return "[Circular]";
  }

  // Depth limit protection
  if (depth >= MAX_DEPTH) {
    return "[MaxDepthReached]";
  }

  visited.add(val);

  // Handle Arrays
  if (Array.isArray(val)) {
    return val.map((item) =>
      sanitizeInternal(item, depth + 1, visited, truncateStrings),
    );
  }

  // Handle general Objects
  const sanitizedObj: Record<string, any> = {};
  for (const key of Object.keys(val)) {
    const lowerKey = key.toLowerCase();
    if (PII_KEYS.has(lowerKey)) {
      sanitizedObj[key] = "[MASKED]";
    } else {
      // Skip string truncation specifically for error stack traces
      const shouldTruncate = key !== "stack";
      sanitizedObj[key] = sanitizeInternal(
        val[key],
        depth + 1,
        visited,
        shouldTruncate,
      );
    }
  }

  // Handle Error instances to maintain stack trace properties if they exist
  if (val instanceof Error) {
    sanitizedObj.message = sanitizeString(val.message);
    if (val.stack) {
      sanitizedObj.stack = sanitizeString(val.stack);
    }
  }

  return sanitizedObj;
}

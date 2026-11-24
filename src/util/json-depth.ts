/** True as soon as any branch exceeds maxDepth -- short-circuits rather
 *  than walking the full tree, so a wide-but-shallow payload (many keys,
 *  low nesting) is cheap even if large. */
export function jsonDepthExceeds(
  value: unknown,
  maxDepth: number,
  depth = 0,
): boolean {
  if (depth > maxDepth) return true;
  if (value === null || typeof value !== "object") return false;
  const entries = Array.isArray(value)
    ? value
    : Object.values(value as Record<string, unknown>);
  for (const entry of entries) {
    if (jsonDepthExceeds(entry, maxDepth, depth + 1)) return true;
  }
  return false;
}

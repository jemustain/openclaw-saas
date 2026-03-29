/**
 * Safe environment variable accessor.
 * Always trims whitespace/newlines to guard against
 * values set with trailing \n (common with piped CLI input).
 */
export function env(name: string): string | undefined {
  return process.env[name]?.trim() || undefined;
}

/**
 * Required environment variable - throws if missing.
 */
export function envRequired(name: string): string {
  const value = env(name);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

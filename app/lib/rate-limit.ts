/**
 * In-memory sliding-window rate limiter.
 * Suitable for single-instance deployments (Vercel hobby/pro).
 * For multi-instance, swap the Map with an Upstash Redis client.
 */

type Entry = { count: number; resetAt: number };

const store = new Map<string, Entry>();

export interface RateLimitOptions {
  /** How many requests are allowed in the window. */
  limit: number;
  /** Window duration in milliseconds. */
  windowMs: number;
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
}

export function checkRateLimit(
  key: string,
  options: RateLimitOptions
): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now >= entry.resetAt) {
    // Fresh window
    store.set(key, { count: 1, resetAt: now + options.windowMs });
    return { success: true, remaining: options.limit - 1, resetAt: now + options.windowMs };
  }

  if (entry.count >= options.limit) {
    return { success: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count += 1;
  return {
    success: true,
    remaining: options.limit - entry.count,
    resetAt: entry.resetAt,
  };
}

// ─── Pre-configured limiters ──────────────────────────────────────────────────

/** OTP requests: max 3 per 15 minutes per email */
export function checkOtpLimit(email: string): RateLimitResult {
  return checkRateLimit(`otp:${email}`, { limit: 3, windowMs: 15 * 60 * 1000 });
}

/** Transfer: max 5 per hour per org */
export function checkTransferLimit(orgId: string): RateLimitResult {
  return checkRateLimit(`transfer:${orgId}`, {
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });
}

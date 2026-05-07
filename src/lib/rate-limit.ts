/**
 * Simple in-memory rate limiter
 * For production, consider using Redis-based rate limiting (@upstash/ratelimit)
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
setInterval(
  () => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (entry.resetAt < now) {
        store.delete(key);
      }
    }
  },
  5 * 60 * 1000,
);

export interface RateLimitConfig {
  /**
   * Maximum number of requests allowed in the window
   */
  limit: number;
  /**
   * Time window in milliseconds
   */
  windowMs: number;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Check if a request should be rate limited
 * @param identifier - Unique identifier (IP, user ID, etc.)
 * @param config - Rate limit configuration
 * @returns Rate limit result
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig,
): RateLimitResult {
  const now = Date.now();
  const key = identifier;
  const entry = store.get(key);

  // No existing entry or expired window
  if (!entry || entry.resetAt < now) {
    const resetAt = now + config.windowMs;
    store.set(key, { count: 1, resetAt });
    return {
      success: true,
      limit: config.limit,
      remaining: config.limit - 1,
      reset: resetAt,
    };
  }

  // Existing entry within window
  if (entry.count >= config.limit) {
    return {
      success: false,
      limit: config.limit,
      remaining: 0,
      reset: entry.resetAt,
    };
  }

  // Increment count
  entry.count++;
  store.set(key, entry);

  return {
    success: true,
    limit: config.limit,
    remaining: config.limit - entry.count,
    reset: entry.resetAt,
  };
}

/**
 * Default rate limit configurations for different endpoints
 */
export const RATE_LIMITS = {
  // Strict limit for auth endpoints
  AUTH: { limit: 5, windowMs: 15 * 60 * 1000 }, // 5 req / 15 min
  // Moderate limit for write operations
  WRITE: { limit: 30, windowMs: 60 * 1000 }, // 30 req / min
  // Generous limit for read operations
  READ: { limit: 100, windowMs: 60 * 1000 }, // 100 req / min
  // Very strict for upload operations
  UPLOAD: { limit: 10, windowMs: 60 * 60 * 1000 }, // 10 req / hour
} as const;

/**
 * Get client identifier from request
 */
export function getClientIdentifier(request: Request): string {
  // Try to get IP from headers
  const headers = new Headers(request.headers);
  const forwarded = headers.get("x-forwarded-for");
  const realIp = headers.get("x-real-ip");
  const cfConnecting = headers.get("cf-connecting-ip");

  const ip =
    cfConnecting || realIp || (forwarded ? forwarded.split(",")[0] : null);

  return ip || "unknown";
}

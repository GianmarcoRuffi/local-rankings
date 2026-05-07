import {
  MILLISECONDS_PER_MINUTE,
  MILLISECONDS_PER_HOUR,
  RATE_LIMIT_AUTH_MAX_REQUESTS,
  RATE_LIMIT_CLEANUP_INTERVAL_MS,
  RATE_LIMIT_READ_MAX_REQUESTS,
  RATE_LIMIT_UPLOAD_MAX_REQUESTS,
  RATE_LIMIT_WRITE_MAX_REQUESTS,
} from "@/lib/constants";

/**
 * Simple in-memory rate limiter
 * For production, consider using Redis-based rate limiting (@upstash/ratelimit)
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();
let lastCleanupAt = 0;

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
  cleanupExpiredEntries(now);
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

function cleanupExpiredEntries(now: number): void {
  if (now - lastCleanupAt < RATE_LIMIT_CLEANUP_INTERVAL_MS) {
    return;
  }

  lastCleanupAt = now;
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt < now) {
      store.delete(key);
    }
  }
}

/**
 * Default rate limit configurations for different endpoints
 */
export const RATE_LIMITS = {
  // Strict limit for auth endpoints
  AUTH: {
    limit: RATE_LIMIT_AUTH_MAX_REQUESTS,
    windowMs: 15 * MILLISECONDS_PER_MINUTE,
  },
  // Moderate limit for write operations
  WRITE: {
    limit: RATE_LIMIT_WRITE_MAX_REQUESTS,
    windowMs: MILLISECONDS_PER_MINUTE,
  },
  // Generous limit for read operations
  READ: {
    limit: RATE_LIMIT_READ_MAX_REQUESTS,
    windowMs: MILLISECONDS_PER_MINUTE,
  },
  // Very strict for upload operations
  UPLOAD: {
    limit: RATE_LIMIT_UPLOAD_MAX_REQUESTS,
    windowMs: MILLISECONDS_PER_HOUR,
  },
} as const;

/**
 * Get client identifier from request
 */
export function getClientIdentifier(request: Request): string {
  const headers = new Headers(request.headers);
  const forwarded = headers.get("x-forwarded-for");
  const realIp = headers.get("x-real-ip");
  const cfConnecting = headers.get("cf-connecting-ip");
  const vercelForwarded = headers.get("x-vercel-forwarded-for");
  const forwardedFor = headers.get("forwarded");

  const ip =
    firstHeaderIp(cfConnecting) ||
    firstHeaderIp(vercelForwarded) ||
    firstHeaderIp(forwarded) ||
    firstHeaderIp(realIp) ||
    firstForwardedIp(forwardedFor);

  if (ip) {
    return `ip:${ip}`;
  }

  const userAgent = headers.get("user-agent") || "unknown-ua";
  const acceptLanguage = headers.get("accept-language") || "unknown-lang";
  return `fallback:${hashIdentifier(`${userAgent}:${acceptLanguage}`)}`;
}

function firstHeaderIp(value: string | null): string | null {
  return value?.split(",")[0]?.trim() || null;
}

function firstForwardedIp(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const first = value.split(",")[0];
  const match = first.match(/for="?([^";]+)"?/i);
  return match?.[1]?.replace(/^\[|\]$/g, "").trim() || null;
}

function hashIdentifier(value: string): string {
  let hash = 5381;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 33) ^ value.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

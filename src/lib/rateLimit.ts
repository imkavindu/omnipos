interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitRecord>();

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * In-memory sliding window rate limiter
 * @param key Unique key (e.g. IP address or userId)
 * @param limit Max requests allowed in the window
 * @param windowMs Window duration in milliseconds (default: 60,000ms / 1 min)
 */
export function checkRateLimit(
  key: string,
  limit = 5,
  windowMs = 60 * 1000
): RateLimitResult {
  const now = Date.now();
  const record = rateLimitMap.get(key);

  // Clean up expired entry
  if (!record || now > record.resetAt) {
    rateLimitMap.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    return {
      success: true,
      limit,
      remaining: limit - 1,
      reset: Math.ceil(windowMs / 1000),
    };
  }

  if (record.count >= limit) {
    return {
      success: false,
      limit,
      remaining: 0,
      reset: Math.ceil((record.resetAt - now) / 1000),
    };
  }

  record.count += 1;
  return {
    success: true,
    limit,
    remaining: limit - record.count,
    reset: Math.ceil((record.resetAt - now) / 1000),
  };
}

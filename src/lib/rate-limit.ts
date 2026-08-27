import "server-only";

/**
 * Minimal fixed-window rate limiter.
 *
 * Deliberately small: an in-memory counter per key, swept periodically. It
 * exists because public certificate numbers are sequential and therefore
 * guessable, so an unthrottled public endpoint invites enumeration.
 *
 * LIMITATIONS — this is not a substitute for infrastructure-level protection:
 *  - State lives in the process, so each instance counts separately. Behind a
 *    load balancer the effective limit is (limit x instances).
 *  - It resets on deploy or restart.
 *  - It keys on a caller-supplied header (X-Forwarded-For), which only means
 *    anything behind a proxy that sets it truthfully.
 *
 * For production, put a real limiter (or a WAF rule) in front of the app. The
 * call sites here are written so swapping the implementation touches only this
 * file.
 */

interface Window {
  count: number;
  resetAt: number;
}

const windows = new Map<string, Window>();

/** Bound the map so a flood of unique keys cannot grow it without limit. */
const MAX_TRACKED_KEYS = 10_000;

function sweep(now: number): void {
  for (const [key, window] of windows) {
    if (window.resetAt <= now) windows.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  /** Seconds until the window resets; useful for a Retry-After header. */
  retryAfterSeconds: number;
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const existing = windows.get(key);

  if (!existing || existing.resetAt <= now) {
    if (windows.size >= MAX_TRACKED_KEYS) sweep(now);
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  existing.count += 1;

  if (existing.count > limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

/**
 * Best-effort caller identity for rate limiting.
 *
 * Only ever used as a throttling key — never for authorisation, and never
 * stored.
 */
export function rateLimitKeyFromHeaders(
  headers: Headers,
  scope: string,
): string {
  const forwarded = headers.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() ||
    headers.get("x-real-ip")?.trim() ||
    "unknown";
  return `${scope}:${ip.slice(0, 45)}`;
}

/**
 * In-memory fixed-window rate limiter.
 *
 * !! This does NOT survive a restart and does NOT coordinate across instances.
 * On Cloudflare Pages every request may be served by a different isolate, so in
 * production this limits almost nothing. Replace it with Cloudflare KV or a
 * Durable Object behind this same interface before the site is reachable.
 *
 * It is here so that the forms are rate limited by construction rather than by
 * intention, and so that swapping the backend is a one-file change.
 */
type Window = { count: number; resetAt: number };

const windows = new Map<string, Window>();

export type RateLimitResult = { allowed: boolean; remaining: number };

export function rateLimit(
  key: string,
  { limit = 5, windowMs = 600_000 }: { limit?: number; windowMs?: number } = {}
): RateLimitResult {
  const now = Date.now();

  // Opportunistic sweep. This sits ABOVE the early return on purpose.
  //
  // It used to sit below it, which made it unreachable under exactly the traffic
  // that grows the map fastest: a flood of unique keys always takes the
  // early-return branch, so the sweep only ran when an existing key was hit
  // again. Ordinary traffic cleaned up after itself; an attack did not.
  // Measured during audit 01 (F-11): 200 further new keys freed nothing, while a
  // single repeat hit on a live key freed 6.51 MB, at 279 bytes per entry.
  if (windows.size > 5_000) {
    for (const [k, w] of windows) if (now >= w.resetAt) windows.delete(k);
  }

  const existing = windows.get(key);

  if (!existing || now >= existing.resetAt) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  existing.count += 1;

  return {
    allowed: existing.count <= limit,
    remaining: Math.max(0, limit - existing.count)
  };
}

/**
 * The identity a limit is counted against.
 *
 * **Only `cf-connecting-ip` is trusted.** Cloudflare sets it at the edge and
 * strips any client-supplied copy, so it cannot be forged from outside.
 *
 * There used to be an `x-forwarded-for` fallback. It defeated the limiter
 * completely: that header is attacker-controlled, so one extra header per
 * request bought a fresh identity every time. Measured during audit 01 (F-04) --
 * 30 of 30 submissions accepted with the header rotated, against 5 of 12
 * without it. It is gone, and it should not come back.
 *
 * When no trusted identity is present the client is unidentifiable, so every
 * such request shares one bucket and they collectively get the ordinary
 * allowance. Failing closed is the right default for a form that accepts five
 * submissions per ten minutes; failing open is what the old fallback did.
 */
export function clientKey(headers: Headers, scope: string): string {
  const trusted = headers.get('cf-connecting-ip');
  if (trusted) return `${scope}:${trusted}`;

  // Local development never sits behind Cloudflare, so without this every dev
  // request would share the unidentified bucket and the form would lock after
  // five submissions. Keyed on NODE_ENV explicitly rather than on the absence of
  // a header, so the loosening cannot silently apply in production.
  if (process.env.NODE_ENV === 'development') {
    const forwarded = headers.get('x-forwarded-for')?.split(',')[0]?.trim();
    return `${scope}:dev:${forwarded ?? 'local'}`;
  }

  return `${scope}:unidentified`;
}

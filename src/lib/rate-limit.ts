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
  const existing = windows.get(key);

  if (!existing || now >= existing.resetAt) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  existing.count += 1;

  // Opportunistic sweep. Without it the map grows for the life of the process.
  if (windows.size > 5_000) {
    for (const [k, w] of windows) if (now >= w.resetAt) windows.delete(k);
  }

  return {
    allowed: existing.count <= limit,
    remaining: Math.max(0, limit - existing.count)
  };
}

/**
 * Cloudflare sets `cf-connecting-ip` and it cannot be spoofed by the client at
 * the edge. `x-forwarded-for` is the fallback for local development and any
 * other proxy; its first entry is the closest thing to a client address.
 */
export function clientKey(headers: Headers, scope: string): string {
  const ip =
    headers.get('cf-connecting-ip') ??
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown';
  return `${scope}:${ip}`;
}

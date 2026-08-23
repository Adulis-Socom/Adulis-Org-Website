/**
 * In-memory fixed-window rate limiter. **This is the backstop, not the primary
 * control. Do not delete it, and do not promote it back.**
 *
 * The primary control is Cloudflare's edge rate-limiting rules, configured in
 * the dashboard. That is the right layer for a form taking five submissions per
 * ten minutes: a refused request never reaches a function at all. It also closes
 * something this limiter cannot — a request refused here still costs a full page
 * render, measured at 66 req/s and a 33 KB response for traffic that is being
 * turned away anyway (security audit 01, F-12).
 *
 * This stays for any environment that is not behind Cloudflare: local
 * development, a preview host, or anywhere the origin is reachable directly.
 * With the F-04 and F-11 fixes applied it fails closed and evicts correctly.
 *
 * It is still per-process, so on Cloudflare each isolate keeps its own map and
 * the effective allowance multiplies by the number of live isolates (F-05, open
 * and not testable without a deployment). That is acceptable for a backstop in a
 * way it would not be for a primary control — which is exactly why the primary
 * moved to the edge rather than to KV.
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
 * !! OPERATIONAL CONSEQUENCE, worth knowing before it wastes an afternoon.
 * Nothing that is not behind Cloudflare sends `cf-connecting-ip` -- not CI, not
 * Playwright, not a local harness, not a staging box with a direct origin. In a
 * production build every such request therefore shares the single
 * `waitlist:unidentified` bucket, and the fifth submission in ten minutes is the
 * last one that works.
 *
 * This was not anticipated when the fail-closed change was written, and it
 * nearly caused this fix to be reverted: the first full QA run showed the F-13
 * no-JS gate failing in WebKit, which is exactly the symptom that gate watches
 * for. The cause was this bucket, not the Origin header. `tests/qa/fixtures.ts`
 * now gives each test its own identity.
 *
 * If an automated environment starts refusing submissions for no clear reason,
 * check this first.
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

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
 * !! CHECK THIS FIRST when an automated environment refuses submissions.
 *
 * It has already been misdiagnosed twice, and once it nearly caused this
 * correct security fix to be reverted. It is not a defect -- failing closed is
 * the right behaviour -- but it carries a standing tax on any environment that
 * is not behind Cloudflare, and that tax has now been paid three times.
 *
 * The mechanism: nothing outside Cloudflare sends `cf-connecting-ip` -- not CI,
 * not Playwright, not a local harness, not a staging box with a direct origin.
 * In a production build every such request therefore shares the single
 * `waitlist:unidentified` bucket, and the fifth submission in ten minutes is the
 * last one that works. The symptom is a generic error or an unexplained refusal,
 * on whichever test happens to run sixth.
 *
 * The three times, so the pattern is recognisable:
 *
 *   1. The first full QA run showed the F-13 no-JS gate failing in WebKit --
 *      exactly the symptom that gate exists to watch for. Reverting F-13 there
 *      would have looked correct and been wrong. The recorded
 *      `originHeaderPresent: true` is what settled it: the Origin header had
 *      been sent perfectly well, and rate limiting was the cause.
 *   2. A webkit keyboard test then failed in a full run and passed in isolation,
 *      because the per-test identity came from a module counter that Playwright
 *      resets when it restarts a worker after a failure.
 *   3. Every run before `tests/qa/fixtures.ts` existed, silently.
 *
 * `tests/qa/fixtures.ts` now derives a unique identity per test by hashing its
 * project, file and title, which is stable across worker restarts. Any new
 * harness needs the same thing. See `tests/qa/README.md`.
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

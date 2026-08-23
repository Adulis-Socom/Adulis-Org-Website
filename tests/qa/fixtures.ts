import { test as base } from '@playwright/test';

/**
 * Every test gets its own rate-limit identity.
 *
 * The waitlist action allows five submissions per ten minutes per client, and
 * `clientKey()` trusts only `cf-connecting-ip` (F-04). Playwright does not send
 * that header, so in a production build every request in the suite falls into
 * the single shared `waitlist:unidentified` bucket.
 *
 * Without this, the suite exhausts its own allowance and later tests fail for
 * reasons that have nothing to do with what they assert. That happened on the
 * first full run: the chromium project consumed the five, and the webkit no-JS
 * submission was refused — which read as an F-13 failure until the recorded
 * `originHeaderPresent: true` showed the Origin header had been sent perfectly
 * well and rate limiting was the actual cause.
 *
 * A unique per-test address keeps each test independent. It does not weaken
 * anything under test: the limiter is still enforced, just per test rather than
 * across the whole run, and the audit already measured the limiter's real
 * behaviour separately.
 */
/**
 * Derived from the test's own identity, not from a counter.
 *
 * A module-level counter looked fine and was not: Playwright restarts the worker
 * process after a failing test, which resets module state, so identities repeat
 * and colliding tests starve each other again. That surfaced as one webkit
 * keyboard test failing in the full run and passing in isolation — the same
 * shape of confusion the counter was added to prevent.
 *
 * Hashing the project name, file and title gives a stable, unique address per
 * test that survives worker restarts and does not depend on execution order.
 */
function identityFor(project: string, file: string, title: string): string {
  let h = 2166136261;
  for (const ch of `${project}|${file}|${title}`) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619) >>> 0;
  }
  // 10.x.y.z — private range, three octets of entropy, never .0 or .255.
  const a = ((h >>> 16) % 254) + 1;
  const b = ((h >>> 8) & 0xff) % 254 + 1;
  const c = (h & 0xff) % 254 + 1;
  return `10.${a}.${b}.${c}`;
}

export const test = base.extend({
  context: async ({ browser, contextOptions }, use, testInfo) => {
    const context = await browser.newContext({
      ...contextOptions,
      extraHTTPHeaders: {
        ...(contextOptions.extraHTTPHeaders ?? {}),
        'cf-connecting-ip': identityFor(testInfo.project.name, testInfo.file, testInfo.title)
      }
    });
    await use(context);
    await context.close();
  }
});

export const expect = base.expect;

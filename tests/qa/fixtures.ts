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
let counter = 0;

export const test = base.extend<{ rateLimitIdentity: string }>({
  rateLimitIdentity: async ({}, use) => {
    counter += 1;
    await use(`198.51.100.${counter % 250}`);
  },

  context: async ({ browser, contextOptions, rateLimitIdentity }, use, testInfo) => {
    const unique = `10.${testInfo.workerIndex % 250}.${(counter >> 8) % 250}.${counter % 250}`;
    const context = await browser.newContext({
      ...contextOptions,
      extraHTTPHeaders: {
        ...(contextOptions.extraHTTPHeaders ?? {}),
        'cf-connecting-ip': unique
      }
    });
    await use(context);
    await context.close();
  }
});

export const expect = base.expect;

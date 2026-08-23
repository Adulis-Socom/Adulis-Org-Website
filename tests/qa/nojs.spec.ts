import { test, expect } from './fixtures';
import { appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const ARTIFACTS = join(__dirname, '.artifacts');
function record(entry: unknown) {
  mkdirSync(ARTIFACTS, { recursive: true });
  appendFileSync(join(ARTIFACTS, 'nojs.jsonl'), JSON.stringify(entry) + '\n');
}

/**
 * §2.6 — JavaScript disabled, and the F-13 revert gate.
 *
 * Amendment 07 §3.5 made the waitlist action reject a request with no `Origin`
 * header. Some browsers have historically omitted `Origin` on **same-origin form
 * POSTs**, which is exactly this path. If a no-JS submission fails in either
 * engine, F-13 (`a775a2e`) is to be reverted rather than worked around — the
 * real abuse control is rate limiting.
 *
 * Runs in both chromium and webkit, because WebKit is what Safari uses and
 * Safari is the engine with the relevant history.
 */
test.use({ javaScriptEnabled: false });

test.describe('§2.6 JavaScript disabled', () => {
  test('page renders its content without JavaScript', async ({ page }) => {
    await page.goto('/en/for-sellers');
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('form')).toBeVisible();
    await expect(page.locator('footer')).toBeVisible();
  });

  test('the Second handle field is visible before hydration', async ({ page }) => {
    await page.goto('/en/for-sellers');
    // It starts visible and only narrows once hydrated. With JS off it must
    // never narrow, or a no-JS seller on two platforms cannot give the second
    // handle at all.
    await expect(page.locator('#secondHandle')).toBeVisible();
  });

  test('F-13 GATE: a valid submission succeeds with no JavaScript', async ({ page }, testInfo) => {
    const requests: { method: string; url: string; origin: string | undefined }[] = [];
    page.on('request', (r) => {
      if (r.method() === 'POST') {
        requests.push({ method: r.method(), url: r.url(), origin: r.headers()['origin'] });
      }
    });

    await page.goto('/en/for-sellers');

    await page.fill('#fullName', 'No JS Tester');
    await page.fill('#phone', '+251911223344');
    await page.selectOption('#platform', 'tiktok');
    await page.fill('#handle', '@nojs');
    await page.fill('#sells', 'clothing');
    await page.fill('#city', 'Addis Ababa');
    await page.check('#consent');

    await Promise.all([
      page.waitForLoadState('load'),
      page.locator('form button[type="submit"]').click()
    ]);
    await page.waitForTimeout(1200);

    const body = await page.content();
    // Rendered text only. waitlist.success.title and waitlist.errors.* both ship
    // in the client message payload on every page, so matching raw HTML reports
    // both a success and an error on the same response.
    const visible = body.replace(/<script[\s\S]*?<\/script>/g, '');
    const succeeded = /You are on the waitlist/.test(visible) && /ADL-WL-\d{2}-\d{4}/.test(visible);
    const genericError = /Something went wrong on our side/.test(visible);
    const rateLimited = /Too many applications from this connection/.test(visible);
    const originSent = requests.length > 0 ? requests[0].origin : undefined;

    record({
      engine: testInfo.project.name,
      check: 'no-JS valid submission',
      succeeded,
      genericError,
      rateLimited,
      postRequests: requests.length,
      originHeaderPresent: originSent !== undefined,
      originHeaderValue: originSent ?? null,
      reference: (visible.match(/ADL-WL-\d{2}-\d{4}/) ?? [null])[0]
    });

    // Distinguish the two ways this can fail. Only the first is an F-13 problem;
    // the second is the suite exhausting its own rate-limit allowance, which is
    // what the per-test identity in fixtures.ts exists to prevent.
    expect(
      rateLimited,
      `Rate limited, so this run says nothing about F-13. The per-test ` +
        `cf-connecting-ip in fixtures.ts is not taking effect.`
    ).toBe(false);

    expect(
      succeeded,
      `F-13 GATE FAILED in ${testInfo.project.name}. ` +
        `Origin header ${originSent === undefined ? 'was NOT sent' : `was "${originSent}"`}; ` +
        `generic error shown: ${genericError}. ` +
        'If Origin was absent, revert F-13 (a775a2e) rather than working around it. ' +
        'If Origin WAS sent, this is not an F-13 failure — find the real cause.'
    ).toBe(true);
  });

  test('server-side validation returns the error summary with no JavaScript', async ({ page }) => {
    await page.goto('/en/for-sellers');
    await Promise.all([
      page.waitForLoadState('load'),
      page.locator('form button[type="submit"]').click()
    ]);
    await page.waitForTimeout(800);

    const summary = page.locator('.error-summary');
    await expect(summary, 'no error summary rendered on an empty no-JS submission').toBeVisible();
    const links = summary.locator('ul li a');
    expect(await links.count(), 'error summary must be a list of links').toBeGreaterThan(0);
  });

  test('footer legal links resolve without JavaScript', async ({ page }) => {
    await page.goto('/en');
    for (const label of ['Terms', 'Privacy', 'Report content', 'Delete my account']) {
      const link = page.locator('footer a', { hasText: new RegExp(`^${label}$`) }).first();
      await expect(link, `${label} missing from the footer`).toHaveCount(1);
      const href = await link.getAttribute('href');
      const res = await page.request.get(href!);
      expect(res.status(), `${label} -> ${href} returned ${res.status()}`).toBe(200);
    }
  });
});

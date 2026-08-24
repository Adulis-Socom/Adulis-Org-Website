import { test, expect } from './fixtures';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { allPages, collectProblems } from './helpers';

/**
 * §2.1 — MISSING_MESSAGE and runtime errors.
 *
 * The highest-value check in the suite. The client payload carries only `nav`,
 * `waitlist` and `deleteAccount` (Amendment 02 §3.1). A client component
 * reaching for anything else throws at runtime, in front of a person — not at
 * build, not in typecheck, not in lint. Server-rendered branches are covered by
 * the build; interaction-only branches are covered here and nowhere else.
 */
const log: Record<string, { kind: string; text: string }[]> = {};

test.describe('§2.1 runtime console', () => {
  for (const p of allPages()) {
    test(`clean console: ${p.label}`, async ({ page }) => {
      const { all, problems } = collectProblems(page);
      await page.goto(p.url, { waitUntil: 'networkidle' });
      log[p.label] = all;
      expect(problems, `console problems on ${p.label}:\n${JSON.stringify(problems, null, 2)}`).toEqual([]);
    });
  }

  test('client boundaries: mobile menu, waitlist fields, validation error', async ({ page }) => {
    const { problems } = collectProblems(page);

    // Mobile menu open/close — Header is a client component using `nav`.
    await page.goto('/en', { waitUntil: 'networkidle' });
    const trigger = page.locator('header button[aria-controls]');
    await trigger.click();
    await expect(page.locator('header nav >> visible=true').last()).toBeVisible();
    // Opening the panel puts six prefetchable links in the viewport. Let them
    // settle before navigating, so the suite is not gratuitously cancelling
    // its own prefetches -- that noise is filtered in helpers.ts, but not
    // provoking it in the first place keeps the filter narrow.
    await page.waitForLoadState('networkidle');
    await page.keyboard.press('Escape');

    // Every waitlist field — WaitlistForm is a client component using `waitlist`.
    await page.goto('/en/for-sellers', { waitUntil: 'networkidle' });
    for (const id of ['fullName', 'phone', 'platform', 'handle', 'alsoSellOn', 'followers', 'sells', 'city']) {
      const el = page.locator(`#${id}`);
      if (await el.count()) await el.first().focus();
    }
    // Reveal the conditional second handle.
    await page.selectOption('#alsoSellOn', 'instagram').catch(() => {});
    await page.locator('#secondHandle').focus().catch(() => {});

    // Validation error state — exercises every error string.
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(1500);

    // Deletion page, as far as the flag allows.
    await page.goto('/en/delete-account', { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);
    await page.goto('/am/delete-account', { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);

    expect(problems, `console problems during interaction:\n${JSON.stringify(problems, null, 2)}`).toEqual([]);
  });

  test.afterAll(() => {
    const dir = join(__dirname, '.artifacts');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'console.json'), JSON.stringify(log, null, 2));
  });
});

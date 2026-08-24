import { test, expect } from './fixtures';
import { appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { allPages, focusIsVisible } from './helpers';

const ARTIFACTS = join(__dirname, '.artifacts');
function record(file: string, entry: unknown) {
  mkdirSync(ARTIFACTS, { recursive: true });
  appendFileSync(join(ARTIFACTS, file), JSON.stringify(entry) + '\n');
}

/** §2.5 — keyboard. */
test.describe('§2.5 keyboard', () => {
  /**
   * Chromium only, and this is an engine limitation rather than a narrowed
   * assertion.
   *
   * **WebKit omits `<a>` elements from the Tab order entirely.** Verified
   * directly: on /en/for-sellers, chromium tabs skip-link → wordmark → menu
   * button → anchor CTA → form fields, while webkit goes straight to the menu
   * button and then the form fields, reaching no link at all. That is Safari's
   * long-standing default — links are reachable only with Full Keyboard Access
   * enabled, or Option+Tab.
   *
   * So a link-focus assertion in webkit tests the engine's setting, not the
   * site. Real Safari with Full Keyboard Access on stays in the human checklist.
   */
  test('skip link is first, becomes visible, and moves focus to #main', async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name === 'webkit',
      'WebKit excludes links from the Tab order by default — see the comment above'
    );
    await page.goto('/en', { waitUntil: 'networkidle' });
    await page.keyboard.press('Tab');

    const first = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      const r = el?.getBoundingClientRect();
      return {
        tag: el?.tagName.toLowerCase(),
        text: (el?.textContent ?? '').trim(),
        href: el?.getAttribute('href'),
        w: Math.round(r?.width ?? 0),
        h: Math.round(r?.height ?? 0)
      };
    });

    expect(first.text, 'first tab stop is not the skip link').toContain('Skip to content');
    expect(first.href).toBe('#main');
    // sr-only until focused; on focus it must be a real, visible target.
    expect(first.w, `focused skip link is ${first.w}x${first.h}`).toBeGreaterThan(44);

    const visible = await focusIsVisible(page);
    expect(visible.ok, `skip link focus indicator: ${visible.reason}`).toBe(true);

    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);
    expect(page.url()).toContain('#main');
    await expect(page.locator('#main')).toHaveCount(1);
  });

  for (const p of allPages()) {
    test(`visible focus on every stop: ${p.label}`, async ({ page }, testInfo) => {
      await page.goto(p.url, { waitUntil: 'networkidle' });

      const invisible: { index: number; tag: string; reason: string }[] = [];
      const order: { index: number; tag: string; text: string; top: number; left: number }[] = [];

      for (let i = 0; i < 40; i++) {
        await page.keyboard.press('Tab');
        const still = await page.evaluate(() => document.activeElement?.tagName !== 'BODY');
        if (!still) break;

        const vis = await focusIsVisible(page);
        if (!vis.ok) invisible.push({ index: i, tag: vis.tag, reason: vis.reason });

        const pos = await page.evaluate(() => {
          const el = document.activeElement as HTMLElement | null;
          const r = el?.getBoundingClientRect();
          // Absolute document position, not viewport-relative. Tabbing scrolls
          // the page, so comparing rect.top across stops compares different
          // scroll states and reports jumps that are not there.
          return {
            tag: el?.tagName.toLowerCase() ?? '?',
            text: (el?.textContent ?? '').trim().slice(0, 30),
            top: Math.round((r?.top ?? 0) + window.scrollY),
            left: Math.round((r?.left ?? 0) + window.scrollX)
          };
        });
        order.push({ index: i, ...pos });
      }

      // Tab order should broadly follow visual order top-to-bottom. Reported,
      // not asserted: a two-column layout legitimately moves up when it wraps
      // to the second column, so a jump is a thing to look at, not a failure.
      const backward = order
        .map((o, i) => ({ o, prev: order[i - 1] }))
        .filter(({ o, prev }) => prev && o.top < prev.top - 24)
        .map(({ o, prev }) => `${prev.text} (${prev.top}) -> ${o.text} (${o.top})`);
      record('keyboard.jsonl', {
        key: `${testInfo.project.name} ${p.label}`,
        stops: order.length,
        invisible,
        backwardJumps: backward
      });

      expect(
        invisible,
        `${p.label}: focus not visible at ${invisible.length} stop(s):\n${JSON.stringify(invisible, null, 2)}`
      ).toEqual([]);
    });
  }

  test('error summary links move focus to the field they name', async ({ page }) => {
    await page.goto('/en/for-sellers', { waitUntil: 'networkidle' });
    await page.locator('form button[type="submit"]').click();

    const summary = page.locator('.error-summary');
    await expect(summary).toBeVisible();

    const links = summary.locator('ul li a');
    const count = await links.count();
    expect(count, 'error summary has no links — it must be a list of links, never a sentence').toBeGreaterThan(0);

    const mismatches: string[] = [];
    for (let i = 0; i < count; i++) {
      const href = await links.nth(i).getAttribute('href');
      const id = (href ?? '').replace('#', '');
      await links.nth(i).click();
      await page.waitForTimeout(120);
      const focused = await page.evaluate(() => document.activeElement?.id ?? '');
      if (focused !== id) mismatches.push(`${href} focused "${focused}" instead of "${id}"`);
    }
    expect(mismatches, `error summary focus mismatches:\n${mismatches.join('\n')}`).toEqual([]);
  });

  test('submit button stays enabled in the error state', async ({ page }) => {
    await page.goto('/en/for-sellers', { waitUntil: 'networkidle' });
    const submit = page.locator('form button[type="submit"]');
    await submit.click();
    await expect(page.locator('.error-summary')).toBeVisible();
    await expect(submit).toBeEnabled();
    await submit.focus();
    expect(await page.evaluate(() => document.activeElement?.tagName)).toBe('BUTTON');
  });
});

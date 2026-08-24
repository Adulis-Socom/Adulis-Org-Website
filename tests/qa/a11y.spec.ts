import { test, expect } from './fixtures';
import AxeBuilder from '@axe-core/playwright';
import { appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { allPages } from './helpers';

const ARTIFACTS = join(__dirname, '.artifacts');
function record(entry: unknown) {
  mkdirSync(ARTIFACTS, { recursive: true });
  appendFileSync(join(ARTIFACTS, 'axe.jsonl'), JSON.stringify(entry) + '\n');
}

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

async function scan(page: import('@playwright/test').Page, key: string) {
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  const violations = results.violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    help: v.help,
    nodes: v.nodes.slice(0, 4).map((n) => ({
      target: n.target.join(' '),
      summary: (n.failureSummary ?? '').split('\n').slice(0, 3).join(' ').slice(0, 220)
    }))
  }));
  record({ key, violations });
  return violations;
}

/**
 * §2.7 — axe, WCAG 2.1 AA, on all 30 pages plus three interactive states.
 *
 * Reported, not fixed. Amendment 08 §5.4 is explicit: fix nothing in this pass.
 */
test.describe('§2.7 accessibility', () => {
  for (const p of allPages()) {
    test(`axe: ${p.label}`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width: 360, height: 640 });
      await page.goto(p.url, { waitUntil: 'networkidle' });
      const v = await scan(page, `${testInfo.project.name} ${p.label}`);
      expect(v, `${p.label}: ${v.length} WCAG 2.1 AA violation(s)\n${JSON.stringify(v, null, 2)}`).toEqual([]);
    });
  }

  test('axe: waitlist error state', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await page.goto('/en/for-sellers', { waitUntil: 'networkidle' });
    await page.locator('form button[type="submit"]').click();
    await expect(page.locator('.error-summary')).toBeVisible();
    const v = await scan(page, `${testInfo.project.name} /en/for-sellers [error state]`);
    expect(v, `waitlist error state: ${v.length} violation(s)\n${JSON.stringify(v, null, 2)}`).toEqual([]);
  });

  test('axe: mobile menu open', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await page.goto('/en', { waitUntil: 'networkidle' });
    await page.locator('header button[aria-controls]').click();
    const v = await scan(page, `${testInfo.project.name} /en [menu open]`);
    expect(v, `mobile menu open: ${v.length} violation(s)\n${JSON.stringify(v, null, 2)}`).toEqual([]);
  });

  test('prefers-reduced-motion is respected', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/en', { waitUntil: 'networkidle' });
    const moving = await page.evaluate(() => {
      const bad: string[] = [];
      for (const el of Array.from(document.querySelectorAll<HTMLElement>('body *'))) {
        const s = getComputedStyle(el);
        const dur = parseFloat(s.transitionDuration || '0') + parseFloat(s.animationDuration || '0');
        if (dur > 0.05) bad.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 40)} ${s.transitionDuration}/${s.animationDuration}`);
      }
      return bad.slice(0, 10);
    });
    expect(moving, `elements still animating under prefers-reduced-motion:\n${moving.join('\n')}`).toEqual([]);
  });
});

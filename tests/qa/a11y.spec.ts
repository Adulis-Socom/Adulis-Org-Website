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

/**
 * `target-size` is tagged `wcag22aa` and ships DISABLED by default in axe-core
 * 4.13, so the "Suite + axe" claim for 44x44 targets was half true: only
 * `smallTargets()` enforced anything.
 *
 * It runs as its own pass rather than being folded into the scan above. Passing
 * `rules` through `.options()` alongside `.withTags()` **replaces `runOnly`
 * entirely**, so every axe rule runs — best-practice rules included — and the
 * scan silently stops being "WCAG 2.1 AA" and becomes "everything axe knows".
 * Widening a guarantee by accident is the same class of error as narrowing one.
 *
 * A separate `runOnly: rule` pass keeps both scopes exact.
 */
const TARGET_SIZE_ONLY = {
  runOnly: { type: 'rule' as const, values: ['target-size'] }
};

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
  /**
   * Two viewports, and the second is not padding.
   *
   * axe skips `display: none` subtrees. The primary navigation is
   * `hidden lg:block`, so pinning every scan to 360px meant **the desktop nav had
   * never been scanned at all** — nor the desktop CTA, nor the desktop Log in
   * link, nor anything else that exists only above the `lg` breakpoint. A
   * guarantee reading "WCAG 2.1 AA on every route" covered rather less than it
   * said, and a restyle touches desktop first.
   */
  for (const viewport of [
    { width: 360, height: 640, name: 'mobile' },
    { width: 1280, height: 900, name: 'desktop' }
  ]) {
    for (const p of allPages()) {
      test(`axe ${viewport.name}: ${p.label}`, async ({ page }, testInfo) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto(p.url, { waitUntil: 'networkidle' });
        const v = await scan(page, `${testInfo.project.name} ${viewport.name} ${p.label}`);
        expect(
          v,
          `${p.label} at ${viewport.name}: ${v.length} WCAG 2.1 AA violation(s)\n${JSON.stringify(v, null, 2)}`
        ).toEqual([]);
      });
    }
  }

  /**
   * The other half of the 44x44 guarantee, which previously enforced nothing.
   * `smallTargets()` measures geometry; this catches overlap, which geometry
   * cannot see.
   */
  for (const p of allPages()) {
    test(`target-size: ${p.label}`, async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 640 });
      await page.goto(p.url, { waitUntil: 'networkidle' });
      const results = await new AxeBuilder({ page }).options(TARGET_SIZE_ONLY).analyze();
      const v = results.violations.map((x) => ({
        id: x.id,
        nodes: x.nodes.slice(0, 4).map((n) => n.target.join(' '))
      }));
      expect(v, `${p.label}: target-size violations
${JSON.stringify(v, null, 2)}`).toEqual([]);
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

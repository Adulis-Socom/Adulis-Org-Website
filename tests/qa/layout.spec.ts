import { test, expect } from './fixtures';
import { appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { allPages, overflowReport, smallTargets } from './helpers';

const WIDTH = 360;
const SHOTS = join(__dirname, 'screenshots');
const ARTIFACTS = join(__dirname, '.artifacts');

/**
 * Appended per test, not accumulated in module state. Playwright restarts the
 * worker process after a failing test, which resets module state — the first
 * run of this suite lost 29 of 30 results that way and reported only the last.
 */
function record(file: string, entry: unknown) {
  mkdirSync(ARTIFACTS, { recursive: true });
  appendFileSync(join(ARTIFACTS, file), JSON.stringify(entry) + '\n');
}

/** §2.2 — layout at 360px, and §2.3 — touch targets. */
test.describe('§2.2 360px layout / §2.3 touch targets', () => {
  test.beforeAll(() => {
    mkdirSync(SHOTS, { recursive: true });
    mkdirSync(ARTIFACTS, { recursive: true });
  });

  for (const p of allPages()) {
    test(`360px: ${p.label}`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width: WIDTH, height: 640 });
      await page.goto(p.url, { waitUntil: 'networkidle' });

      const key = `${testInfo.project.name} ${p.label}`;

      const report = await overflowReport(page, WIDTH);
      record('overflow.jsonl', { key, ...report });

      const small = await smallTargets(page);
      record('touch-targets.jsonl', { key, small });

      // Screenshots are the artefact the human pass reviews, so they are taken
      // for every page regardless of pass or fail.
      const name = `${testInfo.project.name}${p.url.replace(/\//g, '_')}.png`;
      await page.screenshot({ path: join(SHOTS, name), fullPage: true });

      expect(
        report.horizontalScroll,
        `${p.label} scrolls horizontally: scrollWidth ${report.scrollWidth} > clientWidth ${report.clientWidth}`
      ).toBe(false);

      expect(
        report.offenders,
        `${p.label} has elements past ${WIDTH}px:\n${JSON.stringify(report.offenders, null, 2)}`
      ).toEqual([]);

      expect(
        small,
        `${p.label} has targets under 44x44:\n${JSON.stringify(small, null, 2)}`
      ).toEqual([]);
    });
  }

});

/**
 * The remaining responsive widths of WEB-MIG-002 §20, from the largest phones
 * to a wide desktop. English routes only: the 360px pass above walks both
 * locales, and `pseudo.spec.ts` stresses Ge'ez expansion. One test per width
 * keeps the run short while still naming every route that overflows.
 */
const WIDTHS = [390, 430, 768, 1024, 1280, 1440];

test.describe('§2.2 responsive widths', () => {
  for (const width of WIDTHS) {
    test(`${width}px: no page-level horizontal overflow on any English route`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      const failures: string[] = [];

      for (const p of allPages().filter((entry) => entry.locale === 'en')) {
        await page.goto(p.url, { waitUntil: 'networkidle' });
        const report = await overflowReport(page, width);
        if (report.horizontalScroll || report.offenders.length > 0) {
          failures.push(
            `${p.label}: scrollWidth ${report.scrollWidth} > ${report.clientWidth}; ` +
              JSON.stringify(report.offenders)
          );
        }
      }

      expect(failures, `overflow at ${width}px:\n${failures.join('\n')}`).toEqual([]);
    });
  }
});

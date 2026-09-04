import { test, expect } from './fixtures';
import { routePaths } from './helpers';

/**
 * ADU-WEB-03 G10 — layouts survive Ge'ez at +40%.
 *
 * **Outcome:** the Amharic site does not overflow, clip, or render boxes.
 *
 * ## Why this was previously unenforced
 *
 * `src/messages/am.json` is 782 bytes holding one string, so `/am` serves the
 * English fallback: **English length, Latin script, on every route.** The two
 * properties that actually break Ge'ez layouts — length and script — were both
 * untested, while the guarantee was listed as enforced.
 *
 * These run against a separate server instance carrying a generated catalogue
 * (~48% longer than English, padded with Ge'ez outside the switcher subset). The
 * real `/am` assertions elsewhere still run against the real catalogue.
 *
 * ## ⚠ What this is not
 *
 * **It is a proxy, and it does not clear the Ge'ez validation launch gate.**
 * Synthetic expansion differs from translation in word order, break
 * opportunities and idiomatic length — a real Amharic sentence can be shorter
 * than its English source and still break a layout my padding never touches.
 * What it closes is an untested assumption. A human pass over real strings is
 * still required.
 */

const PSEUDO_PORT = Number(process.env.QA_PSEUDO_PORT ?? 3211);
const base = (path: string) => `http://localhost:${PSEUDO_PORT}/am${path === '/' ? '' : path}`;

test.describe('§7 Ge’ez at +40%', () => {
  for (const path of routePaths()) {
    test(`${path} holds pseudo-Amharic without overflowing or clipping`, async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 640 });
      await page.goto(base(path), { waitUntil: 'networkidle' });

      const report = await page.evaluate(() => {
        const doc = document.documentElement;

        const clipped: { selector: string; scrollH: number; clientH: number; text: string }[] = [];
        const wide: { selector: string; right: number }[] = [];

        for (const el of Array.from(document.querySelectorAll<HTMLElement>('body *'))) {
          const s = getComputedStyle(el);
          if (s.display === 'none' || s.visibility === 'hidden') continue;
          const rect = el.getBoundingClientRect();
          const srOnly =
            (s.clipPath !== 'none' && s.clipPath !== '') ||
            s.clip !== 'auto' ||
            (rect.width <= 1 && rect.height <= 1);
          if (srOnly) continue;
          if (rect.right < 0) continue; // off-screen honeypot

          const text = (el.textContent ?? '').trim();
          const id = el.id ? `#${el.id}` : '';
          const cls =
            typeof el.className === 'string' && el.className.trim()
              ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.')
              : '';
          const selector = `${el.tagName.toLowerCase()}${id}${cls}`.slice(0, 70);

          const oy = s.overflowY;
          if ((oy === 'hidden' || oy === 'clip') && text && el.scrollHeight > el.clientHeight + 1) {
            clipped.push({
              selector,
              scrollH: el.scrollHeight,
              clientH: el.clientHeight,
              text: text.slice(0, 60)
            });
          }
          if (rect.right > 361) wide.push({ selector, right: Math.round(rect.right) });
        }

        return {
          horizontalScroll: doc.scrollWidth > doc.clientWidth,
          scrollWidth: doc.scrollWidth,
          clientWidth: doc.clientWidth,
          clipped: clipped.slice(0, 8),
          wide: wide.slice(0, 8)
        };
      });

      expect(
        report.horizontalScroll,
        `/am${path} at +40% Ge'ez scrolls horizontally: ${report.scrollWidth} > ${report.clientWidth}`
      ).toBe(false);

      expect(
        report.clipped,
        `/am${path} at +40% Ge'ez clips text:\n${JSON.stringify(report.clipped, null, 2)}`
      ).toEqual([]);

      expect(
        report.wide,
        `/am${path} at +40% Ge'ez has elements past 360px:\n${JSON.stringify(report.wide, null, 2)}`
      ).toEqual([]);
    });
  }

  /**
   * The script half of the guarantee. Length alone would pass with Latin padding,
   * and a page full of missing-glyph boxes would look fine to every geometric
   * assertion above — boxes have width.
   */
  test('the Ethiopic face actually loads, so Ge’ez is not rendered as boxes', async ({ page }) => {
    await page.goto(base('/'), { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);

    const state = await page.evaluate(() => ({
      // A codepoint the padding uses and the switcher subset does not contain.
      ethiopicReady: document.fonts.check('16px "Noto Sans Ethiopic"', 'ሐ'),
      faces: Array.from(document.fonts)
        .filter((f) => /ethiopic/i.test(f.family))
        .map((f) => ({ family: f.family, status: f.status }))
    }));

    expect(
      state.faces.some((f) => f.status === 'loaded' && !/switcher/i.test(f.family)),
      `no full Ethiopic face loaded on the pseudo-Amharic build. Ge'ez would render ` +
        `as missing-glyph boxes, and every geometric check above would still pass ` +
        `because boxes have width.\n${JSON.stringify(state, null, 2)}`
    ).toBe(true);
  });

  test('the pseudo catalogue is actually in use, not the English fallback', async ({ page }) => {
    await page.goto(base('/'), { waitUntil: 'networkidle' });
    const body = await page.locator('body').innerText();
    // If the generator or the loader silently failed, every assertion above
    // would pass against ordinary English text and prove nothing.
    expect(
      /[ሀ-፿]/.test(body),
      'no Ge’ez on the page — the pseudo catalogue did not load and these tests proved nothing'
    ).toBe(true);
  });
});

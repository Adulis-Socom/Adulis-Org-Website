import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';

/**
 * ADU-WEB-03 — a keyboard user can see where they are. Asserted in pixels.
 *
 * ## Why this replaces the property inspection
 *
 * The focus ring has now failed three ways, and a guard passed every time:
 *
 * | Failure | Why the guard passed |
 * |---|---|
 * | Ink inner ring on an ink button | Two colour stops present, both merged with what they touched |
 * | Zero-spread offset layer | Colour present, pixels absent |
 * | `outline-none` leaving a transparent outline in Safari | Outline present, alpha zero |
 *
 * Each measured the presence of *something* — a colour, a layer, an outline.
 * The guarantee is not that a declaration exists. It is that focusing an
 * element **changes what is on the screen around it**.
 *
 * So: screenshot the element unfocused, focus it, screenshot again, and require
 * a real difference in the band immediately outside its bounds. All three
 * failures above produce no difference in that band, and no property
 * inspection is involved at any point.
 *
 * ## Why this needs no pinned container, unlike G11
 *
 * G11 compares against a **committed baseline**, so it has to be drawn by the
 * same browser on the same fonts. This compares two screenshots taken seconds
 * apart in the same browser on the same page — the platform cancels out. That
 * is what lets it run in the ordinary suite, in both engines, on every route
 * where a control lives, rather than in a container job.
 *
 * ## The band, and the interior
 *
 * The ring occupies roughly 0–4px outside the element: a 2px paper shadow, then
 * a 2px ink outline at 2px offset. The band measured is 0–8px outside, which
 * covers it with room to spare.
 *
 * The interior is measured too, and is *not* asserted — it is reported so a
 * failure can distinguish "nothing painted anywhere" from "something painted,
 * but only inside", which is what a fill-only focus style would do.
 */

/** How far outside the element to look. */
const BAND = 8;

/**
 * Decoding happens **in the page**, using the browser's own PNG decoder via an
 * Image and a canvas. That avoids adding an image library to the test tree, and
 * `page.evaluate` is not subject to the site's CSP the way an injected script
 * tag would be — the same reason every computed-style helper here works.
 */
async function ringDelta(page: Page, selector: string) {
  const el = page.locator(selector).first();
  await el.scrollIntoViewIfNeeded();

  const box = await el.boundingBox();
  if (!box) throw new Error(`${selector} has no box`);

  const clip = {
    x: Math.max(0, Math.floor(box.x) - BAND),
    y: Math.max(0, Math.floor(box.y) - BAND),
    width: Math.ceil(box.width) + BAND * 2,
    height: Math.ceil(box.height) + BAND * 2
  };

  // `caret: 'hide'` matters: focusing a text input paints a blinking caret
  // INSIDE the element, which would otherwise register as a change and let a
  // ring that paints nothing at all pass on a text field.
  const before = (await page.screenshot({ clip, caret: 'hide', animations: 'disabled' })).toString('base64');
  await el.focus();
  const after = (await page.screenshot({ clip, caret: 'hide', animations: 'disabled' })).toString('base64');

  // The element's rect relative to the clip, so the band and the interior can
  // be told apart inside the image.
  const inner = {
    x: box.x - clip.x,
    y: box.y - clip.y,
    width: box.width,
    height: box.height
  };

  return page.evaluate(
    async ([a, b, rect, clipWidth]) => {
      const load = (data: string) =>
        new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = 'data:image/png;base64,' + data;
        });

      const pixels = async (data: string) => {
        const img = await load(data);
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        return { data: ctx.getImageData(0, 0, canvas.width, canvas.height), w: canvas.width, h: canvas.height };
      };

      const A = await pixels(a as string);
      const B = await pixels(b as string);
      if (A.w !== B.w || A.h !== B.h) return { band: 0, interior: 0, bandPixels: 0, note: 'size mismatch' };

      // ⚠ The screenshot is in DEVICE pixels; the rect is in CSS pixels. WebKit
      // runs this suite at deviceScaleFactor 2 and chromium at 1, so without
      // this the element's rect lands at a quarter of its true area in the
      // image, most of the interior counts as band, and the ratio is diluted to
      // roughly a twelfth of its real value. Measured before the fix: 6.2% on a
      // ring that actually covers about half the band.
      const scale = A.w / (clipWidth as number);
      const raw = rect as { x: number; y: number; width: number; height: number };
      const r = {
        x: raw.x * scale,
        y: raw.y * scale,
        width: raw.width * scale,
        height: raw.height * scale
      };
      let bandTotal = 0;
      let bandChanged = 0;
      let interiorTotal = 0;
      let interiorChanged = 0;

      for (let y = 0; y < A.h; y++) {
        for (let x = 0; x < A.w; x++) {
          const i = (y * A.w + x) * 4;
          // 12 per channel absorbs subpixel antialiasing without absorbing a
          // ring: paper against ink is 200+ on every channel.
          const changed =
            Math.abs(A.data.data[i] - B.data.data[i]) > 12 ||
            Math.abs(A.data.data[i + 1] - B.data.data[i + 1]) > 12 ||
            Math.abs(A.data.data[i + 2] - B.data.data[i + 2]) > 12;

          const insideElement =
            x >= r.x - 0.5 && x <= r.x + r.width + 0.5 && y >= r.y - 0.5 && y <= r.y + r.height + 0.5;

          if (insideElement) {
            interiorTotal++;
            if (changed) interiorChanged++;
          } else {
            bandTotal++;
            if (changed) bandChanged++;
          }
        }
      }

      return {
        band: bandTotal ? Number((bandChanged / bandTotal).toFixed(4)) : 0,
        interior: interiorTotal ? Number((interiorChanged / interiorTotal).toFixed(4)) : 0,
        bandPixels: bandChanged,
        note: ''
      };
    },
    [before, after, inner, clip.width] as const
  );
}

/**
 * Measured, not guessed — the third failure mode in §0 of docs/enforcement.md.
 *
 * | | Band changed |
 * |---|---|
 * | **Signal** — the ring as built, 14 cases, both engines | **21.1% – 45.8%** |
 * | **Noise** — the ring reduced to a transparent outline, the exact Safari failure | **0.0%, zero pixels, all 14** |
 *
 * There is no middle ground to tune against. All three historical failures
 * paint nothing outside the element, so they land on exactly zero, and a
 * working ring never came within a factor of two of this threshold. 0.10 sits
 * at half the weakest real signal and infinitely above the floor.
 *
 * The interior was 0.0%–3.7% throughout, which is the cross-check: the ring
 * paints outside the element, as a ring must. A focus style that only filled
 * the element would show the opposite and would fail this.
 */
const MIN_BAND_CHANGE = 0.1;

test.describe('§7 focus is visible in pixels, not in properties', () => {
  const CASES = [
    { route: '/en', selector: 'header a[href="/en"]', what: 'the wordmark link' },
    { route: '/en/for-sellers', selector: '#fullName', what: 'a text input' },
    { route: '/en/for-sellers', selector: '#platform', what: 'a native select' },
    { route: '/en/for-sellers', selector: '#consent', what: 'a native checkbox' },
    { route: '/en/for-sellers', selector: 'button[type="submit"]', what: 'the primary button' },
    { route: '/en/for-sellers', selector: 'a.btn-secondary', what: 'a secondary button' },
    { route: '/en/help', selector: 'details summary', what: 'an accordion summary' }
  ];

  for (const c of CASES) {
    test(`${c.what} changes the pixels around it when focused`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto(c.route, { waitUntil: 'networkidle' });

      const d = await ringDelta(page, c.selector);

      expect(
        d.band,
        `${c.what} (${c.selector}) on ${c.route}: focusing it changed ${(d.band * 100).toFixed(1)}% ` +
          `of the 8px band around it (${d.bandPixels} pixels), and ${(d.interior * 100).toFixed(1)}% ` +
          `of its interior. A focus indicator that paints nothing outside the element cannot be ` +
          `seen against a surface of its own colour. ${d.note}`
      ).toBeGreaterThanOrEqual(MIN_BAND_CHANGE);
    });
  }
});

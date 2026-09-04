import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';

/**
 * §7 — properties a visual redesign must not destroy.
 *
 * These are written BEFORE the restyle, deliberately. A test written afterwards
 * only ratifies whatever the restyle produced; written now, against the current
 * design, it can be observed failing — which is the only way to know it asserts
 * anything.
 *
 * Both tests here exist because a check that runs, passes, and asserts the
 * *wrong thing* has already happened twice on this project: a "no fixed height"
 * source check that was never written, and `focusIsVisible()`, which passes on
 * any non-`none` box-shadow and would go green on a focus ring the same colour
 * as its background.
 *
 * So both assert **computed contrast and rendered size**, never presence in the
 * DOM. Presence is not visibility.
 */

/** Injected into the page: WCAG relative luminance and contrast ratio. */
const CONTRAST_HELPERS = `
  function parseColour(value) {
    const m = String(value).match(/rgba?\\(([^)]+)\\)/);
    if (!m) return null;
    const parts = m[1].split(/[\\s,\\/]+/).filter(Boolean).map(Number);
    if (parts.length < 3 || parts.some(Number.isNaN)) return null;
    // A fully transparent colour is not a visible stop.
    if (parts.length > 3 && parts[3] === 0) return null;
    return [parts[0], parts[1], parts[2]];
  }
  function luminance(rgb) {
    const f = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(rgb[0]) + 0.7152 * f(rgb[1]) + 0.0722 * f(rgb[2]);
  }
  function contrast(a, b) {
    const l = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (l[0] + 0.05) / (l[1] + 0.05);
  }
  function effectiveBackground(el) {
    let node = el;
    while (node && node !== document.documentElement) {
      const c = parseColour(getComputedStyle(node).backgroundColor);
      if (c) return c;
      node = node.parentElement;
    }
    return [255, 255, 255];
  }
`;

/**
 * The EXAMPLE badge marks an illustrative seller card as illustrative.
 *
 * It is a truthfulness control, not wireframe scaffolding — the seller name,
 * price, stock time and order count on those cards are invented, and the badge
 * is the only thing that says so. A visual pass that tones it down until it
 * stops registering removes that, and nothing else on the site would notice.
 */
async function badgeAudit(page: Page) {
  return page.evaluate(
    `(() => {
      ${CONTRAST_HELPERS}
      return Array.from(document.querySelectorAll('.badge-example')).map((el) => {
        const rect = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        const fg = parseColour(style.color);
        const bg = effectiveBackground(el);
        return {
          text: (el.textContent || '').trim(),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          fontSize: parseFloat(style.fontSize),
          opacity: parseFloat(style.opacity),
          visibility: style.visibility,
          display: style.display,
          contrast: fg ? Number(contrast(fg, bg).toFixed(2)) : 0
        };
      });
    })()`
  ) as Promise<
    {
      text: string;
      width: number;
      height: number;
      fontSize: number;
      opacity: number;
      visibility: string;
      display: string;
      contrast: number;
    }[]
  >;
}

test.describe('§7 the EXAMPLE marker survives a restyle', () => {
  for (const route of ['/en', '/en/how-it-works']) {
    test(`${route}: every EXAMPLE badge is rendered and legible`, async ({ page }) => {
      await page.goto(route, { waitUntil: 'networkidle' });
      const badges = await badgeAudit(page);

      expect(badges.length, `${route} renders no EXAMPLE badge at all`).toBeGreaterThan(0);

      for (const b of badges) {
        expect(b.text, 'an EXAMPLE badge with no text marks nothing').not.toBe('');
        expect(b.width, `badge "${b.text}" has zero width`).toBeGreaterThan(0);
        expect(b.height, `badge "${b.text}" has zero height`).toBeGreaterThan(0);
        expect(b.visibility, `badge "${b.text}" is not visible`).not.toBe('hidden');
        expect(b.display, `badge "${b.text}" is display:none`).not.toBe('none');
        expect(b.opacity, `badge "${b.text}" is faded to ${b.opacity}`).toBeGreaterThan(0.8);

        // Small text, so the AA body threshold applies. Toning the badge down
        // until it stops registering is exactly the failure this guards.
        expect(
          b.contrast,
          `badge "${b.text}" is ${b.contrast}:1 against its background — below the 4.5 a marker this size needs`
        ).toBeGreaterThanOrEqual(4.5);
      }
    });
  }
});

/**
 * §3 of the token rulings: the focus indicator must be **dual-tone**.
 *
 * A single-tone ring has to know what it sits on. Components on this site move
 * between two visual registers by design, so a contextual token would need every
 * surface to declare its context correctly — and would fail silently when one
 * did not. Two stops are visible on any background without knowing where they
 * are.
 *
 * ⚠ This replaces a presence check. `focusIsVisible()` returns ok for any
 * non-`none` box-shadow, so an ink ring on an ink surface passes it while being
 * completely invisible. Asserting **two stops with contrast between them** holds
 * without the test knowing anything about context, and fails loudly if someone
 * collapses the ring to one tone.
 */
async function focusStops(page: Page) {
  return page.evaluate(
    `(() => {
      ${CONTRAST_HELPERS}
      const el = document.activeElement;
      if (!el || el === document.body) return { stops: [], best: 0, tag: 'none' };

      const style = getComputedStyle(el);
      const raw = [];
      const shadow = style.boxShadow;
      if (shadow && shadow !== 'none') {
        // Split on commas that are NOT inside rgb(...), so each shadow layer is
        // handled whole.
        const layers = shadow.split(/,(?![^(]*\\))/);
        for (const layer of layers) {
          const colour = (layer.match(/rgba?\\([^)]+\\)/) || [])[0];
          if (!colour) continue;
          // A layer with no blur and no spread paints nothing. Counting it as a
          // stop is how a collapsed ring passes a test that only counts colours
          // — Tailwind still emits the offset layer at 0px when the offset is
          // removed, so the colour is present and the pixels are not.
          const lengths = (layer.replace(colour, '').match(/-?[\\d.]+px/g) || []).map(parseFloat);
          const blur = lengths[2] || 0;
          const spread = lengths[3] || 0;
          if (blur > 0 || spread > 0) raw.push(colour);
        }
      }
      if (style.outlineStyle !== 'none' && parseFloat(style.outlineWidth || '0') > 0) {
        raw.push(style.outlineColor);
      }

      const stops = raw.map(parseColour).filter(Boolean);
      let best = 0;
      for (let i = 0; i < stops.length; i++) {
        for (let j = i + 1; j < stops.length; j++) {
          best = Math.max(best, contrast(stops[i], stops[j]));
        }
      }
      return {
        stops: stops.map((s) => 'rgb(' + s.join(',') + ')'),
        best: Number(best.toFixed(2)),
        tag: el.tagName.toLowerCase() + (el.id ? '#' + el.id : '')
      };
    })()`
  ) as Promise<{ stops: string[]; best: number; tag: string }>;
}

test.describe('§7 the focus indicator is dual-tone', () => {
  const CASES = [
    { route: '/en', selector: 'header a[href="/en"]', what: 'the wordmark link' },
    { route: '/en/for-sellers', selector: '#fullName', what: 'a text input' },
    { route: '/en/for-sellers', selector: 'button[type="submit"]', what: 'the submit button' },
    { route: '/en/help', selector: 'details summary', what: 'an accordion summary' }
  ];

  for (const c of CASES) {
    test(`${c.what} shows two contrasting stops when focused`, async ({ page }) => {
      await page.goto(c.route, { waitUntil: 'networkidle' });
      await page.locator(c.selector).first().focus();

      const f = await focusStops(page);
      expect(f.stops.length, `${c.what}: focus produced no colour stops at all`).toBeGreaterThanOrEqual(2);
      expect(
        f.best,
        `${c.what} (${f.tag}): best stop pair is ${f.best}:1 across ${JSON.stringify(f.stops)} — ` +
          `a single-tone ring is invisible on a surface of its own colour`
      ).toBeGreaterThanOrEqual(3);
    });
  }
});

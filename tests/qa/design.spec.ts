import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';
import { allPages } from './helpers';

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
      let layers = [];
      if (shadow && shadow !== 'none') {
        // Split on commas that are NOT inside rgb(...), so each shadow layer is
        // handled whole.
        layers = shadow.split(/,(?![^(]*\\))/);
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

      // The two edges of the ring. Layers sort by spread: the smallest touches
      // the element, the largest touches whatever surrounds it.
      const bySpread = [];
      for (const layer of layers) {
        const colour = (layer.match(/rgba?\\([^)]+\\)/) || [])[0];
        const c = colour && parseColour(colour);
        if (!c) continue;
        const lengths = (layer.replace(colour, '').match(/-?[\\d.]+px/g) || []).map(parseFloat);
        const spread = lengths[3] || 0;
        if ((lengths[2] || 0) > 0 || spread > 0) bySpread.push({ spread, c });
      }
      bySpread.sort((a, b) => a.spread - b.spread);
      const inner = bySpread.length ? bySpread[0].c : null;
      // An outline sits outside every shadow layer, so when one is drawn it is
      // the outer edge. The ring's ink stop is an outline on purpose: WebKit
      // paints no author box-shadow on native checkboxes and selects.
      const outlineColour =
        style.outlineStyle !== 'none' && parseFloat(style.outlineWidth || '0') > 0
          ? parseColour(style.outlineColor)
          : null;
      const outer = outlineColour || (bySpread.length ? bySpread[bySpread.length - 1].c : null);
      const elementBg = effectiveBackground(el);
      const pageBg = el.parentElement ? effectiveBackground(el.parentElement) : [255, 255, 255];

      return {
        stops: stops.map((s) => 'rgb(' + s.join(',') + ')'),
        best: Number(best.toFixed(2)),
        innerVsElement: inner ? Number(contrast(inner, elementBg).toFixed(2)) : 0,
        outerVsPage: outer ? Number(contrast(outer, pageBg).toFixed(2)) : 0,
        elementBg: 'rgb(' + elementBg.join(',') + ')',
        tag: el.tagName.toLowerCase() + (el.id ? '#' + el.id : '')
      };
    })()`
  ) as Promise<{
    stops: string[];
    best: number;
    innerVsElement: number;
    outerVsPage: number;
    elementBg: string;
    tag: string;
  }>;
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

      // Work order §1.2: the ring must contrast with the ELEMENT, not only with
      // the surface. Two stops that contrast with each other still vanish when
      // the inner one matches the element and the outer one matches the page —
      // an ink-inner ring on the ink CTA, on paper, is exactly that.
      //
      // Asserted as "at least one edge is visible": the inner stop against the
      // element's own background, or the outer stop against what surrounds it.
      // Not "the inner stop alone": no single fixed ring can put a contrasting
      // inner tone against both a paper input and an ink button, and the ruling
      // that made the ring dual-tone was that it must not need to know its
      // context. Either edge visible is what a person sees; both merging is the
      // failure.
      expect(
        Math.max(f.innerVsElement, f.outerVsPage),
        `${c.what} (${f.tag}): the ring merges on both edges — inner stop ${f.innerVsElement}:1 ` +
          `against the element (${f.elementBg}), outer stop ${f.outerVsPage}:1 against the page. ` +
          `Paper inner, ink outer is the order that holds on every element`
      ).toBeGreaterThanOrEqual(3);
    });
  }
});

/**
 * ADU-WEB-03 G2 — no text is visually truncated.
 *
 * **Outcome:** no sentence is cut off; no card clips its own body copy.
 *
 * This replaces "no container has a fixed height", which had no enforcement and
 * was wrongly stated anyway — a fixed-aspect photo box and a 44px minimum
 * control were never violations. What actually failed twice in review was
 * reserved emptiness and clipped copy, and both are the same observable: an
 * element whose content is taller than the box it is allowed to occupy, with no
 * way to reach the rest.
 *
 * The exploit this exists for is the dangerous kind. An equal-height card grid
 * with `line-clamp-3` clips body copy on most pages **while the layout metrics
 * improve** — shorter cards mean a shorter document and fewer overflow
 * opportunities, so every number the QA report cites as evidence gets better as
 * the guarantee breaks.
 *
 * It also hides the Amharic problem rather than revealing it: a card that fits
 * three lines in English is four or five in Ge'ez, and a fixed box makes that
 * invisible instead of obvious.
 */
async function clippedText(page: Page) {
  return page.evaluate(() => {
    const bad: { selector: string; overflow: string; scrollH: number; clientH: number; text: string }[] = [];

    for (const el of Array.from(document.querySelectorAll<HTMLElement>('body *'))) {
      const s = getComputedStyle(el);

      // Only hidden and clip conceal content. auto and scroll are legitimate
      // scroll containers — content beyond the box is still reachable.
      const oy = s.overflowY;
      if (oy !== 'hidden' && oy !== 'clip') continue;

      // Screen-reader-only content is clipped on purpose and is not truncation.
      // Same exclusion smallTargets() uses, for the same reason.
      const rect = el.getBoundingClientRect();
      const srOnly =
        (s.clipPath !== 'none' && s.clipPath !== '') ||
        s.clip !== 'auto' ||
        (rect.width <= 1 && rect.height <= 1);
      if (srOnly) continue;

      if (s.display === 'none' || s.visibility === 'hidden') continue;

      // Must actually bear text. A decorative box clipping a gradient is not a
      // truncated sentence.
      const text = (el.textContent ?? '').trim();
      if (!text) continue;

      // Sub-pixel rounding produces scrollHeight one greater than clientHeight
      // on elements that are not clipped at all, so a 1px tolerance is required
      // or this reports every rounded box on the page.
      if (el.scrollHeight > el.clientHeight + 1) {
        const id = el.id ? `#${el.id}` : '';
        const cls =
          typeof el.className === 'string' && el.className.trim()
            ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.')
            : '';
        bad.push({
          selector: `${el.tagName.toLowerCase()}${id}${cls}`.slice(0, 90),
          overflow: oy,
          scrollH: el.scrollHeight,
          clientH: el.clientHeight,
          text: text.slice(0, 70)
        });
      }
    }
    return bad.slice(0, 10);
  });
}

test.describe('§7 no text is visually truncated', () => {
  for (const viewport of [
    { width: 360, height: 640, name: '360px' },
    { width: 1280, height: 900, name: 'desktop' }
  ]) {
    for (const p of allPages()) {
      test(`${viewport.name}: ${p.label} clips no text`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto(p.url, { waitUntil: 'networkidle' });
        const clipped = await clippedText(page);
        expect(
          clipped,
          `${p.label} at ${viewport.name} clips text:
${JSON.stringify(clipped, null, 2)}`
        ).toEqual([]);
      });
    }
  }
});

/**
 * ADU-WEB-03 G8 — the font stack resolves Latin-first.
 *
 * **Outcome:** Latin characters and digits render from the Latin face; only
 * Ge'ez falls through to Ethiopic.
 *
 * ⚠ This property has failed twice, and `check:font` caught neither, because it
 * asserts a different property — that the committed subset contains glyphs for
 * four codepoints. Both failures were in the cascade, not the font file:
 *
 *   1. A `:root` fallback naming `'Noto Sans Ethiopic'`. `next/font/google`
 *      preserves the real family name, so the "local fallback" matched the
 *      loaded webfont and every English page pulled 198 KB through it.
 *   2. A `:root` rule outranking `next/font`'s generated class, so the subset
 *      was never used at all and the switcher label rendered from a locally
 *      installed face — correct on the developer's machine, four boxes on the
 *      target device.
 *
 * Both looked right in review. Neither would have been caught by anything.
 */
test.describe('§7 the font stack resolves Latin-first', () => {
  test('body text names the Latin family before any Ethiopic family', async ({ page }) => {
    await page.goto('/en', { waitUntil: 'networkidle' });

    const stack = await page.evaluate(() => {
      const el = document.querySelector('p, h1, body') as HTMLElement;
      return getComputedStyle(el).fontFamily;
    });

    const families = stack.split(',').map((f) => f.trim().replace(/^['"]|['"]$/g, ''));
    const latin = families.findIndex((f) => /inter/i.test(f));
    const ethiopic = families.findIndex((f) => /ethiopic|nyala/i.test(f));

    expect(latin, `no Latin family in the stack: ${stack}`).toBeGreaterThanOrEqual(0);
    if (ethiopic >= 0) {
      expect(
        latin,
        `Ethiopic is resolved before Latin — digits, ADULIS, TikTok and Instagram ` +
          `would render from a face that has no glyphs for them.\n  stack: ${stack}`
      ).toBeLessThan(ethiopic);
    }
  });

  test('every Ethiopic @font-face is restricted by unicode-range', async ({ page }) => {
    await page.goto('/en', { waitUntil: 'networkidle' });

    const faces = await page.evaluate(() => {
      const out: { family: string; range: string }[] = [];
      for (const sheet of Array.from(document.styleSheets)) {
        let rules: CSSRuleList;
        try {
          rules = sheet.cssRules;
        } catch {
          continue; // cross-origin sheet; there are none here, but be safe
        }
        for (const rule of Array.from(rules)) {
          if (rule.constructor.name !== 'CSSFontFaceRule') continue;
          const style = (rule as CSSFontFaceRule).style;
          const family = (style.getPropertyValue('font-family') || '').replace(/['"]/g, '').trim();
          if (!/ethiopic/i.test(family)) continue;
          const src = style.getPropertyValue('src') || '';
          // next/font emits a metric-adjust face per family — `src: local(Arial)`
          // with ascent/descent overrides, named "<family> Fallback". It fetches
          // nothing, so a unicode-range on it would restrict nothing. Only faces
          // that can pull a file are in scope.
          if (!/url\(/.test(src)) continue;
          out.push({ family, range: (style.getPropertyValue('unicode-range') || '').trim() });
        }
      }
      return out;
    });

    expect(faces.length, 'no Ethiopic @font-face found at all').toBeGreaterThan(0);

    for (const f of faces) {
      // A face with no unicode-range is offered for every character, which is
      // how an Ethiopic file ends up serving Latin text — or being fetched on a
      // page with no Ge'ez on it.
      expect(f.range, `${f.family} has no unicode-range — it would apply to all text`).not.toBe('');

      // Parse properly: entries are `u+1200-1399`, `u+030e`, or `u+00??`.
      const spans: [number, number][] = [];
      for (const entry of f.range.split(',').map((e) => e.trim().toLowerCase())) {
        const m = entry.match(/^u\+([0-9a-f?]+)(?:-([0-9a-f]+))?$/);
        if (!m) continue;
        if (m[1].includes('?')) {
          spans.push([parseInt(m[1].replace(/\?/g, '0'), 16), parseInt(m[1].replace(/\?/g, 'f'), 16)]);
        } else {
          const lo = parseInt(m[1], 16);
          spans.push([lo, m[2] ? parseInt(m[2], 16) : lo]);
        }
      }
      expect(spans.length, `${f.family} unicode-range parsed to nothing: ${f.range}`).toBeGreaterThan(0);

      /**
       * ⚠ ADU-WEB-03 G8 says the Ethiopic face must be "restricted to Ethiopic
       * blocks". That is not true of a correct build, and asserting it fails on
       * legitimate typography — reported rather than coded around.
       *
       * `next/font` emits SEVERAL faces under the family `Noto Sans Ethiopic`:
       * Google ships latin, latin-ext, cyrillic, greek and vietnamese subsets of
       * that family alongside the Ethiopic one. Each is a separate file with its
       * own range, so the family legitimately declares `u+00??`. The face also
       * legitimately claims U+030E, a combining mark Ethiopic uses.
       *
       * What actually protects the outcome is two other things, both asserted:
       * the stack resolves Latin first (test above), and no Ethiopic face is
       * offered unrestricted. Plus G9 — /en downloads no Ethiopic file at all —
       * which the browser enforces from these very ranges.
       *
       * The one face that MUST be Ethiopic-only is the switcher subset, because
       * its whole purpose is to serve four glyphs and nothing else. If its range
       * widened, an English page would start fetching it for Latin text.
       */
      const isSubset = /switcher/i.test(f.family);
      if (!isSubset) continue;

      for (const [lo, hi] of spans) {
        const ethiopic =
          (lo >= 0x1200 && hi <= 0x139f) ||
          (lo >= 0x2d80 && hi <= 0x2ddf) ||
          (lo >= 0xab00 && hi <= 0xab2f) ||
          (lo >= 0x1e7e0 && hi <= 0x1e7ff) ||
          (lo >= 0x0300 && hi <= 0x036f); // combining marks Ethiopic uses
        expect(
          ethiopic,
          `the switcher subset claims U+${lo.toString(16).toUpperCase()}-U+${hi.toString(16).toUpperCase()}, ` +
            `outside Ethiopic. It exists to serve four glyphs; a wider range means ` +
            `English pages start fetching it.`
        ).toBe(true);
      }
    }
  });
});

/**
 * The self-policing property, which nothing asserted.
 *
 * ⚠ G9 ("/en never downloads the Ethiopic file") passes today for a reason that
 * will stop being true: with `AM_ENABLED` false the switcher does not render, so
 * **no Ge'ez appears on any English page at all** and no Ethiopic file is fetched
 * whatever the CSS says. Verified — re-introducing the `:root` variable that
 * caused the original 198 KB regression does not fail G9.
 *
 * So the incident that shipped once is currently invisible to the suite, and
 * becomes live again the moment the flag flips.
 *
 * This asserts the property directly instead: Ge'ez that is NOT one of the
 * switcher's four codepoints must resolve to nothing on an English page. That
 * holds in both flag states, and it fails immediately if a `:root` variable ever
 * names the full webfont family again.
 */
test.describe('§7 stray Ge\u2019ez on an English page fetches nothing', () => {
  test('/en does not pull a font file for Ge\u2019ez outside the switcher subset', async ({ page }) => {
    const fetched: number[] = [];
    page.on('response', async (r) => {
      if (!/\.woff2?(\?|$)/i.test(r.url())) return;
      try {
        fetched.push((await r.body()).length);
      } catch {
        /* body discarded */
      }
    });

    await page.goto('/en', { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);
    const before = fetched.reduce((a, b) => a + b, 0);

    // Ge'ez deliberately outside U+121B, U+122D, U+129B, U+12A0.
    await page.evaluate(() => {
      const el = document.createElement('p');
      // Every codepoint here is deliberately OUTSIDE U+121B, U+122D, U+129B,
      // U+12A0. An earlier version ended in "\u1275\u130d\u122d\u129b" (Tigrinya), whose last
      // two characters are IN the subset \u2014 so the test failed at 2,648 bytes and
      // was right to. It caught its own test data.
      el.textContent = '\u1245\u1295\u1245 \u1230\u120b\u121d \u1218\u133d\u1210\u134d';
      el.style.fontSize = '32px';
      document.body.appendChild(el);
    });
    await page.waitForTimeout(1500);

    const added = fetched.reduce((a, b) => a + b, 0) - before;
    expect(
      added,
      `injecting Ge'ez into /en pulled ${added} bytes of font. It must pull nothing — ` +
        `stray Ge'ez on an English page renders as boxes by design, and that is the ` +
        `signal that something is on a page it does not belong on. A :root variable ` +
        `naming 'Noto Sans Ethiopic' defeats this and costs 198 KB on every English view.`
    ).toBe(0);
  });
});

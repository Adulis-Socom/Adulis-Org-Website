import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ConsoleMessage, Page } from '@playwright/test';

const ROOT = join(__dirname, '..', '..');

/**
 * Route paths read straight out of src/lib/routes.ts, never restated here.
 * The same rule as scripts/check-routes.mjs: a second list is a list that drifts.
 */
export function routePaths(): string[] {
  const source = readFileSync(join(ROOT, 'src/lib/routes.ts'), 'utf8');
  const block = source.slice(
    source.indexOf('export const ROUTES'),
    source.indexOf('} as const')
  );
  return [...block.matchAll(/:\s*'([^']+)'/g)].map((m) => m[1]);
}

export const LOCALES = ['en', 'am'] as const;

/**
 * Every page under test: 15 routes x 2 locales, **plus the 404**.
 *
 * The 404 is not a ROUTES entry — it has no path of its own, being whatever
 * `[...rest]` catches — so `routePaths()` never yielded it and every page-walking
 * spec silently skipped it. That is 60 layout measurements, 30 axe scans and
 * every console check missing the one page a redesign is most likely to give an
 * oversized display numeral. `clamp(14rem, 26vw, 20rem)` on "404" renders 441px
 * wide in a 312px content box, and nothing would have failed.
 */
export function allPages(): { locale: string; path: string; url: string; label: string }[] {
  const out: { locale: string; path: string; url: string; label: string }[] = [];
  for (const locale of LOCALES) {
    for (const path of routePaths()) {
      const url = `/${locale}${path === '/' ? '' : path}`;
      out.push({ locale, path, url, label: url });
    }
    // Any path that does not exist renders [locale]/not-found.tsx.
    out.push({ locale, path: '/not-found', url: `/${locale}/__not-found__`, label: `/${locale} [404]` });
  }
  return out;
}

export type PageProblem = { kind: string; text: string };

/**
 * Attaches console and error listeners before navigation and returns everything
 * collected. `MISSING_MESSAGE` is the one this suite exists for: the client
 * payload carries only nav, waitlist and deleteAccount (Amendment 02 §3.1), so a
 * client component reaching outside those throws at runtime, in front of a
 * person, and nothing in the build catches it.
 */
export function collectProblems(page: Page) {
  const all: PageProblem[] = [];
  const problems: PageProblem[] = [];

  const record = (kind: string, text: string) => {
    all.push({ kind, text });
    const isProblem =
      /MISSING_MESSAGE/i.test(text) ||
      /IntlError/i.test(text) ||
      /Minified React error|Warning: .*(did not match|Hydration)/i.test(text) ||
      kind === 'pageerror' ||
      kind === 'error';
    const isNoise =
      // Favicon 404s and similar network noise are not what this is looking for.
      /favicon|net::ERR_ABORTED.*favicon/i.test(text) ||
      // Next cancels in-flight RSC prefetches when a navigation starts, logs
      // this, and falls back to a full browser navigation. It is self-healing
      // by design and a real person triggers it any time they tap a link while
      // a prefetch is still running.
      //
      // It surfaced only on CI, in webkit: opening the mobile menu prefetches
      // all six nav links, and the test navigated away before they settled.
      // Deliberately matched on the whole message rather than on "Failed to
      // fetch" alone, so a genuine failed request still trips the check.
      /Failed to fetch RSC payload for .*Falling back to browser navigation/i.test(text) ||
      // A 404 page is REACHED by a request that returns 404, and the browser
      // logs that. It is the page working correctly. Matched narrowly on the
      // status so a genuinely missing subresource elsewhere still trips this.
      /Failed to load resource: the server responded with a status of 404/i.test(text);

    if (isProblem && !isNoise) problems.push({ kind, text });
  };

  page.on('console', (m: ConsoleMessage) => record(m.type(), m.text()));
  page.on('pageerror', (e) => record('pageerror', e.message));

  return { all, problems };
}

/** Horizontal overflow and any element sticking out past the viewport. */
export async function overflowReport(page: Page, width: number) {
  return page.evaluate((w) => {
    const doc = document.documentElement;
    const offenders: { selector: string; right: number; width: number }[] = [];
    for (const el of Array.from(document.querySelectorAll<HTMLElement>('body *'))) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      const style = getComputedStyle(el);
      if (style.visibility === 'hidden' || style.display === 'none') continue;
      // Off-screen honeypot is deliberate, not an overflow.
      if (r.right < 0) continue;
      if (r.right > w + 1) {
        const id = el.id ? `#${el.id}` : '';
        const cls = el.className && typeof el.className === 'string'
          ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.')
          : '';
        offenders.push({
          selector: `${el.tagName.toLowerCase()}${id}${cls}`.slice(0, 90),
          right: Math.round(r.right),
          width: Math.round(r.width)
        });
      }
    }
    return {
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      horizontalScroll: doc.scrollWidth > doc.clientWidth,
      offenders: offenders.slice(0, 12)
    };
  }, width);
}

/** Interactive elements smaller than the 44x44 minimum. */
export async function smallTargets(page: Page, min = 44) {
  return page.evaluate((m) => {
    const sel = 'a[href], button, input, select, textarea, [role="button"], [tabindex]:not([tabindex="-1"])';
    const bad: { selector: string; w: number; h: number; text: string }[] = [];
    for (const el of Array.from(document.querySelectorAll<HTMLElement>(sel))) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      const style = getComputedStyle(el);
      if (style.visibility === 'hidden' || style.display === 'none') continue;
      if (r.right < 0) continue; // off-screen honeypot
      // Screen-reader-only elements are clipped to 1px until focused. The skip
      // link is the case here: measuring it unfocused reports 1x1, which is the
      // measurement working correctly on an element that is not on screen. Its
      // focused size is asserted separately in the keyboard spec.
      const clipped =
        (style.clipPath !== 'none' && style.clipPath !== '') ||
        style.clip !== 'auto' ||
        (r.width <= 1 && r.height <= 1);
      if (clipped) continue;
      // An inline link inside a paragraph is text, not a tap target; the 44px
      // rule is about controls. Treat a link whose parent is a text block and
      // which sits on a shared line as inline.
      const isInlineLink =
        el.tagName === 'A' && style.display === 'inline' && (el.textContent ?? '').length > 0;
      if (isInlineLink) continue;

      // A form control with an associated label is activated by clicking the
      // label too, so the real target is the union of the two. Measuring the
      // raw <input> understates it — the consent checkbox is 20x20 while its
      // effective target is the whole consent line. Ruled accepted in Build
      // Amendment 09 §3.2; encoded here so the harness agrees with the ruling
      // rather than re-reporting it every run.
      let effective = { width: r.width, height: r.height };
      if (el.id) {
        const label = document.querySelector<HTMLElement>(`label[for="${CSS.escape(el.id)}"]`);
        if (label) {
          const lr = label.getBoundingClientRect();
          if (lr.width > 0 || lr.height > 0) {
            const top = Math.min(r.top, lr.top);
            const left = Math.min(r.left, lr.left);
            effective = {
              width: Math.max(r.right, lr.right) - left,
              height: Math.max(r.bottom, lr.bottom) - top
            };
          }
        }
      }
      if (effective.width >= m && effective.height >= m) continue;

      if (r.width < m || r.height < m) {
        const id = el.id ? `#${el.id}` : '';
        bad.push({
          selector: `${el.tagName.toLowerCase()}${id}`,
          w: Math.round(r.width),
          h: Math.round(r.height),
          text: (el.textContent ?? '').trim().slice(0, 40)
        });
      }
    }
    return bad;
  }, min);
}

/** Whether the focused element has a visible focus indicator. */
export async function focusIsVisible(page: Page) {
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el || el === document.body) return { ok: false, tag: 'none', reason: 'no focused element' };
    const s = getComputedStyle(el);
    // A transparent outline is not a visible one. Tailwind's `outline-none`
    // leaves `2px solid transparent` behind, and for two checkpoints this
    // check counted it — which is how a ring WebKit never painted on native
    // checkboxes and selects passed in both engines.
    const transparent = /rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*0\s*\)|transparent/i.test(s.outlineColor);
    const outline =
      s.outlineStyle !== 'none' && parseFloat(s.outlineWidth || '0') > 0 && !transparent;
    const ring = s.boxShadow !== 'none' && s.boxShadow.length > 0;
    const id = el.id ? `#${el.id}` : '';
    return {
      ok: outline || ring,
      tag: `${el.tagName.toLowerCase()}${id}`,
      reason: outline ? 'outline' : ring ? 'box-shadow ring' : 'neither outline nor ring'
    };
  });
}

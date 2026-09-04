import { test, expect } from './fixtures';
import { appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { allPages } from './helpers';

const ARTIFACTS = join(__dirname, '.artifacts');
function record(file: string, entry: unknown) {
  mkdirSync(ARTIFACTS, { recursive: true });
  appendFileSync(join(ARTIFACTS, file), JSON.stringify(entry) + '\n');
}

/**
 * §2.8 — headers, read from a real response rather than from next.config.mjs.
 *
 * ⚠ These come from `next start`. Whether they survive to Cloudflare Pages
 * depends on the adapter, and there is no `_headers` file in the repo. That is
 * a deployment check, not something this suite can answer — see
 * docs/manual-qa.md §8.
 */
const EXPECTED: Record<string, RegExp> = {
  'content-security-policy': /default-src 'self'/,
  'permissions-policy': /camera=\(\)/,
  'cross-origin-opener-policy': /same-origin/,
  'cross-origin-resource-policy': /same-origin/,
  'x-content-type-options': /nosniff/,
  'x-frame-options': /DENY/,
  'referrer-policy': /strict-origin-when-cross-origin/,
  'strict-transport-security': /max-age=\d+/
};

const CSP_DIRECTIVES = [
  "default-src 'self'",
  "style-src 'self'",
  "font-src 'self'",
  "img-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  "object-src 'none'"
];

test.describe('§2.8 security headers', () => {
  test('every header arrives on every route', async ({ request }) => {
    const missing: string[] = [];
    for (const p of allPages()) {
      const res = await request.get(p.url);
      const h = res.headers();
      for (const [name, pattern] of Object.entries(EXPECTED)) {
        const value = h[name];
        if (!value) missing.push(`${p.url}: ${name} absent`);
        else if (!pattern.test(value)) missing.push(`${p.url}: ${name} = "${value}"`);
      }
    }
    expect(missing, `header problems:\n${missing.slice(0, 20).join('\n')}`).toEqual([]);
  });

  test('CSP carries every directive', async ({ request }) => {
    const res = await request.get('/en');
    const csp = res.headers()['content-security-policy'] ?? '';
    record('headers.jsonl', { csp, all: res.headers() });
    const absent = CSP_DIRECTIVES.filter((d) => !csp.includes(d));
    expect(absent, `CSP missing directives: ${absent.join(' | ')}\ngot: ${csp}`).toEqual([]);
  });

  test("script-src carries a nonce and no 'unsafe-inline'", async ({ request }) => {
    const csp = (await request.get('/en')).headers()['content-security-policy'] ?? '';
    const scriptSrc = (csp.split(';').find((d) => d.trim().startsWith('script-src')) ?? '').trim();
    expect(scriptSrc, `script-src was "${scriptSrc}"`).toMatch(/'nonce-[A-Za-z0-9+/=]{16,}'/);
    expect(scriptSrc, `script-src was "${scriptSrc}"`).not.toContain("'unsafe-inline'");
    expect(scriptSrc, `script-src was "${scriptSrc}"`).not.toContain("'unsafe-eval'");
  });

  test('the nonce is per-request, not a build constant', async ({ request }) => {
    const nonceOf = async () => {
      const csp = (await request.get('/en')).headers()['content-security-policy'] ?? '';
      return (csp.match(/'nonce-([A-Za-z0-9+/=]+)'/) ?? [])[1] ?? '';
    };
    const a = await nonceOf();
    const b = await nonceOf();
    expect(a, 'no nonce in CSP').not.toBe('');
    expect(a, 'the same nonce came back twice - it is baked in, not generated').not.toBe(b);
  });

  /**
   * The guard for `export const dynamic = 'force-dynamic'` in the locale layout.
   *
   * Remove that line and every server-side check here still passes: the header
   * keeps its nonce, the directives are all present. But the prerendered HTML
   * carries no nonce attribute, so under `'strict-dynamic'` the browser blocks
   * every script and the site silently stops working. Measured before the line
   * existed: 0 of 29 script tags nonced. This test is the only thing standing
   * between that change and production.
   */
  test('every inline script carries the nonce from its own response', async ({ request }) => {
    for (const url of ['/en', '/am', '/en/for-sellers']) {
      const res = await request.get(url);
      const csp = res.headers()['content-security-policy'] ?? '';
      const headerNonce = (csp.match(/'nonce-([A-Za-z0-9+/=]+)'/) ?? [])[1] ?? '';
      const html = await res.text();
      const scripts = html.match(/<script(?![a-zA-Z])[^>]*>/g) ?? [];
      const inline = scripts.filter((t) => !/ src=/.test(t));
      expect(inline.length, `${url} served no inline scripts at all`).toBeGreaterThan(0);
      const unnonced = inline.filter((t) => !t.includes(`nonce="${headerNonce}"`));
      expect(
        unnonced.length,
        `${url}: ${unnonced.length} of ${inline.length} inline scripts lack the response nonce. ` +
          `Has force-dynamic been removed from the locale layout?\nfirst: ${unnonced[0] ?? ''}`
      ).toBe(0);
    }
  });

  /**
   * The guard for `upgrade-insecure-requests`, which must not be sent on http.
   *
   * That directive rewrites http subresource URLs to https. Over http://localhost
   * nothing is listening on https, so every stylesheet and chunk fails with an
   * SSL error -- and **no CSP violation is logged**, because nothing was blocked
   * by policy; the requests were reissued to a port that is not there. Chromium
   * exempts localhost and showed nothing at all. WebKit does not, and 74 tests
   * failed with symptoms that look like layout and hydration bugs: a 36px menu
   * trigger, aria-expanded stuck at false.
   *
   * Asserting on requests rather than on console output is the point. The
   * violation test above passed throughout.
   */
  test('every subresource actually loads', async ({ page }) => {
    const failed: string[] = [];
    page.on('requestfailed', (r) => failed.push(`${r.url()} <- ${r.failure()?.errorText ?? ''}`));
    await page.goto('/en/for-sellers', { waitUntil: 'load' });
    await page.waitForTimeout(1500);
    // An aborted request is a cancellation, not a failure. Next prefetches RSC
    // payloads for links in view and cancels them when the page tears down, which
    // surfaced as a one-off failure in a full run and passed in isolation.
    //
    // Filtering aborts does not weaken the guard: the bug this test exists for
    // produces "SSL connect error" on stylesheets and chunks, never an abort.
    const real = failed.filter((f) => !/favicon/i.test(f) && !/ERR_ABORTED|cancelled|canceled/i.test(f));
    expect(real, `failed subresource requests:\n${real.slice(0, 6).join('\n')}`).toEqual([]);
  });

  test('upgrade-insecure-requests is absent over http', async ({ request, baseURL }) => {
    const csp = (await request.get('/en')).headers()['content-security-policy'] ?? '';
    if ((baseURL ?? '').startsWith('https:')) {
      expect(csp).toContain('upgrade-insecure-requests');
    } else {
      expect(csp, 'sent over http, where it breaks every subresource').not.toContain(
        'upgrade-insecure-requests'
      );
    }
  });

  test('a real browser reports no CSP violation', async ({ page }) => {
    const violations: string[] = [];
    page.on('console', (m) => {
      if (/Content Security Policy|Refused to (execute|load|apply)/i.test(m.text())) violations.push(m.text());
    });
    page.on('pageerror', (e) => {
      if (/Content Security Policy/i.test(e.message)) violations.push(e.message);
    });
    await page.goto('/en/for-sellers', { waitUntil: 'networkidle' });
    expect(violations, `CSP violations:\n${violations.join('\n')}`).toEqual([]);
  });

  test('HSTS does NOT carry preload', async ({ request }) => {
    const res = await request.get('/en');
    const hsts = res.headers()['strict-transport-security'] ?? '';
    expect(hsts, `HSTS is "${hsts}"`).not.toContain('preload');
    expect(hsts).toContain('includeSubDomains');
  });
});

/** §2.9 — fonts. */
test.describe('§2.9 fonts', () => {
  for (const locale of ['en', 'am']) {
    test(`no Ethiopic font requested on /${locale}`, async ({ page }) => {
      const fonts: string[] = [];
      page.on('request', (r) => {
        const u = r.url();
        if (/\.(woff2?|ttf|otf)(\?|$)/.test(u)) fonts.push(u);
      });

      await page.goto(`/${locale}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(600);

      // Identify which of the emitted faces is the Ethiopic one by asking the
      // document, rather than guessing from hashed filenames.
      const ethiopicFaces = await page.evaluate(() =>
        Array.from(document.fonts)
          .filter((f) => /ethiopic/i.test(f.family))
          .map((f) => ({ family: f.family, status: f.status, unicodeRange: f.unicodeRange.slice(0, 60) }))
      );
      const loadedEthiopic = ethiopicFaces.filter((f) => f.status === 'loaded');

      record('fonts.jsonl', {
        locale,
        fontRequests: fonts,
        ethiopicFacesDeclared: ethiopicFaces.length,
        ethiopicFacesLoaded: loadedEthiopic
      });

      // The subset face is legitimate and will load on English routes as soon as
      // AM_ENABLED flips, because the switcher label is Ge'ez. What must never
      // load is the full 198 KB face. Assert on that, not on "any Ethiopic".
      const fullFace = loadedEthiopic.filter((f) => !/switcher/i.test(f.family));
      expect(
        fullFace,
        `/${locale} loaded the FULL Ethiopic face:\n${JSON.stringify(fullFace, null, 2)}`
      ).toEqual([]);
    });
  }

  /**
   * The byte budget, which is what the two-face split actually buys.
   *
   * The full Ethiopic face is 198,028 bytes and the switcher subset is 2,648.
   * Before the split, an English page with the switcher visible pulled 246,460
   * bytes of font; after it, 51,080.
   *
   * This failed once for a reason no amount of reading would have found: a
   * `:root` fallback in globals.css named 'Noto Sans Ethiopic', which is the
   * real family name next/font/google registers, so the "fallback" matched the
   * webfont and every English page downloaded the whole face. The route-scoped
   * variable was working perfectly the entire time.
   */
  test('English routes stay inside the font byte budget', async ({ page }) => {
    const sizes: { url: string; bytes: number }[] = [];
    page.on('response', async (r) => {
      if (!/\.(woff2?|ttf|otf)(\?|$)/.test(r.url())) return;
      try {
        sizes.push({ url: r.url().split('/').pop() ?? '', bytes: (await r.body()).length });
      } catch {
        /* body already discarded; ignore */
      }
    });
    await page.goto('/en/for-sellers', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);

    const total = sizes.reduce((a, s) => a + s.bytes, 0);
    const biggest = sizes.reduce((a, s) => Math.max(a, s.bytes), 0);
    record('fonts.jsonl', { budget: true, total, files: sizes });

    // Any single file near 198 KB is the full Ethiopic face by another name.
    expect(
      biggest,
      `largest font file was ${biggest} bytes — the full Ethiopic face is 198,028`
    ).toBeLessThan(100_000);
    expect(total, `total font bytes on /en: ${total}\n${JSON.stringify(sizes)}`).toBeLessThan(80_000);
  });

  /**
   * The display face — Phase C. Two things can go wrong silently: it fails to
   * load and headings render from Inter (nobody notices, because Inter is a
   * fine face), or it loads with a wider subset than declared and every English
   * page pays for glyphs no heading uses. `check:font` guards the declaration;
   * this measures what a browser actually got.
   */
  test('the display face loads on /en, Latin-only, one weight', async ({ page }) => {
    await page.goto('/en', { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);

    // Not the metric-adjusted local stand-in next/font also registers as
    // "Instrument Sans Fallback": it is a local face, always loaded, weight
    // normal, and it failed this test in both engines on a correct build.
    const faces = await page.evaluate(() =>
      Array.from(document.fonts)
        .filter((f) => /instrument/i.test(f.family) && !/fallback/i.test(f.family))
        .map((f) => ({ family: f.family, weight: f.weight, status: f.status, unicodeRange: f.unicodeRange }))
    );
    const loaded = faces.filter((f) => f.status === 'loaded');
    record('fonts.jsonl', { displayFace: faces });

    expect(loaded.length, `no Instrument Sans face loaded on /en:\n${JSON.stringify(faces, null, 2)}`).toBeGreaterThan(0);
    for (const f of loaded) {
      expect(f.weight, `display face loaded at weight ${f.weight}; only 600 is declared`).toBe('600');
      // Latin ranges only. An Ethiopic block here would mean the display stack
      // is drawing Ge'ez from a face that has none — boxes.
      //
      // Four hex digits, bounded. A looser `U\+13` matched U+131 — dotless i,
      // squarely Latin — and failed a correct face on the first run.
      expect(
        /U\+1[23][0-9A-F]{2}\b|U\+2D[89A-D][0-9A-F]\b|U\+AB[0-2][0-9A-F]\b/i.test(f.unicodeRange),
        `display face claims an Ethiopic range: ${f.unicodeRange}`
      ).toBe(false);
    }

    // And headings actually resolve to it. A computed family that starts with
    // the Inter variable means the display class never reached the element.
    const h1Family = await page.evaluate(() => getComputedStyle(document.querySelector('h1')!).fontFamily);
    expect(h1Family, `h1 font-family is "${h1Family}"`).toMatch(/instrument/i);
  });

  test('no Google Fonts origin is contacted at runtime', async ({ page }) => {
    const external: string[] = [];
    page.on('request', (r) => {
      const u = new URL(r.url());
      if (u.hostname !== 'localhost' && u.hostname !== '127.0.0.1') external.push(r.url());
    });
    await page.goto('/en', { waitUntil: 'networkidle' });
    await page.goto('/en/for-sellers', { waitUntil: 'networkidle' });
    expect(external, `off-origin requests:\n${external.join('\n')}`).toEqual([]);
  });
});

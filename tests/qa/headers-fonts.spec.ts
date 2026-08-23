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
  "script-src 'self' 'unsafe-inline'",
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

  test('CSP carries every directive from Amendment 07 §4', async ({ request }) => {
    const res = await request.get('/en');
    const csp = res.headers()['content-security-policy'] ?? '';
    record('headers.jsonl', { csp, all: res.headers() });
    const absent = CSP_DIRECTIVES.filter((d) => !csp.includes(d));
    expect(absent, `CSP missing directives: ${absent.join(' | ')}\ngot: ${csp}`).toEqual([]);
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

      expect(
        loadedEthiopic,
        `/${locale} loaded an Ethiopic face:\n${JSON.stringify(loadedEthiopic, null, 2)}`
      ).toEqual([]);
    });
  }

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

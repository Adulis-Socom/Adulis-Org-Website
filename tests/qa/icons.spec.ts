import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { test, expect } from './fixtures';

/**
 * Work order §4.2 — the favicon pipeline, without the artwork.
 *
 * The icon commission has not landed, and a placeholder icon cannot be visibly
 * flagged the way an UNDECIDED legal body can: it silently becomes the brand
 * mark. So the site ships **no icon at all** and takes a deliberate 404 — see
 * docs/engineering-notes.md.
 *
 * What this asserts is the path, so the artwork drops in without a code change:
 *
 *   - while `src/app/icon.svg` is absent, `/icon.svg` and `/favicon.ico` are a
 *     clean 404 and no page advertises an icon that is not there;
 *   - the moment the file exists, Next's file convention serves it, the HTML
 *     links it, and this same test flips to asserting 200.
 *
 * The expectation is read from the filesystem rather than hard-coded, because a
 * test that has to be edited on the day the artwork arrives is a test somebody
 * forgets. The 404 branch is the one running today; the 200 branch was proven
 * by dropping a temporary SVG in, running this, and removing it again — the
 * check:assets guard confirms SVG never touches sharp.
 */
const APP = join(__dirname, '..', '..', 'src', 'app');

const ICONS = [
  { file: 'icon.svg', url: '/icon.svg', type: /image\/svg\+xml/, rel: 'icon' },
  { file: 'apple-icon.png', url: '/apple-icon.png', type: /image\/png/, rel: 'apple-touch-icon' }
] as const;

test.describe('§4.2 icon pipeline', () => {
  for (const icon of ICONS) {
    const present = existsSync(join(APP, icon.file));

    test(`${icon.url} — ${present ? 'served, because the artwork exists' : 'a deliberate 404, because it does not'}`, async ({
      request
    }) => {
      const res = await request.get(icon.url);
      if (present) {
        expect(res.status(), `${icon.url} exists in src/app but did not serve`).toBe(200);
        expect(res.headers()['content-type'] ?? '', `${icon.url} content-type`).toMatch(icon.type);
      } else {
        // Clean, not a redirect and not a 200 with an HTML body pretending to
        // be an image. Anything but 404 here is a placeholder of some kind.
        expect(res.status(), `${icon.url}: no artwork exists, so this must be a plain 404`).toBe(404);
      }
    });

    test(`/en ${present ? 'links' : 'does not advertise'} ${icon.url}`, async ({ request }) => {
      const html = await (await request.get('/en')).text();
      const links = html.match(new RegExp(`<link[^>]*rel="${icon.rel}"[^>]*>`, 'g')) ?? [];
      if (present) {
        expect(links.length, `no <link rel="${icon.rel}"> on /en although ${icon.file} exists`).toBeGreaterThan(0);
      } else {
        // A link to a missing icon is a 404 on every page load, dressed up as
        // a feature. The deliberate 404 is the browser's own /favicon.ico probe
        // and nothing else.
        expect(links, `/en advertises an icon that does not exist: ${links.join(' ')}`).toEqual([]);
      }
    });
  }

  test('/favicon.ico follows the artwork', async ({ request }) => {
    // Next serves /favicon.ico only from an explicit `src/app/favicon.ico`.
    // With none, and with no icon.svg either, the probe 404s cleanly. This is
    // the request every browser makes unasked, so it is the one a reviewer sees
    // in the console — on purpose, until the artwork lands.
    const present = existsSync(join(APP, 'favicon.ico'));
    const res = await request.get('/favicon.ico');
    expect(res.status()).toBe(present ? 200 : 404);
  });
});

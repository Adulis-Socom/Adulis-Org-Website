import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test, expect } from './fixtures';
import { allPages } from './helpers';

/**
 * ADU-WEB-03 G14 — no visitor ever reads a message key as body copy.
 *
 * ## Why Checkpoint 1's fallback test does not cover this
 *
 * That test proved a key missing from `am.json` falls back to English, and no
 * raw key path renders. It holds in one direction only. A key missing from
 * **`en.json`** has nothing to fall back to, and `next-intl` in production does
 * not throw — it logs and renders the key path itself. That is exactly what the
 * deletion journey found: `phone.intro` as a paragraph, `deleteAccount.otp.resend`
 * on a button, and every other assertion green because none of them read the
 * prose.
 *
 * With 567 strings across sixteen routes, any future copy work can reintroduce
 * it, and nothing in the build catches it.
 *
 * ## Why the check is anchored to the catalogue's own keys
 *
 * A generic dotted-identifier pattern false-positives on `adulis.example` and on
 * any domain in the contact copy. Reading the top-level namespaces out of
 * `en.json` at test time is precise, and cannot drift from the catalogue: a new
 * namespace is covered the moment it exists.
 *
 * What counts as visible: rendered text, input placeholders, and `<option>`
 * labels — `innerText` misses the last two, and a missing key renders in both.
 */
const CATALOGUE = join(__dirname, '..', '..', 'src', 'messages', 'en.json');

function topLevelKeys(): string[] {
  const keys = Object.keys(JSON.parse(readFileSync(CATALOGUE, 'utf8')) as Record<string, unknown>);
  // A namespace list this short means the file was not read. Fail loudly rather
  // than assert nothing against an empty pattern.
  expect(keys.length, 'en.json yielded too few namespaces to anchor the check').toBeGreaterThan(5);
  return keys;
}

test.describe('§7 G14 — no message key renders where a sentence belongs', () => {
  const keys = topLevelKeys();
  const pattern = new RegExp(`^(?:${keys.join('|')})\\.[A-Za-z]`);

  for (const p of allPages()) {
    test(`${p.label} renders sentences, not key paths`, async ({ page }) => {
      await page.goto(p.url, { waitUntil: 'networkidle' });

      const visible = await page.evaluate(() => {
        const out: string[] = [];
        out.push(document.body.innerText);
        for (const el of Array.from(document.querySelectorAll<HTMLElement>('[placeholder]'))) {
          out.push(el.getAttribute('placeholder') ?? '');
        }
        for (const el of Array.from(document.querySelectorAll('option'))) {
          out.push(el.textContent ?? '');
        }
        return out.join('\n');
      });

      const leaked = visible
        .split(/\s+/)
        .filter((token) => pattern.test(token))
        .filter((token, i, all) => all.indexOf(token) === i);

      expect(
        leaked,
        `${p.label} rendered a message key as visible text — a key missing from en.json ` +
          `has no fallback, so next-intl prints the path:\n  ${leaked.join('\n  ')}`
      ).toEqual([]);
    });
  }
});

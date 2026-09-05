import { test, expect } from './fixtures';
import { AM_ENABLED } from '@/i18n/config';
import { noIndexReasons } from '@/lib/metadata';
import { routePaths } from './helpers';

/**
 * REHEARSAL ONLY — never merged. Lives on `rehearsal/landings`.
 *
 * What the Amharic landing has to satisfy, asserted against a **synthetic**
 * catalogue with `AM_ENABLED` flipped on. Nothing here is translation: the
 * catalogue is generated from `en.json` by the G10 pseudo-locale generator,
 * +96% in length and padded with Ge'ez.
 *
 * The ordinary suite covers overflow, clipping, axe and console on `/am`
 * already. These are the assertions that only become meaningful once the flag
 * is on, and which therefore have never run.
 */
test.describe('rehearsal: the Amharic landing', () => {
  test.skip(!AM_ENABLED, 'AM_ENABLED is false — this only means anything with the flag on');

  test('/am lifts its noindex, and for the right reason', () => {
    // The assertion that proves the two reasons were correctly separated.
    // `/am` was noindex for `locale-not-offered`, never for undecided content,
    // so flipping the flag must lift it — and must NOT lift it on a route whose
    // content is genuinely unbuilt.
    const built = noIndexReasons({ locale: 'am', unbuilt: false });
    expect(
      built,
      'a built /am route is still noindex with the flag on — the driver was not AM_ENABLED'
    ).not.toContain('locale-not-offered');

    const unbuilt = noIndexReasons({ locale: 'am', unbuilt: true });
    expect(
      unbuilt,
      'an unbuilt /am route stopped being noindex when the locale was offered'
    ).toContain('tier-2-stub-not-built');

    // English is unaffected either way.
    expect(noIndexReasons({ locale: 'en', unbuilt: false })).not.toContain('locale-not-offered');
  });

  test('the switcher renders, and both scripts appear on it', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/en', { waitUntil: 'networkidle' });

    const group = page.locator('[role="group"]').filter({ hasText: /EN/ }).first();
    await expect(group, 'the language switcher did not render with the flag on').toBeVisible();

    const text = await group.innerText();
    expect(text, 'the switcher shows no Latin label').toMatch(/EN/);
    expect(text, 'the switcher shows no Ge’ez label').toMatch(/[ሀ-፿]/);
  });

  test('the switcher subset covers every glyph it renders', async ({ page }) => {
    await page.goto('/en', { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);

    const result = await page.evaluate(() => {
      const group = Array.from(document.querySelectorAll('[role="group"]')).find((g) =>
        /EN/.test(g.textContent ?? '')
      );
      const label = (group?.textContent ?? '').replace(/[^ሀ-፿]/g, '');
      const covered = Array.from(label).map((ch) => ({
        ch,
        code: 'U+' + ch.codePointAt(0)!.toString(16).toUpperCase(),
        // `document.fonts.check` answers "can this text be drawn from that
        // family", which is the question — not whether the file downloaded.
        inSubset: document.fonts.check('16px ethiopicSwitcher', ch)
      }));
      return { label, covered };
    });

    expect(result.label.length, 'no Ge’ez in the switcher to check').toBeGreaterThan(0);
    const missing = result.covered.filter((c) => !c.inSubset);
    expect(
      missing,
      `the switcher renders glyphs its subset does not cover: ${missing.map((m) => `${m.ch} ${m.code}`).join(', ')}. ` +
        `Those render as missing-glyph boxes in the control that offers Amharic.`
    ).toEqual([]);
  });

  test('the full Ethiopic face loads on /am and still not on /en', async ({ page }) => {
    const facesOn = async (url: string) => {
      await page.goto(url, { waitUntil: 'networkidle' });
      await page.waitForTimeout(900);
      return page.evaluate(() =>
        Array.from(document.fonts)
          .filter((f) => /ethiopic/i.test(f.family) && !/switcher/i.test(f.family))
          .map((f) => ({ family: f.family, status: f.status }))
      );
    };

    // The whole point of the two-face split: Amharic pages get the 198 KB face,
    // English pages never do — and that must still hold once Amharic is real.
    const am = await facesOn('/am');
    expect(
      am.some((f) => f.status === 'loaded'),
      `/am did not load the full Ethiopic face, so its Ge’ez is drawn from a fallback:\n${JSON.stringify(am, null, 2)}`
    ).toBe(true);

    const en = await facesOn('/en');
    expect(
      en.filter((f) => f.status === 'loaded'),
      `/en loaded the full Ethiopic face — the 198 KB regression is back`
    ).toEqual([]);
  });

  test('no Ge’ez route renders a missing-glyph box', async ({ page }) => {
    // Geometry cannot catch this: a box has width. Ask the font system whether
    // every Ge'ez codepoint actually on the page can be drawn by a loaded face.
    const problems: string[] = [];
    for (const path of routePaths()) {
      await page.goto(`/am${path === '/' ? '' : path}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      const unrenderable = await page.evaluate(() => {
        const text = document.body.innerText;
        const geez = new Set(Array.from(text).filter((c) => /[ሀ-፿]/.test(c)));
        return Array.from(geez).filter((ch) => !document.fonts.check('16px "Noto Sans Ethiopic"', ch));
      });
      if (unrenderable.length) problems.push(`/am${path}: ${unrenderable.join(' ')}`);
    }
    expect(problems, `Ge’ez that no loaded face can draw:\n${problems.join('\n')}`).toEqual([]);
  });
});

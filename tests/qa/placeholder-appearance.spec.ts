import { test, expect } from './fixtures';

/**
 * ADU-WEB-03 G11 — an undecided item is *visibly* flagged, never plausible
 * content.
 *
 * ## Why this file exists
 *
 * G11 was the one guarantee with no enforcement of its actual outcome. The
 * existing checks assert a class name is present and the word `UNDECIDED`
 * appears. Both are mechanisms. A restyle that keeps `.placeholder-flag` and the
 * word, while turning the dashed amber box into a tidy grey callout with a soft
 * border, passes every one of them — and at that point an unfinished item reads
 * as a designed feature, which is the exact failure the guarantee names.
 *
 * "Looks obviously unfinished" is not computable. Pixels are. So this compares
 * pixels, and nothing else here does.
 *
 * ## Pinned, deliberately
 *
 * ⚠ Chromium only, and one image only: `mcr.microsoft.com/playwright:v1.62.1-noble`,
 * matching the installed Playwright. That is where the committed baselines were
 * drawn, where `npm run qa:snapshots` compares them, and where the `snapshots`
 * job in `.github/workflows/ci.yml` compares them.
 *
 * The pin is the point. Font rasterisation, subpixel antialiasing and dashed
 * border phase all differ between Windows, macOS and Linux; unpinned, these
 * would fail on whichever machine did not generate them, and a snapshot test
 * that cries wolf gets deleted. A disabled guarantee is worse than an absent
 * one, because the row in docs/enforcement.md still claims it.
 *
 * Two things keep that pin honest. `playwright.config.ts` excludes this file
 * from the ordinary `npm run qa` unless `QA_SNAPSHOTS=1`, and CI runs it in its
 * own job inside the same image — `ubuntu-latest` on its own would not do, since
 * it ships a different font set from this container despite being the same
 * Ubuntu release. The platform guard below is the last line: run outside the
 * container anyway and it **skips loudly** rather than comparing against a
 * baseline it cannot trust.
 *
 * Enforced where it can be trusted, and it says so where it cannot.
 *
 * ## Regenerating
 *
 * A change to these three treatments is meant to be deliberate:
 *
 *   npm run qa:snapshots:update
 *
 * which runs this file in that container with `--update-snapshots`. Review the
 * image diff in the PR. If the new picture does not read as unfinished at a
 * glance, the guarantee has been broken and the test did its job.
 */

/** The platform the committed baselines were generated on, and CI's platform. */
const BASELINE_PLATFORM = 'linux';

/**
 * Measured, not guessed.
 *
 * ⚠ This was `maxDiffPixelRatio: 0.02` first — a number picked by intuition as
 * "small but not zero". Restyling `.placeholder-flag` from a dashed amber box
 * into a solid grey callout, the exact change this guarantee exists to catch,
 * produced **231 differing pixels: a ratio of 0.02**. It passed. The guard sat
 * precisely on top of the signal it was meant to detect.
 *
 * So the numbers were measured instead. In this pinned container, two images
 * that were NOT restyled differ by **0 pixels** — identical builds render
 * identically, which is what pinning an exact image tag buys. Noise floor zero,
 * signal 231.
 *
 * 20 is an order of magnitude below the signal and above a measured-zero floor,
 * leaving room for occasional subpixel nondeterminism without leaving room for a
 * restyle. `threshold` stays at 0.2: that is the per-pixel colour tolerance, and
 * it is what keeps antialiasing from counting.
 */
const TOLERANCE = { maxDiffPixels: 20, threshold: 0.2 } as const;

test.describe('§7 G11 — placeholders look unfinished', () => {
  test.skip(
    process.platform !== BASELINE_PLATFORM,
    `Baselines are pinned to ${BASELINE_PLATFORM}; this is ${process.platform}. ` +
      'Run `npm run qa:snapshots` to compare in the pinned container.'
  );
  test.skip(
    ({ browserName }) => browserName !== 'chromium',
    'Baselines are pinned to chromium.'
  );

  // Wide enough that the elements render at their intended size rather than
  // their 360px reflow, which is a different picture and a separate question.
  test.use({ viewport: { width: 1280, height: 900 } });

  /**
   * Waits for webfonts, and nothing else.
   *
   * ⚠ This used to inject a stylesheet to freeze animations and hide the caret.
   * The site's CSP blocked it — `style-src 'self' 'nonce-...'`, no
   * `unsafe-inline` — which is G5 doing exactly its job, on a test. It was also
   * unnecessary: `toHaveScreenshot` already disables animations and hides the
   * caret by default.
   *
   * The font wait is not optional. A screenshot taken mid-swap captures the
   * fallback face, and the comparison then measures load timing rather than the
   * design.
   */
  const settle = async (page: import('@playwright/test').Page) => {
    await page.evaluate(() => document.fonts.ready);
  };

  test('the EXAMPLE badge on an invented shop', async ({ page }) => {
    await page.goto('/en/how-it-works');
    await settle(page);

    const badge = page.locator('.badge-example').first();
    await expect(badge).toBeVisible();

    // The badge alone. Its own contrast and geometry are asserted elsewhere;
    // what this holds is that it still reads as a stamp on invented content.
    await expect(badge).toHaveScreenshot('example-badge.png', TOLERANCE);
  });

  test('the media placeholder standing in for a photo', async ({ page }) => {
    await page.goto('/en/how-it-works');
    await settle(page);

    const media = page.locator('.placeholder-media').first();
    await expect(media).toBeVisible();

    // The crossed box is the whole signal — a plain grey rectangle with a label
    // is what stock photography looks like before it arrives.
    await expect(media).toHaveScreenshot('media-placeholder.png', TOLERANCE);
  });

  test('an UNDECIDED flag in running copy', async ({ page }) => {
    await page.goto('/en/about');
    await settle(page);

    const flag = page.locator('.placeholder-flag').first();
    await expect(flag).toBeVisible();

    // The dashed amber box against body text. If a restyle makes this look like
    // a pull quote, this is where it is caught.
    await expect(flag).toHaveScreenshot('undecided-flag.png', TOLERANCE);
  });
});

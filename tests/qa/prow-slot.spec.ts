import { test, expect } from './fixtures';

/**
 * The prow slot — §2.3's one bold element, before the drawing exists.
 *
 * The mark's double-curl prow becomes the top edge of the single ink surface a
 * relational page carries. The drawing is commissioned with the icon (one
 * drawing serving three purposes) and has not arrived, so what exists is the
 * SLOT: a masked band whose current state is a plain edge.
 *
 * This asserts the slot is a **file drop** rather than a layout change — that
 * dropping a path in turns it on and spans the surface at both extremes of the
 * supported range, 360px and 1440px. Written during the landing rehearsal, and
 * kept because it guards the slot from here on.
 *
 * ⚠ The mask is stretched (`mask-size: 100% 100%`), so one path serves a 312px
 * phone and a 1216px desktop. That is why the commission brief asks for a curve
 * that survives both compression and extension.
 */
test.describe('§7 the prow slot', () => {
  test('the prow slot takes a mask at 360px and 1440px', async ({ page }) => {
    for (const width of [360, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/en', { waitUntil: 'networkidle' });

      const surfaces = page.locator('.surface-ink');
      expect(await surfaces.count(), `no ink surface at ${width}px`).toBe(1);

      const slot = await surfaces.first().evaluate((el) => {
        const before = getComputedStyle(el, '::before');
        const rect = el.getBoundingClientRect();
        return {
          height: before.height,
          maskImage: before.maskImage || before.webkitMaskImage,
          opacity: before.opacity,
          surfaceWidth: Math.round(rect.width)
        };
      });

      // Pre-artwork: the band exists and paints nothing.
      expect(slot.height, `prow band has no height at ${width}px`).toBe('14px');
      expect(slot.opacity, `the prow paints before a drawing exists (${width}px)`).toBe('0');

      // With a mask supplied the band turns on and spans the surface, which is
      // what makes `prow.svg` a file drop rather than a layout change.
      await page.evaluate(() => {
        const el = document.querySelector('.surface-ink') as HTMLElement;
        el.style.setProperty('--prow-on', '1');
        // A stand-in path, inline: two curls, deliberately crude.
        el.style.setProperty(
          '--prow',
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 14' preserveAspectRatio='none'%3E%3Cpath d='M0 14 Q 10 0 20 14 T 40 14 T 60 14 T 80 14 T 100 14 Z' fill='%23000'/%3E%3C/svg%3E\")"
        );
      });

      const on = await surfaces.first().evaluate((el) => {
        const before = getComputedStyle(el, '::before');
        return {
          opacity: before.opacity,
          width: before.width,
          maskImage: before.maskImage || before.webkitMaskImage
        };
      });
      expect(on.opacity, `the prow did not turn on at ${width}px`).toBe('1');
      expect(on.maskImage, `no mask applied at ${width}px`).toContain('svg');
      expect(
        Math.abs(parseFloat(on.width) - slot.surfaceWidth),
        `the prow band does not span the surface at ${width}px: ${on.width} vs ${slot.surfaceWidth}px`
      ).toBeLessThan(2);
    }
  });
});

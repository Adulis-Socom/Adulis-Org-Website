import { test, expect } from './fixtures';

/** §2.4 — the mobile menu at 360px. */
test.describe('§2.4 mobile menu', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await page.goto('/en', { waitUntil: 'networkidle' });
  });

  const trigger = (page: import('@playwright/test').Page) =>
    page.locator('header button[aria-controls]');

  test('trigger is at least 44x44', async ({ page }) => {
    const box = await trigger(page).boundingBox();
    expect(box, 'menu trigger not found').not.toBeNull();
    expect(box!.width, `trigger width ${box!.width}`).toBeGreaterThanOrEqual(44);
    expect(box!.height, `trigger height ${box!.height}`).toBeGreaterThanOrEqual(44);
  });

  test('opens, shows six nav items and a full-width waitlist button', async ({ page }) => {
    await trigger(page).click();
    await expect(trigger(page)).toHaveAttribute('aria-expanded', 'true');

    const panelId = await trigger(page).getAttribute('aria-controls');
    const panel = page.locator(`#${panelId}`);
    await expect(panel).toBeVisible();

    const items = panel.locator('nav ul li a');
    await expect(items).toHaveCount(6);

    const cta = panel.locator('a.btn-primary');
    await expect(cta).toBeVisible();
    const ctaBox = await cta.boundingBox();
    const panelBox = await panel.boundingBox();
    // Full width, allowing for the container gutter on each side.
    expect(
      ctaBox!.width,
      `waitlist CTA is ${ctaBox!.width}px inside a ${panelBox!.width}px panel — an earlier revision shipped this as a ~14px sliver`
    ).toBeGreaterThan(panelBox!.width * 0.8);
    expect(ctaBox!.height).toBeGreaterThanOrEqual(44);
  });

  test('language switcher is absent while AM_ENABLED is false', async ({ page }) => {
    await trigger(page).click();
    const panelId = await trigger(page).getAttribute('aria-controls');
    const panel = page.locator(`#${panelId}`);
    await expect(panel.getByText('አማርኛ')).toHaveCount(0);
    await expect(page.locator('header').getByText('አማርኛ')).toHaveCount(0);
  });

  test('icon changes between hamburger and close', async ({ page }) => {
    const closedIcon = await trigger(page).innerHTML();
    const closedLabel = await trigger(page).getAttribute('aria-label');
    await trigger(page).click();
    const openIcon = await trigger(page).innerHTML();
    const openLabel = await trigger(page).getAttribute('aria-label');
    expect(openIcon, 'icon did not change when opened').not.toBe(closedIcon);
    expect(openLabel, 'aria-label did not change when opened').not.toBe(closedLabel);
  });

  test('closes on Escape', async ({ page }) => {
    await trigger(page).click();
    await expect(trigger(page)).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Escape');
    await expect(trigger(page)).toHaveAttribute('aria-expanded', 'false');
  });

  test('closes on navigation', async ({ page }) => {
    await trigger(page).click();
    const panelId = await trigger(page).getAttribute('aria-controls');
    await page.locator(`#${panelId} nav ul li a`).first().click();
    await page.waitForLoadState('networkidle');
    await expect(trigger(page)).toHaveAttribute('aria-expanded', 'false');
  });

  test('page behind does not scroll while open', async ({ page }) => {
    await trigger(page).click();
    const overflow = await page.evaluate(() => document.body.style.overflow);
    expect(overflow, 'body scroll not locked while the panel is open').toBe('hidden');
  });
});

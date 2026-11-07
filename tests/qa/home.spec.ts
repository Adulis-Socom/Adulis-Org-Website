import { test, expect } from './fixtures';
import { ROUTES, WAITLIST_HREF } from '@/lib/routes';
import en from '@/messages/en.json';

/**
 * The international homepage (WEB-MIG-003).
 *
 * Copy is read from the catalogue rather than restated, so these assertions
 * follow a wording change instead of fighting it. What they pin is structure
 * and truthfulness: one H1, real destinations, `/` as the canonical English
 * URL, every illustration marked as an example, photography slots that are
 * announced correctly, and none of the public wording the founder rulings
 * forbid.
 */

/** Rendered text only — never the RSC payload, which carries every client namespace. */
async function visibleText(page: import('@playwright/test').Page) {
  return page.locator('main').innerText();
}

test.describe('§WEB-MIG-003 homepage', () => {
  test('/ is served directly and /en redirects to it', async ({ request }) => {
    const home = await request.get('/', { maxRedirects: 0 });
    expect(home.status()).toBe(200);

    const legacy = await request.get('/en', { maxRedirects: 0 });
    expect([307, 308]).toContain(legacy.status());
    expect(new URL(legacy.headers()['location'] ?? '', 'http://x').pathname).toBe('/');
  });

  test('metadata: title, description and a canonical at the site root', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    await expect(page).toHaveTitle(en.home.pageTitle);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', en.home.description);

    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
    expect(canonical, 'no canonical on /').not.toBeNull();
    expect(new URL(canonical!).pathname, `canonical is ${canonical}`).toBe('/');

    const alternates = await page.locator('link[rel="alternate"][hreflang]').evaluateAll((links) =>
      links.map((l) => new URL(l.getAttribute('href') ?? '').pathname)
    );
    expect(alternates.filter((p) => p.startsWith('/en')), 'an /en alternate survived D-01').toEqual([]);
  });

  test('one H1, and every section opens with an H2', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    const h1 = page.locator('main h1');
    await expect(h1).toHaveCount(1);
    await expect(h1).toHaveText(en.home.hero.heading);

    const levels = await page.locator('main h1, main h2, main h3').evaluateAll((hs) =>
      hs.map((h) => Number(h.tagName[1]))
    );
    for (let i = 1; i < levels.length; i++) {
      expect(levels[i] - levels[i - 1], `heading level jumps at position ${i}: ${levels.join(',')}`).toBeLessThanOrEqual(1);
    }
  });

  test('calls to action go to real routes', async ({ page, request }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    const main = page.locator('main');

    const waitlist = main.getByRole('link', { name: en.nav.waitlistCta, exact: true });
    await expect(waitlist).toHaveCount(2);
    for (const href of await waitlist.evaluateAll((as) => as.map((a) => a.getAttribute('href')))) {
      expect(href).toBe(WAITLIST_HREF);
    }

    const expected: [string, string][] = [
      [en.home.hero.secondaryCta, ROUTES.howItWorks],
      [en.home.discovery.link, ROUTES.forBuyers],
      [en.home.storefront.link, ROUTES.forSellers],
      [en.home.trust.link, ROUTES.trustAndSafety],
      [en.home.journey.link, ROUTES.howItWorks]
    ];
    for (const [name, href] of expected) {
      await expect(main.getByRole('link', { name, exact: true })).toHaveAttribute('href', href);
    }

    // Nothing on the page points at a route that does not exist.
    const hrefs = await main.locator('a[href]').evaluateAll((as) => as.map((a) => a.getAttribute('href')!));
    for (const href of new Set(hrefs)) {
      const res = await request.get(href.split('#')[0]);
      expect(res.status(), `${href} returned ${res.status()}`).toBe(200);
    }
  });

  test('photography slots are announced or hidden, and carry their tone', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    const slots = page.locator('main .photo-slot');
    expect(await slots.count()).toBeGreaterThan(0);

    const audit = await slots.evaluateAll((els) =>
      els.map((el) => ({
        role: el.getAttribute('role'),
        label: el.getAttribute('aria-label'),
        hidden: el.getAttribute('aria-hidden'),
        background: getComputedStyle(el).backgroundImage
      }))
    );
    for (const slot of audit) {
      if (slot.role === 'img') {
        expect(slot.label, 'a briefed slot needs an accessible name').toMatch(/^Photograph to come: .+/);
      } else {
        expect(slot.hidden, 'an unbriefed slot must be hidden from assistive technology').toBe('true');
      }
      // A purged tone class leaves a white box; the gradient is the evidence it survived.
      expect(slot.background, 'photography slot rendered without its tone').toContain('gradient');
    }

    const announced = audit.filter((s) => s.role === 'img').map((s) => s.label);
    expect(announced).toEqual(
      expect.arrayContaining([
        `Photograph to come: ${en.home.hero.photoBrief}`,
        `Photograph to come: ${en.home.trust.photoBrief}`,
        `Photograph to come: ${en.home.cta.photoBrief}`
      ])
    );
  });

  test('every invented Scene, Product or storefront is marked as an example', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    // Hero tagged Product, two For You Scenes, one storefront.
    await expect(page.locator('main .badge-example')).toHaveCount(4);
  });

  test('no forbidden or superseded public wording renders', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    const text = await visibleText(page);

    const forbidden: [RegExp, string][] = [
      [/\b(product|shoppable)\s+posts?\b/i, 'public terminology is Product and Scene'],
      [/\bverified\s+(sellers?|storefronts?)\b/i, 'F-05'],
      [/never holds/i, 'F-01'],
      [/\b0[.,]5\s?%/, '0.5% claim'],
      [/\b(commissions?|surcharges?)\b/i, 'unresolved commercial treatment'],
      [/bank transfer|receipt upload|payment verifier|reserve in the app/i, 'superseded payment model'],
      [/\b60 days\b|free period|paid plans?/i, 'superseded pricing'],
      [/government id/i, 'Adulis does not collect Government ID'],
      [/physical shop is required|shop address/i, 'no physical-shop requirement']
    ];
    for (const [pattern, why] of forbidden) {
      expect(text, `${why}: ${pattern}`).not.toMatch(pattern);
    }

    // Where Trust labels are listed, all four are.
    for (const label of ['New', 'Rebuilding', 'Established', 'Trusted']) {
      expect(text, `Trust label ${label} missing`).toContain(label);
    }
  });

  test.describe('without JavaScript', () => {
    test.use({ javaScriptEnabled: false });

    test('the page reads and every call to action is a plain link', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('main h1')).toHaveText(en.home.hero.heading);
      await expect(page.locator('main').getByRole('link', { name: en.nav.waitlistCta, exact: true }).first()).toHaveAttribute('href', WAITLIST_HREF);
      await expect(page.locator('main').getByRole('link', { name: en.home.discovery.link, exact: true })).toHaveAttribute('href', ROUTES.forBuyers);
      // Every section rendered on the server, not just the hero.
      await expect(page.locator('main section')).toHaveCount(9);
    });
  });
});

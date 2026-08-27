import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';

/**
 * §6.2 — the contact and report forms.
 *
 * Both are built, both are tested, and neither can accept a live submission: the
 * store is not provisioned because choosing one is the Article 22 decision. The
 * QA run configures a local sink, so delivery is exercised here and nowhere real.
 *
 * ⚠ Same rule as the waitlist spec — anything keyed per person must differ per
 * engine, or WebKit's assertions pass by reading Chromium's records.
 */

const SINK = `http://localhost:${process.env.QA_SINK_PORT ?? 4556}`;

type Delivered = Record<string, unknown> & { kind?: string; reference?: string };

async function delivered(page: Page, kind: string): Promise<Delivered[]> {
  const res = await page.request.get(`${SINK}/records`);
  const all = (await res.json()).records as Delivered[];
  return all.filter((r) => r.kind === kind);
}

const uniq = (project: string, tag: string) => `${tag}-${project}`;

test.describe('§6.2 contact form', () => {
  test('a valid enquiry is delivered with a reference and a retention date', async ({
    page
  }, testInfo) => {
    const subject = uniq(testInfo.project.name, 'partnership');
    await page.goto('/en/contact');
    await page.fill('#name', 'Mekdes Tesfaye');
    await page.fill('#email', 'mekdes@example.com');
    await page.fill('#subject', subject);
    await page.fill('#message', 'I would like to discuss a partnership.');
    await page.check('#consent');
    await page.click('button[type="submit"]');

    await expect(page.getByText(/ADU-CON-\d{2}-[23456789A-HJKMNP-TV-Z]{6}/)).toBeVisible();

    const mine = (await delivered(page, 'contact')).find((r) => r.subject === subject);
    expect(mine, 'enquiry did not reach the sink').toBeTruthy();
    expect(mine!.consent).toBe(true);
    expect(mine!.consentAt).toBeTruthy();
    expect(mine!.purgeAfter, 'a record without a retention date is a record nobody can age out').toBeTruthy();
    expect(String(mine!.reference)).toMatch(/^ADU-CON-/);
  });

  test('a blank email asks for one; a malformed email is called invalid', async ({ page }) => {
    await page.goto('/en/contact');

    // Blank: the person has not typed anything wrong yet, so telling them their
    // empty field is malformed would be both untrue and unhelpful.
    await page.click('button[type="submit"]');
    await expect(page.locator('.error-summary')).toBeVisible();
    await expect(page.locator('#email + .field-error, #email ~ .field-error').first()).toHaveText(
      'Enter your email address.'
    );

    // Present and wrong: now the validity message is the right one.
    await page.fill('#email', 'not-an-address');
    await page.click('button[type="submit"]');
    await expect(page.locator('#email ~ .field-error').first()).toHaveText(
      'Enter a valid email address.'
    );
  });

  test('valid fields keep their values through a failure', async ({ page }) => {
    await page.goto('/en/contact');
    await page.fill('#name', 'Mekdes Tesfaye');
    await page.fill('#subject', 'Press');
    // email and message left blank, consent unticked
    await page.click('button[type="submit"]');
    await expect(page.locator('.error-summary')).toBeVisible();

    expect(await page.inputValue('#name'), 'a valid field must not be cleared').toBe(
      'Mekdes Tesfaye'
    );
    expect(await page.inputValue('#subject')).toBe('Press');
  });

  test('the error summary is a list of links pointing at real fields', async ({ page }) => {
    await page.goto('/en/contact');
    await page.click('button[type="submit"]');
    await expect(page.locator('.error-summary')).toBeVisible();
    const links = page.locator('.error-summary ul li a');
    const n = await links.count();
    expect(n, 'the summary must be links, not a sentence').toBeGreaterThan(0);
    for (let i = 0; i < n; i++) {
      const href = (await links.nth(i).getAttribute('href')) ?? '';
      expect(href).toMatch(/^#/);
      expect(
        await page.locator(`[id="${href.slice(1)}"]`).count(),
        `summary link ${href} points at nothing`
      ).toBe(1);
    }
  });

  test('an unconsented enquiry is refused and never delivered', async ({ page }, testInfo) => {
    const subject = uniq(testInfo.project.name, 'no-consent');
    await page.goto('/en/contact');
    await page.evaluate(() => document.querySelector('#consent')?.remove());
    await page.fill('#name', 'Mekdes Tesfaye');
    await page.fill('#email', 'mekdes@example.com');
    await page.fill('#subject', subject);
    await page.fill('#message', 'Hello.');
    await page.click('button[type="submit"]');

    await expect(page.locator('.error-summary')).toBeVisible();
    const found = (await delivered(page, 'contact')).find((r) => r.subject === subject);
    expect(found, 'an unconsented enquiry must never be delivered').toBeFalsy();
  });
});

test.describe('§6.2 report content form', () => {
  test('a report is delivered and the success state states the 24-hour commitment', async ({
    page
  }, testInfo) => {
    const what = uniq(testInfo.project.name, 'seller-page');
    await page.goto('/en/report-content');
    await page.fill('#what', what);
    await page.fill('#description', 'This listing appears to be counterfeit.');
    await page.fill('#contact', 'reporter@example.com');
    await page.check('#consent');
    await page.click('button[type="submit"]');

    await expect(page.getByText(/ADU-REP-\d{2}-[23456789A-HJKMNP-TV-Z]{6}/)).toBeVisible();
    // Someone who has just reported harmful content should not have to guess
    // whether anyone will look.
    await expect(page.getByText(/within 24 hours/)).toBeVisible();

    const mine = (await delivered(page, 'report')).find((r) => r.what === what);
    expect(mine, 'report did not reach the sink').toBeTruthy();
    expect(mine!.reason, 'no category list exists yet, so nothing may be recorded').toBeNull();
    expect(mine!.purgeAfter).toBeTruthy();
  });

  /**
   * The reason category is the page's most important input and it is undecided.
   * A moderation taxonomy published on a public page is a policy statement, so
   * the gap is shown rather than filled.
   */
  test('the reason category is a flagged placeholder, not invented options', async ({ page }) => {
    await page.goto('/en/report-content');
    expect(
      await page.locator('select[name="reason"]').count(),
      'a select here would publish a moderation policy nobody approved'
    ).toBe(0);
    const flag = page.locator('.placeholder-flag');
    await expect(flag.first()).toBeVisible();
    await expect(flag.first()).toContainText('UNDECIDED');
  });

  test('an optional link may be omitted', async ({ page }, testInfo) => {
    const what = uniq(testInfo.project.name, 'no-link');
    await page.goto('/en/report-content');
    await page.fill('#what', what);
    await page.fill('#description', 'Describing the issue.');
    await page.fill('#contact', '+251911777888');
    await page.check('#consent');
    await page.click('button[type="submit"]');

    await expect(page.getByText(/ADU-REP-/)).toBeVisible();
    const mine = (await delivered(page, 'report')).find((r) => r.what === what);
    expect(mine!.link, 'an omitted optional field is null, not an empty string').toBeNull();
  });
});

test.describe('§6.2 forms without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  for (const route of ['/en/contact', '/en/report-content']) {
    test(`${route} validates server-side with no JavaScript`, async ({ page }) => {
      await page.goto(route);
      await Promise.all([
        page.waitForLoadState('load'),
        page.locator('form button[type="submit"]').click()
      ]);
      await page.waitForTimeout(800);

      const summary = page.locator('.error-summary');
      await expect(summary, `${route} produced no server-rendered error summary`).toBeVisible();
      expect(await summary.locator('ul li a').count()).toBeGreaterThan(0);
    });
  }
});

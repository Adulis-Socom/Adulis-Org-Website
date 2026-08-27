import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';

/**
 * §5 — the waitlist, asserted on the delivered record rather than on the page.
 *
 * The retention column, the platform enum and the discarded second handle are
 * all invisible from the browser. The QA sink keeps what it receives so these
 * can be checked where they actually matter, at the delivery boundary.
 *
 * ⚠ **Every test here must use a different phone number.** Per-phone rate
 * limiting and dedupe are keyed on the number, not on the per-test
 * `cf-connecting-ip` that `fixtures.ts` provides, so two tests sharing a number
 * would starve or deduplicate each other and fail for reasons unrelated to what
 * they assert. That is the same class of confusion the shared rate-limit bucket
 * caused in the first full run — see tests/qa/README.md.
 */

const SINK = `http://localhost:${process.env.QA_SINK_PORT ?? 4556}`;

/**
 * A phone number unique to this test AND this engine.
 *
 * Both projects run the same bodies, so a shared number means WebKit's
 * submissions deduplicate against Chromium's and its assertions pass by reading
 * Chromium's record — green, and testing nothing. The engine goes in the number.
 */
function phoneFor(project: string, slot: number): string {
  const engine = project === 'webkit' ? '2' : '1';
  return `+2519110${engine}0${String(slot).padStart(3, '0')}`;
}

/** The trailing digits, for finding the record this test wrote. */
function tailOf(phone: string): string {
  return phone.replace(/\D/g, '').slice(-9);
}

type Record_ = {
  reference: string;
  fullName: string;
  phone: string;
  primaryPlatform: string;
  primaryHandle: string;
  alsoSellOn: string;
  secondHandle: string | null;
  followerCount: string | null;
  sells: string;
  city: string;
  consent: boolean;
  consentAt: string;
  submittedAt: string;
  purgeAfter: string;
  phoneKey: string | null;
};

async function records(page: Page): Promise<Record_[]> {
  const res = await page.request.get(`${SINK}/records`);
  const all = (await res.json()).records as (Record_ & { kind?: string })[];
  // Checkpoint 4 added contact and report deliveries to the same sink. Those
  // carry a `kind` and no `phone`, so an unguarded `r.phone.includes(...)` throws
  // on them — the same shape of failure the readiness-probe records caused.
  return all.filter((r) => !r.kind && typeof r.phone === 'string');
}

/** Fill and submit, returning the reference shown on the success screen. */
async function submit(
  page: Page,
  values: Partial<Record<string, string>> & { phone: string }
): Promise<string> {
  await page.goto('/en/for-sellers');
  await page.fill('#fullName', values.fullName ?? 'Mekdes Tesfaye');
  await page.fill('#phone', values.phone);
  await page.selectOption('#platform', values.platform ?? 'tiktok');
  await page.fill('#handle', values.handle ?? '@mekdesstyle');
  // Platform first: once hydrated the form removes #secondHandle unless a second
  // platform is selected, so it has to exist before it can be filled.
  if (values.alsoSellOn) await page.selectOption('#alsoSellOn', values.alsoSellOn);
  if (values.secondHandle) await page.fill('#secondHandle', values.secondHandle);
  if (values.followers) await page.fill('#followers', values.followers);
  await page.fill('#sells', values.sells ?? "Women's clothing and accessories");
  await page.fill('#city', values.city ?? 'Addis Ababa');
  await page.check('#consent');
  await page.click('button[type="submit"]');
  const ref = page.getByText(/ADU-WL-\d{2}-[23456789A-HJKMNP-TV-Z]{6}/);
  await expect(ref).toBeVisible();
  return (await ref.textContent()) ?? '';
}

test.describe('§5 waitlist', () => {
  test('the delivered record carries every required field', async ({ page }, testInfo) => {
    const phone = phoneFor(testInfo.project.name, 1);
    await submit(page, { phone, followers: '18,400' });

    const mine = (await records(page)).filter((r) => r.phone.includes(tailOf(phone)));
    expect(mine.length, 'submission did not reach the sink').toBe(1);
    const r = mine[0];

    expect(r.primaryPlatform, 'platform must be stored as the enum').toBe('TIKTOK');
    expect(r.consent, 'consent is recorded, never inferred').toBe(true);
    expect(r.consentAt).toBeTruthy();
    expect(r.submittedAt).toBeTruthy();
    expect(r.phoneKey, 'phone must be keyed for dedupe').toBeTruthy();
    expect(r.phoneKey, 'the key must not be the number').not.toContain(tailOf(phone));

    // followerCount is stored as typed and never parsed to a number.
    expect(typeof r.followerCount).toBe('string');
    expect(r.followerCount).toBe('18,400');
  });

  test('purgeAfter is exactly twelve months after submission', async ({ page }, testInfo) => {
    const phone = phoneFor(testInfo.project.name, 2);
    await submit(page, { phone });

    const r = (await records(page)).find((x) => x.phone.includes(tailOf(phone)));
    expect(r, 'submission did not reach the sink').toBeTruthy();

    const submitted = new Date(r!.submittedAt);
    const purge = new Date(r!.purgeAfter);
    const expected = new Date(submitted);
    expected.setUTCMonth(expected.getUTCMonth() + 12);

    expect(purge.toISOString(), 'retention must be a per-record column').toBe(
      expected.toISOString()
    );
    // The consent copy promises "up to 12 months". Anything materially longer
    // makes that sentence untrue.
    const months = (purge.getTime() - submitted.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
    expect(months).toBeGreaterThan(11.5);
    expect(months).toBeLessThan(12.5);
  });

  test('a second platform keeps its handle', async ({ page }, testInfo) => {
    const phone = phoneFor(testInfo.project.name, 4);
    await submit(page, { phone, alsoSellOn: 'instagram', secondHandle: '@mekdes.style' });

    const r = (await records(page)).find((x) => x.phone.includes(tailOf(phone)));
    expect(r!.alsoSellOn).toBe('INSTAGRAM');

    // Delivered as `'@mekdes.style`, not `@mekdes.style`. Every handle starts
    // with `@`, which is one of the four characters a spreadsheet treats as the
    // start of a formula, so the delivery boundary prefixes an apostrophe
    // (security audit 01, F-01). Asserting the escape rather than stripping it
    // keeps this test failing if that protection is ever removed.
    expect(r!.secondHandle).toBe("'@mekdes.style");
    expect(r!.primaryHandle.startsWith("'@"), 'handles must be spreadsheet-escaped').toBe(true);
  });

  /**
   * S2 — a no-JavaScript form on a slow connection, with a submit button that
   * stays enabled by invariant, gets tapped twice. Two records and two reference
   * numbers for one person is a founder on the callback trying to work out which
   * is real.
   */
  test('a double submission returns the original reference and writes once', async ({ page }, testInfo) => {
    const phone = phoneFor(testInfo.project.name, 5);
    const first = await submit(page, { phone });
    const second = await submit(page, { phone });

    expect(second, 'the second submission must return the FIRST reference').toBe(first);

    const mine = (await records(page)).filter((x) => x.phone.includes(tailOf(phone)));
    expect(mine.length, 'a double tap must not create a second record').toBe(1);
  });

  /**
   * S4 — an unticked checkbox is not submitted at all, so absent has to be read
   * as an explicit false. Treating the two differently is how an unconsented
   * submission gets through on the path where the browser sends nothing on the
   * applicant's behalf.
   */
  test('a submission with no consent field at all is refused', async ({ page }, testInfo) => {
    await page.goto('/en/for-sellers');

    // Remove the checkbox entirely, which is what an unticked box amounts to on
    // the wire — and what a hand-built POST would send.
    await page.evaluate(() => document.querySelector('#consent')?.remove());

    const phone = phoneFor(testInfo.project.name, 6);
    await page.fill('#fullName', 'Mekdes Tesfaye');
    await page.fill('#phone', phone);
    await page.selectOption('#platform', 'tiktok');
    await page.fill('#handle', '@mekdesstyle');
    await page.fill('#sells', 'Clothing');
    await page.fill('#city', 'Addis Ababa');
    await page.click('button[type="submit"]');

    await expect(page.locator('.error-summary')).toBeVisible();
    const delivered = (await records(page)).filter((x) => x.phone.includes(tailOf(phone)));
    expect(delivered.length, 'an unconsented submission must never be delivered').toBe(0);
  });

  test('the error summary is a list of links', async ({ page }, testInfo) => {
    await page.goto('/en/for-sellers');
    await page.click('button[type="submit"]');
    const summary = page.locator('.error-summary');
    await expect(summary).toBeVisible();
    const links = summary.locator('ul li a');
    expect(await links.count(), 'the summary must be links, not plain text').toBeGreaterThan(0);

    // Each link must move focus to the field it names.
    const href = await links.first().getAttribute('href');
    expect(href, 'summary entries must target a field').toMatch(/^#/);
    expect(await page.locator(`[id="${(href ?? '').slice(1)}"]`).count()).toBe(1);
  });

  /**
   * The standing prohibition, asserted rather than trusted.
   *
   * A follower count far below and far above any plausible audience must both be
   * accepted, because there is no threshold in either direction and every
   * applicant is reviewed by hand.
   */
  test('followerCount gates nothing, at either extreme', async ({ page }, testInfo) => {
    const tiny = phoneFor(testInfo.project.name, 7);
    const huge = phoneFor(testInfo.project.name, 8);

    await submit(page, { phone: tiny, followers: '1' });
    await submit(page, { phone: huge, followers: '999999999999' });

    const all = await records(page);
    expect(all.find((x) => x.phone.includes(tailOf(tiny)))?.followerCount).toBe('1');
    expect(all.find((x) => x.phone.includes(tailOf(huge)))?.followerCount).toBe('999999999999');
  });

  test('an omitted follower count is stored as null, not zero', async ({ page }, testInfo) => {
    const phone = phoneFor(testInfo.project.name, 9);
    await submit(page, { phone });
    const r = (await records(page)).find((x) => x.phone.includes(tailOf(phone)));
    expect(r!.followerCount, 'absent must not become a number').toBeNull();
  });
});

/**
 * S3 — choosing "Neither" after typing a second handle.
 *
 * This only happens **without JavaScript**, and that is the whole point. Once
 * hydrated, the form removes `#secondHandle` unless a second platform is
 * selected, so the value can never be submitted. With scripting off the field is
 * visible from the start, so someone can fill it and then choose Neither — and
 * the applicant has done nothing wrong.
 *
 * The server discards the value rather than erroring.
 */
test.describe('§5 waitlist, no JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('Neither discards a typed second handle without erroring', async ({ page }, testInfo) => {
    const phone = phoneFor(testInfo.project.name, 10);
    await page.goto('/en/for-sellers');

    // Visible from the start with scripting off — assert that, since the rest of
    // this test is meaningless if the field is not reachable.
    await expect(page.locator('#secondHandle')).toBeVisible();

    await page.fill('#fullName', 'Mekdes Tesfaye');
    await page.fill('#phone', phone);
    await page.selectOption('#platform', 'tiktok');
    await page.fill('#handle', '@mekdesstyle');
    await page.fill('#secondHandle', '@mekdes.style');
    await page.selectOption('#alsoSellOn', 'neither');
    await page.fill('#sells', 'Clothing');
    await page.fill('#city', 'Addis Ababa');
    await page.check('#consent');

    await Promise.all([
      page.waitForLoadState('load'),
      page.locator('form button[type="submit"]').click()
    ]);
    await page.waitForTimeout(1200);

    const visible = (await page.content()).replace(/<script[\s\S]*?<\/script>/g, '');
    expect(
      /Application received/.test(visible),
      'selecting Neither after typing a handle must not be an error'
    ).toBe(true);

    const res = await page.request.get(`${SINK}/records`);
    const all = (await res.json()).records as Record_[];
    const r = all.find((x) => x.phone && x.phone.includes(tailOf(phone)));
    expect(r, 'submission did not reach the sink').toBeTruthy();
    expect(r!.alsoSellOn).toBe('NEITHER');
    expect(r!.secondHandle, 'the second handle must be discarded, not stored').toBeNull();
  });
});

import { test, expect } from './fixtures';

/**
 * ADU-WEB-03 G6 — the deletion journey, without JavaScript.
 *
 * Previously deferred as untestable while `DELETION_FLOW_ENABLED` is false and
 * no API exists. That deferral was too broad: it conflated the **journey** with
 * the **integration**.
 *
 * The journey — five form posts chaining, the ticket surviving three boundaries
 * in hidden fields, all with scripting off — is testable now. It runs against a
 * server instance with the flow forced on and pointed at the test double in
 * `tests/qa/sink.mjs`.
 *
 * ⚠ This proves nothing about the real API, which does not exist. Integration
 * stays on the flag-flip checklist. What it replaces is a source check that
 * asserted every form carries an `action` — the mechanism, not the journey.
 *
 * `check:copy` still refuses `DELETION_FLOW_TEST_FORCE` on any build that has
 * not declared itself undeployable, so this cannot leak into a deployment.
 */

const PORT = Number(process.env.QA_DELETION_PORT ?? 3212);
const at = (path: string) => `http://localhost:${PORT}/en${path}`;

/** The one code the double accepts. */
const CODE = '123456';

test.describe('§7 deletion journey with JavaScript disabled', () => {
  test.use({ javaScriptEnabled: false });

  /** Reads the value a hidden field is carrying forward. */
  const hidden = (page: import('@playwright/test').Page, name: string) =>
    page.locator(`input[type="hidden"][name="${name}"]`).first().getAttribute('value');

  test('all five steps chain, and the ticket survives three boundaries', async ({ page }) => {
    const phone = '+251911500500';

    // 1 — explain. The store requirement: a person reads what they are asking
    // for before identifying themselves.
    await page.goto(at('/delete-account'));
    await expect(page.getByText(/not a sign-in/i).first()).toBeVisible();
    await Promise.all([
      page.waitForLoadState('load'),
      page.locator('form button[type="submit"]').click()
    ]);

    // 2 — phone.
    await expect(page.locator('#delete-phone')).toBeVisible();
    await page.fill('#delete-phone', phone);
    await Promise.all([
      page.waitForLoadState('load'),
      page.locator('form button[type="submit"]').first().click()
    ]);

    // 3 — OTP. The phone crossed the first boundary in a hidden field.
    await expect(page.locator('#delete-otp')).toBeVisible();
    expect(await hidden(page, 'phone'), 'the phone did not survive step 2 -> 3').toBe(phone);

    await page.fill('#delete-otp', CODE);
    await Promise.all([
      page.waitForLoadState('load'),
      page.locator('form button[type="submit"]').first().click()
    ]);

    // 4 — confirm. A ticket now exists and crossed the second boundary.
    await expect(page.locator('#delete-ack')).toBeVisible();
    const ticket = await hidden(page, 'ticket');
    expect(ticket, 'no ticket after verify — the flow reached confirm without one').toBeTruthy();
    expect(ticket).toMatch(/^tkt-/);

    // ⚠ A ticket in a cookie would be a session, and this site has none.
    const cookies = await page.context().cookies();
    expect(
      cookies.filter((c) => c.value === ticket || /ticket|deletion|session/i.test(c.name)),
      'the ticket reached a cookie. It must live in a hidden field and nowhere else'
    ).toEqual([]);

    await page.check('#delete-ack');
    await Promise.all([
      page.waitForLoadState('load'),
      page.locator('form button[type="submit"]').first().click()
    ]);

    // 5 — success. The ticket crossed the third boundary to reach confirm.
    await expect(page.getByRole('heading', { name: /Account deleted/i })).toBeVisible();
  });

  /**
   * The blocked branch, rendered from `items[]` as the server returned it —
   * including a reason code this build has never heard of.
   */
  test('blockers render from the server response, unknown reasons included', async ({ page }) => {
    // The double returns blockers for a number ending 999999.
    const phone = '+251911999999';

    await page.goto(at('/delete-account'));
    await Promise.all([
      page.waitForLoadState('load'),
      page.locator('form button[type="submit"]').click()
    ]);
    await page.fill('#delete-phone', phone);
    await Promise.all([
      page.waitForLoadState('load'),
      page.locator('form button[type="submit"]').first().click()
    ]);
    await page.fill('#delete-otp', CODE);
    await Promise.all([
      page.waitForLoadState('load'),
      page.locator('form button[type="submit"]').first().click()
    ]);

    await expect(page.getByRole('heading', { name: /temporarily blocked/i })).toBeVisible();

    const items = page.locator('ul li.card-sunken');
    expect(await items.count(), 'the blocked list is empty').toBe(3);

    // Two reasons this build knows, rendered from the catalogue.
    await expect(page.getByText('Order awaiting handoff')).toBeVisible();
    await expect(page.getByText('Open claim')).toBeVisible();

    // One it does not. It must still render — a new blocker type on the server
    // must never silently vanish from the page.
    await expect(page.getByText('A future blocker type')).toBeVisible();

    // And confirm must be unreachable from here.
    expect(await page.locator('#delete-ack').count(), 'confirm reachable from blocked').toBe(0);
  });

  test('a wrong code does not advance, and issues no ticket', async ({ page }) => {
    await page.goto(at('/delete-account'));
    await Promise.all([
      page.waitForLoadState('load'),
      page.locator('form button[type="submit"]').click()
    ]);
    await page.fill('#delete-phone', '+251911500501');
    await Promise.all([
      page.waitForLoadState('load'),
      page.locator('form button[type="submit"]').first().click()
    ]);

    await page.fill('#delete-otp', '000000');
    await Promise.all([
      page.waitForLoadState('load'),
      page.locator('form button[type="submit"]').first().click()
    ]);

    await expect(page.locator('#delete-otp'), 'a wrong code advanced the flow').toBeVisible();
    expect(await page.locator('#delete-ack').count(), 'reached confirm with a bad code').toBe(0);
    expect(await hidden(page, 'ticket'), 'a ticket was issued for a wrong code').toBeFalsy();
  });

  /**
   * Every step renders finished sentences, not message keys.
   *
   * Not decoration. The flow had never rendered — a separate defect held the
   * gate closed — so its catalogue was never exercised and two keys were simply
   * absent. `next-intl` in production does not throw on a missing message: it
   * logs and renders the KEY PATH. `phone.intro` shipped as visible body copy,
   * a store reviewer would have read `otp.resend` on a button, and every
   * journey assertion above still passed, because none of them read the prose.
   *
   * Watching the console alone would not do it either — a MISSING_MESSAGE line
   * is the mechanism. What a person sees is a dotted key where a sentence
   * belongs, so that is what this reads, off the rendered text.
   */
  test('no step renders a message key where a sentence belongs', async ({ page }) => {
    const reported: string[] = [];
    page.on('console', (message) => {
      if (/MISSING_MESSAGE|INSUFFICIENT_PATH/.test(message.text())) reported.push(message.text());
    });

    // dotted.lowerCamel paths, standing alone. Prose does not look like this;
    // a missing message renders exactly like this.
    const KEYISH = /(^|\s)[a-z][a-zA-Z0-9]*(\.[a-z][a-zA-Z0-9]*)+($|\s)/;

    const advance = async () => {
      await Promise.all([
        page.waitForLoadState('load'),
        page.locator('form button[type="submit"]').first().click()
      ]);
    };
    const check = async (label: string) => {
      const body = await page.locator('main').innerText();
      expect(body.length, `${label} rendered almost nothing`).toBeGreaterThan(40);
      expect(body, `${label} rendered a message key instead of a sentence`).not.toMatch(KEYISH);
    };

    await page.goto(at('/delete-account'));
    await check('explain');
    await advance();
    await check('phone');

    await page.fill('#delete-phone', '+251911500500');
    await advance();
    // The OTP step carries the resend button, which was one of the two gaps.
    await check('otp');

    await page.fill('#delete-otp', CODE);
    await advance();
    await check('confirm');

    await page.check('#delete-ack');
    await advance();
    await check('success');

    expect(reported, `next-intl reported missing messages: ${reported.join(' | ')}`).toEqual([]);
  });
});

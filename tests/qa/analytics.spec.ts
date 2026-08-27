import { test, expect } from './fixtures';
import { ANALYTICS_EVENTS, isAnalyticsEvent, sanitiseProperties } from '@/lib/analytics';

/**
 * §6.4 — analytics carries counts and nothing that identifies anyone.
 *
 * This is the one piece of Checkpoint 4 that can ship, and it ships **because**
 * of the payload design. An IP address or a persistent identifier would make the
 * stream personal data and put it straight back behind the Article 22 block that
 * holds the three forms.
 *
 * So the tests here are about what is *absent*, which is the harder thing to
 * keep true over time.
 */
test.describe('§6.4 analytics payload', () => {
  test('properties not on the allowlist are dropped', () => {
    const out = sanitiseProperties({
      field: 'phone',
      // None of these may ever reach the sink.
      ip: '196.188.1.1',
      visitorId: 'abc-123',
      sessionId: 'sess-9',
      userAgent: 'Mozilla/5.0',
      email: 'someone@example.com',
      city: 'Addis Ababa'
    });
    expect(out, 'only allowlisted keys survive').toEqual({ field: 'phone' });
  });

  test('long values are truncated rather than passed through', () => {
    const out = sanitiseProperties({ reason: 'x'.repeat(500) });
    expect(String(out.reason).length).toBeLessThanOrEqual(64);
  });

  test('every declared event is recognised and nothing else is', () => {
    for (const event of ANALYTICS_EVENTS) expect(isAnalyticsEvent(event)).toBe(true);
    expect(isAnalyticsEvent('page_view')).toBe(false);
    expect(isAnalyticsEvent('waitlist_submitted; DROP TABLE')).toBe(false);
    expect(isAnalyticsEvent(42)).toBe(false);
  });

  test('the beacon endpoint accepts a known event and ignores an unknown one', async ({
    request
  }) => {
    // Both answer 204 with no body: the endpoint tells a caller nothing about
    // its own state, because a beacon has no use for the information and a
    // prober should learn nothing either.
    const good = await request.post('/api/events', {
      data: { event: 'language_switched', route: '/en', properties: { to: 'am' } }
    });
    expect(good.status()).toBe(204);

    const bad = await request.post('/api/events', {
      data: { event: 'not_a_real_event', route: '/en' }
    });
    expect(bad.status()).toBe(204);
  });

  test('a malformed body cannot break the endpoint', async ({ request }) => {
    for (const body of ['', 'not json', '[]', '{"event":null}']) {
      const res = await request.post('/api/events', {
        headers: { 'content-type': 'application/json' },
        data: body
      });
      expect(res.status(), `body ${JSON.stringify(body)} produced ${res.status()}`).toBe(204);
    }
  });

  /**
   * The client emits abandonment through the same-origin beacon, never to a
   * third party. `connect-src 'self'` would block one, but the point here is
   * that nothing even tries.
   */
  test('field abandonment reaches our own origin and carries no identifiers', async ({ page }) => {
    const beacons: { url: string; body: string }[] = [];
    page.on('request', (r) => {
      if (r.url().includes('/api/events')) {
        // sendBeacon posts a Blob, and postData() comes back empty for it.
        beacons.push({ url: r.url(), body: r.postDataBuffer()?.toString('utf8') ?? '' });
      }
    });

    // Playwright cannot read the body of a sendBeacon Blob, so the fallback path
    // is forced. That path is real code — engines without sendBeacon take it —
    // and it sends the identical payload, which is what this test is about.
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'sendBeacon', { value: undefined, configurable: true });
    });

    // networkidle, not load: the blur handler is attached at hydration, and
    // focusing before that fires a blur nothing is listening for. WebKit hydrates
    // slowly enough at 360px for the difference to be the whole test.
    await page.goto('/en/for-sellers', { waitUntil: 'networkidle' });

    // The conditional second-handle field is removed once hydrated, so its
    // absence is a reliable signal that React has taken over.
    await expect(page.locator('#secondHandle')).toHaveCount(0);

    // Focus a field, leave it empty, move on.
    await page.locator('#fullName').focus();
    await page.locator('#phone').focus();
    await page.waitForTimeout(800);

    expect(beacons.length, 'no abandonment beacon was sent').toBeGreaterThan(0);

    const first = beacons[0];
    expect(new URL(first.url).host, 'the beacon must stay on this origin').toBe(
      new URL(page.url()).host
    );
    const parsed = JSON.parse(first.body);
    expect(parsed.event).toBe('waitlist_field_abandoned');
    expect(parsed.properties, 'field names only, never values').toEqual({ field: 'fullName' });
    expect(first.body).not.toMatch(/@|\+251|sessionId|visitorId/);
  });

  test('no off-origin request is made from any page', async ({ page }) => {
    const external: string[] = [];
    page.on('request', (r) => {
      const host = new URL(r.url()).hostname;
      if (host !== 'localhost' && host !== '127.0.0.1') external.push(r.url());
    });
    for (const route of ['/en', '/en/for-sellers', '/en/contact', '/en/report-content']) {
      await page.goto(route, { waitUntil: 'networkidle' });
    }
    expect(external, `off-origin requests:\n${external.join('\n')}`).toEqual([]);
  });
});

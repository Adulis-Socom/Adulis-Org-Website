import { test, expect } from './fixtures';
import { createServer, type Server } from 'node:http';
import {
  confirmDeletion,
  previewDeletion,
  requestOtp,
  verifyOtp
} from '@/lib/deletion/client';

/**
 * §6.3 — the deletion adapter.
 *
 * The four endpoints live in `adulis-platform` and **do not exist yet**. Nothing
 * in the product stubs them: with no `DELETION_API_URL` the page renders the
 * explanation and the manual route, and the flow does not offer itself.
 *
 * These tests point the client at a mock **inside the test process**. That is not
 * a stub in the product — it is the only way to exercise a client against a
 * contract before the server exists, and it means the day the real API appears,
 * the client has already been run against every response shape it promises.
 */

let server: Server;
let calls: { method: string; url: string; auth: string | null; body: string }[] = [];
let respond: (url: string) => { status: number; body: unknown } = () => ({ status: 200, body: {} });

test.beforeAll(async () => {
  server = createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      calls.push({
        method: req.method ?? '',
        url: req.url ?? '',
        auth: req.headers.authorization ?? null,
        body
      });
      const { status, body: out } = respond(req.url ?? '');
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(out));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as { port: number }).port;
  process.env.DELETION_API_URL = `http://localhost:${port}`;
});

test.afterAll(async () => {
  delete process.env.DELETION_API_URL;
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

test.beforeEach(() => {
  calls = [];
  respond = () => ({ status: 200, body: {} });
});

test.describe('§6.3 deletion client', () => {
  test('otp/request posts the phone and nothing else', async () => {
    respond = () => ({ status: 202, body: {} });
    const result = await requestOtp('+251911223344');
    expect(result.status).toBe('ok');

    expect(calls).toHaveLength(1);
    expect(calls[0].method).toBe('POST');
    expect(calls[0].url).toBe('/v1/deletion/otp/request');
    expect(JSON.parse(calls[0].body)).toEqual({ phone: '+251911223344' });
  });

  test('otp/verify returns a ticket, and the ticket travels only in the header', async () => {
    respond = () => ({ status: 200, body: { ticket: 'tkt-abc', expires_at: '2026-01-01T00:00:00Z' } });
    const verified = await verifyOtp('+251911223344', '123456');
    expect(verified.status).toBe('ok');
    if (verified.status !== 'ok') return;
    expect(verified.data.ticket).toBe('tkt-abc');

    calls = [];
    respond = () => ({ status: 200, body: { items: [] } });
    await previewDeletion(verified.data.ticket);

    expect(calls[0].method).toBe('GET');
    expect(calls[0].auth, 'the ticket goes in Authorization, as a Ticket').toBe('Ticket tkt-abc');
    // A ticket in a query string ends up in logs and referrers.
    expect(calls[0].url).not.toContain('tkt-abc');
  });

  /**
   * The server decides what blocks a deletion; the page renders what it is told.
   * A blocker type this build has never heard of must survive the client intact.
   */
  test('preview returns items[] as given, including unknown reasons', async () => {
    respond = () => ({
      status: 200,
      body: {
        items: [
          { reason: 'CLAIM_OPEN' },
          { reason: 'SOMETHING_INVENTED_LATER', detail: 'A future blocker type' }
        ]
      }
    });
    const result = await previewDeletion('tkt-abc');
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;

    expect(result.data).toHaveLength(2);
    expect(result.data[0].reason).toBe('CLAIM_OPEN');
    expect(
      result.data[1].reason,
      'an unrecognised blocker must not be filtered out by this client'
    ).toBe('SOMETHING_INVENTED_LATER');
    expect(result.data[1].detail).toBe('A future blocker type');
  });

  test('an expired ticket is reported as expired, not as a failure to reach', async () => {
    respond = () => ({ status: 401, body: {} });
    expect((await previewDeletion('stale')).status).toBe('expired');
    expect((await confirmDeletion('stale')).status).toBe('expired');
  });

  test('a rate-limited response is distinguished from everything else', async () => {
    respond = () => ({ status: 429, body: {} });
    expect((await requestOtp('+251911223344')).status).toBe('rateLimited');
  });

  test('a wrong code is invalid, not unreachable', async () => {
    respond = () => ({ status: 400, body: {} });
    expect((await verifyOtp('+251911223344', '000000')).status).toBe('invalid');
  });

  /**
   * Today's expected outcome, and the reason the page has an honest state for it.
   */
  test('no configured API is unreachable, and nothing is called', async () => {
    const saved = process.env.DELETION_API_URL;
    delete process.env.DELETION_API_URL;
    calls = [];

    expect((await requestOtp('+251911223344')).status).toBe('unreachable');
    expect(calls, 'nothing may be called when no API is configured').toHaveLength(0);

    process.env.DELETION_API_URL = saved;
  });

  test('a server error is unreachable rather than a fabricated success', async () => {
    respond = () => ({ status: 500, body: {} });
    expect((await confirmDeletion('tkt-abc')).status).toBe('unreachable');
  });
});

test.describe('§6.3 deletion page while the API does not exist', () => {
  test('renders the explanation and the manual route, and offers no flow', async ({ page }) => {
    await page.goto('/en/delete-account');

    // The Phase 0b job: exist, be reachable, explain. A store reviewer looks for
    // the explanation on the landing step.
    await expect(page.getByRole('heading', { name: 'Delete my account' })).toBeVisible();
    await expect(page.getByText(/not a sign-in/i).first()).toBeVisible();

    // No phone entry, no OTP, no confirm — the wording must not imply a
    // self-service path exists when it does not.
    expect(await page.locator('#delete-phone').count()).toBe(0);
    expect(await page.locator('#delete-otp').count()).toBe(0);
    expect(await page.locator('#delete-ack').count()).toBe(0);
  });

  test('sets no cookie, because a ticket is not a session', async ({ page }) => {
    await page.goto('/en/delete-account');
    const cookies = await page.context().cookies();
    expect(
      cookies.filter((c) => /ticket|deletion|session/i.test(c.name)),
      'a ticket in a cookie is a session, and this site has none'
    ).toEqual([]);
  });
});

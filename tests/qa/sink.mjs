// Local delivery sink for the QA run. localhost only.
//
// It keeps what it receives, because Checkpoint 3 asserts on the shape of the
// delivered record — the retention column, the platform enum, the discarded
// second handle — and none of that is visible from the page.
//
//   POST /                        accept a submission
//   GET  /records                 everything received, newest last
//   POST /reset                   forget everything
//
// It also stands in for the deletion API, which lives in `adulis-platform` and
// does not exist yet:
//
//   POST /v1/deletion/otp/request { phone }              -> 202
//   POST /v1/deletion/otp/verify  { phone, code }        -> 200 { ticket, expires_at }
//   GET  /v1/deletion/preview     Authorization: Ticket  -> { items: [...] }
//   POST /v1/deletion/confirm     Authorization: Ticket  -> 200
//
// ⚠ This is a TEST double, not a stub in the product. `src/lib/deletion/client.ts`
// implements the real contract and calls whatever `DELETION_API_URL` points at;
// with nothing configured it reports `unreachable` and the page says so honestly.
// Nothing in `src/` knows this file exists.
//
// Nothing is persisted to disk and the process is started and stopped by
// Playwright, so state lives only as long as the run.
import http from 'node:http';

const PORT = Number(process.env.QA_SINK_PORT ?? 4556);
const records = [];

/** The one code the double accepts. Anything else is rejected as invalid. */
const GOOD_CODE = '123456';

/**
 * A phone whose account has outstanding obligations, so the blocked branch is
 * reachable. Any other number previews clean.
 */
const BLOCKED_PHONE_TAIL = '999999';

/** ticket -> phone, so preview and confirm can tell which account they are on. */
const tickets = new Map();
let ticketSeq = 0;

function readBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => {
      if (body.length < 100_000) body += chunk;
    });
    req.on('end', () => resolve(body));
  });
}

http
  .createServer(async (req, res) => {
    const json = (body, status = 200) => {
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(body));
    };
    const url = req.url ?? '/';

    /* ------------------------------------------------ deletion API double */
    if (url.startsWith('/v1/deletion/')) {
      const auth = req.headers.authorization ?? '';
      const ticket = auth.startsWith('Ticket ') ? auth.slice(7) : null;

      if (url.startsWith('/v1/deletion/otp/request')) {
        await readBody(req);
        // Uniform response whether or not an account exists — the send-code path
        // must not be an enumeration oracle. Condition 2 in src/lib/flags.ts.
        return json({}, 202);
      }

      if (url.startsWith('/v1/deletion/otp/verify')) {
        const body = await readBody(req);
        let phone = '';
        let code = '';
        try {
          ({ phone = '', code = '' } = JSON.parse(body));
        } catch {
          /* malformed body falls through to invalid */
        }
        if (code !== GOOD_CODE) return json({}, 400);
        const value = `tkt-${++ticketSeq}`;
        tickets.set(value, String(phone));
        return json({ ticket: value, expires_at: '2099-01-01T00:00:00Z' });
      }

      if (url.startsWith('/v1/deletion/preview')) {
        req.resume();
        if (!ticket || !tickets.has(ticket)) return json({}, 401);
        const phone = tickets.get(ticket) ?? '';
        const items = phone.replace(/\D/g, '').endsWith(BLOCKED_PHONE_TAIL)
          ? [
              { reason: 'ORDER_AWAITING_HANDOFF' },
              { reason: 'CLAIM_OPEN' },
              // A reason this build has never heard of, so the page's fallback
              // rendering is exercised rather than assumed.
              { reason: 'SOMETHING_INVENTED_LATER', detail: 'A future blocker type' }
            ]
          : [];
        return json({ items });
      }

      if (url.startsWith('/v1/deletion/confirm')) {
        await readBody(req);
        if (!ticket || !tickets.has(ticket)) return json({}, 401);
        // Single use. A ticket that survived its own confirmation would be a
        // session, which is the thing this flow exists not to have.
        tickets.delete(ticket);
        return json({});
      }

      req.resume();
      return json({}, 404);
    }

    /* ------------------------------------------------------- submissions */
    if (req.method === 'GET' && url.startsWith('/records')) {
      req.resume();
      return json({ records });
    }

    if (req.method === 'POST' && url.startsWith('/reset')) {
      req.resume();
      records.length = 0;
      tickets.clear();
      return json({ ok: true });
    }

    // Anything that is not a POST is a readiness probe, not a submission.
    // Playwright's webServer polls GET / until the sink answers, and an earlier
    // version of this file fell through to the body reader on those — pushing an
    // `{unparseable: ''}` record for every poll and breaking every assertion that
    // read the first record.
    if (req.method !== 'POST') {
      req.resume();
      return json({ ok: true });
    }

    const body = await readBody(req);
    try {
      records.push(JSON.parse(body));
    } catch {
      records.push({ unparseable: body.slice(0, 200) });
    }
    return json({ ok: true });
  })
  .listen(PORT, () => console.log(`qa sink on :${PORT}`));

/**
 * A client for four endpoints this repository does not own and must not
 * implement.
 *
 *   POST /v1/deletion/otp/request   { phone }             -> 202
 *   POST /v1/deletion/otp/verify    { phone, code }       -> 200 { ticket, expires_at }
 *   GET  /v1/deletion/preview       Authorization: Ticket -> { items: [...] }
 *   POST /v1/deletion/confirm       Authorization: Ticket
 *
 * They are being built in `adulis-platform` on a separate track and **do not
 * exist yet**. Nothing here stubs them and nothing here fakes a success path:
 * when the API is unreachable the caller renders an explicit, honest state and
 * the person is told to use the manual route.
 *
 * ## The four rules, each load-bearing
 *
 * 1. **The ticket is never written to a cookie**, and no other request carries
 *    it. It lives in React state for the life of one flow and is passed only to
 *    `preview` and `confirm`. A ticket in a cookie is a session, and this site
 *    has no session — that is the whole point of the deletion path being an OTP
 *    rather than a sign-in.
 *
 * 2. **The website never stores the phone number.** Not in a store, not in a
 *    log, not in an analytics event. It is held in memory for the length of the
 *    flow because `otp/verify` needs it alongside the code, and it goes nowhere
 *    else. There is deliberately no `console.log` in this file that takes a
 *    phone argument.
 *
 * 3. The explanation precedes the phone field — enforced by the component, not
 *    here.
 *
 * 4. **The blocked branch renders `items[]` as returned.** This client does not
 *    interpret, filter, reorder or translate the blockers. The server decides
 *    what blocks a deletion; the page renders what it is told. Hard-coding the
 *    list here would mean a new blocker type on the server silently disappearing
 *    from the page.
 */

/** Where the product API lives. Absent means the flow cannot run. */
export function deletionApiBase(): string | null {
  return process.env.DELETION_API_URL ?? null;
}

/**
 * One blocker, exactly as the server sent it.
 *
 * `reason` keys into `deleteAccount.blocked.reasons` for a translated title and
 * action; `detail` is optional server-supplied text. An unknown `reason` must
 * still render — see `DeleteAccountFlow` — because the server is allowed to add
 * blocker types without this repository shipping first.
 */
export type DeletionBlocker = {
  reason: string;
  detail?: string;
};

export type DeletionTicket = {
  ticket: string;
  expiresAt: string;
};

/**
 * Every way a call can end, as data rather than as thrown errors.
 *
 * `unreachable` is a first-class outcome, not an exception, because today it is
 * the *expected* one and the UI has an honest state for it.
 */
export type DeletionResult<T> =
  | { status: 'ok'; data: T }
  | { status: 'invalid' }
  | { status: 'expired' }
  | { status: 'rateLimited' }
  | { status: 'unreachable' };

/** Ten seconds. A person waiting on an OTP should not stare at a spinner. */
const TIMEOUT_MS = 10_000;

async function call<T>(
  path: string,
  init: RequestInit,
  parse: (body: unknown) => T
): Promise<DeletionResult<T>> {
  const base = deletionApiBase();
  if (!base) return { status: 'unreachable' };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${base}${path}`, {
      ...init,
      signal: controller.signal,
      headers: { 'content-type': 'application/json', ...(init.headers ?? {}) }
    });

    if (response.status === 429) return { status: 'rateLimited' };
    if (response.status === 401 || response.status === 403) return { status: 'expired' };
    if (response.status === 400 || response.status === 422) return { status: 'invalid' };
    if (!response.ok) return { status: 'unreachable' };

    const text = await response.text();
    return { status: 'ok', data: parse(text ? JSON.parse(text) : {}) };
  } catch {
    // Network failure, DNS failure, timeout, malformed JSON. All of them mean
    // the same thing to the person on the page: this is not working right now.
    // Deliberately not logged with any argument — the caller holds a phone
    // number and a log line here is how it would escape.
    return { status: 'unreachable' };
  } finally {
    clearTimeout(timer);
  }
}

export async function requestOtp(phone: string): Promise<DeletionResult<null>> {
  return call('/v1/deletion/otp/request', {
    method: 'POST',
    body: JSON.stringify({ phone })
  }, () => null);
}

export async function verifyOtp(phone: string, code: string): Promise<DeletionResult<DeletionTicket>> {
  return call('/v1/deletion/otp/verify', {
    method: 'POST',
    body: JSON.stringify({ phone, code })
  }, (body) => {
    const b = (body ?? {}) as Record<string, unknown>;
    return {
      ticket: String(b.ticket ?? ''),
      expiresAt: String(b.expires_at ?? '')
    };
  });
}

export async function previewDeletion(ticket: string): Promise<DeletionResult<DeletionBlocker[]>> {
  return call('/v1/deletion/preview', {
    method: 'GET',
    headers: { authorization: `Ticket ${ticket}` }
  }, (body) => {
    const b = (body ?? {}) as Record<string, unknown>;
    const items = Array.isArray(b.items) ? b.items : [];
    // Rendered as returned. Shape is normalised, content is not.
    return items.map((item) => {
      const i = (item ?? {}) as Record<string, unknown>;
      return {
        reason: String(i.reason ?? 'UNKNOWN'),
        detail: typeof i.detail === 'string' ? i.detail : undefined
      };
    });
  });
}

export async function confirmDeletion(ticket: string): Promise<DeletionResult<null>> {
  return call('/v1/deletion/confirm', {
    method: 'POST',
    headers: { authorization: `Ticket ${ticket}` }
  }, () => null);
}

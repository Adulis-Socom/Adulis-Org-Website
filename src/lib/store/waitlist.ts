/**
 * Where waitlist submissions go — as an interface, with nothing provisioned.
 *
 * ## ⚠ Provision nothing from this file
 *
 * No database, no bucket, no queue, no third-party service. **Choosing where
 * waitlist submissions live IS the Article 22 decision**, and the DPIA lists a
 * legal opinion as required *before any technical provisioning*. That opinion has
 * not landed.
 *
 * The practical consequence, stated plainly: **the waitlist cannot accept a live
 * submission today.** It is built, it is tested, and it sits behind a gate that
 * is legal rather than technical. Adding a real adapter here is not a coding
 * task, and an agent or engineer who "just wires up a database" to make the
 * tests more satisfying has made a decision that was not theirs to make.
 *
 * ## What exists
 *
 * `WebhookWaitlistStore` posts to `WAITLIST_WEBHOOK_URL`. That is the delivery
 * path that already existed, expressed through the interface rather than inlined
 * in the action. It is a relay to a destination the founders configure, not
 * storage this repository provisions.
 *
 * `MemoryWaitlistStore` is for tests and development. It forgets everything on
 * restart, which is the correct behaviour for something holding personal data
 * that nobody has assessed a home for.
 */

/** The stored shape. Every field a founder needs to act on the application. */
export type WaitlistRecord = {
  reference: string;
  fullName: string;
  phone: string;
  primaryPlatform: PrimaryPlatform;
  primaryHandle: string;
  alsoSellOn: AlsoSellOn;
  /** Null when the applicant sells on one platform only. */
  secondHandle: string | null;
  /**
   * Kept as the applicant typed it, deliberately not parsed to a number.
   *
   * INVARIANT — this value is compared to no number, ever. No minimum, no
   * maximum, no warning, no soft signal, no sort order. Every applicant is
   * accepted onto the list and reviewed by hand; the count is an input to the
   * question the beta exists to answer, never a gate.
   *
   * Storing a string rather than an integer is a deliberate guard on that
   * invariant: a numeric column invites a comparison, and there is no arithmetic
   * anyone needs to do on it. See the note in the Checkpoint 3 report.
   */
  followerCount: string | null;
  sells: string;
  city: string;
  /** Always true — a record cannot exist without it. Recorded, not inferred. */
  consent: true;
  consentAt: string;
  submittedAt: string;
  /**
   * Submission + 12 months, per record rather than per table.
   *
   * A retention policy expressed as a column is one a reviewer can verify by
   * looking at a row, and one that survives the data being copied somewhere the
   * policy did not follow it. The consent copy promises exactly this: "Waitlist
   * data is kept for up to 12 months."
   */
  purgeAfter: string;
  /**
   * Keyed HMAC of the phone number, for dedupe only. Never the number itself.
   * Null when no hashing secret is configured. See src/lib/hash.ts.
   */
  phoneKey: string | null;
};

export type PrimaryPlatform = 'TIKTOK' | 'INSTAGRAM';
export type AlsoSellOn = 'TIKTOK' | 'INSTAGRAM' | 'NEITHER';

export interface WaitlistStore {
  /** Persist a record. Throwing means the applicant is told delivery failed. */
  put(record: WaitlistRecord): Promise<void>;

  /**
   * The reference of a submission from the same phone inside `withinMs`, if any.
   *
   * This is what stops a double tap producing two applications and two reference
   * numbers for one person. Returning the ORIGINAL reference means the second
   * submission is a no-op that still shows the applicant a success screen with
   * the number they already have.
   *
   * A store that cannot answer this returns null, and the caller degrades to
   * accepting the duplicate rather than refusing a real applicant.
   */
  findRecentByPhoneKey(phoneKey: string, withinMs: number): Promise<string | null>;
}

/** Twelve months from an ISO timestamp, as an ISO timestamp. */
export function purgeAfterFor(submittedAt: string): string {
  const d = new Date(submittedAt);
  // setUTCMonth handles the year rollover, and a 31st landing in a 30-day month
  // normalises forward by a day. That is well inside the tolerance of a
  // twelve-month retention promise.
  d.setUTCMonth(d.getUTCMonth() + 12);
  return d.toISOString();
}

/**
 * In-memory. For development and tests only.
 *
 * Not exported as a default anywhere: nothing should be able to reach for this
 * accidentally and believe submissions are being kept.
 */
export class MemoryWaitlistStore implements WaitlistStore {
  private records: WaitlistRecord[] = [];

  async put(record: WaitlistRecord): Promise<void> {
    this.records.push(record);
  }

  async findRecentByPhoneKey(phoneKey: string, withinMs: number): Promise<string | null> {
    const cutoff = Date.now() - withinMs;
    for (let i = this.records.length - 1; i >= 0; i--) {
      const r = this.records[i];
      if (r.phoneKey === phoneKey && new Date(r.submittedAt).getTime() >= cutoff) {
        return r.reference;
      }
    }
    return null;
  }

  /** Test seam only. */
  all(): readonly WaitlistRecord[] {
    return this.records;
  }
}

/**
 * Relays to `WAITLIST_WEBHOOK_URL`.
 *
 * Dedupe is answered from a process-local map rather than from the destination,
 * because a webhook is write-only — it cannot be queried.
 *
 * ⚠ That map is per-instance. On Cloudflare Workers, where requests are spread
 * across isolates, two rapid submissions can land in different instances and
 * both will be delivered. This narrows the double-submission window; it does not
 * close it. Closing it needs a store that can actually be read back, which is
 * the provisioning decision that has not been made.
 */
export class WebhookWaitlistStore implements WaitlistStore {
  private recent = new Map<string, { reference: string; at: number }>();

  constructor(private readonly url: string) {}

  async put(record: WaitlistRecord): Promise<void> {
    const response = await fetch(this.url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(record)
    });
    if (!response.ok) throw new Error(`Webhook responded ${response.status}`);

    if (record.phoneKey) {
      this.recent.set(record.phoneKey, { reference: record.reference, at: Date.now() });
    }
    this.sweep();
  }

  async findRecentByPhoneKey(phoneKey: string, withinMs: number): Promise<string | null> {
    this.sweep();
    const hit = this.recent.get(phoneKey);
    if (!hit) return null;
    return Date.now() - hit.at <= withinMs ? hit.reference : null;
  }

  /** Bounded, so a long-lived instance cannot accumulate keys indefinitely. */
  private sweep() {
    const cutoff = Date.now() - DEDUPE_WINDOW_MS;
    for (const [key, value] of this.recent) {
      if (value.at < cutoff) this.recent.delete(key);
    }
  }
}

/**
 * How long a repeat submission from the same phone is treated as a double tap.
 *
 * Long enough to cover a slow connection and an impatient second tap; short
 * enough that somebody who genuinely re-applies later gets a fresh application.
 */
export const DEDUPE_WINDOW_MS = 10 * 60 * 1000;

/**
 * The store this deployment uses.
 *
 * Deliberately a function rather than a module-level singleton, so that reading
 * the environment happens per request and a test can construct its own.
 */
export function waitlistStore(): WaitlistStore | null {
  const url = process.env.WAITLIST_WEBHOOK_URL;
  if (!url) return null;
  return getWebhookStore(url);
}

// One instance per URL, so the dedupe map survives between requests within an
// instance. A fresh store per request would forget every reference immediately
// and make the dedupe check useless.
const webhookStores = new Map<string, WebhookWaitlistStore>();
function getWebhookStore(url: string): WebhookWaitlistStore {
  let store = webhookStores.get(url);
  if (!store) {
    store = new WebhookWaitlistStore(url);
    webhookStores.set(url, store);
  }
  return store;
}

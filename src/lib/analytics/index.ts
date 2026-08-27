/**
 * Counts, and deliberately nothing else.
 *
 * ## Why this can ship when the forms cannot
 *
 * Contact, report and waitlist submissions are blocked on the Article 22
 * decision because they are personal data. This stream is not, and that is a
 * design property rather than a happy accident.
 *
 * What makes web analytics personal data is almost always an **IP address** or a
 * **persistent identifier**. Neither answers any question this site asks, so
 * neither is collected. What is left is aggregate counts, which do not identify
 * anyone, so the legal opinion is not a gate here.
 *
 * ⚠ That property is load-bearing and easy to destroy by accident. Adding a
 * visitor id, a session id, an IP, a user-agent string, or any value that could
 * link two events to one person turns this stream into personal data and puts it
 * straight back behind the same block. `docs/dpia-notes.md` records the
 * property; `PROPERTY_ALLOWLIST` below enforces it.
 *
 * ## What is given up, accepted explicitly
 *
 * No unique visitors, no session duration, no per-person paths.
 * `waitlist_form_viewed` counts page loads rather than people, so the
 * view-to-submit ratio is **directional** and should be sanity-checked against
 * actual submissions once there are a few hundred.
 *
 * For a sixteen-page pre-launch site whose only conversion is reviewed by hand,
 * that is enough. The waitlist store already answers "how many submitted";
 * analytics only supplies the denominator and the abandonment field.
 *
 * ## The third-party-script invariant
 *
 * SECURITY.md forbids third-party analytics. The hazard it names is a third
 * party receiving visitor data **directly from the browser**. Counts written
 * server-side from our own origin do not touch it. Nothing here loads an
 * external script, and `connect-src 'self'` would block one anyway.
 */

/**
 * Every event this site emits. **This list is ADU-WEB-01 §12, exactly.**
 *
 * ⚠ Do not add an event here without adding it to ADU-WEB-01 §12 first.
 *
 * ADU-DB-01 C7 has the website's events sharing the platform's registry, where
 * `analytics.event_definition` is append-only with `UNIQUE (name, version)`.
 * There is no path that edits or removes version 1 — so an event name invented
 * in code because two documents were ambiguous becomes permanent.
 *
 * `door_clicked` was exactly that mistake: a generic event beside
 * `buyer_door_clicked` and `seller_door_clicked`, recording the same fact twice.
 * It existed for one build and is gone.
 *
 * Four events for the contact and report forms are deliberately ABSENT, and this
 * was ruled on rather than left open — do not add them.
 *
 * `waitlist_submitted` exists because the waitlist is the site's only conversion
 * and has to sit in the same stream as `waitlist_form_viewed` to give a ratio.
 * Contact and report have no funnel, nobody is optimising contact-form
 * conversion, and the enquiry stores already answer how many arrived. A
 * validation-failure rate is real but not actionable at this volume: a
 * pre-launch site taking dozens of enquiries surfaces a broken form through the
 * absence of submissions long before a rate would be consulted.
 *
 * The asymmetry decides it. Adding them later costs nothing; adding them now and
 * being wrong costs forever.
 */
export type AnalyticsEvent =
  | 'waitlist_form_viewed'
  | 'waitlist_field_abandoned'
  | 'waitlist_submitted'
  | 'waitlist_validation_failed'
  | 'buyer_door_clicked'
  | 'seller_door_clicked'
  | 'language_switched'
  | 'deletion_requested'
  | 'deletion_blocked';

export const ANALYTICS_EVENTS: readonly AnalyticsEvent[] = [
  'waitlist_form_viewed',
  'waitlist_field_abandoned',
  'waitlist_submitted',
  'waitlist_validation_failed',
  'buyer_door_clicked',
  'seller_door_clicked',
  'language_switched',
  'deletion_requested',
  'deletion_blocked'
];

/** Bumped when the meaning of an existing event changes, never for a new one. */
export const ANALYTICS_VERSION = 1;

/**
 * The only property keys that may accompany an event.
 *
 * An allowlist rather than a denylist, because the failure being prevented is
 * somebody adding a property nobody thought about. Every key here is a small
 * closed set — a field name, a platform, an error reason — and none of them can
 * carry user input.
 *
 * ⚠ Never add a key whose value comes from something a person typed. A city, a
 * handle, a subject line or a phone number in an event turns this stream into
 * personal data.
 */
const PROPERTY_ALLOWLIST = new Set([
  'field',
  'fields',
  'platform',
  'alsoSellOn',
  'reason',
  'locale',
  'route',
  'duplicate',
  'to',
  'from'
]);

/** Values are short and closed-set. Anything longer is a smell, so it is cut. */
const MAX_PROPERTY_LENGTH = 64;

export type AnalyticsProperties = Record<string, string | number | boolean>;

export type AnalyticsPayload = {
  event: AnalyticsEvent;
  v: number;
  ts: string;
  route: string | null;
  locale: string | null;
  properties: Record<string, string | number | boolean>;
};

/**
 * Drops anything not on the allowlist, and truncates what survives.
 *
 * Exported so the API route can apply the identical rule to a payload that
 * arrived over the network, which must be trusted no further than a form post.
 */
export function sanitiseProperties(input: unknown): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  if (!input || typeof input !== 'object') return out;

  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (!PROPERTY_ALLOWLIST.has(key)) continue;
    if (typeof value === 'number' || typeof value === 'boolean') {
      out[key] = value;
    } else if (typeof value === 'string') {
      out[key] = value.slice(0, MAX_PROPERTY_LENGTH);
    }
  }
  return out;
}

export function isAnalyticsEvent(value: unknown): value is AnalyticsEvent {
  return typeof value === 'string' && (ANALYTICS_EVENTS as readonly string[]).includes(value);
}

/* ------------------------------------------------------------------ sinks */

export interface AnalyticsSink {
  record(payload: AnalyticsPayload): void;
}

/**
 * Structured log lines. The cheapest transport that exists, and enough for
 * months — a count is `grep | wc -l`.
 *
 * One line, one JSON object, prefixed so it can be separated from application
 * logging without a parser.
 */
export class LogAnalyticsSink implements AnalyticsSink {
  record(payload: AnalyticsPayload): void {
    console.log(`[analytics] ${JSON.stringify(payload)}`);
  }
}

/** Discards everything. Used when analytics is switched off. */
export class NullAnalyticsSink implements AnalyticsSink {
  record(): void {
    /* deliberately nothing */
  }
}

/**
 * ⚠ Cloudflare Workers Analytics Engine is the other candidate and is NOT
 * implemented here, because binding one is provisioning and provisioning is a
 * decision this repository does not make. When that decision is taken, it is a
 * new class implementing `AnalyticsSink` and one line in `sink()` — nothing
 * else in the codebase changes, because every call site goes through `track()`.
 */

let cached: AnalyticsSink | null = null;

export function sink(): AnalyticsSink {
  if (cached) return cached;
  cached = process.env.ANALYTICS_DISABLED === '1' ? new NullAnalyticsSink() : new LogAnalyticsSink();
  return cached;
}

/** Test seam. Not for application code. */
export function __setSink(next: AnalyticsSink | null) {
  cached = next;
}

/* ------------------------------------------------------------------ track */

/**
 * Records that something happened.
 *
 * On the server this writes straight to the sink. In the browser it posts to
 * `/api/events` on this same origin — no third-party script, and `connect-src
 * 'self'` would block one if somebody tried. The beacon is fire-and-forget:
 * analytics must never delay or break what the person is actually doing.
 */
export function track(event: AnalyticsEvent, properties: AnalyticsProperties = {}): void {
  const clean = sanitiseProperties(properties);

  if (typeof window === 'undefined') {
    sink().record({
      event,
      v: ANALYTICS_VERSION,
      ts: new Date().toISOString(),
      route: typeof clean.route === 'string' ? clean.route : null,
      locale: typeof clean.locale === 'string' ? clean.locale : null,
      properties: clean
    });
    return;
  }

  // Browser. Never awaited, and every failure is swallowed: a blocked or failed
  // beacon must not surface as a console error on a page a seller is reading.
  try {
    const body = JSON.stringify({
      event,
      route: window.location.pathname,
      properties: clean
    });
    // sendBeacon survives the page being navigated away from, which is exactly
    // when an abandonment event fires. It is absent in some engines, so fetch
    // with keepalive is the fallback.
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      navigator.sendBeacon('/api/events', new Blob([body], { type: 'application/json' }));
      return;
    }
    // `keepalive` is what lets a request outlive the page, but WebKit does not
    // support it on fetch and throws rather than ignoring it — which silently
    // dropped every event on this path. Feature-detected rather than assumed.
    const supportsKeepalive = (() => {
      try {
        return 'keepalive' in new Request('/', { method: 'POST' });
      } catch {
        return false;
      }
    })();

    void fetch('/api/events', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
      ...(supportsKeepalive ? { keepalive: true } : {})
    }).catch(() => {});
  } catch {
    /* analytics never breaks the page */
  }
}

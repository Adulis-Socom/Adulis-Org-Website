import { NextResponse } from 'next/server';
import { clientKey, rateLimit } from '@/lib/ratelimit';
import {
  ANALYTICS_VERSION,
  isAnalyticsEvent,
  sanitiseProperties,
  sink
} from '@/lib/analytics';

/**
 * The one place a browser-side event enters the system.
 *
 * Most events are emitted server-side, where no endpoint is needed. Exactly one
 * cannot be: `waitlist_field_abandoned` describes something that happens only in
 * the browser — a field focused and left empty — and the server never sees it.
 *
 * ## What this deliberately does not record
 *
 * The request arrives with an IP address, a user-agent string and whatever
 * headers the browser attached. **None of them are read.** The payload written
 * to the sink is assembled from an allowlisted event name, an allowlisted
 * property bag and a server clock — nothing derived from the connection.
 *
 * That is what keeps the stream out of scope as personal data, and it is one
 * careless line from being untrue. If you find yourself adding
 * `request.headers.get(...)` to the recorded payload, stop: an IP or a
 * user-agent here turns aggregate counts into a record about a person, and the
 * whole stream goes back behind the Article 22 block.
 *
 * `clientKey` IS read, for rate limiting — but only to bound abuse, and it is
 * never written to the sink.
 */

/** Cheap and bounded. Nothing here is worth a large body. */
const MAX_BODY_BYTES = 2_000;

export async function POST(request: Request): Promise<Response> {
  // A public unauthenticated endpoint that writes a log line is a log-flooding
  // target. Generous, because a real person browsing can legitimately emit a
  // handful of events per page.
  const { allowed } = rateLimit(clientKey(request.headers, 'events'), {
    limit: 120,
    windowMs: 60_000
  });
  if (!allowed) {
    // 204 rather than 429 on purpose: this endpoint tells a caller nothing about
    // its own state, and analytics is not something a browser should retry.
    return new NextResponse(null, { status: 204 });
  }

  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY_BYTES) return new NextResponse(null, { status: 204 });
    body = JSON.parse(text);
  } catch {
    return new NextResponse(null, { status: 204 });
  }

  const input = (body ?? {}) as Record<string, unknown>;

  // An unknown event name is dropped rather than recorded. The event set is
  // closed, so anything else is either a stale client or somebody probing.
  if (!isAnalyticsEvent(input.event)) {
    return new NextResponse(null, { status: 204 });
  }

  // The route comes from the client, so it is treated as untrusted: path only,
  // length-bounded, and never reflected anywhere.
  const rawRoute = typeof input.route === 'string' ? input.route : '';
  const route = /^\/[A-Za-z0-9/_-]{0,120}$/.test(rawRoute) ? rawRoute : null;
  const locale = route?.startsWith('/am') ? 'am' : route?.startsWith('/en') ? 'en' : null;

  sink().record({
    event: input.event,
    v: ANALYTICS_VERSION,
    ts: new Date().toISOString(),
    route,
    locale,
    properties: sanitiseProperties(input.properties)
  });

  // No body. There is nothing a caller needs to know, and an empty response is
  // the cheapest thing to send back to a beacon.
  return new NextResponse(null, { status: 204 });
}

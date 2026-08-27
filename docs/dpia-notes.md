# Data-handling design properties

Two records for the DPIA: the analytics stream, and what the store adapters do
and do not decide.

---

## Part 1 — Analytics, a stated design property

**Status:** for the DPIA. This is a record of a design decision, not a legal
opinion.

The website's analytics stream was **built not to be personal data**, rather than
assumed not to be. This document states the property, what enforces it, and what
would break it — so that a later reviewer can check the claim rather than take it
on trust.

It matters because the three forms on this site (waitlist, contact, report
content) are blocked pending the Article 22 decision, and analytics is not. The
difference is entirely in the payload.

---

## The property

**No value collected can link two events to one person.**

| Collected | Not collected |
|---|---|
| Event name, from a closed set of ten | IP address |
| Schema version | Cookie or session identifier |
| Server timestamp | Visitor identifier of any kind |
| Route path | User-agent string |
| Locale (derived from the route) | Referrer |
| A small allowlisted property bag | Anything a person typed |

What ordinarily makes web analytics personal data is an IP address or a
persistent identifier. Neither answers any question this site asks, so neither is
collected. What remains is aggregate counts.

---

## What enforces it

Four things, none of which is a comment asking people to be careful.

1. **A closed event set.** `ANALYTICS_EVENTS` in `src/lib/analytics/index.ts`.
   An event name that is not on the list is dropped, not recorded.

2. **A property allowlist, not a denylist.** `PROPERTY_ALLOWLIST` permits ten
   keys, every one a small closed set — a field name, a platform, an error
   reason. A denylist would only stop the values somebody thought of.

3. **The beacon endpoint assembles the payload itself.** `src/app/api/events/route.ts`
   builds what it writes from an allowlisted event name, an allowlisted property
   bag and a server clock. It reads the connection only for rate limiting, and
   that value is never written.

4. **`npm run check:copy` fails** if that route so much as references
   `user-agent`, `x-forwarded-for`, `cookies()` or `get('cookie')`. Verified by
   adding a user-agent to the payload and watching the check name it.

Tests in `tests/qa/analytics.spec.ts` assert the allowlist drops identifiers,
that unknown events are ignored, that the browser beacon carries field names
only, and that no page makes an off-origin request.

---

## What would break it

Any of these turns the stream into personal data and puts it back behind the same
block that holds the forms:

- adding an IP address, a user-agent, or a referrer to the payload
- adding a visitor id, session id, or any cookie-backed identifier
- adding a property whose value comes from something a person typed — a city, a
  handle, a subject line, a phone number
- a third-party analytics script, which would also violate the standing rule in
  `SECURITY.md` and be blocked by `connect-src 'self'`

---

## What is given up, accepted explicitly

No unique visitors. No session duration. No per-person paths.

`waitlist_form_viewed` counts **page loads, not people**, so the view-to-submit
ratio is directional rather than exact. It should be sanity-checked against
actual submissions once there are a few hundred.

For a sixteen-page pre-launch site whose only conversion is reviewed by hand,
this is sufficient. The waitlist store already answers *how many submitted*;
analytics supplies the denominator and the abandonment field, and nothing else is
needed to decide whether the form is working.

---

## Transport

Behind an `AnalyticsSink` interface, so the destination is reversible.

Today: **structured log lines** (`LogAnalyticsSink`) — one JSON object per line,
prefixed `[analytics]`, queried with grep. The cheapest transport that exists and
adequate for months.

The other candidate is **Cloudflare Workers Analytics Engine**, native to where
the site already runs and written from the Worker with no client script. It is
deliberately **not implemented**: binding one is provisioning, and provisioning
is not a decision this repository makes. When it is taken, it is one new class
and one line in `sink()` — no call site changes, because every one goes through
`track()`.

---

## Part 2 — The store adapters relocate the Article 22 decision, they do not dissolve it

`WaitlistStore` and `EnquiryStore` are interfaces with a webhook relay and an
in-memory adapter. Nothing is provisioned by this repository, and that is the
point — but it should be recorded plainly so nobody later reads the adapter as a
way around the gate.

**Setting `ENQUIRY_WEBHOOK_URL` to a third-party endpoint is choosing a
processor.** It sends a name, an email address and free-text complaint content to
whatever is on the other end. `WAITLIST_WEBHOOK_URL` does the same for names and
phone numbers. That is the Article 22 decision arriving through a different door,
not a bypass of it.

The adapters are correct precisely because they defer the choice to whoever sets
the variable. They do not make it, and setting a variable is not a smaller
decision than writing a database binding.

**Three destinations, three decisions.** `WAITLIST_WEBHOOK_URL`,
`ENQUIRY_WEBHOOK_URL` and `REPORT_WEBHOOK_URL` are separate variables.

They began as one, on the reasoning that one destination is one thing to assess.
That was wrong twice over, and the same test separates them each time: **does the
record contain something the other does not?**

- A waitlist application is a person volunteering their own details.
- A contact enquiry adds free text and an email address.
- **A report contains allegations about a named third party who never visited
  this site and consented to anything.** That is not a difference of degree.

The report destination also carries a 24-hour response commitment the others do
not, and the moderation-record retention interaction below. It should plausibly
be reachable by fewer people than a press enquiry inbox.

### Retention

Twelve months for all three, stated in three places that must agree — the consent
line on each form, the privacy notice, and the `purgeAfter` column on each
record.

⚠ **This is a founder ruling and is provisional, pending the lawyer's review**,
alongside the four undecided legal bodies.

⚠ **One interaction for the lawyer, not modelled here.** A report that leads to a
moderation action becomes a moderation record, and the product's doctrine retains
moderation records in full, permanently. The reporter's contact details and the
record of the action are different things with different lifetimes. A privacy
notice saying "twelve months" while a moderation record persists is a
contradiction someone will find. The platform owns that boundary; this site
should not model it, but the notice has to survive it.

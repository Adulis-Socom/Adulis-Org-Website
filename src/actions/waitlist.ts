'use server';

import { headers } from 'next/headers';
import { clientKey, rateLimit } from '@/lib/ratelimit';
import { spreadsheetSafeRecord } from '@/lib/spreadsheet-safe';
import { phoneKeyHash } from '@/lib/hash';
import { track } from '@/lib/analytics';
import {
  DEDUPE_WINDOW_MS,
  purgeAfterFor,
  waitlistStore,
  type AlsoSellOn,
  type PrimaryPlatform,
  type WaitlistRecord
} from '@/lib/store/waitlist';
import {
  checked,
  isPlausiblePhone,
  str,
  reference as makeReference,
  type FieldErrors,
  type FormState
} from '@/lib/validation';

/** The form's option values, and the enum they map to in the stored record. */
const PLATFORMS = { tiktok: 'TIKTOK', instagram: 'INSTAGRAM' } as const;
const ALSO_SELL_ON = { tiktok: 'TIKTOK', instagram: 'INSTAGRAM', neither: 'NEITHER' } as const;

/**
 * Maximum accepted length per field.
 *
 * Before these existed the only bound was Next's default 1 MB server-action body
 * cap — a framework default nobody chose. A 900,000-character name was validated,
 * logged and delivered (security audit 01, F-09).
 *
 * `followers` is a length bound, not a threshold. Sixteen characters allows a
 * count far larger than any real audience, so it cannot act as a minimum or a
 * rejection path on audience size — the invariant that there is no follower
 * threshold is untouched.
 */
const MAX_LENGTH: Record<string, number> = {
  fullName: 100,
  phone: 32,
  handle: 64,
  secondHandle: 64,
  followers: 16,
  sells: 100,
  city: 100
};

/**
 * There is no rejection path here, and that is deliberate.
 *
 * INVARIANT — `followers` is compared to no number, ever. No minimum, no
 * maximum, no warning, no soft signal, no sort order. Every applicant is
 * accepted onto the waitlist and reviewed by hand; the count is an input to the
 * question the controlled beta exists to answer — what audience size actually
 * predicts a seller who succeeds — and is never a gate.
 *
 * If you find yourself about to write a comparison on it, stop.
 */
export async function submitWaitlist(
  _prev: FormState,
  data: FormData
): Promise<FormState> {
  const values = {
    fullName: str(data, 'fullName'),
    phone: str(data, 'phone'),
    platform: str(data, 'platform'),
    handle: str(data, 'handle'),
    alsoSellOn: str(data, 'alsoSellOn'),
    secondHandle: str(data, 'secondHandle'),
    followers: str(data, 'followers'),
    sells: str(data, 'sells'),
    city: str(data, 'city')
  };

  // Honeypot. A bot that fills every field gets a success screen and goes away;
  // telling it what it tripped on only teaches it to avoid the trap next time.
  //
  // This returns before the rate limiter, so honeypot traffic is unmetered. That
  // is fine for load -- the path does less work than a 404 -- but it also made
  // bot volume invisible, since nothing counted it (security audit 01, R-06).
  // One line, no submission body: the founders should be able to tell whether
  // the site is being hit at all.
  if (str(data, 'company')) {
    console.info('[waitlist] honeypot triggered; submission discarded');
    return { ok: true, errors: {}, values: {}, reference: makeReference('WL') };
  }

  const requestHeaders = await headers();

  // Next already refuses a server action whose Origin disagrees with Host, which
  // is what closes browser CSRF. It accepts a request with no Origin at all,
  // though, so any non-browser client could invoke this directly with no token
  // (security audit 01, F-13). Every real browser sends Origin on a POST, so
  // requiring it costs nothing and closes that path.
  //
  // !! If the no-JavaScript form ever stops working in a real browser, this is
  // the first thing to revert. Some browsers have historically omitted Origin on
  // same-origin form POSTs, and that is exactly the no-JS path. There is a check
  // for it in docs/manual-qa.md; the real abuse control here is rate limiting,
  // not this.
  if (!requestHeaders.get('origin')) {
    return { ok: false, errors: { _form: 'unexpected' }, values };
  }

  const { allowed } = rateLimit(clientKey(requestHeaders, 'waitlist'), { limit: 5 });
  if (!allowed) {
    track('waitlist_validation_failed', { reason: 'rate_limited' });
    return { ok: false, errors: { _form: 'rateLimited' }, values };
  }

  const errors: FieldErrors = {};

  // Length first, so an oversized field reports that rather than passing a
  // presence check and being delivered.
  for (const [field, max] of Object.entries(MAX_LENGTH)) {
    if (values[field as keyof typeof values].length > max) {
      errors[field] = `${field}TooLong`;
    }
  }

  // Length is the more specific complaint, so it is not overwritten by a
  // presence or format check on the same field.
  const set = (field: string, key: string) => {
    if (!errors[field]) errors[field] = key;
  };

  if (!values.fullName) set('fullName', 'fullNameRequired');

  if (!values.phone) set('phone', 'phoneRequired');
  else if (!isPlausiblePhone(values.phone)) set('phone', 'phoneInvalid');

  const platform = PLATFORMS[values.platform as keyof typeof PLATFORMS];
  if (!platform) set('platform', 'platformRequired');

  if (!values.handle) set('handle', 'handleRequired');
  if (!values.sells) set('sells', 'sellsRequired');
  if (!values.city) set('city', 'cityRequired');

  // An unticked checkbox is not submitted at all, so absent must be read as an
  // explicit `false` rather than as "not provided". Treating the two differently
  // is how an unconsented submission gets through on the no-JavaScript path --
  // which is precisely the path this rule exists to protect, because it is the
  // one where the browser sends nothing on the applicant's behalf.
  const consentGiven: false | true = checked(data, 'consent') ? true : false;
  if (!consentGiven) set('consent', 'consentRequired');

  // `followers` still has no threshold and no format rule. The only thing that
  // can fail it is the length bound above, which is far too large to act as one.

  if (Object.keys(errors).length > 0) {
    track('waitlist_validation_failed', { fields: Object.keys(errors).join(',') });
    return { ok: false, errors, values };
  }

  // Selecting "Neither" after typing a second handle is not an error the
  // applicant should have to fix. Without JavaScript the second-handle field is
  // visible from the start, so filling it and then choosing Neither is a normal
  // sequence. The value is discarded server-side and the submission proceeds.
  const alsoSellOn: AlsoSellOn =
    ALSO_SELL_ON[values.alsoSellOn as keyof typeof ALSO_SELL_ON] ?? 'NEITHER';
  const secondHandle = alsoSellOn === 'NEITHER' ? null : values.secondHandle || null;

  const store = waitlistStore();
  const phoneKey = await phoneKeyHash(values.phone);

  // A second identity to count against, so one person cannot use a phone
  // rotation of IPs to bypass the per-client limit. Falls back to IP-only when
  // no secret is configured, rather than failing the applicant.
  if (phoneKey) {
    const perPhone = rateLimit(`waitlist:phone:${phoneKey}`, { limit: 5 });
    if (!perPhone.allowed) {
      track('waitlist_validation_failed', { reason: 'rate_limited_phone' });
      return { ok: false, errors: { _form: 'rateLimited' }, values };
    }
  }

  // A no-JavaScript form on a slow connection, with a submit button that stays
  // enabled by invariant, gets tapped twice. Two records and two reference
  // numbers for one person is a founder on the callback trying to work out which
  // is real. The second submission returns the FIRST reference and writes
  // nothing.
  if (store && phoneKey) {
    const existing = await store.findRecentByPhoneKey(phoneKey, DEDUPE_WINDOW_MS);
    if (existing) {
      console.info('[waitlist] duplicate submission within the dedupe window; returning the original reference');
      track('waitlist_submitted', { duplicate: true });
      return { ok: true, errors: {}, values: {}, reference: existing };
    }
  }

  const reference = makeReference('WL');
  const submittedAt = new Date().toISOString();

  // Escaped at the delivery boundary, never at validation: the value the seller
  // typed is kept intact, and only the copy crossing into a spreadsheet-shaped
  // destination is neutralised. See src/lib/spreadsheet-safe.ts for why, and for
  // the note that this is wrong if the destination stops being a spreadsheet.
  const safe = spreadsheetSafeRecord({
    fullName: values.fullName,
    phone: values.phone,
    handle: values.handle,
    secondHandle: secondHandle ?? '',
    followers: values.followers,
    sells: values.sells,
    city: values.city
  });

  const record: WaitlistRecord = {
    reference,
    fullName: safe.fullName,
    phone: safe.phone,
    primaryPlatform: platform as PrimaryPlatform,
    primaryHandle: safe.handle,
    alsoSellOn,
    secondHandle: secondHandle === null ? null : safe.secondHandle,
    // Never parsed to a number. See the invariant on WaitlistRecord.
    followerCount: values.followers ? safe.followers : null,
    sells: safe.sells,
    city: safe.city,
    // Recorded explicitly rather than left implicit in the presence of a field.
    // Consent is a legal record under Proclamation 1321/2024, and a reviewer
    // should be able to see it in the row rather than infer it from the fact
    // that the row exists.
    consent: true,
    consentAt: submittedAt,
    submittedAt,
    purgeAfter: purgeAfterFor(submittedAt),
    phoneKey
  };

  // No destination configured. This used to log the submission and return a
  // reference number anyway, which meant the site's only conversion failed
  // silently in both directions: the applicant believed they had applied, and no
  // founder ever saw it. A reference number is a promise that the application
  // exists somewhere, so it is only ever issued after delivery succeeds.
  //
  // `npm run build` refuses to produce a build without a destination
  // (scripts/check-env.mjs), so in practice this branch is reachable only in
  // development or under an explicit opt-out.
  if (!store) {
    if (process.env.NODE_ENV === 'development') {
      // Development keeps a console path, but the reference is visibly marked so
      // it can never be mistaken for a delivered application. The submission body
      // is deliberately NOT logged -- it is personal data under Proclamation
      // 1321/2024 and runtime logs are not a destination anybody has assessed.
      console.info(
        `[waitlist] DEV: no store configured. Submission ${reference} was NOT delivered. ` +
          `${Object.keys(values).length} fields captured, body not logged.`
      );
      return { ok: true, errors: {}, values: {}, reference: `DEV-NOT-DELIVERED-${reference}` };
    }

    console.error('[waitlist] no waitlist store configured; refusing the submission');
    return { ok: false, errors: { _form: 'unexpected' }, values };
  }

  try {
    await store.put(record);
  } catch (error) {
    // The error, never the record. A failed fetch does not carry the URL
    // (verified in audit 01, R-07), but the body would carry the applicant's
    // name and phone number.
    console.error('[waitlist] delivery failed', error);
    return { ok: false, errors: { _form: 'unexpected' }, values };
  }

  track('waitlist_submitted', { platform, alsoSellOn });
  return { ok: true, errors: {}, values: {}, reference };
}

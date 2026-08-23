'use server';

import { headers } from 'next/headers';
import { clientKey, rateLimit } from '@/lib/rate-limit';
import { spreadsheetSafeRecord } from '@/lib/spreadsheet-safe';
import {
  checked,
  isPlausiblePhone,
  str,
  waitlistReference,
  type FieldErrors,
  type FormState
} from '@/lib/validation';

const PLATFORMS = ['tiktok', 'instagram'] as const;

/**
 * There is no rejection path here, and that is deliberate.
 *
 * Every applicant is accepted onto the waitlist and reviewed by hand. Follower
 * count is captured as an input to the decision the controlled beta exists to
 * make -- what audience size actually predicts a seller who succeeds -- and is
 * never a gate. Do not add a threshold check to this function.
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
  if (str(data, 'company')) {
    return { ok: true, errors: {}, values: {}, reference: waitlistReference() };
  }

  const { allowed } = rateLimit(clientKey(await headers(), 'waitlist'), { limit: 5 });
  if (!allowed) {
    return { ok: false, errors: { _form: 'rateLimited' }, values };
  }

  const errors: FieldErrors = {};

  if (!values.fullName) errors.fullName = 'fullNameRequired';

  if (!values.phone) errors.phone = 'phoneRequired';
  else if (!isPlausiblePhone(values.phone)) errors.phone = 'phoneInvalid';

  if (!PLATFORMS.includes(values.platform as (typeof PLATFORMS)[number])) {
    errors.platform = 'platformRequired';
  }

  if (!values.handle) errors.handle = 'handleRequired';
  if (!values.sells) errors.sells = 'sellsRequired';
  if (!values.city) errors.city = 'cityRequired';
  if (!checked(data, 'consent')) errors.consent = 'consentRequired';

  // Note the absence: `followers` is never validated. It is optional, it is
  // never compared against a threshold, and no value of it can fail a submission.

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors, values };
  }

  const reference = waitlistReference();

  // Escaped at the delivery boundary, never at validation: the value the seller
  // typed is kept intact, and only the copy crossing into a spreadsheet-shaped
  // destination is neutralised. See src/lib/spreadsheet-safe.ts for why, and for
  // the note that this is wrong if the destination stops being a spreadsheet.
  const submission = {
    reference,
    ...spreadsheetSafeRecord(values),
    submittedAt: new Date().toISOString()
  };

  const webhook = process.env.WAITLIST_WEBHOOK_URL;

  // No destination configured. This used to log the submission and return a
  // reference number anyway, which meant the site's only conversion failed
  // silently in both directions: the applicant believed they had applied, and no
  // founder ever saw it. A reference number is a promise that the application
  // exists somewhere, so it is only ever issued after delivery succeeds.
  //
  // `npm run build` refuses to produce a build without a destination
  // (scripts/check-env.mjs), so in practice this branch is reachable only in
  // development or under an explicit opt-out.
  if (!webhook) {
    if (process.env.NODE_ENV === 'development') {
      // Development keeps a console path, but the reference is visibly marked so
      // it can never be mistaken for a delivered application. The submission body
      // is deliberately NOT logged -- it is personal data under Proclamation
      // 1321/2024 and runtime logs are not a destination anybody has assessed.
      console.info(
        `[waitlist] DEV: no WAITLIST_WEBHOOK_URL set. Submission ${reference} was NOT delivered. ` +
          `${Object.keys(values).length} fields captured, body not logged.`
      );
      return { ok: true, errors: {}, values: {}, reference: `DEV-NOT-DELIVERED-${reference}` };
    }

    console.error('[waitlist] no WAITLIST_WEBHOOK_URL configured; refusing the submission');
    return { ok: false, errors: { _form: 'unexpected' }, values };
  }

  try {
    const response = await fetch(webhook, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(submission)
    });
    if (!response.ok) throw new Error(`Webhook responded ${response.status}`);
  } catch (error) {
    // The error, never the submission. A failed fetch does not carry the URL
    // (verified in audit 01, R-07), but the body would carry the applicant's
    // name and phone number.
    console.error('[waitlist] delivery failed', error);
    return { ok: false, errors: { _form: 'unexpected' }, values };
  }

  return { ok: true, errors: {}, values: {}, reference };
}

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
  try {
    if (webhook) {
      const response = await fetch(webhook, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(submission)
      });
      if (!response.ok) throw new Error(`Webhook responded ${response.status}`);
    } else {
      // No destination configured. The applicant still gets a reference number,
      // but nobody receives the application -- see the README checklist.
      console.info('[waitlist] no WAITLIST_WEBHOOK_URL set; submission not delivered', submission);
    }
  } catch (error) {
    console.error('[waitlist] delivery failed', error);
    return { ok: false, errors: { _form: 'unexpected' }, values };
  }

  return { ok: true, errors: {}, values: {}, reference };
}

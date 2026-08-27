'use server';

import { headers } from 'next/headers';
import { clientKey, rateLimit } from '@/lib/ratelimit';
import { spreadsheetSafeRecord } from '@/lib/spreadsheet-safe';
import { track } from '@/lib/analytics';
import { contactStore, purgeAfterFor, type ContactRecord } from '@/lib/store/enquiries';
import {
  checked,
  isPlausibleEmail,
  str,
  reference as makeReference,
  type FieldErrors,
  type FormState
} from '@/lib/validation';

/**
 * Maximum accepted length per field. The same reasoning as the waitlist: without
 * these the only bound is the server-action body cap, which is a framework
 * default nobody chose.
 *
 * `message` is generous because it is the point of the form — somebody
 * describing a partnership or a press enquiry needs room — but it is bounded.
 */
const MAX_LENGTH: Record<string, number> = {
  name: 100,
  email: 254, // the practical maximum length of an email address
  subject: 150,
  message: 2000
};

export async function submitContact(_prev: FormState, data: FormData): Promise<FormState> {
  const values = {
    name: str(data, 'name'),
    email: str(data, 'email'),
    subject: str(data, 'subject'),
    message: str(data, 'message')
  };

  // Honeypot, as on the waitlist. A bot that fills every field gets a success
  // screen; telling it what it tripped on teaches it to avoid the trap.
  if (str(data, 'company')) {
    console.info('[contact] honeypot triggered; submission discarded');
    return { ok: true, errors: {}, values: {}, reference: makeReference('CON') };
  }

  const requestHeaders = await headers();

  // Next refuses a server action whose Origin disagrees with Host, but accepts
  // one with no Origin at all. Every real browser sends it on a POST.
  if (!requestHeaders.get('origin')) {
    return { ok: false, errors: { _form: 'unexpected' }, values };
  }

  const { allowed } = rateLimit(clientKey(requestHeaders, 'contact'), { limit: 5 });
  if (!allowed) {
    track('contact_validation_failed', { reason: 'rate_limited' });
    return { ok: false, errors: { _form: 'rateLimited' }, values };
  }

  const errors: FieldErrors = {};

  // Length first, so an oversized field reports that rather than passing a
  // presence check and being delivered.
  for (const [field, max] of Object.entries(MAX_LENGTH)) {
    if (values[field as keyof typeof values].length > max) errors[field] = `${field}TooLong`;
  }
  const set = (field: string, key: string) => {
    if (!errors[field]) errors[field] = key;
  };

  if (!values.name) set('name', 'nameRequired');

  // A blank field is "enter your email address", not "that is not valid" — the
  // person has not typed anything wrong yet, and telling them their empty field
  // is malformed is both untrue and unhelpful. The validity message is reserved
  // for a value that is actually present and actually wrong.
  if (!values.email) set('email', 'emailRequired');
  else if (!isPlausibleEmail(values.email)) set('email', 'emailInvalid');

  if (!values.subject) set('subject', 'subjectRequired');
  if (!values.message) set('message', 'messageRequired');

  // An unticked checkbox is not submitted at all, so absent is an explicit
  // false rather than "not provided" — the distinction that lets an unconsented
  // submission through on the no-JavaScript path.
  if (!checked(data, 'consent')) set('consent', 'consentRequired');

  if (Object.keys(errors).length > 0) {
    track('contact_validation_failed', { fields: Object.keys(errors).join(',') });
    return { ok: false, errors, values };
  }

  const store = contactStore();
  const reference = makeReference('CON');
  const submittedAt = new Date().toISOString();
  const safe = spreadsheetSafeRecord(values);

  const record: ContactRecord = {
    reference,
    name: safe.name,
    email: safe.email,
    subject: safe.subject,
    message: safe.message,
    consent: true,
    consentAt: submittedAt,
    submittedAt,
    purgeAfter: purgeAfterFor(submittedAt)
  };

  if (!store) {
    if (process.env.NODE_ENV === 'development') {
      // The body is deliberately NOT logged. It is personal data, and runtime
      // logs are not a destination anybody has assessed.
      console.info(`[contact] DEV: no store configured. ${reference} was NOT delivered.`);
      return { ok: true, errors: {}, values: {}, reference: `DEV-NOT-DELIVERED-${reference}` };
    }
    console.error('[contact] no store configured; refusing the submission');
    return { ok: false, errors: { _form: 'unexpected' }, values };
  }

  try {
    await store.put(record);
  } catch (error) {
    // The error, never the record: the body carries a name and an email address.
    console.error('[contact] delivery failed', error);
    return { ok: false, errors: { _form: 'unexpected' }, values };
  }

  track('contact_submitted');
  return { ok: true, errors: {}, values: {}, reference };
}

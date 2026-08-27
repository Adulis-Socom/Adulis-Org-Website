'use server';

import { headers } from 'next/headers';
import { clientKey, rateLimit } from '@/lib/ratelimit';
import { spreadsheetSafeRecord } from '@/lib/spreadsheet-safe';
import { purgeAfterFor, reportStore, type ReportRecord } from '@/lib/store/enquiries';
import {
  checked,
  str,
  reference as makeReference,
  type FieldErrors,
  type FormState
} from '@/lib/validation';

const MAX_LENGTH: Record<string, number> = {
  what: 200,
  description: 2000,
  link: 500,
  contact: 254
};

/**
 * Content reports.
 *
 * ⚠ **The reason category is not validated against a list**, because there is no
 * list. W21 shows the field as `UNDECIDED — report categories`, and a moderation
 * taxonomy published on a public page is a policy statement rather than copy.
 * Inventing one here would publish a policy nobody approved.
 *
 * The field is therefore optional and stored as submitted, which today is null.
 * When the taxonomy is decided this gains an enum exactly like
 * `primaryPlatform`, and the field becomes required.
 */
export async function submitReport(_prev: FormState, data: FormData): Promise<FormState> {
  const values = {
    what: str(data, 'what'),
    reason: str(data, 'reason'),
    description: str(data, 'description'),
    link: str(data, 'link'),
    contact: str(data, 'contact')
  };

  if (str(data, 'company')) {
    console.info('[report] honeypot triggered; submission discarded');
    return { ok: true, errors: {}, values: {}, reference: makeReference('REP') };
  }

  const requestHeaders = await headers();
  if (!requestHeaders.get('origin')) {
    return { ok: false, errors: { _form: 'unexpected' }, values };
  }

  // Deliberately not tighter than the other forms. A report is the mechanism by
  // which harmful content gets taken down, and throttling someone reporting a
  // scam harder than someone asking a press question would be the wrong trade.
  const { allowed } = rateLimit(clientKey(requestHeaders, 'report'), { limit: 5 });
  if (!allowed) {
    return { ok: false, errors: { _form: 'rateLimited' }, values };
  }

  const errors: FieldErrors = {};
  for (const [field, max] of Object.entries(MAX_LENGTH)) {
    if (values[field as keyof typeof values].length > max) errors[field] = `${field}TooLong`;
  }
  const set = (field: string, key: string) => {
    if (!errors[field]) errors[field] = key;
  };

  if (!values.what) set('what', 'whatRequired');
  if (!values.description) set('description', 'descriptionRequired');
  if (!values.contact) set('contact', 'contactRequired');
  if (!checked(data, 'consent')) set('consent', 'consentRequired');

  // No `reason` check. There is no category list to check against yet, and a
  // required field with no valid values would make the form unsubmittable.

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors, values };
  }

  const store = reportStore();
  const reference = makeReference('REP');
  const submittedAt = new Date().toISOString();
  const safe = spreadsheetSafeRecord(values);

  const record: ReportRecord = {
    reference,
    what: safe.what,
    reason: values.reason ? safe.reason : null,
    description: safe.description,
    link: values.link ? safe.link : null,
    contact: safe.contact,
    consent: true,
    consentAt: submittedAt,
    submittedAt,
    purgeAfter: purgeAfterFor(submittedAt)
  };

  if (!store) {
    if (process.env.NODE_ENV === 'development') {
      console.info(`[report] DEV: no store configured. ${reference} was NOT delivered.`);
      return { ok: true, errors: {}, values: {}, reference: `DEV-NOT-DELIVERED-${reference}` };
    }
    console.error('[report] no store configured; refusing the submission');
    return { ok: false, errors: { _form: 'unexpected' }, values };
  }

  try {
    await store.put(record);
  } catch (error) {
    // The error, never the record. A report body can describe an alleged crime
    // and names the person reporting it.
    console.error('[report] delivery failed', error);
    return { ok: false, errors: { _form: 'unexpected' }, values };
  }

  return { ok: true, errors: {}, values: {}, reference };
}

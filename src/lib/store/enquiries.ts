/**
 * Contact enquiries and content reports.
 *
 * ## ⚠ Provision nothing from this file
 *
 * A name, an email address and free text describing a complaint are exactly the
 * categories the waitlist store is blocked on. **These inherit that block.**
 * Choosing where they live is the Article 22 decision, and the DPIA lists a legal
 * opinion as required before any technical provisioning.
 *
 * So both forms are built and tested and neither can accept a live submission.
 * That is the correct shape, not a failure — the gate is legal, not technical.
 *
 * A report is the more sensitive of the two. Its free-text field may describe a
 * named seller, an alleged crime, or the reporter's own circumstances, and the
 * follow-up contact ties it to a person. Anywhere it is eventually stored needs
 * to be somewhere a moderation record belongs.
 */

import { purgeAfterFor } from './waitlist';

export type ContactRecord = {
  reference: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  consent: true;
  consentAt: string;
  submittedAt: string;
  /**
   * ⚠ Twelve months, matching the waitlist — but unlike the waitlist, **this
   * period is not stated in the consent copy on the page.** W12's consent line
   * says only "to respond to my enquiry". A retention period a person was never
   * told about is a weaker legal position than one they agreed to. Flagged in the
   * Checkpoint 4 report; the number here is a placeholder for a ruling, not a
   * decision this file made.
   */
  purgeAfter: string;
};

export type ReportRecord = {
  reference: string;
  what: string;
  /**
   * Undecided. W21 shows the field as `UNDECIDED — report categories`, and a
   * moderation taxonomy published on a public page is a policy statement rather
   * than copy. Stored as whatever the form submitted, which today is nothing.
   */
  reason: string | null;
  description: string;
  link: string | null;
  contact: string;
  consent: true;
  consentAt: string;
  submittedAt: string;
  /** Same caveat as ContactRecord. W21's consent line states no period either. */
  purgeAfter: string;
};

export interface EnquiryStore<T> {
  put(record: T): Promise<void>;
}

/** In-memory. Development and tests only; forgets everything on restart. */
export class MemoryEnquiryStore<T> implements EnquiryStore<T> {
  private records: T[] = [];
  async put(record: T): Promise<void> {
    this.records.push(record);
  }
  all(): readonly T[] {
    return this.records;
  }
}

/**
 * Relays to a webhook the founders configure. A relay to a destination chosen
 * outside this repository, not storage this repository provisions.
 */
export class WebhookEnquiryStore<T> implements EnquiryStore<T> {
  constructor(
    private readonly url: string,
    private readonly kind: string
  ) {}

  async put(record: T): Promise<void> {
    const response = await fetch(this.url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ kind: this.kind, ...record })
    });
    if (!response.ok) throw new Error(`Webhook responded ${response.status}`);
  }
}

/**
 * `ENQUIRY_WEBHOOK_URL`, separate from the waitlist destination.
 *
 * These first shared `WAITLIST_WEBHOOK_URL` on the reasoning that one
 * destination is one thing to configure and one thing to assess. That was wrong
 * in one direction that matters: a waitlist application and a report alleging
 * that a named seller is selling counterfeit goods are different sensitivity
 * classes, and pointing them at one endpoint makes them one decision when they
 * should be two.
 *
 * ⚠ **Setting this variable is choosing a processor.** It sends a name, an email
 * address and free-text complaint content to whatever is on the other end. That
 * is the Article 22 decision arriving through a different door, not a way round
 * it. The adapter is correct precisely because it defers the choice to whoever
 * sets the variable — it does not make the choice.
 */
export function contactStore(): EnquiryStore<ContactRecord> | null {
  const url = process.env.ENQUIRY_WEBHOOK_URL;
  return url ? new WebhookEnquiryStore<ContactRecord>(url, 'contact') : null;
}

export function reportStore(): EnquiryStore<ReportRecord> | null {
  const url = process.env.ENQUIRY_WEBHOOK_URL;
  return url ? new WebhookEnquiryStore<ReportRecord>(url, 'report') : null;
}

export { purgeAfterFor };

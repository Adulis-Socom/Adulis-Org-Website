'use server';

import { headers } from 'next/headers';
import { clientKey, rateLimit } from '@/lib/ratelimit';
import { track } from '@/lib/analytics';
import { isPlausiblePhone } from '@/lib/validation';
import {
  confirmDeletion,
  previewDeletion,
  requestOtp,
  verifyOtp,
  type DeletionBlocker
} from '@/lib/deletion/client';

/**
 * The deletion flow, as a server action.
 *
 * ## Why a server action and not client handlers
 *
 * The flow used to advance through `onSubmit` handlers with `preventDefault`.
 * That works only when JavaScript does, and every other form on this site works
 * without it by invariant. The person it failed is the one on a slow connection
 * whose bundle never arrives — which is the population this site is built for —
 * and this is also the app-store gate, so it must not depend on a bundle.
 *
 * ## Where the ticket lives
 *
 * In a **hidden field**, carried across `verify → preview → confirm`.
 *
 * That is no weaker than the React state it replaces: both put the ticket in the
 * DOM, and neither transmits automatically. What matters is what it is NOT — it
 * is not a cookie, so it is never attached to an unrelated request, and it does
 * not survive a reload of the page by itself.
 *
 * ## What is never stored
 *
 * The phone number is carried in a hidden field for the length of the flow
 * because `otp/verify` needs it alongside the code. It is written to no store, no
 * log and no analytics event. There is deliberately no log line in this file that
 * takes a phone or a code argument.
 */

export type DeletionStep =
  | 'explain'
  | 'phone'
  | 'otp'
  | 'confirm'
  | 'blocked'
  | 'success'
  | 'unreachable';

export type DeletionState = {
  step: DeletionStep;
  /** Carried across steps in a hidden field. Never persisted. */
  phone: string;
  /** Carried across steps in a hidden field. Never a cookie. */
  ticket: string | null;
  /** Exactly as the server returned them. */
  blockers: DeletionBlocker[];
  /** A key into the `deleteAccount` namespace, never a rendered sentence. */
  error: string | null;
};

export const initialDeletionState: DeletionState = {
  step: 'explain',
  phone: '',
  ticket: null,
  blockers: [],
  error: null
};

/** Origin required, as on every other action, plus a per-client backstop. */
async function guard(scope: string): Promise<boolean> {
  const requestHeaders = await headers();
  if (!requestHeaders.get('origin')) return false;
  return rateLimit(clientKey(requestHeaders, scope), { limit: 10 }).allowed;
}

function fail(state: DeletionState, error: string): DeletionState {
  return { ...state, error };
}

/**
 * One action for every step, chosen by the `intent` field.
 *
 * A single action keeps the whole state machine server-side. Reaching `confirm`
 * requires a ticket that only `verify` can produce, so there is no client
 * transition into it by construction (security audit 01, F-02).
 */
export async function advanceDeletion(
  prev: DeletionState,
  data: FormData
): Promise<DeletionState> {
  const intent = String(data.get('intent') ?? '');
  const phone = String(data.get('phone') ?? prev.phone).trim();
  const ticket = String(data.get('ticket') ?? prev.ticket ?? '') || null;
  const carried: DeletionState = { ...prev, phone, ticket, error: null };

  if (intent === 'explain') return { ...carried, step: 'phone' };
  if (intent === 'cancel') return { ...initialDeletionState };

  if (intent === 'request' || intent === 'resend') {
    if (!(await guard('deletion-otp'))) return fail(carried, 'rateLimited');
    // A format check only, so nobody waits for a code that was never going to
    // arrive. It is not authorisation: the server owns whether a number gets an
    // OTP, and answers identically whether or not an account exists.
    if (!isPlausiblePhone(phone)) return fail({ ...carried, step: 'phone' }, 'phoneInvalid');

    const result = await requestOtp(phone);
    if (result.status === 'unreachable') return { ...carried, step: 'unreachable' };
    if (result.status !== 'ok') return fail({ ...carried, step: 'phone' }, result.status);

    track('deletion_requested');
    return { ...carried, step: 'otp' };
  }

  if (intent === 'verify') {
    if (!(await guard('deletion-verify'))) return fail({ ...carried, step: 'otp' }, 'rateLimited');
    const code = String(data.get('code') ?? '').trim();

    const verified = await verifyOtp(phone, code);
    if (verified.status === 'unreachable') return { ...carried, step: 'unreachable' };
    if (verified.status !== 'ok') return fail({ ...carried, step: 'otp' }, 'otpInvalid');

    // The blocked list is requested only AFTER the code is verified, and never in
    // the same response as the check — otherwise the check becomes an oracle for
    // whether an account exists.
    const preview = await previewDeletion(verified.data.ticket);
    if (preview.status === 'unreachable') return { ...carried, step: 'unreachable' };
    if (preview.status !== 'ok') return fail({ ...carried, step: 'phone' }, 'expired');

    if (preview.data.length > 0) {
      track('deletion_blocked');
      return { ...carried, ticket: verified.data.ticket, blockers: preview.data, step: 'blocked' };
    }
    return { ...carried, ticket: verified.data.ticket, step: 'confirm' };
  }

  if (intent === 'confirm') {
    if (!(await guard('deletion-confirm'))) return fail({ ...carried, step: 'confirm' }, 'rateLimited');
    if (data.get('acknowledge') !== 'on') {
      return fail({ ...carried, step: 'confirm' }, 'confirmRequired');
    }
    // No ticket means the flow was entered by something other than a verified
    // code. There is no path here by construction; this refuses it anyway.
    if (!ticket) return fail({ ...initialDeletionState, step: 'phone' }, 'expired');

    const done = await confirmDeletion(ticket);
    if (done.status === 'unreachable') return { ...carried, step: 'unreachable' };
    if (done.status !== 'ok') return fail({ ...carried, step: 'confirm' }, 'expired');

    // The ticket is dropped the moment it has been used.
    return { ...initialDeletionState, step: 'success' };
  }

  return carried;
}

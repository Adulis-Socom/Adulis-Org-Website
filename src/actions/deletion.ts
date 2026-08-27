'use server';

import { headers } from 'next/headers';
import { clientKey, rateLimit } from '@/lib/ratelimit';
import {
  confirmDeletion,
  previewDeletion,
  requestOtp,
  verifyOtp,
  type DeletionBlocker,
  type DeletionResult,
  type DeletionTicket
} from '@/lib/deletion/client';

/**
 * The deletion flow's calls go through the server, not from the browser.
 *
 * The product API is a different origin, and the CSP sets `connect-src 'self'` —
 * a browser fetch to it would be blocked. Relaxing the CSP to allow it would put
 * the deletion API directly in reach of any script on the page, which is a worse
 * trade than one server hop.
 *
 * ## What this does not do
 *
 * **Nothing here writes a cookie.** The ticket is returned to the caller, held in
 * React state for the life of the flow, and passed back on the next call. A
 * ticket in a cookie would be a session, and this site has no session — which is
 * the entire reason deletion uses an OTP rather than a sign-in.
 *
 * **Nothing here stores or logs the phone number.** It arrives, it is forwarded,
 * it is forgotten. There is deliberately no log line in this file that takes a
 * phone or a code argument, and no analytics event carries either.
 */

/** Rate limiting here is a backstop; the product API owns the real per-phone limit. */
async function guard(scope: string): Promise<boolean> {
  const requestHeaders = await headers();
  // Origin required, as on every other action. Next accepts a request with no
  // Origin at all, and every real browser sends one on a POST.
  if (!requestHeaders.get('origin')) return false;
  return rateLimit(clientKey(requestHeaders, scope), { limit: 10 }).allowed;
}

export async function startDeletion(phone: string): Promise<DeletionResult<null>> {
  if (!(await guard('deletion-otp'))) return { status: 'rateLimited' };
  return requestOtp(phone);
}

export async function verifyDeletionCode(
  phone: string,
  code: string
): Promise<DeletionResult<DeletionTicket>> {
  if (!(await guard('deletion-verify'))) return { status: 'rateLimited' };
  return verifyOtp(phone, code);
}

export async function loadDeletionPreview(
  ticket: string
): Promise<DeletionResult<DeletionBlocker[]>> {
  if (!(await guard('deletion-preview'))) return { status: 'rateLimited' };
  return previewDeletion(ticket);
}

export async function completeDeletion(ticket: string): Promise<DeletionResult<null>> {
  if (!(await guard('deletion-confirm'))) return { status: 'rateLimited' };
  return confirmDeletion(ticket);
}

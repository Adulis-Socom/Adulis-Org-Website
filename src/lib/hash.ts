/**
 * Keyed hashing for values used as rate-limit and dedupe keys.
 *
 * ## Why an HMAC and not a hash
 *
 * A bare SHA-256 of a phone number is the phone number, stored slightly
 * awkwardly. Ethiopian mobile numbers are `+251 9XX XXX XXX` — on the order of
 * **10⁸ candidates**. Enumerating that space and hashing each one is seconds of
 * work on a laptop, so an unkeyed digest in a rate-limit table is a privacy
 * control in name only: anyone who reads the table recovers every number in it.
 *
 * An HMAC with a server-side secret removes that. Without the key the digest is
 * not reversible by enumeration, because the attacker cannot compute candidate
 * digests at all.
 *
 * ## The secret
 *
 * `WAITLIST_HASH_SECRET`, from the environment, never from this repository.
 * `scripts/check-env.mjs` refuses a production build without it.
 *
 * Rotating it invalidates every existing counter. That is acceptable and worth
 * saying out loud: a rate-limit window here is minutes, so the worst case of a
 * rotation is that a handful of people briefly get a fresh allowance.
 *
 * ## Why WebCrypto rather than node:crypto
 *
 * This has to keep working on Cloudflare Workers, where `node:crypto` is only
 * partially available. `crypto.subtle` is present in both Node 18+ and Workers.
 * It is async, which costs nothing here because the caller is already async.
 */

/** Cached key material, so a submission does not re-import the secret each time. */
let cachedKey: CryptoKey | null = null;
let cachedSecret: string | null = null;

async function hmacKey(secret: string): Promise<CryptoKey> {
  if (cachedKey && cachedSecret === secret) return cachedKey;
  cachedKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  cachedSecret = secret;
  return cachedKey;
}

/**
 * A keyed, non-reversible identifier for a phone number.
 *
 * Returns `null` when no secret is configured. Callers must treat that as "phone
 * keying is unavailable" and fall back to a weaker control, never as "this
 * submission is fine" — see the caller in src/actions/waitlist.ts.
 *
 * The number is normalised to digits first, so `+251 911 284 763`,
 * `0911284763` and `251911284763` do not produce three different keys and
 * quietly triple somebody's allowance.
 */
export async function phoneKeyHash(phone: string): Promise<string | null> {
  const secret = process.env.WAITLIST_HASH_SECRET;
  if (!secret) return null;

  // Digits only, and leading zeros and country code reconciled, so the same
  // human number always lands on the same key regardless of how it was typed.
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('251')) digits = digits.slice(3);
  digits = digits.replace(/^0+/, '');

  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(digits));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

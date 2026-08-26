import createMiddleware from 'next-intl/middleware';
import type { NextRequest } from 'next/server';
import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);

/**
 * Content-Security-Policy with a per-request nonce on `script-src`.
 *
 * `'unsafe-inline'` is deliberately absent, and so is `'unsafe-eval'`.
 *
 * ## Why this replaced the previous policy
 *
 * The earlier policy carried `'unsafe-inline'` on `script-src`, on the grounds
 * that a nonce deoptimises static rendering and the site had no injection sink:
 * no `dangerouslySetInnerHTML`, no `eval`, no third-party script, and no
 * user-generated content rendered anywhere. That decision was recorded in
 * SECURITY.md **with an expiry condition** -- reopen it the moment any
 * user-supplied content is rendered into a page.
 *
 * That condition has now fired, in advance rather than in arrears: this origin
 * will also serve seller storefronts, which render seller-written product
 * descriptions and buyer-written review text. A policy retrofitted at that point
 * is a policy written under pressure, so it is written now.
 *
 * `'strict-dynamic'` lets a nonced script load the chunks it needs without every
 * chunk URL being enumerated in the policy, which is what makes this workable
 * against a bundler that names files by content hash.
 *
 * ## The cost, stated plainly
 *
 * A per-request nonce cannot be baked into a page at build time, so pages that
 * read it render per request. See the Checkpoint 1 report for the measured
 * effect on the prerender count.
 */
function buildCsp(nonce: string, isHttps: boolean): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    // Styles take the nonce too. `'unsafe-inline'` was tried here first and
    // turned out to be unnecessary: with the nonce, 30 pages load with zero
    // style-src violations, so the weaker value was removed rather than left in
    // because it happened to work.
    `style-src 'self' 'nonce-${nonce}'`,
    "font-src 'self'",
    "img-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "object-src 'none'",
    // Only meaningful on an https page, and actively destructive on an http one.
    //
    // This directive rewrites http subresource URLs to https. On http://localhost
    // there is nothing listening on https, so every stylesheet and chunk fails to
    // load. Chromium exempts localhost and hid this completely; WebKit does not,
    // and the whole site rendered unstyled and unhydrated -- 74 QA tests failed
    // with symptoms (a 36px button, aria-expanded stuck at false) that look
    // nothing like a CSP problem. It logs **no** console violation, because the
    // requests are not blocked by policy; they are reissued to a port that is not
    // there and fail as SSL errors.
    //
    // HSTS already forces https for real traffic, so gating this costs nothing.
    ...(isHttps ? ['upgrade-insecure-requests'] : [])
  ].join('; ');
}

export default function middleware(request: NextRequest) {
  // Base64 of 16 random bytes. crypto is available on the edge runtime.
  const nonce = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))));
  // Cloudflare terminates TLS and forwards over http, so the forwarded header is
  // the authority here, not the protocol of the request that reached this worker.
  const isHttps =
    request.headers.get('x-forwarded-proto') === 'https' ||
    request.nextUrl.protocol === 'https:';
  const csp = buildCsp(nonce, isHttps);

  // Next reads the nonce off the REQUEST headers to stamp it onto the inline
  // bootstrap scripts it emits. Setting it only on the response would produce a
  // policy that blocks the framework's own scripts.
  request.headers.set('x-nonce', nonce);
  request.headers.set('content-security-policy', csp);

  const response = intlMiddleware(request);
  response.headers.set('content-security-policy', csp);

  return response;
}

export const config = {
  // Run on everything except Next internals, the API surface and static files.
  // The dot exclusion also keeps /.well-known/* out of locale rewriting, which
  // matters when the App Links and Universal Links association files land there.
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};

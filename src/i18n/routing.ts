import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';
import { locales, defaultLocale, AM_ENABLED } from './config';

// Re-exported so every existing `@/i18n/routing` import keeps working. The
// declarations themselves live in ./config, which has no next-intl dependency --
// see that file for why.
export { locales, defaultLocale, AM_ENABLED };
export type { Locale } from './config';

/**
 * Path-based rather than cookie-based, and with detection off on purpose:
 *
 * - a shared link lands in the language it was shared in, not in whatever the
 *   recipient's browser happens to prefer
 * - nothing about language selection depends on JavaScript
 *
 * `'as-needed'` (founder ruling D-01, ADU-WEB-02 §8, ADU-MKT-01 §66): English
 * is the canonical international site at unprefixed URLs (`/`, `/about`), and
 * other locales carry their prefix (`/am/about`). next-intl itself redirects
 * `/en/...` to the unprefixed equivalent, so `/en` never serves a second copy
 * of the English site. `scripts/check-routes.mjs` asserts both halves.
 *
 * A locale path is a language, never a Market (ADU-MKT-01 §8): nothing here
 * reads IP or geolocation.
 *
 * `alternateLinks: false` — next-intl would otherwise send a `Link:` header
 * advertising every locale, `/am` included, built from the request host. That
 * contradicts the page metadata, which advertises a locale only while it is on
 * offer (`AM_ENABLED`) and against `NEXT_PUBLIC_SITE_URL`. One source of
 * hreflang: `buildPageMetadata`.
 *
 * `localeCookie: false` — with detection off the cookie is never read, so
 * setting it on every response only added a `Set-Cookie` header to pages that
 * have no reason to carry one.
 */
export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: 'as-needed',
  localeDetection: false,
  alternateLinks: false,
  localeCookie: false
});

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);

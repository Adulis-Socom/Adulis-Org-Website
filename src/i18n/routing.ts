import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';

export const locales = ['en', 'am'] as const;
export type Locale = (typeof locales)[number];

/**
 * Whether the Amharic locale is offered to visitors.
 *
 * INVARIANT -- this flag is read from this module and nowhere else. It is never
 * duplicated into a component, an environment variable, or a conditional in a
 * page. One boolean, one place.
 *
 * While false:
 *   - the language switcher is not rendered on any surface
 *   - /am/* still resolves, so URLs stay stable and translation can land
 *     incrementally
 *   - /am/* is noindex regardless of NEXT_PUBLIC_SITE_URL
 *   - the English fallback in request.ts continues to work unchanged
 *
 * It is false because `src/messages/am.json` holds no approved translations, and a
 * person who taps አማርኛ and is served English learns something true about how
 * carefully this was built. Better to offer nothing than to break the promise.
 *
 * It may only be set true when ALL of these hold:
 *   1. am.json contains human-approved translations for every key in en.json
 *   2. Ge'ez layout validation has run against those real strings
 *      (ADU-PROJ-01 v9.0 section 12)
 *   3. The Ethiopic micro-subset for the switcher label is implemented, so the
 *      full Ge'ez face is still not fetched on /en (ADU-WEB-01 sections 8.1, 9.1)
 */
export const AM_ENABLED = false;

/**
 * Prefixed rather than cookie-based, and with detection off on purpose:
 *
 * - a shared link lands in the language it was shared in, not in whatever the
 *   recipient's browser happens to prefer
 * - both trees index
 * - nothing about language selection depends on JavaScript
 * - `/` resolves to `/en` deterministically, which is what the launch check
 *   asserts
 */
export const routing = defineRouting({
  locales,
  defaultLocale: 'en',
  localePrefix: 'always',
  localeDetection: false
});

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);

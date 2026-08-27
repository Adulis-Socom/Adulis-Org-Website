import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';
import { locales, defaultLocale, AM_ENABLED } from './config';

// Re-exported so every existing `@/i18n/routing` import keeps working. The
// declarations themselves live in ./config, which has no next-intl dependency --
// see that file for why.
export { locales, defaultLocale, AM_ENABLED };
export type { Locale } from './config';

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
  defaultLocale,
  localePrefix: 'always',
  localeDetection: false
});

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);

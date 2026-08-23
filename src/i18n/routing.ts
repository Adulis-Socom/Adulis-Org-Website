import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';

export const locales = ['en', 'am'] as const;
export type Locale = (typeof locales)[number];

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

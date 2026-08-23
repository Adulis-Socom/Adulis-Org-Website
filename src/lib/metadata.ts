import type { Metadata } from 'next';
import { AM_ENABLED, routing } from '@/i18n/routing';
import type { RoutePath } from './routes';

/**
 * One entry point for every field of page metadata that depends on the route or
 * the locale: title, robots, canonical and hreflang alternates.
 *
 * ## Why one helper and not two
 *
 * The behaviour this guards against is that **a page's `metadata` replaces the
 * layout's value for each field it sets, silently** — no error, no warning, no
 * build failure. Crucially it is *per field*, not wholesale: a page setting only
 * `robots` keeps the layout's title, canonical and alternates. That is what
 * makes it easy to miss — the page looks right and one field is quietly wrong.
 *
 * That is exactly how the canonical defect survived. `robots` was centralised
 * and `alternates` was not, every page inherited the layout's locale-root
 * canonical, and because the override is per-field nothing looked broken.
 * Fifteen pages each declared the home page as their canonical.
 *
 * Two helpers would preserve that failure mode: a page could call one and forget
 * the other. One helper means a page cannot half-adopt it. There is deliberately
 * no exported `buildRobots` — a helper that still exists will get called.
 *
 * **No page hand-writes title, robots, canonical or alternates.**
 */
export type PageMetadataIntent = {
  /** The locale segment this page is rendering for. */
  locale: string;
  /**
   * The page's own route, from `ROUTES`. Omit it for a surface that should
   * declare no canonical at all — the 404 and the catch-all. Never pass a
   * placeholder path to satisfy the type.
   */
  path?: RoutePath;
  /** A Tier 2 placeholder. Nothing worth indexing until it is built. */
  unbuilt?: boolean;
  /** Reachable by URL but never meant to rank — the account-deletion path. */
  unlisted?: boolean;
  title?: string;
  description?: string;
};

/**
 * Why this page is not indexable, in the order the reasons are evaluated. Empty
 * means indexable. Diagnostic only — it produces no metadata, so it cannot be
 * mistaken for a substitute for `buildPageMetadata`.
 */
export function noIndexReasons({
  locale,
  unbuilt = false,
  unlisted = false
}: Pick<PageMetadataIntent, 'locale' | 'unbuilt' | 'unlisted'>): string[] {
  const reasons: string[] = [];

  if (unbuilt) reasons.push('tier-2-stub-not-built');
  if (unlisted) reasons.push('deliberately-unlisted');

  // /am resolves so URLs stay stable and translation can land key by key, but it
  // must not be indexed while it is serving English fallback text.
  if (locale === 'am' && !AM_ENABLED) reasons.push('locale-not-offered');

  // No domain is decided yet. A pre-launch build indexed under the Adulis name
  // is public use of a name whose IP registration is not complete.
  if (!process.env.NEXT_PUBLIC_SITE_URL) reasons.push('no-public-site-url');

  return reasons;
}

/** `/en`, `/en/about` — never `/en/` for the home route. */
function localeHref(locale: string, path: RoutePath): string {
  return path === '/' ? `/${locale}` : `/${locale}${path}`;
}

export function buildPageMetadata({
  locale,
  path,
  unbuilt = false,
  unlisted = false,
  title,
  description
}: PageMetadataIntent): Metadata {
  const metadata: Metadata = {
    // `undefined` means indexable — Next then emits no robots meta at all,
    // which is the correct representation of "no restriction".
    robots:
      noIndexReasons({ locale, unbuilt, unlisted }).length > 0
        ? { index: false, follow: false }
        : undefined
  };

  if (title !== undefined) metadata.title = title;
  if (description !== undefined) metadata.description = description;

  if (path !== undefined) {
    metadata.alternates = {
      // The page's own URL. Never the locale root -- that told search engines
      // all fifteen pages were duplicates of the home page.
      canonical: localeHref(locale, path),
      languages: {
        en: localeHref('en', path),
        // Only advertise a locale actually on offer. While AM_ENABLED is false
        // /am is noindex, and an hreflang alternate pointing at a noindex page
        // is self-contradictory -- search engines discard it and it advertises
        // an unfinished surface. It returns with the flag.
        ...(AM_ENABLED ? { am: localeHref('am', path) } : {}),
        'x-default': localeHref(routing.defaultLocale, path)
      }
    };
  }

  return metadata;
}

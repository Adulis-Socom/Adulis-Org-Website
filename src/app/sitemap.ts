import type { MetadataRoute } from 'next';
import { indexableRoutes } from '@/lib/routes';
import { AM_ENABLED, defaultLocale, locales } from '@/i18n/config';

/**
 * `/sitemap.xml`.
 *
 * ## The rule this exists to keep
 *
 * **A sitemap must never list a route the site tells crawlers to ignore.** That
 * is a contradiction search engines act on: submitting a URL and then serving it
 * with `noindex` is a signal that the site does not know its own mind, and it
 * costs crawl budget on a site that has very little to spend.
 *
 * So the route list comes from `indexableRoutes()`, which reads the same
 * `INDEX_POLICY` that each page's `generateMetadata` reads. There is one answer
 * to "may this be indexed", in one place, and this file is a consumer of it
 * rather than a second copy.
 *
 * ## Three ways this comes back empty, all correct
 *
 * 1. **No `NEXT_PUBLIC_SITE_URL`.** There are no absolute URLs to emit, and
 *    `robots.txt` is disallowing everything anyway.
 * 2. **A route with an `INDEX_POLICY` entry** — the four legal pages, contact,
 *    report content, and the deliberately unlisted `/delete-account`.
 * 3. **Amharic, while `AM_ENABLED` is false.** `/am` resolves so URLs stay
 *    stable and translation can land incrementally, but it serves English
 *    fallback text and must not be indexed as if it were Amharic.
 *
 * When the Amharic catalogue lands and the flag flips, the `am` entries appear
 * here with no change to this file.
 *
 * ## Generated per request, not at build
 *
 * Without this, `NEXT_PUBLIC_SITE_URL` is read once during `next build` and the
 * result is frozen — a build that happened before the domain was configured
 * would serve a permanently closed robots.txt and an empty sitemap that no
 * runtime variable could reopen. The rest of the site already renders per
 * request for the CSP nonce, so this costs nothing extra.
 */
export const dynamic = 'force-dynamic';

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) return [];

  const base = siteUrl.replace(/\/$/, '');
  const offered = locales.filter((locale) => locale === defaultLocale || AM_ENABLED);
  const href = (locale: string, path: string) => `${base}/${locale}${path === '/' ? '' : path}`;

  return indexableRoutes().flatMap((path) =>
    offered.map((locale) => ({
      url: href(locale, path),
      lastModified: new Date(),
      // Every alternate that is actually on offer, so a crawler is told about
      // the other locale rather than finding it and guessing at the pairing.
      alternates: {
        languages: Object.fromEntries(offered.map((l) => [l, href(l, path)]))
      }
    }))
  );
}

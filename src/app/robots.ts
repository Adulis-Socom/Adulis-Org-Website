import type { MetadataRoute } from 'next';

/**
 * `/robots.txt`.
 *
 * Two states, and the default is the closed one.
 *
 * **No `NEXT_PUBLIC_SITE_URL` → `Disallow: /` for everything.** No domain is
 * decided yet, IP registration is not complete, and a preview URL is a real
 * crawlable URL. Every page already emits `noindex` in that state; this says the
 * same thing at the door, so a crawler does not need to fetch a page to learn it.
 *
 * **A site URL configured → crawling allowed, plus a sitemap pointer.** The
 * sitemap itself decides which routes are listed, and it reads the same
 * `INDEX_POLICY` the pages do.
 *
 * `/api/` is disallowed in both states. It holds one endpoint that takes a
 * beacon and returns 204 — there is nothing to index and no reason to spend
 * anyone's crawl budget on it.
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

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  if (!siteUrl) {
    return {
      rules: [{ userAgent: '*', disallow: '/' }]
    };
  }

  return {
    rules: [{ userAgent: '*', allow: '/', disallow: '/api/' }],
    sitemap: `${siteUrl.replace(/\/$/, '')}/sitemap.xml`
  };
}

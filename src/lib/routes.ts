/**
 * Every route path in the site, in one place.
 *
 * Nothing hand-writes an href or a metadata path. A page references
 * `ROUTES.about` rather than `'/about'`, so a rename or a typo becomes a
 * compile error caught by `npm run typecheck` — no extra script, no drift
 * between a hardcoded string and the route folder it is supposed to name.
 *
 * That mattered here: a path string that quietly diverges from its route is the
 * same class of silent bug as the canonical URL that produced this file.
 *
 * Values are locale-relative. The locale prefix is added by `next-intl`'s `Link`
 * for navigation, and by `buildPageMetadata` for canonical and hreflang URLs.
 */
export const ROUTES = {
  home: '/',
  howItWorks: '/how-it-works',
  forSellers: '/for-sellers',
  forBuyers: '/for-buyers',
  about: '/about',
  trustAndSafety: '/trust-and-safety',
  help: '/help',
  contact: '/contact',
  terms: '/terms',
  privacy: '/privacy',
  sellerTerms: '/seller-terms',
  refunds: '/refunds-and-disputes',
  prohibited: '/prohibited-products',
  report: '/report-content',
  deleteAccount: '/delete-account'
} as const;

export type RouteKey = keyof typeof ROUTES;
export type RoutePath = (typeof ROUTES)[RouteKey];

/**
 * Why a route is not indexable, in one place.
 *
 * This used to live in fifteen separate `generateMetadata` calls. That was fine
 * while nothing else needed it — and then `sitemap.ts` did, and a second copy of
 * "which routes may be indexed" is the exact drift this file exists to prevent.
 * A sitemap listing routes the site tells crawlers to ignore is a contradiction
 * search engines act on.
 *
 * `unbuilt` — real content, but something inside it is still undecided. The four
 * legal pages have placeholder bodies; contact has no working addresses; report
 * has no reason categories.
 *
 * `unlisted` — complete and deliberately not advertised. `/delete-account` is
 * reachable from the footer and from app-store metadata, and that is the whole
 * audience for it.
 *
 * A route absent from this map is indexable, subject to the two conditions no
 * route controls: a public site URL existing, and the locale being on offer.
 */
export const INDEX_POLICY: Partial<
  Record<RouteKey, { unbuilt?: boolean; unlisted?: boolean }>
> = {
  contact: { unbuilt: true },
  terms: { unbuilt: true },
  privacy: { unbuilt: true },
  sellerTerms: { unbuilt: true },
  refunds: { unbuilt: true },
  report: { unbuilt: true },
  deleteAccount: { unlisted: true }
};

export function indexPolicy(key: RouteKey): { unbuilt?: boolean; unlisted?: boolean } {
  return INDEX_POLICY[key] ?? {};
}

/** The routes a sitemap may list: no policy against them at all. */
export function indexableRoutes(): RoutePath[] {
  return (Object.keys(ROUTES) as RouteKey[])
    .filter((key) => Object.keys(indexPolicy(key)).length === 0)
    .map((key) => ROUTES[key]);
}

/** The waitlist form lives on the For Sellers page, at an anchor. */
export const WAITLIST_HREF = `${ROUTES.forSellers}#waitlist` as const;

/**
 * The seller console. A different origin, and the only sign-in affordance that
 * exists anywhere on this site.
 *
 * Not in ROUTES on purpose. Everything in ROUTES is locale-relative and gets a
 * locale prefix; this is absolute, external, and must never be handed to
 * next-intl's `Link` -- that would produce `/en/https://...`.
 *
 * Read from the environment rather than written here because the console's
 * hostname is not this repository's to decide, and a placeholder that ships is
 * worse than a build that fails. `scripts/check-env.mjs` refuses a production
 * build without it. The development fallback is deliberately obvious.
 */
export const SELLER_CONSOLE_URL =
  process.env.NEXT_PUBLIC_SELLER_CONSOLE_URL ?? 'https://console.invalid/';

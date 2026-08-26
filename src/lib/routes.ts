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

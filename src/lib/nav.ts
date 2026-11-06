import { ROUTES, SELLER_CONSOLE_URL } from './routes';

/**
 * The single source of truth for navigation. The header, the mobile menu and the
 * footer all read these arrays, so a link cannot exist in one and not the
 * others -- which is how "Privacy" ends up unreachable on mobile.
 *
 * `key` indexes into the `nav` and `footer` namespaces in messages/*.json.
 * `href` comes from ROUTES, never from a literal.
 */
/**
 * The prototype's header order (`f448d06`). Availability joins between Trust &
 * Safety and About when its route exists (WEB-MIG-005) — a nav entry must
 * never point at a page that 404s. Help moved to the footer, as in the
 * prototype.
 */
export const primaryNav = [
  { key: 'howItWorks', href: ROUTES.howItWorks },
  { key: 'forSellers', href: ROUTES.forSellers },
  { key: 'forBuyers', href: ROUTES.forBuyers },
  { key: 'trustAndSafety', href: ROUTES.trustAndSafety },
  { key: 'about', href: ROUTES.about }
] as const;

/**
 * Footer row 2. Two of these are app-store requirements (Report content, Delete
 * my account) and one is a data-protection requirement (Privacy), so the whole
 * row appears on every page.
 */
export const legalNav = [
  { key: 'terms', href: ROUTES.terms },
  { key: 'privacy', href: ROUTES.privacy },
  { key: 'sellerTerms', href: ROUTES.sellerTerms },
  { key: 'refunds', href: ROUTES.refunds },
  { key: 'prohibited', href: ROUTES.prohibited },
  { key: 'report', href: ROUTES.report },
  { key: 'deleteAccount', href: ROUTES.deleteAccount }
] as const;

/**
 * The footer's three groups, after the prototype's Platform / Company / Legal
 * columns, built from the entries above so a link cannot exist in the header
 * and be missing here.
 *
 * Two deliberate departures from the prototype: Trust & Safety is listed
 * (the prototype omitted it), and Legal keeps Refunds & Disputes, because every
 * page must reach the full legal row. Press is absent until approved content
 * exists (founder ruling D-04); Pricing and Availability join when their routes
 * exist (WEB-MIG-004, WEB-MIG-005).
 *
 * `key` resolves in the `footer` namespace first and `nav` second.
 */
export const footerNav = [
  {
    key: 'platform',
    links: primaryNav.filter((item) => item.key !== 'about')
  },
  {
    key: 'company',
    links: [
      { key: 'about', href: ROUTES.about },
      { key: 'help', href: ROUTES.help },
      { key: 'contact', href: ROUTES.contact }
    ]
  },
  { key: 'legal', links: legalNav }
] as const;

/**
 * The language switcher's labels, and the only Ge'ez that may appear on an
 * English page.
 *
 * Declared here rather than inside the component because a build step reads them:
 * `scripts/build-ethiopic-subset.mjs` derives the exact codepoint set from these
 * strings and checks the committed font subset still covers it. Hard-coding the
 * codepoints somewhere else breaks silently the day someone writes
 * `አማርኛ ቋንቋ` -- the extra glyphs would render as boxes with nothing failing.
 *
 * That is not hypothetical. The Checkpoint 1 ruling listed `ኛ` as U+123B; it is
 * U+129B. U+123B is `ሻ`, a different letter. Deriving from the string caught it;
 * a hand-written list would have shipped `አማር` followed by a box.
 */
export const LOCALE_LABELS = {
  en: 'EN',
  am: 'አማርኛ'
} as const;

/**
 * The one sign-in affordance on this site.
 *
 * INVARIANT — the only sign-in affordance on this site is a single outbound link
 * to the seller console origin. There is no same-origin sign-in route, no
 * session, no cookie-based identity, and no buyer-facing sign-in language.
 * Buyers never sign in on the web.
 *
 * This object is the single allowlisted occurrence of sign-in wording in the
 * source tree. `scripts/check-copy.mjs` enforces all three halves of that:
 * the wording appears nowhere else, no `/login`-shaped route exists, and this
 * `href` points at the console origin and nowhere else.
 *
 * `external: true` is load-bearing. It must be rendered with a plain anchor --
 * next-intl's `Link` would prefix the locale and produce `/en/https://...`.
 *
 * It appears on every route, `/delete-account` included. The no-sign-in rule on
 * that page governs the page body, not the global chrome, and its own copy
 * already states that the OTP is not a sign-in.
 */
export const sellerConsoleLink = {
  key: 'logIn',
  href: SELLER_CONSOLE_URL,
  external: true
} as const;

export { ROUTES, WAITLIST_HREF, SELLER_CONSOLE_URL } from './routes';

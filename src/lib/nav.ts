import { ROUTES } from './routes';

/**
 * The single source of truth for navigation. The header, the mobile menu and the
 * footer all read these arrays, so a link cannot exist in one and not the
 * others -- which is how "Privacy" ends up unreachable on mobile.
 *
 * `key` indexes into the `nav` and `footer` namespaces in messages/*.json.
 * `href` comes from ROUTES, never from a literal.
 */
export const primaryNav = [
  { key: 'howItWorks', href: ROUTES.howItWorks },
  { key: 'forSellers', href: ROUTES.forSellers },
  { key: 'forBuyers', href: ROUTES.forBuyers },
  { key: 'about', href: ROUTES.about },
  { key: 'trustAndSafety', href: ROUTES.trustAndSafety },
  { key: 'help', href: ROUTES.help }
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

export { ROUTES, WAITLIST_HREF } from './routes';

/**
 * The single source of truth for navigation. The header, the mobile menu and the
 * footer all read these arrays, so a link cannot exist in one and not the
 * others -- which is how "Privacy" ends up unreachable on mobile.
 *
 * `key` indexes into the `nav` and `footer` namespaces in messages/*.json.
 */
export const primaryNav = [
  { key: 'howItWorks', href: '/how-it-works' },
  { key: 'forSellers', href: '/for-sellers' },
  { key: 'forBuyers', href: '/for-buyers' },
  { key: 'about', href: '/about' },
  { key: 'trustAndSafety', href: '/trust-and-safety' },
  { key: 'help', href: '/help' }
] as const;

/**
 * Footer row 2. Two of these are app-store requirements (Report content, Delete
 * my account) and one is a data-protection requirement (Privacy), so the whole
 * row appears on every page.
 */
export const legalNav = [
  { key: 'terms', href: '/terms' },
  { key: 'privacy', href: '/privacy' },
  { key: 'sellerTerms', href: '/seller-terms' },
  { key: 'refunds', href: '/refunds-and-disputes' },
  { key: 'prohibited', href: '/prohibited-products' },
  { key: 'report', href: '/report-content' },
  { key: 'deleteAccount', href: '/delete-account' }
] as const;

export const WAITLIST_HREF = '/for-sellers#waitlist';

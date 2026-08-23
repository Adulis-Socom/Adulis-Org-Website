import type { Metadata } from 'next';
import { AM_ENABLED } from '@/i18n/routing';

/**
 * One place decides what may be indexed. Pages declare what they *are*; they
 * never hand-write a robots object.
 *
 * This exists because of a Next.js behaviour worth knowing once rather than
 * rediscovering: **a page's `metadata` replaces the layout's value for each
 * field it sets, silently.** No error, no warning, no build failure. The Tier 2
 * stubs set `robots: {index: false}` and so quietly dropped the layout's
 * `follow: false` on `/am` routes — `/am/help` disagreed with `/am/about` and
 * nothing anywhere said so.
 *
 * The consequence is not really about `follow`, which on a private pre-launch
 * site is worth almost nothing. It is that the same mechanism will clobber
 * `alternates.languages`, the canonical URL or the title template the day
 * someone sets one of those on a page — and those do matter once the site is
 * public. Centralising the decision closes the class, not just this instance.
 *
 * Three reasons a page may be unindexable, and they compose: any one is enough.
 */
export type RobotsIntent = {
  /** The locale segment this page is rendering for. */
  locale: string;
  /** A Tier 2 placeholder. Nothing worth indexing until it is built. */
  unbuilt?: boolean;
  /** Reachable by URL but never meant to rank — the account-deletion path. */
  unlisted?: boolean;
};

/**
 * Why this page is not indexable, in the order the reasons are evaluated.
 * Empty means indexable. Exported so the reason can be asserted, not inferred.
 */
export function noIndexReasons({
  locale,
  unbuilt = false,
  unlisted = false
}: RobotsIntent): string[] {
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

/**
 * The computed directive. `undefined` means indexable — Next then emits no
 * robots meta at all, which is the correct representation of "no restriction".
 */
export function buildRobots(intent: RobotsIntent): Metadata['robots'] {
  return noIndexReasons(intent).length > 0 ? { index: false, follow: false } : undefined;
}

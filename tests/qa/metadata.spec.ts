import { test, expect } from './fixtures';
import { noIndexReasons } from '@/lib/metadata';
import { AM_ENABLED } from '@/i18n/config';

/**
 * §2.10 — why a page is noindex, not merely that it is.
 *
 * Six routes are noindex because their content is undecided, and the whole `/am`
 * tree is noindex because Amharic is not on offer yet. **These two lift at
 * different times.** Conflating them means the Amharic tree either starts
 * indexing the moment the legal text lands, or stays hidden after the
 * translation arrives — and both failures are silent, because the page renders
 * identically either way.
 *
 * This runs against the exported reason function rather than over HTTP on
 * purpose. Over HTTP all three reasons collapse into the same `noindex` header,
 * so a response cannot tell you WHICH reason applied -- and the whole point here
 * is that the reasons are separable.
 */
test.describe('§2.10 noindex reasons are independent', () => {
  test('Amharic is noindex for its locale, not for undecided content', () => {
    const reasons = noIndexReasons({ locale: 'am', unbuilt: false });
    expect(reasons, 'a built /am route must still be noindex').toContain('locale-not-offered');
    expect(
      reasons,
      'a built /am route must NOT claim undecided content as its reason'
    ).not.toContain('tier-2-stub-not-built');
  });

  test('undecided content is noindex for its content, not for its locale', () => {
    const reasons = noIndexReasons({ locale: 'en', unbuilt: true });
    expect(reasons).toContain('tier-2-stub-not-built');
    expect(reasons, 'an English route must never be noindex for locale').not.toContain(
      'locale-not-offered'
    );
  });

  test('an /am route with undecided content carries both reasons', () => {
    const reasons = noIndexReasons({ locale: 'am', unbuilt: true });
    expect(reasons).toContain('locale-not-offered');
    expect(reasons).toContain('tier-2-stub-not-built');
  });

  /**
   * The guard that matters when the flag flips. If `locale-not-offered` were ever
   * driven by anything other than AM_ENABLED, /am would stay hidden after the
   * translation lands and nobody would notice for months.
   */
  test('locale-not-offered tracks AM_ENABLED and nothing else', () => {
    const reasons = noIndexReasons({ locale: 'am', unbuilt: false });
    const present = reasons.includes('locale-not-offered');
    expect(
      present,
      `AM_ENABLED is ${AM_ENABLED}, so locale-not-offered should be ${!AM_ENABLED}`
    ).toBe(!AM_ENABLED);
  });
});

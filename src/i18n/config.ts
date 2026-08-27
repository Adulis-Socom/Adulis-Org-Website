/**
 * Locale configuration, with no dependency on next-intl.
 *
 * Split out of `routing.ts` so that anything needing to reason about locales --
 * `lib/metadata.ts` in particular -- does not drag in `next-intl/navigation`,
 * which pulls `next/navigation` and only resolves inside Next's bundler.
 *
 * That import chain is why the noindex logic had no test: importing
 * `lib/metadata.ts` from a plain Node context failed at
 * `Cannot find module 'next/navigation'`. Config that describes *what* the
 * locales are does not need the machinery that routes them.
 *
 * `routing.ts` re-exports everything here, so existing imports are unaffected.
 */

export const locales = ['en', 'am'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

/**
 * Whether the Amharic locale is offered to visitors.
 *
 * INVARIANT -- this flag is read from this module and nowhere else. It is never
 * duplicated into a component, an environment variable, or a conditional in a
 * page. One boolean, one place.
 *
 * While false:
 *   - the language switcher is not rendered on any surface
 *   - /am/* still resolves, so URLs stay stable and translation can land
 *     incrementally
 *   - /am/* is noindex regardless of NEXT_PUBLIC_SITE_URL
 *   - the English fallback in request.ts continues to work unchanged
 *
 * It is false because `src/messages/am.json` holds no approved translations, and
 * a person who taps አማርኛ and is served English learns something true about how
 * carefully this was built. Better to offer nothing than to break the promise.
 *
 * ⚠ The noindex on /am must be driven by THIS flag and by nothing else. It is a
 * different reason from `tier-2-stub-not-built`, and the two lift at different
 * times: legal text landing must not start indexing Amharic, and the translation
 * landing must not leave it hidden. `tests/qa/metadata.spec.ts` asserts they stay
 * independent.
 *
 * It may only be set true when ALL of these hold:
 *   1. am.json contains human-approved translations for every key in en.json
 *   2. Ge'ez layout validation has run against those real strings
 *      (ADU-PROJ-01 v9.0 section 12)
 *   3. ~~The Ethiopic micro-subset for the switcher label is implemented~~ —
 *      DONE at Checkpoint 1 (R2). The switcher label is served from a
 *      2,648-byte subset and the full face is never fetched on /en.
 */
export const AM_ENABLED = false;

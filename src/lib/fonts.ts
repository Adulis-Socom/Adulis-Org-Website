import { Inter, Noto_Sans_Ethiopic } from 'next/font/google';
import localFont from 'next/font/local';

/**
 * The font stack is load-bearing, and this is the fix for a real defect rather
 * than a preference.
 *
 * An earlier wireframe round applied an Ethiopic-only family. A font covering
 * only the Ethiopic block has no Latin letters, no digits and no punctuation, so
 * on every Amharic page `ADULIS`, `TikTok`, `Instagram` and every number
 * rendered as a missing-glyph box -- including every published figure the
 * product exists to show. The Ge'ez itself looked correct, so a reviewer who
 * does not read Amharic would not have noticed.
 *
 * Latin comes first and Ethiopic is the fallback. Because each face declares its
 * own `unicode-range`, the browser fetches an Ethiopic file only when Ge'ez
 * glyphs actually appear.
 */
export const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  preload: true
});

/**
 * Face A -- the switcher subset. Four glyphs, 2,648 bytes.
 *
 * The full Ethiopic face is **198,028 bytes**. The only Ge'ez on an English page
 * is the language switcher's own label, so without this every English visitor
 * would download 198 KB to draw four characters -- on the low-end Android over a
 * slow connection that PRD §23 names as the binding performance constraint.
 * Measured directly: injecting Ge'ez into a loaded English page fetched exactly
 * one new file, the 198 KB one.
 *
 * The `unicode-range` is what makes it free. A browser fetches this only when one
 * of those four codepoints is rendered, and no other Ge'ez can resolve through
 * it. That is deliberate: on an English route, any Ge'ez beyond the switcher
 * label renders as a missing-glyph box, which is the signal you want, because
 * Ge'ez has no business being there. The subset is self-policing.
 *
 * The file and its `unicode-range` are generated from the labels in
 * `src/lib/nav.ts` by `scripts/build-ethiopic-subset.mjs`, which runs in
 * `prebuild` and fails if the labels drift from the committed subset. Do not
 * hand-edit either -- see that file for why a hand-written codepoint list is a
 * silent failure.
 */
export const ethiopicSwitcher = localFont({
  src: '../fonts/ethiopic-switcher.woff2',
  display: 'swap',
  variable: '--font-ethiopic-switcher',
  preload: false,
  declarations: [{ prop: 'unicode-range', value: 'U+121B, U+122D, U+129B, U+12A0' }]
});

/**
 * Face B -- the full Ethiopic face, for Amharic routes only.
 *
 * Applied by the locale layout when `locale === 'am'`, never globally. An
 * English page must never reference this family; Face A covers the only Ge'ez it
 * is allowed to contain.
 *
 * `preload: false` because Amharic pages still lead with Latin -- the wordmark,
 * platform names and every numeral -- so preloading this would compete with the
 * font that draws the first line of text.
 */
export const notoEthiopic = Noto_Sans_Ethiopic({
  subsets: ['ethiopic'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-ethiopic',
  preload: false
});

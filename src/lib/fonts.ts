import { DM_Mono, Fraunces, Noto_Sans_Ethiopic, Outfit } from 'next/font/google';
import localFont from 'next/font/local';

/**
 * The three Latin faces of the approved prototype (`f448d06`): Fraunces for
 * display and headings, Outfit for body and UI, DM Mono for labels, prices and
 * step numbers.
 *
 * The prototype loads them from a Google Fonts stylesheet at runtime. Here they
 * go through `next/font/google`, which downloads them at BUILD time and serves
 * them from this origin — so `font-src 'self'` holds (ADU-CSP-01 §20), no
 * visitor contacts Google, nothing is committed to the repository, and
 * next/font's metric-adjusted fallbacks keep the swap from shifting layout.
 *
 * Latin subset and the fewest weights the type styles use, because every weight
 * is another file on the low-end Android this site is built for:
 *
 *   Fraunces  600            every heading is SemiBold
 *   Outfit    400 500 600    body, medium nav/labels, semibold buttons
 *   DM Mono   500            mono labels and figures
 *
 * `scripts/check-font.mjs` refuses a build where a subset or weight list
 * widens, and `tests/qa/headers-fonts.spec.ts` measures what reaches the
 * browser against the byte budget.
 *
 * ⚠ `next/font/google` keeps the real family names. Never write 'Fraunces',
 * 'Outfit' or 'DM Mono' as a literal anywhere in CSS — it would match the
 * webfont and defeat the `var()` fallback, the same defect that once shipped
 * 198 KB of Ethiopic on every English page.
 *
 * Latin comes first and Ethiopic is the fallback (tailwind.config.ts). Each
 * face declares its own `unicode-range`, so the browser fetches an Ethiopic
 * file only when Ge'ez glyphs actually appear — an Ethiopic-only family once
 * rendered `ADULIS`, `TikTok` and every number on Amharic pages as boxes.
 */
export const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['600'],
  display: 'swap',
  variable: '--font-fraunces',
  preload: true
});

export const outfit = Outfit({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
  variable: '--font-outfit',
  preload: true
});

export const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['500'],
  display: 'swap',
  variable: '--font-dm-mono',
  // Labels sit below the fold more often than not; preloading this would
  // compete with the faces that draw the first heading and paragraph.
  preload: false
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

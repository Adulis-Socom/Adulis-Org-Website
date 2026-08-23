import { Inter, Noto_Sans_Ethiopic } from 'next/font/google';

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
 * own `unicode-range`, the browser fetches the Ethiopic file only when Ge'ez
 * glyphs actually appear -- English pages never download it, which matters on
 * the low-end Android over a slow connection that is the binding constraint.
 */
export const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  preload: true
});

export const notoEthiopic = Noto_Sans_Ethiopic({
  subsets: ['ethiopic'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-ethiopic',
  preload: false
});

#!/usr/bin/env node
/**
 * Keeps the switcher-sized Ethiopic font subset honest.
 *
 * ## Why this exists
 *
 * The full Noto Sans Ethiopic face is **198 KB**. The only Ge'ez on an English
 * page is the language switcher's own label -- four characters. Shipping 198 KB
 * to every English visitor to draw four characters, on the low-end Android over
 * a slow connection that PRD §23 names as the binding performance constraint, is
 * the single largest avoidable cost on the page.
 *
 * So there are two faces:
 *
 *   Face A  this subset, ~1-2 KB, declared globally with a `unicode-range`
 *           restricted to exactly the switcher's codepoints
 *   Face B  the full face, applied only on Amharic routes
 *
 * ## Why it derives the codepoints instead of listing them
 *
 * A hand-written codepoint list breaks silently. The glyphs it misses render as
 * missing-glyph boxes and nothing fails -- no build error, no test, and nobody
 * who cannot read Ge'ez would notice in review.
 *
 * That is not a hypothetical risk. The ruling that commissioned this file listed
 * `ኛ` as U+123B. It is U+129B; U+123B is `ሻ`, a different letter. Deriving the
 * set from the string caught it. A hand-written list would have shipped the word
 * for "Amharic" with its last letter as a box, in the control offering Amharic.
 *
 * ## A useful side effect
 *
 * On an English route only these four glyphs can resolve. Any other Ge'ez
 * appearing there renders as a box -- which is exactly the signal you want,
 * because Ge'ez has no business on an English page. The subset is self-policing.
 *
 * ## Running it
 *
 *   node scripts/build-ethiopic-subset.mjs           verify (runs in prebuild/CI)
 *   node scripts/build-ethiopic-subset.mjs --write   re-fetch and regenerate
 *
 * Verification is offline and deterministic: it compares the codepoints the
 * labels need against the manifest committed beside the font. Only `--write`
 * touches the network, so CI never depends on Google being reachable. If the
 * labels change, verification fails and tells you to run `--write`.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { coveredCodepoints } from './lib/woff2-cmap.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FONT_DIR = join(ROOT, 'src/fonts');
const FONT_FILE = join(FONT_DIR, 'ethiopic-switcher.woff2');
const MANIFEST = join(FONT_DIR, 'ethiopic-switcher.json');
const WRITE = process.argv.includes('--write');

/** Ethiopic and Ethiopic Supplement/Extended blocks. */
function isEthiopic(cp) {
  return (
    (cp >= 0x1200 && cp <= 0x139f) ||
    (cp >= 0x2d80 && cp <= 0x2ddf) ||
    (cp >= 0xab00 && cp <= 0xab2f) ||
    (cp >= 0x1e7e0 && cp <= 0x1e7ff)
  );
}

/**
 * The labels, read out of the source rather than restated here. Restating them
 * is the exact failure this script exists to prevent.
 */
function switcherLabels() {
  const src = readFileSync(join(ROOT, 'src/lib/nav.ts'), 'utf8');
  const start = src.indexOf('export const LOCALE_LABELS');
  if (start === -1) throw new Error('LOCALE_LABELS not found in src/lib/nav.ts');
  const block = src.slice(start, src.indexOf('} as const', start));
  const labels = [...block.matchAll(/:\s*'([^']*)'/g)].map((m) => m[1]);
  if (labels.length === 0) throw new Error('LOCALE_LABELS parsed but empty');
  return labels;
}

function requiredCodepoints() {
  const set = new Set();
  for (const label of switcherLabels()) {
    for (const ch of label) {
      const cp = ch.codePointAt(0);
      if (isEthiopic(cp)) set.add(cp);
    }
  }
  return [...set].sort((a, b) => a - b);
}

const hex = (cp) => 'U+' + cp.toString(16).toUpperCase().padStart(4, '0');

const required = requiredCodepoints();
if (required.length === 0) {
  console.error('\nfont: no Ethiopic codepoints in LOCALE_LABELS. Expected at least one.\n');
  process.exit(1);
}

if (!WRITE) {
  if (!existsSync(FONT_FILE) || !existsSync(MANIFEST)) {
    console.error(
      '\nfont: the Ethiopic switcher subset is missing.' +
        '\n      Run: node scripts/build-ethiopic-subset.mjs --write\n'
    );
    process.exit(1);
  }
  const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
  const have = manifest.codepoints ?? [];
  const missing = required.filter((cp) => !have.includes(cp));
  const extra = have.filter((cp) => !required.includes(cp));

  const bytes = readFileSync(FONT_FILE);
  const digest = 'sha256:' + createHash('sha256').update(bytes).digest('hex');
  const tampered = manifest.sha256 && manifest.sha256 !== digest;

  // The check that matters: read the cmap out of the font binary and confirm it
  // really maps every codepoint the label needs.
  //
  // Comparing the label against the manifest only proves the manifest and the
  // file belong together. If the subsetting request ever returned a font missing
  // a glyph, the manifest -- written from that same response -- would claim
  // coverage anyway, the check would pass, and the switcher would render a box
  // with everything green. That is the U+123B class of failure exactly.
  let uncovered = [];
  let cmapError = null;
  try {
    const covered = coveredCodepoints(bytes);
    uncovered = required.filter((cp) => !covered.has(cp));
  } catch (err) {
    cmapError = err.message;
  }

  if (missing.length || tampered || uncovered.length || cmapError) {
    console.error('\nfont: the committed subset does not match the switcher labels.');
    if (missing.length) {
      console.error(`      missing glyphs: ${missing.map(hex).join(', ')}`);
      console.error('      These would render as missing-glyph boxes in the switcher.');
    }
    if (tampered) console.error(`      font file hash does not match the manifest`);
    if (uncovered.length) {
      console.error(`      the FONT BINARY does not map: ${uncovered.map(hex).join(', ')}`);
      console.error('      The manifest claims coverage the font does not have.');
    }
    if (cmapError) console.error(`      could not read the font's cmap: ${cmapError}`);
    console.error('\n      Run: node scripts/build-ethiopic-subset.mjs --write\n');
    process.exit(1);
  }
  if (extra.length) {
    // Not a failure: a shrunk label leaves harmless unused glyphs behind.
    console.log(`font: note - subset carries ${extra.length} glyph(s) no longer used`);
  }
  console.log(
    `font: ethiopic switcher subset ok — cmap verified for ` +
      `${required.map(hex).join(', ')} (${bytes.length} bytes)`
  );
  process.exit(0);
}

/* ------------------------------------------------------------------ --write */

const text = [...new Set(required.map((cp) => String.fromCodePoint(cp)))].join('');
const cssUrl =
  'https://fonts.googleapis.com/css2?family=Noto+Sans+Ethiopic:wght@400;500;600;700&display=swap&text=' +
  encodeURIComponent(text);

// Google serves woff2 only to user agents it believes support it.
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

console.log(`font: requesting subset for ${required.map(hex).join(', ')}`);
const cssRes = await fetch(cssUrl, { headers: { 'User-Agent': UA } });
if (!cssRes.ok) {
  console.error(`\nfont: Google Fonts returned ${cssRes.status}.\n`);
  process.exit(1);
}
const css = await cssRes.text();

const fontUrl = (css.match(/src:\s*url\(([^)]+)\)/) ?? [])[1];
if (!fontUrl) {
  console.error('\nfont: no font URL in the returned CSS.\n');
  process.exit(1);
}
const range = (css.match(/unicode-range:\s*([^;]+);/) ?? [])[1]?.trim() ?? '';

const fontRes = await fetch(fontUrl, { headers: { 'User-Agent': UA } });
if (!fontRes.ok) {
  console.error(`\nfont: font download returned ${fontRes.status}.\n`);
  process.exit(1);
}
const bytes = Buffer.from(await fontRes.arrayBuffer());

// Sanity: a full Ethiopic face is ~198 KB. Anything near that is not a subset,
// which would silently reintroduce the exact cost this file exists to remove.
if (bytes.length > 20000) {
  console.error(
    `\nfont: downloaded ${bytes.length} bytes, which is too large to be a subset.` +
      '\n      Refusing to commit it. Check the text= parameter.\n'
  );
  process.exit(1);
}

mkdirSync(FONT_DIR, { recursive: true });
writeFileSync(FONT_FILE, bytes);
writeFileSync(
  MANIFEST,
  JSON.stringify(
    {
      note: 'Generated by scripts/build-ethiopic-subset.mjs. Do not edit by hand.',
      source: 'Noto Sans Ethiopic (Google Fonts), SIL Open Font License 1.1',
      labels: switcherLabels(),
      codepoints: required,
      codepointsHex: required.map(hex),
      unicodeRange: range,
      bytes: bytes.length,
      sha256: 'sha256:' + createHash('sha256').update(bytes).digest('hex')
    },
    null,
    2
  ) + '\n'
);

console.log(`font: wrote ${bytes.length} bytes covering ${required.map(hex).join(', ')}`);
console.log(`font: unicode-range ${range}`);

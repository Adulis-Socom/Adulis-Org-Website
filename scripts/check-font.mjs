#!/usr/bin/env node
/**
 * `npm run check:font` — both faces this site self-hosts, before every build.
 *
 *   1. The Ethiopic switcher subset: cmap-verified against the labels it must
 *      draw. `scripts/build-ethiopic-subset.mjs`, unchanged, run first.
 *
 *   2. The display face, Instrument Sans (Phase C). It arrives through
 *      `next/font/google`, so there is no committed file to open — what can
 *      drift is the DECLARATION in `src/lib/fonts.ts`, and a widened
 *      declaration is silent: an extra weight or the `latin-ext` subset adds
 *      files to every English page and nothing fails. This reads the
 *      declaration out of the source and refuses a build where it has grown.
 *
 * The byte budget itself is measured in a browser by
 * `tests/qa/headers-fonts.spec.ts`; this is the static half, so a mistake fails
 * in a second at the point of writing rather than fifteen minutes later.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/* ------------------------------------------------- 1. the Ethiopic subset */
const subset = spawnSync(process.execPath, [join(ROOT, 'scripts/build-ethiopic-subset.mjs'), ...process.argv.slice(2)], {
  stdio: 'inherit'
});
if (subset.status !== 0) process.exit(subset.status ?? 1);

/* --------------------------------------------------- 2. the display face */

/** Exactly what the ten text styles need. Anything beyond this is bytes with no reader. */
const EXPECTED = {
  subsets: ['latin'],
  weights: ['600'],
  variable: '--font-instrument'
};

const src = readFileSync(join(ROOT, 'src/lib/fonts.ts'), 'utf8');
const start = src.indexOf('Instrument_Sans(');
if (start === -1) {
  console.error('\nfont: Instrument_Sans is not declared in src/lib/fonts.ts.\n');
  process.exit(1);
}
const block = src.slice(start, src.indexOf('});', start));

const list = (key) => {
  const m = block.match(new RegExp(`${key}:\\s*\\[([^\\]]*)\\]`));
  return m ? [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]).sort() : null;
};
const problems = [];

const subsets = list('subsets');
if (!subsets) problems.push('no `subsets` list');
else if (subsets.join() !== EXPECTED.subsets.join()) {
  problems.push(`subsets are [${subsets}] — expected [${EXPECTED.subsets}]. latin-ext adds a file to every English page.`);
}

const weights = list('weight');
if (!weights) problems.push('no `weight` list — a variable font without one ships the whole axis');
else if (weights.join() !== EXPECTED.weights.join()) {
  problems.push(`weights are [${weights}] — expected [${EXPECTED.weights}]. SemiBold is the only weight the text styles use.`);
}

const variable = (block.match(/variable:\s*'([^']+)'/) ?? [])[1];
if (variable !== EXPECTED.variable) {
  problems.push(`variable is ${variable ?? 'unset'} — tailwind.config.ts reads ${EXPECTED.variable}`);
}

// The C4 trap: a literal family name in CSS matches the real face that
// next/font/google registers, and the var() fallback stops being a fallback.
const css = readFileSync(join(ROOT, 'src/app/globals.css'), 'utf8');
const config = readFileSync(join(ROOT, 'tailwind.config.ts'), 'utf8');
for (const [file, body] of [['src/app/globals.css', css], ['tailwind.config.ts', config]]) {
  const stripped = body.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  if (/['"]Instrument Sans['"]/.test(stripped) || /['"]Inter['"]/.test(stripped) || /['"]Noto Sans Ethiopic['"]/.test(stripped)) {
    problems.push(`${file} names a loaded webfont family literally. Fallbacks go inside var() and name only local families.`);
  }
}

if (problems.length) {
  console.error('\nfont: the display face declaration has drifted.');
  for (const p of problems) console.error(`      ${p}`);
  console.error('');
  process.exit(1);
}
console.log(`font: display face ok — Instrument Sans, subsets [${subsets}], weights [${weights}], ${variable}`);

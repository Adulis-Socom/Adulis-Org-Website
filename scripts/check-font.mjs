#!/usr/bin/env node
/**
 * `npm run check:font` — the faces this site self-hosts, before every build.
 *
 *   1. The Ethiopic switcher subset: cmap-verified against the labels it must
 *      draw. `scripts/build-ethiopic-subset.mjs`, unchanged, run first.
 *
 *   2. The three Latin faces of the approved prototype (WEB-MIG-002): Fraunces,
 *      Outfit and DM Mono. They arrive through
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

/* ------------------------------------------------ 2. the three Latin faces */

/** Exactly what the type styles need. Anything beyond this is bytes with no reader. */
const FACES = [
  { ctor: 'Fraunces', family: 'Fraunces', subsets: ['latin'], weights: ['600'], variable: '--font-fraunces' },
  { ctor: 'Outfit', family: 'Outfit', subsets: ['latin'], weights: ['400', '500', '600'], variable: '--font-outfit' },
  { ctor: 'DM_Mono', family: 'DM Mono', subsets: ['latin'], weights: ['500'], variable: '--font-dm-mono' }
];

const src = readFileSync(join(ROOT, 'src/lib/fonts.ts'), 'utf8');
const problems = [];
const summary = [];

for (const face of FACES) {
  const start = src.indexOf(`${face.ctor}({`);
  if (start === -1) {
    problems.push(`${face.ctor} is not declared in src/lib/fonts.ts`);
    continue;
  }
  const block = src.slice(start, src.indexOf('});', start));
  const list = (key) => {
    const m = block.match(new RegExp(`${key}:\\s*\\[([^\\]]*)\\]`));
    return m ? [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]).sort() : null;
  };

  const subsets = list('subsets');
  if (!subsets) problems.push(`${face.family}: no subsets list`);
  else if (subsets.join() !== [...face.subsets].sort().join()) {
    problems.push(`${face.family}: subsets are [${subsets}] — expected [${face.subsets}]. latin-ext adds a file to every English page.`);
  }

  const weights = list('weight');
  if (!weights) problems.push(`${face.family}: no weight list — a variable font without one ships the whole axis`);
  else if (weights.join() !== [...face.weights].sort().join()) {
    problems.push(`${face.family}: weights are [${weights}] — expected [${face.weights}]. Every weight is another file.`);
  }

  const variable = (block.match(/variable:\s*'([^']+)'/) ?? [])[1];
  if (variable !== face.variable) {
    problems.push(`${face.family}: variable is ${variable ?? 'unset'} — tailwind.config.ts reads ${face.variable}`);
  }
  summary.push(`${face.family} [${weights ?? '?'}]`);
}

// The C4 trap: a literal family name in CSS matches the real face that
// next/font/google registers, and the var() fallback stops being a fallback.
const loaded = [...FACES.map((f) => f.family), 'Noto Sans Ethiopic'];
const css = readFileSync(join(ROOT, 'src/app/globals.css'), 'utf8');
const config = readFileSync(join(ROOT, 'tailwind.config.ts'), 'utf8');
for (const [file, body] of [['src/app/globals.css', css], ['tailwind.config.ts', config]]) {
  const stripped = body.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const named = loaded.filter((family) => new RegExp(`['"]${family}['"]`).test(stripped));
  if (named.length) {
    problems.push(`${file} names a loaded webfont family literally (${named.join(', ')}). Fallbacks go inside var() and name only local families.`);
  }
}

if (problems.length) {
  console.error('\nfont: a Latin face declaration has drifted.');
  for (const p of problems) console.error(`      ${p}`);
  console.error('');
  process.exit(1);
}
console.log(`font: Latin faces ok — ${summary.join(', ')}, subsets [latin]`);

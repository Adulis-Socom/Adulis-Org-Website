#!/usr/bin/env node
/**
 * ADU-WEB-03 G10 — generates a pseudo-Amharic catalogue for the test run.
 *
 * ## Why this exists
 *
 * "Containers grow ~40% for Amharic without breaking" was listed as an enforced
 * guarantee and **nothing anywhere rendered a longer-than-English string.**
 * `src/messages/am.json` is 782 bytes holding one value, so `/am` serves English
 * fallback text: the Amharic tree is tested at English length, in Latin script,
 * on every route. The two properties that actually break Ge'ez layouts — length
 * and script — were both untested.
 *
 * This tests them months before a translator is engaged, which is the point. A
 * layout that cannot hold +40% is cheaper to find now than after the strings are
 * paid for.
 *
 * ## ⚠ It must be impossible to commit
 *
 * A pseudo-locale on disk is a pseudo-locale that eventually ships to a real
 * visitor reading nonsense. Three things keep it out:
 *
 *   1. It is written to `.pseudo/`, which is gitignored.
 *   2. `src/i18n/request.ts` reads it only when `PSEUDO_AM_FILE` points at it.
 *   3. `scripts/check-env.mjs` refuses a production build with that variable set.
 *
 * The generated file is not translation and must never be mistaken for it — every
 * value is marked, and the marker is checked by the spec that consumes it.
 *
 * Run: node scripts/make-pseudo-locale.mjs [outPath]
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.argv[2] ?? join(ROOT, '.pseudo', 'am.json');

/**
 * Ge'ez syllables used to pad. Deliberately NOT the four in the switcher
 * subset (U+121B, U+122D, U+129B, U+12A0) — padding drawn only from those would
 * be served by the 2,648-byte subset and would never prove the full face loads.
 */
const GEEZ = 'ሀለሐመሠረሰቀበተኀነከወዐዘየደገጠጰጸፀፈፐ';

/** Expansion target. 1.4 is the figure the layout invariant is written against. */
const FACTOR = 1.4;

/**
 * Placeholders like `{reference}` must survive intact — next-intl throws on a
 * malformed message, and a thrown formatter would look like a layout pass.
 */
function expand(value) {
  const parts = value.split(/(\{[^}]*\})/g);
  return parts
    .map((part) => {
      if (part.startsWith('{') && part.endsWith('}')) return part;
      if (!part.trim()) return part;
      const extra = Math.max(1, Math.round(part.length * (FACTOR - 1)));
      let pad = '';
      for (let i = 0; i < extra; i++) pad += GEEZ[(part.length + i) % GEEZ.length];
      // Ge'ez word space, so the padding can break rather than forming one
      // unbreakable run — an unbreakable run tests the wrong thing.
      return part + ' ' + pad.replace(/(.{6})/g, '$1 ').trim();
    })
    .join('');
}

function walk(node) {
  if (typeof node === 'string') return expand(node);
  if (Array.isArray(node)) return node.map(walk);
  if (node && typeof node === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(node)) out[k] = walk(v);
    return out;
  }
  return node;
}

const en = JSON.parse(readFileSync(join(ROOT, 'src/messages/en.json'), 'utf8'));
const pseudo = walk(en);

// Marked, so nothing can mistake the artefact for a translation.
pseudo._pseudo = 'GENERATED — not a translation. See scripts/make-pseudo-locale.mjs.';

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(pseudo, null, 2) + '\n');

const before = Buffer.byteLength(JSON.stringify(en));
const after = Buffer.byteLength(JSON.stringify(pseudo));
console.log(
  `pseudo: wrote ${OUT.replace(ROOT, '.')} — ` +
    `${before} -> ${after} bytes (+${Math.round((after / before - 1) * 100)}%)`
);

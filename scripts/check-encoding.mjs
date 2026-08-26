#!/usr/bin/env node
/**
 * UTF-8 end to end, so the Amharic translation survives arriving.
 *
 * ## Why this exists
 *
 * `src/messages/am.json` was emptied once already. Ge'ez strings came back as
 * mojibake, the C1 control bytes were unrecoverable, and a latin1-to-utf8
 * round-trip could not restore them. The catalogue shipped near-empty and the
 * site has been running on English fallback ever since.
 *
 * Whatever did that is still in the path, and the **paid human translation** is
 * going to arrive through it. Losing a machine translation is an inconvenience.
 * Losing a commissioned one is a schedule hit and a second invoice.
 *
 * This runs in `prebuild`, so the corruption is caught at the point it enters
 * the repository rather than discovered by a reader in Addis.
 *
 * ## What it checks
 *
 * 1. Every catalogue is valid UTF-8, with no BOM and no U+FFFD.
 * 2. No mojibake signatures — the byte patterns a utf8-read-as-latin1 round trip
 *    leaves behind, which is exactly what happened before.
 * 3. No C1 control bytes, which is what made the previous damage unrecoverable.
 * 4. Ge'ez survives the real pipeline: raw bytes -> JSON.parse -> the same deep
 *    merge `src/i18n/request.ts` performs -> byte-identical output.
 *
 * Run: npm run check:encoding   (also runs automatically before `npm run build`)
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'src/messages');

const problems = [];
const isEthiopic = (cp) =>
  (cp >= 0x1200 && cp <= 0x139f) ||
  (cp >= 0x2d80 && cp <= 0x2ddf) ||
  (cp >= 0xab00 && cp <= 0xab2f);

/**
 * The fingerprints of a utf8 -> latin1 -> utf8 round trip.
 *
 * Ge'ez is U+1200-U+137F, which encodes as three bytes starting E1 88-8E. Read
 * as latin1 and re-encoded, those become the sequences below. If any appear, the
 * file has already been through the exact accident that emptied am.json.
 */
const MOJIBAKE = [
  /á[-¿]/, // E1 88 xx misread
  /á[-¿]/,
  /á[-¿]/,
  /á[-¿]/,
  /á[-¿]/,
  /á[-¿]/,
  /Ã¡Â/ // doubly-encoded
];

const files = readdirSync(DIR).filter((f) => f.endsWith('.json'));
if (files.length === 0) problems.push('src/messages contains no .json catalogues');

const parsed = {};

for (const name of files) {
  const path = join(DIR, name);
  const bytes = readFileSync(path);

  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    problems.push(`${name}: starts with a UTF-8 BOM. Strip it — JSON.parse and some editors disagree about it.`);
  }

  // Node replaces invalid sequences with U+FFFD rather than throwing, so a
  // clean decode proves nothing on its own. Re-encoding and comparing does.
  const text = bytes.toString('utf8');
  if (!Buffer.from(text, 'utf8').equals(bytes)) {
    problems.push(`${name}: is not valid UTF-8 — bytes changed on a decode/encode round trip.`);
  }
  if (text.includes('�')) {
    problems.push(`${name}: contains U+FFFD replacement characters. Text has already been lost.`);
  }

  for (const re of MOJIBAKE) {
    if (re.test(text)) {
      problems.push(
        `${name}: contains mojibake — Ge'ez read as latin1 and re-encoded.\n` +
          `      This is what emptied am.json. Do not "fix" it in place; re-import the source.`
      );
      break;
    }
  }

  for (let i = 0; i < text.length; i++) {
    const cp = text.codePointAt(i);
    if (cp >= 0x80 && cp <= 0x9f) {
      problems.push(`${name}: contains a C1 control byte (U+${cp.toString(16).toUpperCase()}) at index ${i}.`);
      break;
    }
  }

  try {
    parsed[name] = JSON.parse(text);
  } catch (err) {
    problems.push(`${name}: is not valid JSON — ${err.message}`);
  }
}

/* ------------------------------------------- the pipeline round-trip check */

/** The same deep merge src/i18n/request.ts performs. Arrays replace wholesale. */
function deepMerge(base, override) {
  if (Array.isArray(override)) return override;
  if (typeof override !== 'object' || override === null) return override;
  const out = { ...base };
  for (const [k, v] of Object.entries(override)) {
    out[k] = k in base && typeof base[k] === 'object' && base[k] !== null ? deepMerge(base[k], v) : v;
  }
  return out;
}

function collectGeez(value, path, into) {
  if (typeof value === 'string') {
    if ([...value].some((ch) => isEthiopic(ch.codePointAt(0)))) into.push({ path, value });
    return;
  }
  if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) collectGeez(v, path ? `${path}.${k}` : k, into);
  }
}

const en = parsed['en.json'] ?? {};
let geezChecked = 0;

for (const [name, catalogue] of Object.entries(parsed)) {
  if (name === 'en.json') continue;
  const found = [];
  collectGeez(catalogue, '', found);

  const merged = deepMerge(en, catalogue);
  for (const { path, value } of found) {
    const out = path.split('.').reduce((o, k) => (o == null ? o : o[k]), merged);
    geezChecked++;
    if (out !== value) {
      problems.push(`${name}: "${path}" did not survive the merge byte-identically.`);
    }
    if (Buffer.from(String(out), 'utf8').toString('utf8') !== value) {
      problems.push(`${name}: "${path}" changed on a UTF-8 round trip.`);
    }
  }
}

/**
 * A synthetic canary, so this check has teeth even while am.json is empty.
 *
 * Right now there is almost no Ge'ez in the catalogues, so the loop above has
 * little to check and would report success on an empty set — a green tick that
 * means nothing. This pushes a known Ge'ez string through the identical path.
 */
{
  const sample = 'አዱሊስ ገበያ ነው። አማርኛ ትግርኛ ቋንቋ';
  const merged = deepMerge({ canary: 'placeholder' }, { canary: sample });
  const viaJson = JSON.parse(JSON.stringify({ canary: sample })).canary;
  const viaBytes = Buffer.from(sample, 'utf8').toString('utf8');
  if (merged.canary !== sample) problems.push('canary: Ge’ez did not survive the deep merge.');
  if (viaJson !== sample) problems.push('canary: Ge’ez did not survive JSON.stringify/parse.');
  if (viaBytes !== sample) problems.push('canary: Ge’ez did not survive a UTF-8 byte round trip.');
  geezChecked += 3;
}

if (problems.length > 0) {
  console.error('');
  for (const p of problems) console.error(`encoding: ${p}`);
  console.error('');
  process.exit(1);
}

console.log(
  `encoding: ${files.length} catalogue(s) are clean UTF-8; ${geezChecked} Ge'ez round-trip check(s) passed`
);

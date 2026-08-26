#!/usr/bin/env node
/**
 * Guards against partially translated arrays.
 *
 * The deep merge in `src/i18n/request.ts` replaces arrays wholesale rather than
 * merging them element by element. That is deliberate: mixing languages inside
 * one list is worse than either extreme, and a per-index merge would produce a
 * list that is half Amharic and half English with no way to tell which entries
 * were reviewed.
 *
 * The failure mode it leaves open is this. An array **absent** from a locale
 * catalogue falls back correctly and is safe. An array **partially** translated
 * replaces the English one entirely, and the missing elements simply vanish from
 * the page -- no error, no warning, nothing in the build output. `en.json` holds
 * twelve arrays; translation is exactly the activity that produces partial ones.
 *
 * So it fails loudly here instead. For every array present in a locale
 * catalogue, its length must equal the English array at the same path.
 *
 * Run: npm run check:i18n   (also runs automatically before `npm run build`)
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const MESSAGES_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'messages');
const BASE_LOCALE = 'en';

const read = (locale) =>
  JSON.parse(readFileSync(join(MESSAGES_DIR, `${locale}.json`), 'utf8'));

const isPlainObject = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Collect every problem rather than throwing on the first. */
function compare(base, override, path, problems) {
  for (const [key, overrideValue] of Object.entries(override)) {
    if (key.startsWith('_')) continue; // _note and friends are metadata
    const here = path ? `${path}.${key}` : key;
    const baseValue = base?.[key];

    if (Array.isArray(overrideValue)) {
      if (!Array.isArray(baseValue)) {
        problems.push({
          path: here,
          detail: `translated as an array, but ${BASE_LOCALE}.json has ${
            baseValue === undefined ? 'no such key' : typeof baseValue
          }`
        });
        continue;
      }
      if (overrideValue.length !== baseValue.length) {
        problems.push({
          path: here,
          detail: `${overrideValue.length} entries, but ${BASE_LOCALE}.json has ${baseValue.length}`,
          partial: true
        });
        continue;
      }
      // Same length: recurse into object entries so nested arrays are covered too.
      overrideValue.forEach((entry, i) => {
        if (isPlainObject(entry) && isPlainObject(baseValue[i])) {
          compare(baseValue[i], entry, `${here}[${i}]`, problems);
        }
      });
    } else if (isPlainObject(overrideValue)) {
      if (baseValue !== undefined && !isPlainObject(baseValue)) {
        problems.push({
          path: here,
          detail: `translated as an object, but ${BASE_LOCALE}.json has ${typeof baseValue}`
        });
        continue;
      }
      compare(baseValue ?? {}, overrideValue, here, problems);
    } else if (baseValue === undefined) {
      problems.push({ path: here, detail: `not present in ${BASE_LOCALE}.json` });
    }
  }
}

const base = read(BASE_LOCALE);
const locales = readdirSync(MESSAGES_DIR)
  .filter((f) => f.endsWith('.json'))
  .map((f) => f.replace(/\.json$/, ''))
  .filter((l) => l !== BASE_LOCALE);

let failed = false;

for (const locale of locales) {
  const problems = [];
  compare(base, read(locale), '', problems);

  if (problems.length === 0) {
    console.log(`i18n: ${locale}.json ok`);
    continue;
  }

  failed = true;
  console.error(`\ni18n: ${locale}.json has ${problems.length} problem(s):\n`);
  for (const { path, detail, partial } of problems) {
    console.error(`  ${path}`);
    console.error(`    ${detail}`);
    if (partial) {
      console.error(
        '    Arrays are replaced wholesale, not merged entry by entry, so the'
      );
      console.error(
        `    missing entries would disappear from the page. Translate all of them,`
      );
      console.error(`    or remove the key entirely and let it fall back to English.`);
    }
    console.error('');
  }
}

if (failed) {
  console.error('i18n check failed.\n');
  process.exit(1);
}

console.log(`i18n: checked ${locales.length} locale(s) against ${BASE_LOCALE}.json`);

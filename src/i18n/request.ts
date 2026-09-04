import type { AbstractIntlMessages } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';
import { routing, type Locale } from './routing';
import en from '../messages/en.json';
import am from '../messages/am.json';

type Dict = Record<string, unknown>;

/**
 * The Amharic catalogue, or the generated pseudo-locale when a test run asks
 * for it.
 *
 * ADU-WEB-03 G10 needs every route rendered with strings ~40% longer than
 * English, in Ge'ez, to prove layouts grow rather than overflow or clip. Nothing
 * tested that: `am.json` holds one string, so `/am` renders English fallback at
 * English length in Latin script, and both properties that break Ge'ez layouts
 * went unexercised.
 *
 * ⚠ `PSEUDO_AM_FILE` must never be set on a deployment. It replaces the Amharic
 * catalogue with generated nonsense. Three things stop that:
 *   - the file lives under `.pseudo/`, which is gitignored
 *   - `scripts/check-env.mjs` refuses a production build with this variable set
 *   - the QA harness sets it on a SEPARATE server instance, so the ordinary
 *     `/am` assertions still run against the real catalogue
 */
function amCatalogue(): Dict {
  const path = process.env.PSEUDO_AM_FILE;
  if (!path) return am as Dict;
  try {
    // Bare 'fs', not 'node:fs'. This module is reachable from
    // next-intl's react-server navigation entry, and webpack refuses the `node:`
    // scheme there — "Reading from node:fs is not handled by plugins". The bare
    // specifier resolves as a Node external instead.
    //
    // Required lazily and only on this branch, so a normal build never reaches
    // the filesystem for messages.
    const { readFileSync } = require('fs') as typeof import('fs');
    return JSON.parse(readFileSync(path, 'utf8')) as Dict;
  } catch {
    // A missing or malformed pseudo file must not take the site down — it falls
    // back to the real catalogue, and the spec that needs it fails instead.
    return am as Dict;
  }
}

const isPlainObject = (value: unknown): value is Dict =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Deep-merges `override` onto `base`. Plain objects merge key by key; anything
 * else -- strings, numbers, arrays -- is replaced wholesale.
 *
 * Arrays are replaced rather than merged index by index on purpose. A partly
 * translated array merged per index produces a list that is half Amharic and
 * half English with no way to tell which entries were reviewed. Replacing means
 * an array is either fully translated or fully English, which is a state a
 * reviewer can actually check.
 */
function merge(base: Dict, override: Dict): Dict {
  const out: Dict = { ...base };
  for (const [key, value] of Object.entries(override)) {
    const existing = out[key];
    out[key] =
      isPlainObject(existing) && isPlainObject(value) ? merge(existing, value) : value;
  }
  return out;
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale: Locale = routing.locales.includes(requested as Locale)
    ? (requested as Locale)
    : routing.defaultLocale;

  // English is the base. The Amharic catalogue is deliberately partial, so a key
  // missing from am.json falls back to English rather than rendering a raw key
  // path. Without this, /am is unusable and translation cannot proceed key by key.
  const merged = locale === 'en' ? (en as Dict) : merge(en as Dict, amCatalogue());

  // The catalogues contain arrays of objects (steps, benefits, founders), which
  // `AbstractIntlMessages` does not model but next-intl serves correctly through
  // `t.raw()`. The cast is confined to this one boundary.
  const messages = merged as unknown as AbstractIntlMessages;

  return { locale, messages, timeZone: 'Africa/Addis_Ababa' };
});

import type { AbstractIntlMessages } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';
import { routing, type Locale } from './routing';
import en from '../../messages/en.json';
import am from '../../messages/am.json';

type Dict = Record<string, unknown>;

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
  const merged = locale === 'en' ? (en as Dict) : merge(en as Dict, am as Dict);

  // The catalogues contain arrays of objects (steps, benefits, founders), which
  // `AbstractIntlMessages` does not model but next-intl serves correctly through
  // `t.raw()`. The cast is confined to this one boundary.
  const messages = merged as unknown as AbstractIntlMessages;

  return { locale, messages, timeZone: 'Africa/Addis_Ababa' };
});

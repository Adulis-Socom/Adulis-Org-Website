'use client';

import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/routing';
import { locales, type Locale } from '@/i18n/routing';
import { LOCALE_LABELS } from '@/lib/nav';

/**
 * Two plain links to the current path in each locale, so switching language
 * works with JavaScript disabled and a shared link keeps its language.
 *
 * Both scripts are shown at all times. A switcher that shows only the language
 * you are not currently in is ambiguous in every direction.
 */
// Labels live in src/lib/nav.ts because a build step derives the Ethiopic font
// subset from them. Restating them here would let the two drift, and the drift
// shows up as a missing-glyph box rather than as an error.
const LABELS = LOCALE_LABELS;

export function LanguageSwitcher({ locale }: { locale: Locale }) {
  const t = useTranslations('nav');
  const pathname = usePathname();

  return (
    <div role="group" aria-label={t('languageLabel')} className="flex items-center gap-1 text-small">
      {locales.map((code, i) => {
        const current = code === locale;
        return (
          <span key={code} className="flex items-center gap-1">
            {i > 0 && (
              <span aria-hidden className="text-ink-muted">
                /
              </span>
            )}
            <Link
              href={pathname}
              locale={code}
              hrefLang={code}
              aria-current={current ? 'true' : undefined}
              className={`inline-flex min-h-[44px] items-center px-1 font-semibold ${
                current ? 'text-ink' : 'text-ink-muted hover:text-ink'
              }`}
            >
              {LABELS[code]}
            </Link>
          </span>
        );
      })}
    </div>
  );
}

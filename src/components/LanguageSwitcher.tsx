'use client';

import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/routing';
import { locales, type Locale } from '@/i18n/routing';
import { LOCALE_LABELS } from '@/lib/nav';
import { track } from '@/lib/analytics';

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
              // min-W as well as min-H, and justify-center so the label sits in
              // the middle of the target rather than at its left edge.
              //
              // ⚠ `EN` is two characters. With `px-1` it measured **27×44** —
              // under the 44×44 invariant on its width, on every route, in both
              // locales. Nothing caught it because the switcher does not render
              // while AM_ENABLED is false, so the target has never existed to be
              // measured. The landing rehearsal turned the flag on and the whole
              // 360px layout suite failed on it.
              className={`inline-flex min-h-[44px] min-w-[44px] items-center justify-center px-1 font-semibold ${
                current ? 'text-ink' : 'text-ink-muted hover:text-ink'
              }`}
              // Emits nothing today: track() has no transport until Checkpoint 4,
              // and the switcher is hidden behind AM_ENABLED anyway. The call
              // site lives here so the event is wired where the behaviour is,
              // rather than retrofitted later by someone hunting for it.
              onClick={() => {
                if (!current) track('language_switched', { from: locale, to: code });
              }}
            >
              {LABELS[code]}
            </Link>
          </span>
        );
      })}
    </div>
  );
}

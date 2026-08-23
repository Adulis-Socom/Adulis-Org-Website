'use client';

import { useEffect, useId, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { AM_ENABLED, Link, usePathname } from '@/i18n/routing';
import type { Locale } from '@/i18n/routing';
import { primaryNav, WAITLIST_HREF } from '@/lib/nav';
import { LanguageSwitcher } from './LanguageSwitcher';

/**
 * An earlier revision shipped the mobile call to action as a compressed ~14px
 * sliver and shipped no mobile navigation at all. On a site whose target reader
 * is on a low-end Android, that is most of the audience unable to reach most of
 * the pages. Both the panel and the full-size button below are load-bearing.
 */
export function Header() {
  const t = useTranslations('nav');
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const panelId = useId();
  const [open, setOpen] = useState(false);

  // Close on navigation. Without this the panel stays open over the new page.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <header className="border-b border-line bg-surface">
      <div className="container-page flex items-center justify-between gap-4 py-3">
        <Link href="/" className="text-h3 font-bold tracking-tight text-ink">
          ADULIS
        </Link>

        <nav aria-label="Primary" className="hidden lg:block">
          <ul className="flex items-center gap-5">
            {primaryNav.map((item) => (
              <li key={item.key}>
                <Link
                  href={item.href}
                  className="text-small font-medium text-ink-muted hover:text-ink"
                >
                  {t(item.key)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-3">
          {/* Hidden until the Amharic catalogue is human-translated. Offering a
              language that resolves to English is a broken promise. */}
          {AM_ENABLED && <LanguageSwitcher locale={locale} />}

          <Link href={WAITLIST_HREF} className="btn-primary hidden lg:inline-flex">
            {t('waitlistCta')}
          </Link>

          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls={panelId}
            aria-label={open ? t('closeMenu') : t('openMenu')}
            className="inline-flex h-11 w-11 items-center justify-center rounded border border-line text-ink lg:hidden"
          >
            {open ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>

      {open && (
        <div id={panelId} className="border-t border-line bg-surface lg:hidden">
          <nav aria-label="Primary" className="container-page py-4">
            <ul className="flex flex-col gap-2">
              {primaryNav.map((item) => (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    className="flex min-h-[44px] items-center rounded border border-line px-4 py-3 text-body font-medium text-ink"
                  >
                    {t(item.key)}
                  </Link>
                </li>
              ))}
            </ul>

            {AM_ENABLED && (
              <div className="mt-4 flex items-center justify-between gap-4 border-t border-line pt-4">
                <LanguageSwitcher locale={locale} />
              </div>
            )}

            <Link href={WAITLIST_HREF} className="btn-primary btn-block mt-4">
              {t('waitlistCta')}
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}

function MenuIcon() {
  return (
    <svg aria-hidden width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg aria-hidden width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

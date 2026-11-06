'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { AM_ENABLED, Link, usePathname } from '@/i18n/routing';
import type { Locale } from '@/i18n/routing';
import { primaryNav, ROUTES, WAITLIST_HREF, sellerConsoleLink } from '@/lib/nav';
import { LanguageSwitcher } from './LanguageSwitcher';
import { Logo } from './Logo';

/** Tailwind's `lg`: the width from which the full navigation shows. */
const DESKTOP_QUERY = '(min-width: 1024px)';

/**
 * The global header, after the approved prototype: sticky, a translucent
 * surface, the mark and wordmark, the primary navigation with the current route
 * as a pill, and one primary call to action.
 *
 * Production behaviour the prototype lacked, kept or added on purpose:
 *   - real routes through next-intl `Link`, read from `lib/nav.ts`
 *   - `aria-current="page"` on the current route
 *   - a disclosure menu below `lg` with `aria-expanded`/`aria-controls`, a 44px
 *     trigger, Escape to close (focus returns to the trigger), close on
 *     navigation, close when focus or a tap leaves the header, and a body scroll
 *     lock released the moment the viewport widens past `lg`
 *   - the panel scrolls itself, so a locked page can never strand a link
 *     below the fold of a short phone
 *
 * Without JavaScript the trigger does nothing; every destination stays
 * reachable from the footer, which renders on every page.
 */
export function Header() {
  const t = useTranslations('nav');
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const panelId = useId();
  const headerRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  // Close on navigation. Without this the panel stays open over the new page.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      toggleRef.current?.focus();
    };
    const isOutside = (node: EventTarget | null) =>
      node instanceof Node && !headerRef.current?.contains(node);
    // A tap anywhere outside the header closes the menu...
    const onPointerDown = (event: PointerEvent) => {
      if (isOutside(event.target)) setOpen(false);
    };
    // ...and so does keyboard focus moving out of it, so Tab past the last link
    // never lands on content hidden behind the panel.
    const onFocusIn = (event: FocusEvent) => {
      if (isOutside(event.target)) setOpen(false);
    };
    const desktop = window.matchMedia(DESKTOP_QUERY);
    const onWiden = () => {
      if (desktop.matches) setOpen(false);
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('focusin', onFocusIn);
    desktop.addEventListener('change', onWiden);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('focusin', onFocusIn);
      desktop.removeEventListener('change', onWiden);
    };
  }, [open]);

  const isCurrent = (href: string) =>
    href === ROUTES.home ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur-md"
    >
      <div className="container-page flex h-16 items-center gap-3 lg:gap-6">
        {/* The visible word is the link's name; the mark is decorative. */}
        <Link
          href={ROUTES.home}
          className="-ms-1 inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-lg px-1"
        >
          <Logo />
          <span className="font-display text-heading-s font-semibold text-content">Adulis</span>
        </Link>

        <nav aria-label={t('primaryLabel')} className="hidden flex-1 justify-center lg:flex">
          <ul className="flex items-center gap-1">
            {primaryNav.map((item) => (
              <li key={item.key}>
                <Link
                  href={item.href}
                  aria-current={isCurrent(item.href) ? 'page' : undefined}
                  className="nav-link"
                >
                  {t(item.key)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ms-auto flex items-center gap-2 lg:ms-0">
          {/* Hidden until the Amharic catalogue is human-translated. Offering a
              language that resolves to English is a broken promise. */}
          {AM_ENABLED && (
            <div className="hidden lg:block">
              <LanguageSwitcher locale={locale} />
            </div>
          )}

          {/* A plain anchor, not next-intl's Link: a different origin, and Link
              would prefix a locale onto an absolute URL. */}
          <a href={sellerConsoleLink.href} className="nav-link hidden lg:inline-flex">
            {t(sellerConsoleLink.key)}
          </a>

          <Link href={WAITLIST_HREF} className="btn-primary btn-sm">
            <span className="sm:hidden">{t('waitlistCtaShort')}</span>
            <span className="hidden sm:inline">{t('waitlistCta')}</span>
          </Link>

          <button
            ref={toggleRef}
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls={panelId}
            aria-label={open ? t('closeMenu') : t('openMenu')}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-[1.5px] border-border-control text-content lg:hidden"
          >
            {open ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>

      <div
        id={panelId}
        hidden={!open}
        className="max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-border bg-surface lg:hidden"
      >
        <nav aria-label={t('primaryLabel')} className="container-page py-4">
          <ul className="flex flex-col gap-1">
            {primaryNav.map((item) => (
              <li key={item.key}>
                <Link
                  href={item.href}
                  aria-current={isCurrent(item.href) ? 'page' : undefined}
                  className="nav-link flex w-full px-4 py-3 text-body"
                >
                  {t(item.key)}
                </Link>
              </li>
            ))}
          </ul>

          {AM_ENABLED && (
            <div className="mt-4 border-t border-border pt-4">
              <LanguageSwitcher locale={locale} />
            </div>
          )}

          <div className="mt-4 border-t border-border pt-4">
            <a href={sellerConsoleLink.href} className="nav-link flex w-full px-4 py-3 text-body">
              {t(sellerConsoleLink.key)}
            </a>
            <Link href={WAITLIST_HREF} className="btn-primary btn-block mt-3">
              {t('waitlistCta')}
            </Link>
          </div>
        </nav>
      </div>
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

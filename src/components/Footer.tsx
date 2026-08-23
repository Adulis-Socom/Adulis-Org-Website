import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { legalNav, primaryNav } from '@/lib/nav';

/**
 * Row 2 appears on every page and is not optional. Report content and Delete my
 * account are app-store requirements, and Privacy is a data-protection one -- a
 * 404 behind any of the three is a submission problem, not a cosmetic one.
 */
export async function Footer() {
  const nav = await getTranslations('nav');
  const footer = await getTranslations('footer');

  return (
    <footer className="mt-auto border-t border-line bg-surface-sunken">
      <nav aria-label="Footer" className="container-page py-8">
        <ul className="flex flex-wrap gap-x-5 gap-y-2">
          {primaryNav.map((item) => (
            <li key={item.key}>
              <Link href={item.href} className="text-small font-medium text-ink hover:underline">
                {nav(item.key)}
              </Link>
            </li>
          ))}
          <li>
            <Link href="/contact" className="text-small font-medium text-ink hover:underline">
              {footer('contact')}
            </Link>
          </li>
        </ul>

        <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-line pt-4">
          {legalNav.map((item) => (
            <li key={item.key}>
              <Link href={item.href} className="text-small text-ink-muted hover:text-ink hover:underline">
                {footer(item.key)}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="container-page flex flex-col gap-1 border-t border-line py-5 text-small text-ink-muted sm:flex-row sm:justify-between">
        <p>{footer('address')}</p>
        <p className="tnum">{footer('copyright')}</p>
      </div>
    </footer>
  );
}

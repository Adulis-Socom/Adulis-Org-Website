import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { footerNav, ROUTES } from '@/lib/nav';
import { Logo } from './Logo';

/**
 * The global footer, after the approved prototype: a brand column, then
 * Platform / Company / Legal.
 *
 * The Legal group is not optional and renders on every page. Report Content and
 * Account Deletion are app-store requirements and Privacy is a data-protection
 * one — a 404 behind any of them is a submission problem, not a cosmetic one.
 * Every destination in the header is here too, which is what keeps the site
 * navigable on a phone with JavaScript disabled.
 */
export async function Footer() {
  const nav = await getTranslations('nav');
  const footer = await getTranslations('footer');
  const label = (key: string) => (footer.has(key) ? footer(key) : nav(key));

  return (
    <footer className="mt-auto border-t border-border bg-page">
      <div className="container-page grid gap-10 py-12 md:py-14 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-16">
        <div className="max-w-xs">
          <Link
            href={ROUTES.home}
            className="-ms-1 inline-flex min-h-[44px] items-center gap-2 rounded-lg px-1"
          >
            <Logo className="h-6 w-6" />
            <span className="font-display text-heading-s font-semibold text-content">Adulis</span>
          </Link>
          <p className="mt-3 text-body-s text-content-muted">{footer('description')}</p>
          <p className="tnum mt-4 font-mono text-label text-content-muted">{footer('copyright')}</p>
        </div>

        <nav
          aria-label={footer('navLabel')}
          className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3"
        >
          {footerNav.map((group) => (
            <div key={group.key}>
              <h2 className="footer-heading">{footer(group.key)}</h2>
              <ul className="mt-3">
                {group.links.map((link) => (
                  <li key={link.key}>
                    <Link href={link.href} className="footer-link">
                      {label(link.key)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>
    </footer>
  );
}

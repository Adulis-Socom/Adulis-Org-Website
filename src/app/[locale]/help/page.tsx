import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { buildPageMetadata } from '@/lib/metadata';
import { ROUTES } from '@/lib/routes';
import { Link } from '@/i18n/routing';

type LocaleParams = { params: Promise<{ locale: string }> };
type Faq = { q: string; a: string };

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'help' });
  // No `unbuilt` here, unlike the legal pages: every answer on this page is
  // approved copy. It is the one Tier 2 route that is genuinely finished.
  return buildPageMetadata({ locale, path: ROUTES.help, title: t('pageTitle') });
}

export default async function HelpPage({ params }: LocaleParams) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('help');
  const faqs = t.raw('faqs') as Faq[];

  return (
    <div className="container-page">
      <section className="section">
        <h1 className="page-title">{t('heading')}</h1>
        <p className="lede">{t('sub')}</p>
      </section>

      {/* <details>/<summary>, not a JavaScript accordion.
          It opens, closes, takes focus and announces its expanded state with
          JavaScript disabled, which is the state a reader on a slow connection
          sees first and sometimes only. A scripted disclosure here would need
          ARIA to recreate what the browser already does correctly, and would
          leave every answer unreachable if the bundle never arrives.

          Deliberately not `open` by default. Eleven expanded answers is a wall
          of text on a 360px screen, and the questions are the navigation. */}
      <section className="section-tight pb-12">
        <ul className="grid gap-3">
          {faqs.map((faq) => (
            <li key={faq.q}>
              <details className="card group">
                <summary className="flex min-h-[44px] cursor-pointer items-center justify-between gap-4 text-body font-semibold text-ink">
                  {faq.q}
                  <span aria-hidden className="select-none text-ink-muted transition-transform group-open:rotate-180">
                    ⌄
                  </span>
                </summary>
                <p className="card-body mt-2">{faq.a}</p>
              </details>
            </li>
          ))}
        </ul>
      </section>

      <section className="section-tight pb-12">
        <div className="door flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-h3 text-ink">{t('stillNeedHelp')}</h2>
          <Link href={ROUTES.contact} className="link-arrow-target">
            {t('contactLink')}
          </Link>
        </div>
      </section>
    </div>
  );
}

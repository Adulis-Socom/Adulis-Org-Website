import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { buildPageMetadata } from '@/lib/metadata';
import { ROUTES } from '@/lib/routes';
import { Link } from '@/i18n/routing';
import { InfoCard, SectionTitle } from '@/components/ui';

type LocaleParams = { params: Promise<{ locale: string }> };
type Item = { title: string; body: string };

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'trust' });
  return buildPageMetadata({ locale, path: ROUTES.trustAndSafety, title: t('pageTitle') });
}

export default async function TrustAndSafetyPage({ params }: LocaleParams) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('trust');
  const boundaries = t.raw('boundaries') as Item[];
  const verification = t.raw('verification') as Item[];
  const ladder = t.raw('ladder') as string[];
  const published = t.raw('published') as string[];

  return (
    <div className="container-page">
      <section className="section">
        <h1 className="page-title">{t('heading')}</h1>
        <p className="lede">{t('sub')}</p>
      </section>

      <section className="section-tight">
        <SectionTitle>{t('boundariesHeading')}</SectionTitle>
        <div className="grid gap-4 md:grid-cols-2">
          {boundaries.map((item) => (
            <InfoCard key={item.title} title={item.title} body={item.body} />
          ))}
        </div>
      </section>

      <section className="section-tight">
        <SectionTitle>{t('verifiedHeading')}</SectionTitle>
        <div className="grid gap-4 md:grid-cols-2">
          {verification.map((item) => (
            <InfoCard key={item.title} title={item.title} body={item.body} variant="sunken" />
          ))}
        </div>
      </section>

      <section className="section-tight">
        <SectionTitle>{t('ladderHeading')}</SectionTitle>

        {/* No EXAMPLE badge here. New, Established and Trusted are the real
            level names -- only their thresholds are undecided, which is what
            ladderNote says. Tagging them as illustrative would be untrue. */}
        <ol className="grid gap-4 md:grid-cols-3">
          {ladder.map((level, i) => (
            <li key={level} className="card">
              <p className="card-title">
                <span className="tnum text-ink-muted">{i + 1}. </span>
                {level}
              </p>
            </li>
          ))}
        </ol>

        <p className="note mt-4 max-w-prose">{t('ladderNote')}</p>
      </section>

      <section className="section-tight">
        <SectionTitle>{t('publishHeading')}</SectionTitle>

        {/* One statement below the set, never the same sentence repeated on
            every card. */}
        <ul className="grid gap-3 sm:grid-cols-2">
          {published.map((entry) => (
            <li key={entry} className="card">
              <span className="card-title">{entry}</span>
            </li>
          ))}
        </ul>

        <p className="note mt-4 max-w-prose">{t('publishNote')}</p>
      </section>

      <section className="section-tight pb-12">
        <div className="card-sunken">
          <h2 className="section-title">{t('wrongTitle')}</h2>
          <p className="card-body max-w-prose">{t('wrongBody')}</p>
          <p className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
            <Link href={ROUTES.refunds} className="link-arrow">
              {t('refundsLink')}
            </Link>
            <Link href={ROUTES.report} className="link-arrow">
              {t('reportLink')}
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}

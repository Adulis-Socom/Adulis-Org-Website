import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { buildPageMetadata } from '@/lib/metadata';
import { ROUTES } from '@/lib/routes';
import { InfoCard, SectionTitle } from '@/components/ui';
import { WaitlistForm } from '@/components/WaitlistForm';

type LocaleParams = { params: Promise<{ locale: string }> };
type Item = { title: string; body: string };

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'forSellers' });
  return buildPageMetadata({ locale, path: ROUTES.forSellers, title: t('pageTitle') });
}

export default async function ForSellersPage({ params }: LocaleParams) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('forSellers');
  const waitlist = await getTranslations('waitlist');
  const problems = t.raw('problems') as Item[];
  const benefits = t.raw('benefits') as Item[];

  return (
    <div className="container-page">
      <section className="section">
        <h1 className="page-title">{t('heading')}</h1>
        <p className="lede">{t('sub')}</p>

        {/* A button, not a bold text link. This is the page's only job. */}
        <a href="#waitlist" className="btn-secondary mt-6">
          {t('anchorCta')}
        </a>
      </section>

      <section className="section-tight">
        <SectionTitle>{t('problemsHeading')}</SectionTitle>
        <div className="grid gap-4 md:grid-cols-2">
          {problems.map((item) => (
            <InfoCard key={item.title} title={item.title} body={item.body} />
          ))}
        </div>
      </section>

      <section className="section-tight">
        <SectionTitle>{t('getHeading')}</SectionTitle>
        <div className="grid gap-4 md:grid-cols-3">
          {benefits.map((item) => (
            <InfoCard key={item.title} title={item.title} body={item.body} variant="sunken" />
          ))}
        </div>
      </section>

      <section className="section-tight">
        <div className="card">
          <h2 className="section-title">{t('notDoTitle')}</h2>
          <p className="card-body max-w-prose">{t('notDoBody')}</p>
        </div>
      </section>

      <section className="section-tight">
        <div className="card-sunken">
          <h2 className="section-title">{t('betaTitle')}</h2>
          <p className="card-body max-w-prose">{t('betaBody')}</p>
        </div>
      </section>

      <section id="waitlist" className="mt-12 scroll-mt-8 border-t border-line pb-4 pt-10">
        <h2 className="section-title">{waitlist('heading')}</h2>
        <p className="lede mb-6">{waitlist('sub')}</p>
        <WaitlistForm />
      </section>
    </div>
  );
}

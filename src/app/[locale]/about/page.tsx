import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { buildRobots } from '@/lib/metadata';
import { MediaPlaceholder, SectionTitle } from '@/components/ui';

type LocaleParams = { params: Promise<{ locale: string }> };
type Founder = { name: string; role: string; body: string };

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'about' });
  return { title: t('pageTitle'), robots: buildRobots({ locale }) };
}

export default async function AboutPage({ params }: LocaleParams) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('about');
  const founders = t.raw('founders') as Founder[];

  return (
    <div className="container-page">
      <section className="section">
        <h1 className="page-title">{t('heading')}</h1>
        <p className="lede">{t('sub')}</p>
      </section>

      <section className="section-tight">
        <div className="card-sunken">
          <h2 className="section-title">{t('originTitle')}</h2>
          {/* The 50-vs-5 comparison carries this page, so the figures are
              tabular. */}
          <p className="tnum card-body max-w-prose">{t('originBody1')}</p>
          <p className="card-body max-w-prose">{t('originBody2')}</p>
        </div>
      </section>

      <section className="section-tight">
        <SectionTitle>{t('foundersHeading')}</SectionTitle>
        <ul className="grid gap-4 md:grid-cols-3">
          {founders.map((founder) => (
            <li key={founder.name} className="card">
              <MediaPlaceholder label="Photo" className="h-32 w-32" />
              <p className="card-title mt-4">{founder.name}</p>
              <p className="text-small font-semibold text-ink-muted">{founder.role}</p>
              <p className="card-body">{founder.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="section-tight pb-12">
        <div className="card">
          <h2 className="section-title">{t('companyTitle')}</h2>
          <p className="card-body max-w-prose">{t('companyBody')}</p>
        </div>
      </section>
    </div>
  );
}

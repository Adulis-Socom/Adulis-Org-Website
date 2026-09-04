import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { buildPageMetadata } from '@/lib/metadata';
import { ROUTES } from '@/lib/routes';
import { MediaPlaceholder, SectionTitle, UndecidedFlag } from '@/components/ui';

type LocaleParams = { params: Promise<{ locale: string }> };
type Founder = { name: string; role: string };

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'about' });
  return buildPageMetadata({ locale, path: ROUTES.about, title: t('pageTitle') });
}

export default async function AboutPage({ params }: LocaleParams) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('about');
  const common = await getTranslations('common');
  const founders = t.raw('founders') as Founder[];
  const status = t.raw('status') as string[];

  return (
    <div className="container-page">
      <section className="section">
        <h1 className="page-title">{t('heading')}</h1>
        <p className="lede">{t('sub')}</p>
      </section>

      <section className="section-tight">
        <div className="card">
          <h2 className="section-title">{t('originTitle')}</h2>
          {/* The final wireframe set replaced the 50-vs-5 comparison with
              "roughly eighty ... against almost nothing". Fewer hard figures,
              so no tabular numerals are needed here any more. */}
          <p className="card-body max-w-prose">{t('originBody')}</p>
        </div>
      </section>

      <section className="section-tight">
        <SectionTitle>{t('foundersHeading')}</SectionTitle>
        <ul className="grid gap-4 md:grid-cols-3">
          {founders.map((founder) => (
            <li key={founder.name} className="card">
              <MediaPlaceholder label={common('photoPlaceholder')} className="h-32 w-32" />
              <p className="card-title mt-4">{founder.name}</p>
              <p className="text-small font-semibold text-ink-muted">{founder.role}</p>
            </li>
          ))}
        </ul>
        <UndecidedFlag>{t('foundersUndecided')}</UndecidedFlag>
      </section>

      <section className="section-tight pb-12">
        <div className="card">
          <h2 className="section-title">{t('whereHeading')}</h2>

          <p className="card-title mt-4">{t('registrationLabel')}</p>
          <UndecidedFlag>{t('registrationUndecided')}</UndecidedFlag>

          <p className="card-title mt-4">{t('statusLabel')}</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {status.map((entry) => (
              <li key={entry} className="badge-level">
                {entry}
              </li>
            ))}
          </ul>

          <p className="card-title mt-4">{t('companyContactLabel')}</p>
          <UndecidedFlag>{t('companyContactUndecided')}</UndecidedFlag>

          <p className="note mt-4 max-w-prose">{t('companyNote')}</p>
        </div>
      </section>
    </div>
  );
}

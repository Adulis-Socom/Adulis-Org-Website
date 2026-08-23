import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { buildPageMetadata } from '@/lib/metadata';
import { ROUTES } from '@/lib/routes';
import { ShopPreview } from '@/components/ShopPreview';
import { InfoCard, MediaPlaceholder, SectionTitle, Sequence } from '@/components/ui';

type LocaleParams = { params: Promise<{ locale: string }> };
type Step = { title: string; body: string };

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'howItWorks' });
  return buildPageMetadata({ locale, path: ROUTES.howItWorks, title: t('pageTitle') });
}

export default async function HowItWorksPage({ params }: LocaleParams) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('howItWorks');
  const paste = await getTranslations('paste');
  const steps = t.raw('steps') as Step[];

  return (
    <>
      <section className="container-page section">
        <h1 className="page-title">{t('heading')}</h1>
        <p className="lede">{t('sub')}</p>

        {/* Genuinely a sequence, so the cards are numbered and the list is an ol. */}
        <ol className="mt-6 grid gap-4 md:grid-cols-3">
          {steps.map((step, i) => (
            <li key={step.title}>
              <InfoCard title={step.title} body={step.body} index={i + 1} />
            </li>
          ))}
        </ol>
      </section>

      <section className="container-page section-tight">
        <SectionTitle>{t('shopSectionTitle')}</SectionTitle>
        <ShopPreview />

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <MediaPlaceholder label={t('categories.clothing')} className="min-h-[120px]" />
          <MediaPlaceholder label={t('categories.cosmetics')} className="min-h-[120px]" />
          <MediaPlaceholder label={t('categories.electronics')} className="min-h-[120px]" />
        </div>
      </section>

      <section className="container-page section-tight">
        <div className="card-tint">
          <h2 className="section-title">{paste('titleSeller')}</h2>
          <p className="card-body max-w-prose">{paste('bodySeller')}</p>
          <Sequence steps={[paste('step1'), paste('step2'), paste('step3')]} />
        </div>
      </section>

      <section className="container-page section-tight pb-12">
        <div className="card-sunken">
          <h2 className="section-title">{t('moneyTitle')}</h2>
          <p className="card-body max-w-prose">{t('moneyBody')}</p>
        </div>
      </section>
    </>
  );
}

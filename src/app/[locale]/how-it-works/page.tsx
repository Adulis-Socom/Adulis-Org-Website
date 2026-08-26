import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { buildPageMetadata } from '@/lib/metadata';
import { ROUTES } from '@/lib/routes';
import { InfoCard, MediaPlaceholder, SectionTitle } from '@/components/ui';

type LocaleParams = { params: Promise<{ locale: string }> };
type Step = { title: string; body: string };
type Preview = { seller: string; product: string; price: string; stock: string; level: string };

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'howItWorks' });
  return buildPageMetadata({ locale, path: ROUTES.howItWorks, title: t('pageTitle') });
}

export default async function HowItWorksPage({ params }: LocaleParams) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('howItWorks');
  const common = await getTranslations('common');
  const steps = t.raw('steps') as Step[];
  const previews = t.raw('shopPreviews') as Preview[];
  const findAgain = t.raw('findAgain.items') as Step[];

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
        {/* Every one of these is invented, so every one carries the EXAMPLE badge.
            The level names are real; only their thresholds are undecided. */}
        <div className="grid gap-4 md:grid-cols-3">
          {previews.map((p) => (
            <div key={p.seller} className="card">
              <MediaPlaceholder label={common('mutedProductImage')} className="min-h-[120px]" />
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-h3 text-ink">{p.seller}</span>
                <span className="badge-example">{common('exampleTag')}</span>
              </div>
              <p className="card-body">{p.product}</p>
              <p className="tnum mt-1 text-small text-ink">{p.price}</p>
              <p className="tnum mt-1 text-small text-ink-muted">{p.stock}</p>
              <p className="badge-level mt-2">{p.level}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container-page section-tight">
        <div className="card-tint">
          <h2 className="section-title">{t('findAgain.title')}</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {findAgain.map((item) => (
              <InfoCard key={item.title} title={item.title} body={item.body} />
            ))}
          </div>
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

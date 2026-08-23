import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { buildRobots } from '@/lib/metadata';
import { DoorBand, InfoCard, SectionTitle, Sequence } from '@/components/ui';

type LocaleParams = { params: Promise<{ locale: string }> };
type Item = { title: string; body: string };

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'forBuyers' });
  return { title: t('pageTitle'), robots: buildRobots({ locale }) };
}

export default async function ForBuyersPage({ params }: LocaleParams) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('forBuyers');
  const paste = await getTranslations('paste');
  const value = t.raw('value') as Item[];
  const steps = t.raw('steps') as Item[];

  return (
    <div className="container-page">
      <section className="section">
        <h1 className="page-title">{t('heading')}</h1>
        <p className="lede">{t('sub')}</p>

        {/* Disabled on purpose. The apps have not shipped, and a live store link
            that 404s is worse than an honest "coming soon". Never a link. */}
        <div className="mt-6 flex flex-wrap gap-3">
          <StoreBadge name={t('appStore')} status={t('comingSoon')} />
          <StoreBadge name={t('googlePlay')} status={t('comingSoon')} />
        </div>
      </section>

      <section className="section-tight grid gap-4 md:grid-cols-3">
        {value.map((item) => (
          <InfoCard key={item.title} title={item.title} body={item.body} />
        ))}
      </section>

      <section className="section-tight">
        <SectionTitle>{t('stepsHeading')}</SectionTitle>
        <ol className="grid gap-4 md:grid-cols-2">
          {steps.map((step, i) => (
            <li key={step.title}>
              <InfoCard title={step.title} body={step.body} variant="sunken" index={i + 1} />
            </li>
          ))}
        </ol>
      </section>

      <section className="section-tight">
        <div className="card-tint">
          <h2 className="section-title">{paste('titleBuyer')}</h2>
          <p className="card-body max-w-prose">{paste('bodyBuyer')}</p>
          <Sequence steps={[paste('step1'), paste('step2'), paste('step3')]} />
        </div>
      </section>

      <section className="section-tight">
        <div className="card">
          <h2 className="section-title">{t('notDoTitle')}</h2>
          <p className="card-body max-w-prose">{t('notDoBody')}</p>
        </div>
      </section>

      <section className="section-tight pb-12">
        <DoorBand
          title={t('sellerDoorTitle')}
          linkLabel={t('sellerDoorLink')}
          href="/for-sellers"
        />
      </section>
    </div>
  );
}

function StoreBadge({ name, status }: { name: string; status: string }) {
  return (
    <span
      aria-disabled="true"
      className="inline-flex min-h-[44px] flex-col justify-center rounded border border-line bg-surface-sunken px-4 py-2 text-ink-muted"
    >
      <span className="text-body font-semibold text-ink">{name}</span>
      <span className="text-small">{status}</span>
    </span>
  );
}

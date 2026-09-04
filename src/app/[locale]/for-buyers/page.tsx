import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { buildPageMetadata } from '@/lib/metadata';
import { ROUTES } from '@/lib/routes';
import { DoorBand, InfoCard, SectionTitle, Sequence } from '@/components/ui';

type LocaleParams = { params: Promise<{ locale: string }> };
type Item = { title: string; body: string };

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'forBuyers' });
  return buildPageMetadata({ locale, path: ROUTES.forBuyers, title: t('pageTitle') });
}

export default async function ForBuyersPage({ params }: LocaleParams) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('forBuyers');
  const steps = t.raw('steps') as Item[];
  const checks = t.raw('checks') as Item[];
  const limits = t.raw('limits') as Item[];

  return (
    <div className="container-page">
      <section className="section">
        <h1 className="page-title">{t('heading')}</h1>
        <p className="lede">{t('sub')}</p>

      </section>

      <section className="section-tight">
        <SectionTitle>{t('stepsHeading')}</SectionTitle>
        <ol className="grid gap-4 md:grid-cols-2">
          {steps.map((step, i) => (
            <li key={step.title}>
              <InfoCard title={step.title} body={step.body} variant="contained" index={i + 1} />
            </li>
          ))}
        </ol>
      </section>

      <section className="section-tight">
        <SectionTitle>{t('checkHeading')}</SectionTitle>
        {/* A set, not a sequence: Open, with room, as the value items on Home. */}
        <div className="grid gap-8 md:grid-cols-3 md:gap-10">
          {checks.map((item) => (
            <InfoCard key={item.title} title={item.title} body={item.body} variant="open" />
          ))}
        </div>
      </section>

      <section className="section-tight">
        <SectionTitle>{t('appsHeading')}</SectionTitle>
        {/* Disabled on purpose. The apps have not shipped, and a live store link
            that 404s is worse than an honest note. Never a link. */}
        <div className="flex flex-wrap gap-3">
          <StoreBadge name={t('appStore')} status={t('appsNote')} />
          <StoreBadge name={t('googlePlay')} status={t('appsNote')} />
        </div>
      </section>

      <section className="section-tight">
        <SectionTitle>{t('limitsHeading')}</SectionTitle>
        <div className="grid gap-4 md:grid-cols-2">
          {limits.map((item) => (
            <InfoCard key={item.title} title={item.title} body={item.body} variant="contained" />
          ))}
        </div>
      </section>

      <section className="section-tight pb-12">
        <DoorBand
          title={t('sellerDoorTitle')}
          linkLabel={t('sellerDoorLink')}
          href={ROUTES.forSellers}
          event="seller_door_clicked"
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

import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { buildPageMetadata } from '@/lib/metadata';
import { ROUTES } from '@/lib/routes';
import { Link } from '@/i18n/routing';
import { WAITLIST_HREF } from '@/lib/nav';
import { ShopPreview } from '@/components/ShopPreview';
import { DoorBand, InfoCard, SectionTitle } from '@/components/ui';

type LocaleParams = { params: Promise<{ locale: string }> };
type Item = { title: string; body: string };

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'home' });
  return buildPageMetadata({ locale, path: ROUTES.home, title: t('pageTitle') });
}

export default async function HomePage({ params }: LocaleParams) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('home');
  const common = await getTranslations('common');
  const nav = await getTranslations('nav');

  const sellerChanges = t.raw('sellerChanges.items') as Item[];
  const whatFor = t.raw('whatFor.items') as Item[];
  const cohort = t.raw('cohort.items') as Item[];

  return (
    <>
      {/* Both columns start on the same line. An earlier revision pushed the
          preview down and right, leaving a third of the hero blank. */}
      <section className="container-page section grid items-start gap-8 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <p className="badge-beta">{common('betaBadge')}</p>
          <h1 className="page-title mt-4">{t('heading')}</h1>
          <p className="lede">{t('sub')}</p>
          <Link href={WAITLIST_HREF} className="btn-primary mt-6">
            {nav('waitlistCta')}
          </Link>
        </div>

        <ShopPreview />
      </section>

      <section className="container-page section-tight">
        <SectionTitle>{t('sellerChanges.title')}</SectionTitle>
        <div className="grid gap-4 md:grid-cols-3">
          {sellerChanges.map((item) => (
            <InfoCard key={item.title} title={item.title} body={item.body} />
          ))}
        </div>
      </section>

      <section className="container-page section-tight">
        <SectionTitle>{t('whatFor.title')}</SectionTitle>
        <div className="grid gap-4 md:grid-cols-2">
          {whatFor.map((item) => (
            <InfoCard key={item.title} title={item.title} body={item.body} variant="tint" />
          ))}
        </div>
      </section>

      <section className="container-page section-tight">
        <DoorBand
          title={t('buyerDoorTitle')}
          linkLabel={t('buyerDoorLink')}
          href={ROUTES.forBuyers}
          event="buyer_door_clicked"
        />
        <p className="card-body mt-2">{t('buyerDoorBody')}</p>
      </section>

      <section className="container-page section-tight pb-12">
        <div className="card-sunken">
          <h2 className="section-title">{t('cohort.title')}</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {cohort.map((item) => (
              <InfoCard key={item.title} title={item.title} body={item.body} />
            ))}
          </div>
          <Link href={WAITLIST_HREF} className="btn-primary mt-4">
            {nav('waitlistCta')}
          </Link>
        </div>
      </section>
    </>
  );
}

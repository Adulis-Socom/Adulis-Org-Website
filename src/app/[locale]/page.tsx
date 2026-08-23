import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { WAITLIST_HREF } from '@/lib/nav';
import { ShopPreview } from '@/components/ShopPreview';
import { DoorBand, InfoCard } from '@/components/ui';

type LocaleParams = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'home' });
  return { title: t('pageTitle') };
}

export default async function HomePage({ params }: LocaleParams) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('home');
  const common = await getTranslations('common');
  const nav = await getTranslations('nav');

  return (
    <>
      {/* Both columns start on the same line. An earlier revision pushed the
          shop preview down and right, leaving a third of the hero blank. */}
      <section className="container-page section grid items-start gap-8 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <p className="badge-beta">{common('betaBadge')}</p>
          <h1 className="page-title mt-4">
            {t('headlineLine1')}
            <br />
            {t('headlineLine2')}
          </h1>
          <p className="lede">{t('sub')}</p>
          <Link href={WAITLIST_HREF} className="btn-primary mt-6">
            {nav('waitlistCta')}
          </Link>
        </div>

        <ShopPreview withArrow />
      </section>

      <section className="container-page section-tight grid gap-4 md:grid-cols-3">
        <InfoCard title={t('value.goodsTitle')} body={t('value.goodsBody')} />
        <InfoCard title={t('value.payTitle')} body={t('value.payBody')} />
        <InfoCard title={t('value.evidenceTitle')} body={t('value.evidenceBody')} />
      </section>

      <section className="container-page section-tight">
        <DoorBand
          title={t('buyerDoorTitle')}
          linkLabel={t('buyerDoorLink')}
          href="/for-buyers"
        />
      </section>

      <section className="container-page section-tight pb-12">
        <div className="card-sunken">
          <h2 className="section-title">{t('cohortTitle')}</h2>
          <p className="card-body">{t('cohortBody')}</p>
          <Link href={WAITLIST_HREF} className="btn-primary mt-4">
            {nav('waitlistCta')}
          </Link>
        </div>
      </section>
    </>
  );
}

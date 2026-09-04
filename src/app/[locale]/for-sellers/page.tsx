import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { buildPageMetadata } from '@/lib/metadata';
import { ROUTES } from '@/lib/routes';
import { DisplayHeading, InfoCard, SectionTitle } from '@/components/ui';
import { WaitlistForm } from '@/components/WaitlistForm';
import { track } from '@/lib/analytics';

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
  const nav = await getTranslations('nav');

  // Emitted server-side, so it counts people who never run the bundle -- which
  // on a slow connection is a meaningful share of the audience, and exactly the
  // share a client-only view event would silently omit. No transport until
  // Checkpoint 4; see src/lib/analytics.
  track('waitlist_form_viewed', { locale });
  const problems = t.raw('problems') as Item[];
  const benefits = t.raw('benefits') as Item[];
  const sequence = t.raw('sequence') as Item[];
  const next = t.raw('next') as Item[];

  return (
    <div className="container-page">
      <section className="section">
        <DisplayHeading lead={t('heading')} accent={t('headingAccent')} />
        <p className="lede">{t('sub')}</p>

        {/* A button, not a bold text link. This is the page's only job. */}
        <a href="#waitlist" className="btn-secondary mt-6">
          {nav('waitlistCta')}
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
            <InfoCard key={item.title} title={item.title} body={item.body} variant="contained" />
          ))}
        </div>

        {/* One line inside an existing block, not a new section. This is the
            conversion page and every extra block costs.
            Framed as "What you handle" rather than as a disclaimer: a seller
            reading a list of things the platform will not do on a recruitment
            page reads defensiveness, and this is a job description. The
            substance is the one obligation that genuinely surprises people --
            the seller, not Adulis, decides whether a payment is real. A seller
            who does not know that before applying eventually confirms a forged
            receipt and finds out at the worst possible moment. */}
        <div className="card mt-4">
          <h3 className="card-title">{t('handleTitle')}</h3>
          <p className="card-body max-w-prose">{t('handleBody')}</p>
        </div>
      </section>

      <section className="section-tight">
        <SectionTitle>{t('sequenceHeading')}</SectionTitle>
        <div className="grid gap-4 md:grid-cols-3">
          {sequence.map((item) => (
            <InfoCard key={item.title} title={item.title} body={item.body} variant="contained" />
          ))}
        </div>
        {/* Kept verbatim from the specification. An earlier revision blanked this
            and Build Amendment 01 §7 ruled the specification right and the site
            wrong: the commercial sequence is stated, the prices are not. */}
        <p className="card-body mt-4 max-w-prose">{t('sequenceNote')}</p>
      </section>

      <section id="waitlist" className="mt-12 scroll-mt-8 border-t border-line pb-4 pt-10">
        <h2 className="section-title">{waitlist('heading')}</h2>
        <p className="lede mb-6">{waitlist('sub')}</p>
        <WaitlistForm />
      </section>

      <section className="section-tight pb-12">
        <SectionTitle>{t('nextHeading')}</SectionTitle>
        <div className="grid gap-4 md:grid-cols-3">
          {next.map((item) => (
            <InfoCard key={item.title} title={item.title} body={item.body} variant="contained" />
          ))}
        </div>
      </section>
    </div>
  );
}

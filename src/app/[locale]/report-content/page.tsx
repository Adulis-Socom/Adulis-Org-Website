import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { buildPageMetadata } from '@/lib/metadata';
import { ROUTES } from '@/lib/routes';
import { Link } from '@/i18n/routing';
import { UndecidedFlag } from '@/components/ui';

type LocaleParams = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'report' });
  // Still `unbuilt`: the form is not wired and the reason categories are
  // undecided. This route must resolve — it is an app-store requirement — but it
  // must not be indexed while it cannot actually take a report.
  return buildPageMetadata({ locale, path: ROUTES.report, title: t('pageTitle'), unbuilt: true });
}

export default async function ReportContentPage({ params }: LocaleParams) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('report');
  const trust = await getTranslations('trust');
  const moderation = trust.raw('moderation') as { title: string; body: string }[];

  return (
    <div className="container-page">
      <section className="section">
        <h1 className="page-title">{t('heading')}</h1>
        <p className="lede">{t('sub')}</p>
      </section>

      {/* Fields, validation and delivery are Checkpoint 4, and the reason
          categories are still undecided. A report form that accepts a
          submission and drops it is worse than one that says it is not ready:
          someone reporting harmful content would believe it had been sent. */}
      <section className="section-tight">
        <UndecidedFlag>Not yet accepting reports — the form is built in Checkpoint 4.</UndecidedFlag>
      </section>

      <section className="section-tight pb-12">
        <h2 className="section-title mb-4">{trust('moderationHeading')}</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {moderation.map((item) => (
            <div key={item.title} className="card">
              <h3 className="card-title">{item.title}</h3>
              <p className="card-body">{item.body}</p>
            </div>
          ))}
        </div>
        <Link href={ROUTES.trustAndSafety} className="link-arrow-target mt-4 inline-block">
          {trust('pageTitle')} →
        </Link>
      </section>
    </div>
  );
}

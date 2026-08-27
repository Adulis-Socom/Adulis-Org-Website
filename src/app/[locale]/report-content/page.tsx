import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { buildPageMetadata } from '@/lib/metadata';
import { ROUTES } from '@/lib/routes';
import { Link } from '@/i18n/routing';
import { ReportForm } from '@/components/ReportForm';

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

      {/* The reason category is still a flagged placeholder inside the form —
          a moderation taxonomy on a public page is a policy statement, not
          copy. Everything else works: someone can describe the problem in their
          own words today. */}
      <section className="section-tight">
        <ReportForm />
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

import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { buildPageMetadata } from '@/lib/metadata';
import { ROUTES } from '@/lib/routes';
import { Link } from '@/i18n/routing';
import { InfoCard, SectionTitle, UndecidedFlag } from '@/components/ui';

type LocaleParams = { params: Promise<{ locale: string }> };
type Item = { title: string; body: string };
type LadderRow = { level: string; earnedBy: string; meaning: string };
/** One card carries a list instead of a body — see the claims section below. */
type ClaimCard = { title: string; body?: string; lead?: string; items?: string[] };

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'trust' });
  return buildPageMetadata({ locale, path: ROUTES.trustAndSafety, title: t('pageTitle') });
}

export default async function TrustAndSafetyPage({ params }: LocaleParams) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('trust');
  const boundaries = t.raw('boundaries') as Item[];
  const verification = t.raw('verification') as Item[];
  const ladder = t.raw('ladder') as LadderRow[];
  const ladderNotes = t.raw('ladderNotes') as Item[];
  const published = t.raw('published') as string[];
  const reviews = t.raw('reviews') as Item[];
  const claims = t.raw('claims') as ClaimCard[];
  const moderation = t.raw('moderation') as Item[];

  return (
    <div className="container-page">
      <section className="section">
        <h1 className="page-title">{t('heading')}</h1>
        <p className="lede">{t('sub')}</p>
      </section>

      <section className="section-tight">
        <SectionTitle>{t('boundariesHeading')}</SectionTitle>
        <div className="grid gap-4 md:grid-cols-2">
          {boundaries.map((item) => (
            <InfoCard key={item.title} title={item.title} body={item.body} />
          ))}
        </div>
      </section>

      <section className="section-tight">
        <SectionTitle>{t('verifiedHeading')}</SectionTitle>
        <div className="grid gap-4 md:grid-cols-2">
          {verification.map((item) => (
            <InfoCard key={item.title} title={item.title} body={item.body} variant="sunken" />
          ))}
        </div>
        <p className="note mt-4 max-w-prose">{t('verificationNote')}</p>
      </section>

      <section className="section-tight">
        <SectionTitle>{t('ladderHeading')}</SectionTitle>

        {/* No EXAMPLE badge here. New, Established and Trusted are the real
            level names -- only their thresholds are undecided, which is what
            ladderUndecided says. Tagging them as illustrative would be untrue. */}
        {/* Cards below md, a table from md up.
            An overflow-x-auto table was tried first and was wrong twice over: at
            360px it made the ladder a sideways scroll on the device this site is
            built for, and axe flagged it "scrollable-region-focusable" because a
            scrollable region with no focusable content is unreachable by
            keyboard. Stacking removes both rather than papering over either. */}
        <ul className="grid gap-4 md:hidden">
          {ladder.map((row) => (
            <li key={row.level} className="card">
              <h3 className="card-title">{row.level}</h3>
              <p className="mt-2 text-small font-semibold text-ink-muted">
                {t('ladderColumns.earnedBy')}
              </p>
              <p className="card-body">{row.earnedBy}</p>
              <p className="mt-2 text-small font-semibold text-ink-muted">
                {t('ladderColumns.meaning')}
              </p>
              <p className="card-body">{row.meaning}</p>
            </li>
          ))}
        </ul>

        <table className="hidden w-full border-collapse text-left md:table">
          <thead>
            <tr>
              <th scope="col" className="border-b border-line py-2 pr-4 text-small text-ink-muted">
                {t('ladderColumns.level')}
              </th>
              <th scope="col" className="border-b border-line py-2 pr-4 text-small text-ink-muted">
                {t('ladderColumns.earnedBy')}
              </th>
              <th scope="col" className="border-b border-line py-2 text-small text-ink-muted">
                {t('ladderColumns.meaning')}
              </th>
            </tr>
          </thead>
          <tbody>
            {ladder.map((row) => (
              <tr key={row.level}>
                <th scope="row" className="card-title border-b border-line py-3 pr-4 align-top">
                  {row.level}
                </th>
                <td className="card-body border-b border-line py-3 pr-4 align-top">{row.earnedBy}</td>
                <td className="card-body border-b border-line py-3 align-top">{row.meaning}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {ladderNotes.map((item) => (
            <InfoCard key={item.title} title={item.title} body={item.body} />
          ))}
        </div>

        <UndecidedFlag>{t('ladderUndecided')}</UndecidedFlag>
      </section>

      <section className="section-tight">
        <SectionTitle>{t('publishHeading')}</SectionTitle>

        {/* One statement below the set, never the same sentence repeated on
            every card. */}
        <ul className="grid gap-3 sm:grid-cols-2">
          {published.map((entry) => (
            <li key={entry} className="card">
              <span className="card-title">{entry}</span>
            </li>
          ))}
        </ul>

        <p className="note mt-4 max-w-prose">{t('publishNote')}</p>
      </section>

      <section className="section-tight">
        <SectionTitle>{t('reviewsHeading')}</SectionTitle>
        <div className="grid gap-4 md:grid-cols-2">
          {reviews.map((item) => (
            <InfoCard key={item.title} title={item.title} body={item.body} />
          ))}
        </div>
      </section>

      <section className="section-tight">
        <SectionTitle>{t('claimsHeading')}</SectionTitle>
        {/* "What can be claimed" is deliberately taller than its siblings. It is
            the one card on this page that answers the question the page exists
            for, and the no-repeated-sibling-text rule forbids identical filler,
            not unequal length.

            The five triggers are ADU-PRD-01 §14 in plain language. If that list
            moves, the PRD governs and this follows it. */}
        <div className="grid gap-4 md:grid-cols-3">
          {claims.map((item) => (
            <div key={item.title} className="card">
              <h3 className="card-title">{item.title}</h3>
              {item.body && <p className="card-body">{item.body}</p>}
              {item.lead && <p className="card-body">{item.lead}</p>}
              {item.items && (
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {item.items.map((entry) => (
                    <li key={entry} className="card-body">
                      {entry}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="section-tight">
        <SectionTitle>{t('moderationHeading')}</SectionTitle>
        <div className="grid gap-4 md:grid-cols-3">
          {moderation.map((item) => (
            <InfoCard key={item.title} title={item.title} body={item.body} variant="sunken" />
          ))}
        </div>
      </section>

      <section className="section-tight pb-12">
        <div className="card-sunken">
          <p className="flex flex-wrap gap-x-6 gap-y-2">
            <Link href={ROUTES.refunds} className="link-arrow-target">
              {t('refundsLink')}
            </Link>
            <Link href={ROUTES.report} className="link-arrow-target">
              {t('reportLink')}
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}

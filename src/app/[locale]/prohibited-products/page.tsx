import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { buildPageMetadata } from '@/lib/metadata';
import { Link } from '@/i18n/routing';
import { ROUTES } from '@/lib/routes';
// Evidentiary register, as Trust & Safety: Card/Open, no surfaces, no gold.

type LocaleParams = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'prohibited' });
  return buildPageMetadata({ locale, path: ROUTES.prohibited, title: t('pageTitle') });
}

export default async function ProhibitedProductsPage({ params }: LocaleParams) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('prohibited');
  const common = await getTranslations('common');
  const categories = t.raw('categories') as { title: string; body: string }[];

  return (
    <div className="container-page">
      <section className="section">
        <h1 className="page-title">{t('heading')}</h1>
        <p className="lede">{t('sub')}</p>

        {/* Each category now carries its own definition. A bare list of twelve
            nouns left a reader guessing what "Fraudulent" covers, and this is
            the page a seller checks before listing something. */}
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <li key={category.title} className="card-open">
              <h2 className="card-title">{category.title}</h2>
              <p className="card-body">{category.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="section-tight pb-12">
        <div className="card-open">
          <h2 className="section-title">{t('noteTitle')}</h2>
          <p className="card-body max-w-prose">{t('noteBody')}</p>
          <Link href={ROUTES.report} className="link-arrow-target mt-3 inline-block">
            {t('reportLink')}
          </Link>
        </div>
      </section>
    </div>
  );
}

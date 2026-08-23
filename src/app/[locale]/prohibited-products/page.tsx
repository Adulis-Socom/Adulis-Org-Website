import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

type LocaleParams = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'prohibited' });
  return { title: t('pageTitle') };
}

export default async function ProhibitedProductsPage({ params }: LocaleParams) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('prohibited');
  const categories = t.raw('categories') as string[];

  return (
    <div className="container-page">
      <section className="section">
        <h1 className="page-title">{t('heading')}</h1>

        {/* Twelve names and nothing else. Repeating the same sentence of body
            text under each card would say it twelve times and mean it once --
            it belongs below the set. */}
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((category) => (
            <li key={category} className="card">
              <span className="card-title">{category}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="section-tight pb-12">
        <div className="card-sunken">
          <h2 className="section-title">{t('noteTitle')}</h2>
          <p className="card-body max-w-prose">{t('noteBody')}</p>
        </div>
      </section>
    </div>
  );
}

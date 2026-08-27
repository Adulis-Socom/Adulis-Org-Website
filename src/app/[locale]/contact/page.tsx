import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { buildPageMetadata } from '@/lib/metadata';
import { ROUTES } from '@/lib/routes';
import { UndecidedFlag } from '@/components/ui';
import { ContactForm } from '@/components/ContactForm';

type LocaleParams = { params: Promise<{ locale: string }> };
type Route = { title: string; value: string };

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'contact' });
  // Still `unbuilt`: every address is undecided and the form is not wired, so
  // there is currently no way to contact anyone from this page. Indexing a
  // contact page that cannot deliver a message is worse than not having one.
  return buildPageMetadata({ locale, path: ROUTES.contact, title: t('pageTitle'), unbuilt: true });
}

export default async function ContactPage({ params }: LocaleParams) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('contact');
  const footer = await getTranslations('footer');
  const routes = t.raw('routes') as Route[];

  return (
    <div className="container-page">
      <section className="section">
        <h1 className="page-title">{t('heading')}</h1>
        <p className="lede">{t('sub')}</p>
      </section>

      <section className="section-tight">
        <h2 className="section-title mb-4">{t('routesHeading')}</h2>
        <ul className="grid gap-4 md:grid-cols-3">
          {routes.map((route) => (
            <li key={route.title} className="card">
              <h3 className="card-title">{route.title}</h3>
              {/* The addresses are genuinely undecided, so they render as
                  flagged placeholders rather than as mailto: links to nothing. */}
              <UndecidedFlag>{route.value}</UndecidedFlag>
            </li>
          ))}
        </ul>
      </section>

      <section className="section-tight">
        <div className="card-sunken">
          <h2 className="section-title">{t('locationTitle')}</h2>
          <p className="card-body">{footer('address')}</p>
        </div>
      </section>

      {/* The form now has an action behind it, which is what Checkpoint 2's
          placeholder was waiting for. It still cannot accept a live submission:
          no store is provisioned, so a production build with no destination
          refuses rather than silently discarding. The gate is legal, not
          technical. */}
      <section className="section-tight">
        <h2 className="section-title mb-4">{t('formHeading')}</h2>
        <ContactForm />
      </section>

      <section className="section-tight pb-12">
        <div className="card">
          <h2 className="section-title">{t('privacyTitle')}</h2>
          <p className="card-body max-w-prose">{t('privacyBody')}</p>
        </div>
      </section>
    </div>
  );
}

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { routing, type Locale } from '@/i18n/routing';
import { inter, notoEthiopic } from '@/lib/fonts';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import '../globals.css';

type LocaleParams = { params: Promise<{ locale: string }> };

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  return {
    metadataBase: new URL(siteUrl ?? 'http://localhost:3000'),
    title: {
      default: t('siteName'),
      template: `%s · ${t('siteName')}`
    },
    description: t('defaultDescription'),
    alternates: {
      canonical: `/${locale}`,
      languages: Object.fromEntries(routing.locales.map((code) => [code, `/${code}`]))
    },
    // No domain is decided yet. Until NEXT_PUBLIC_SITE_URL is set deliberately,
    // every page is noindex: a pre-launch build indexed under the Adulis name is
    // public use of a name whose IP registration is not complete.
    robots: siteUrl ? undefined : { index: false, follow: false }
  };
}

export default async function LocaleLayout({
  children,
  params
}: LocaleParams & { children: React.ReactNode }) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as Locale)) notFound();

  setRequestLocale(locale);

  const messages = await getMessages();
  const t = await getTranslations({ locale, namespace: 'nav' });

  return (
    <html lang={locale} className={`${inter.variable} ${notoEthiopic.variable}`}>
      <body className="flex min-h-screen flex-col">
        <NextIntlClientProvider messages={messages}>
          <a href="#main" className="skip-link">
            {t('skipToContent')}
          </a>
          <Header />
          <main id="main" className="flex-1">
            {children}
          </main>
          <Footer />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

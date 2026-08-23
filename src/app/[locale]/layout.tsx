import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { AM_ENABLED, routing, type Locale } from '@/i18n/routing';
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

  // /am resolves so that URLs stay stable and translation can land key by key,
  // but it must not be indexed while it is serving English fallback text.
  const localeIsOffered = locale !== 'am' || AM_ENABLED;
  const indexable = Boolean(siteUrl) && localeIsOffered;

  return {
    metadataBase: new URL(siteUrl ?? 'http://localhost:3000'),
    title: {
      default: t('siteName'),
      template: `%s · ${t('siteName')}`
    },
    description: t('defaultDescription'),
    alternates: {
      canonical: `/${locale}`,
      // Only advertise locales actually on offer, or search engines are told
      // about an Amharic tree that is not Amharic yet.
      languages: Object.fromEntries(
        routing.locales
          .filter((code) => code !== 'am' || AM_ENABLED)
          .map((code) => [code, `/${code}`])
      )
    },
    // No domain is decided yet. Until NEXT_PUBLIC_SITE_URL is set deliberately,
    // every page is noindex: a pre-launch build indexed under the Adulis name is
    // public use of a name whose IP registration is not complete.
    robots: indexable ? undefined : { index: false, follow: false }
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

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { routing, type Locale } from '@/i18n/routing';
import { buildPageMetadata } from '@/lib/metadata';
import { inter, ethiopicSwitcher, notoEthiopic } from '@/lib/fonts';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import '../globals.css';

/**
 * Every page under this layout renders per request. This is not a preference.
 *
 * The CSP in src/middleware.ts puts a fresh nonce on `script-src` for each
 * response. A nonce baked into a prerendered HTML file is the same nonce for
 * every visitor forever, which is not a nonce -- and Next will not stamp one
 * onto prerendered markup at all. Measured directly before this line was added:
 * with static prerendering, 0 of 29 <script> tags carried the nonce, so under
 * `'strict-dynamic'` (which makes browsers ignore `'self'`) every script on the
 * site was blocked. With per-request rendering, 23 of 23 carry it and 30 pages
 * load with zero CSP violations.
 *
 * Cost, measured locally on this machine, static vs dynamic:
 *   prerendered HTML files   30  ->  0
 *   median TTFB            5 ms  ->  13 ms
 * The larger cost is not the milliseconds: prerendered pages can be served from
 * edge cache, and these cannot. Every request now runs a full RSC render.
 *
 * ⚠ The build's route table still prints these as `●  (SSG)`. That marker
 * reflects `generateStaticParams` being present, not actual prerendering -- the
 * .html files are genuinely gone. Do not read the table as evidence this line
 * stopped working; check `.next/server/app` for .html files instead.
 *
 * Removing this line silently breaks the entire site in the browser while every
 * server-side check continues to pass. The QA suite guards it.
 */
export const dynamic = 'force-dynamic';

type LocaleParams = { params: Promise<{ locale: string }> };

/**
 * The only message namespaces sent to the browser.
 *
 * Left to itself, NextIntlClientProvider inlines the entire catalogue into every
 * page's RSC payload -- about 16KB of JSON on a site whose binding constraint is
 * first paint on a low-end Android over a slow connection. Only four components
 * are client-side and between them they need three namespaces:
 *
 *   nav           -> Header, LanguageSwitcher
 *   waitlist      -> WaitlistForm
 *   deleteAccount -> DeleteAccountFlow
 *
 * Everything else is a server component and needs nothing on the client.
 *
 * A client component reaching for a namespace that is not in this list fails at
 * runtime, not at build. If you add one, add its namespace here.
 */
const CLIENT_NAMESPACES = ['nav', 'waitlist', 'deleteAccount'] as const;

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

    // Deliberately no `alternates` here. Every real page supplies its own
    // canonical through buildPageMetadata; a layout-level one would be the
    // locale root, and each page would inherit it and claim to be a duplicate
    // of the home page. Leaving it out is also what lets the 404 and the
    // catch-all emit no canonical at all, which is correct for both.
    //
    // Robots is still computed here, because those two surfaces define no
    // metadata of their own and this is the value they should inherit.
    ...buildPageMetadata({ locale })
  };
}

export default async function LocaleLayout({
  children,
  params
}: LocaleParams & { children: React.ReactNode }) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as Locale)) notFound();

  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: 'nav' });

  // From v4 the provider would inherit the whole catalogue from i18n/request.ts.
  // Pass an explicit subset instead -- see CLIENT_NAMESPACES above. The English
  // fallback merge has already happened by this point, so the picked namespaces
  // are post-merge.
  const messages = await getMessages();
  const clientMessages = Object.fromEntries(
    CLIENT_NAMESPACES.map((namespace) => [namespace, messages[namespace]])
  );

  return (
    // Face A (the four switcher glyphs) is global and costs 2,648 bytes.
    // Face B (the full 198,028-byte Ethiopic face) is applied only on Amharic
    // routes, so an English page can never pull it -- see src/lib/fonts.ts.
    <html
      lang={locale}
      className={`${inter.variable} ${ethiopicSwitcher.variable}${
        locale === 'am' ? ` ${notoEthiopic.variable}` : ''
      }`}
    >
      <body className="flex min-h-screen flex-col">
        <NextIntlClientProvider messages={clientMessages}>
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

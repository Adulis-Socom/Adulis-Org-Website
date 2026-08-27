import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { buildPageMetadata } from '@/lib/metadata';
import { ROUTES, indexPolicy } from '@/lib/routes';
import { LegalSections } from '@/components/LegalSections';

type LocaleParams = { params: Promise<{ locale: string }> };

// generateMetadata, not a static `metadata` export: a static one cannot see the
// locale, so it could not ask buildPageMetadata the right question -- and whatever
// it set would silently replace the layout's value for that field.
//
// `unbuilt` stays true while any section body is undecided. The section map is
// real, but a Privacy page whose retention text is a placeholder must not be
// indexed and quoted back at the company.
export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'refunds' });
  return buildPageMetadata({
    ...indexPolicy('refunds'),
    locale,
    path: ROUTES.refunds,
    title: t('pageTitle')
  });
}

export default async function Page({ params }: LocaleParams) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <LegalSections namespace="refunds" />;
}

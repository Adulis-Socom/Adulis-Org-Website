import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { buildPageMetadata } from '@/lib/metadata';
import { ROUTES } from '@/lib/routes';
import { TierTwoStub } from '@/components/TierTwoStub';

type LocaleParams = { params: Promise<{ locale: string }> };

const TITLE = 'Help Center';
const NOTE =
  'Eleven questions, collapsed and expanded, per wireframe W11.';

// generateMetadata, not a static `metadata` export: a static one cannot see the
// locale, so it could not ask buildPageMetadata the right question -- and whatever it
// set would silently replace the layout's value for that field.
export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata({ locale, path: ROUTES.help, title: TITLE, unbuilt: true });
}

export default async function HelpPage({ params }: LocaleParams) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <TierTwoStub title={TITLE} note={NOTE} />;
}

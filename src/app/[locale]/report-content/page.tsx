import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { buildRobots } from '@/lib/metadata';
import { TierTwoStub } from '@/components/TierTwoStub';

type LocaleParams = { params: Promise<{ locale: string }> };

const TITLE = 'Report content';
const NOTE =
  'Form and success states, per W21. Reason options are still to be confirmed.';

// generateMetadata, not a static `metadata` export: a static one cannot see the
// locale, so it could not ask buildRobots the right question -- and whatever it
// set would silently replace the layout's value for that field.
export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const { locale } = await params;
  return { title: TITLE, robots: buildRobots({ locale, unbuilt: true }) };
}

export default async function ReportContentPage({ params }: LocaleParams) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <TierTwoStub title={TITLE} note={NOTE} />;
}

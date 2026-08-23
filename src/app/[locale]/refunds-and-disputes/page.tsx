import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { buildRobots } from '@/lib/metadata';
import { TierTwoStub } from '@/components/TierTwoStub';

type LocaleParams = { params: Promise<{ locale: string }> };

const TITLE = 'Refunds & Disputes';
const NOTE =
  'Seven sections with the anchor sidebar, per W15. Blocked on drafted legal text.';

// generateMetadata, not a static `metadata` export: a static one cannot see the
// locale, so it could not ask buildRobots the right question -- and whatever it
// set would silently replace the layout's value for that field.
export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const { locale } = await params;
  return { title: TITLE, robots: buildRobots({ locale, unbuilt: true }) };
}

export default async function RefundsAndDisputesPage({ params }: LocaleParams) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <TierTwoStub title={TITLE} note={NOTE} />;
}

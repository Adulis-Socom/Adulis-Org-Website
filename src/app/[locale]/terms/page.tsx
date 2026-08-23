import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { TierTwoStub } from '@/components/TierTwoStub';

const TITLE = 'Terms';
const NOTE =
  'Eleven sections with the anchor sidebar, per W13. Blocked on drafted legal text.';

export const metadata: Metadata = { title: TITLE, robots: { index: false } };

export default async function TermsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <TierTwoStub title={TITLE} note={NOTE} />;
}

import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { TierTwoStub } from '@/components/TierTwoStub';

const TITLE = 'Privacy';
const NOTE =
  'Fourteen sections with the anchor sidebar, per W14. Retention must read 12 months, matching the waitlist consent.';

export const metadata: Metadata = { title: TITLE, robots: { index: false } };

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <TierTwoStub title={TITLE} note={NOTE} />;
}

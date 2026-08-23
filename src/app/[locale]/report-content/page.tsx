import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { TierTwoStub } from '@/components/TierTwoStub';

const TITLE = 'Report content';
const NOTE =
  'Form and success states, per W21. Reason options are still to be confirmed.';

export const metadata: Metadata = { title: TITLE, robots: { index: false } };

export default async function ReportContentPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <TierTwoStub title={TITLE} note={NOTE} />;
}

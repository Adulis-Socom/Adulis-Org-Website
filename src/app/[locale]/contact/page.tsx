import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { TierTwoStub } from '@/components/TierTwoStub';

const TITLE = 'Contact';
const NOTE =
  'Three states plus the consent line, per W12. Blocked on the domain decision.';

export const metadata: Metadata = { title: TITLE, robots: { index: false } };

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <TierTwoStub title={TITLE} note={NOTE} />;
}

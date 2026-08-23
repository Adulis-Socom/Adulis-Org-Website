import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { TierTwoStub } from '@/components/TierTwoStub';

const TITLE = 'Help Center';
const NOTE = 'Eleven questions, collapsed and expanded, per wireframe W11.';

export const metadata: Metadata = { title: TITLE, robots: { index: false } };

export default async function HelpPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <TierTwoStub title={TITLE} note={NOTE} />;
}

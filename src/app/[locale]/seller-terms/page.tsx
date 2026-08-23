import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { TierTwoStub } from '@/components/TierTwoStub';

const TITLE = 'Seller Terms';
const NOTE =
  'Twelve sections with the anchor sidebar, per W16. Blocked on drafted legal text.';

export const metadata: Metadata = { title: TITLE, robots: { index: false } };

export default async function SellerTermsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <TierTwoStub title={TITLE} note={NOTE} />;
}

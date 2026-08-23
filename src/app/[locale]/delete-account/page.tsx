import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { buildRobots } from '@/lib/metadata';
import { DeleteAccountFlow } from '@/components/DeleteAccountFlow';

type LocaleParams = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'deleteAccount' });
  return {
    title: t('pageTitle'),
    // Reachable by URL because both app stores require it, but there is no
    // reason for it to rank.
    robots: buildRobots({ locale, unlisted: true })
  };
}

export default async function DeleteAccountPage({ params }: LocaleParams) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="container-page section">
      <DeleteAccountFlow />
    </div>
  );
}

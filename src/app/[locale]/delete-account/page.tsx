import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { buildPageMetadata } from '@/lib/metadata';
import { ROUTES, indexPolicy } from '@/lib/routes';
import { DeleteAccountFlow } from '@/components/DeleteAccountFlow';

type LocaleParams = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'deleteAccount' });
  // Reachable by URL because both app stores require it, but there is no
  // reason for it to rank.
  return buildPageMetadata({
    ...indexPolicy('deleteAccount'),
    locale,
    path: ROUTES.deleteAccount,
    title: t('pageTitle')
  });
}

export default async function DeleteAccountPage({ params }: LocaleParams) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="container-page section">
      <DeleteAccountFlow
      // The API URL is server-only, so whether it is configured is passed in
      // rather than read in the browser. The flow needs BOTH this and
      // DELETION_FLOW_ENABLED: the flag is a person certifying the seven
      // conditions in src/lib/flags.ts, the URL is the technical precondition.
      apiConfigured={Boolean(process.env.DELETION_API_URL)}
    />
    </div>
  );
}

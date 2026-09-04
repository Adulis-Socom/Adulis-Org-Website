import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { buildPageMetadata } from '@/lib/metadata';
import { ROUTES, indexPolicy } from '@/lib/routes';
import { DeleteAccountFlow } from '@/components/DeleteAccountFlow';
import { DELETION_FLOW_ENABLED } from '@/lib/flags';

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
      // Both gates, evaluated on the server where the environment is real.
      // The flag is a person certifying the eight conditions in src/lib/flags.ts;
      // the URL is the technical precondition. A client component cannot make
      // this decision — it would inline process.env at build time.
      enabled={DELETION_FLOW_ENABLED && Boolean(process.env.DELETION_API_URL)}
    />
    </div>
  );
}

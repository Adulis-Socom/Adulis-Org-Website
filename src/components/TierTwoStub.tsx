import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { UndecidedFlag } from './ui';

/**
 * These seven routes are linked from the header and the footer on every page, so
 * they must resolve. A 404 behind "Privacy", "Report content" or "Delete my
 * account" is a legal and app-store problem, not a cosmetic one -- a visibly
 * unbuilt page is the honest interim state.
 */
export async function TierTwoStub({ title, note }: { title: string; note: string }) {
  const notFound = await getTranslations('notFound');

  return (
    <div className="container-page section">
      <h1 className="page-title">{title}</h1>

      <div className="mt-4">
        <UndecidedFlag>Tier 2 — not built yet</UndecidedFlag>
      </div>

      <p className="lede">{note}</p>

      <Link href="/" className="btn-secondary mt-6">
        {notFound('home')}
      </Link>
    </div>
  );
}

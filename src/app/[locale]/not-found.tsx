import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { ROUTES } from '@/lib/routes';

/**
 * The localised 404, inside the normal header and footer. It is reached through
 * `notFound()` (the `[...rest]` catch-all), so the response keeps its real 404
 * status — styling here cannot turn it into a soft 200.
 *
 * Spare on purpose: the code, one sentence, and a way back — Home first, then
 * the two pages a lost visitor most often wanted (ADU-WEB-02 §97). Availability
 * and Ethiopia join this list when their routes exist.
 */
export default function LocaleNotFound() {
  const t = useTranslations('notFound');
  const nav = useTranslations('nav');

  return (
    <div className="container-page section">
      <p className="section-label tnum">{t('code')}</p>
      <h1 className="page-title mt-4">{t('heading')}</h1>

      <div className="cta-group">
        <Link href={ROUTES.home} className="btn-primary">
          {t('home')}
        </Link>
        <Link href={ROUTES.howItWorks} className="btn-secondary">
          {nav('howItWorks')}
        </Link>
        <Link href={ROUTES.help} className="btn-text">
          {nav('help')} →
        </Link>
      </div>
    </div>
  );
}

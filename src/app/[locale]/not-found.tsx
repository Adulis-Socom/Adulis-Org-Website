import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { ROUTES } from '@/lib/routes';

export default function LocaleNotFound() {
  const t = useTranslations('notFound');

  return (
    <div className="container-page section">
      <p className="tnum text-display font-bold text-ink-muted">{t('code')}</p>
      <h1 className="page-title mt-2">{t('heading')}</h1>

      {/* W20 is deliberately spare: the code, one sentence, one way out. The
          earlier revision added a body line and a second button to Help; the
          final wireframe set removed both, and a 404 is not the place to offer
          a reader a menu. */}
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href={ROUTES.home} className="btn-primary">
          {t('home')}
        </Link>
      </div>
    </div>
  );
}

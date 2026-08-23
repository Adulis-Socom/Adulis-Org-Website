import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';

export default function LocaleNotFound() {
  const t = useTranslations('notFound');

  return (
    <div className="container-page section">
      <p className="tnum text-display font-bold text-ink-muted">{t('code')}</p>
      <h1 className="page-title mt-2">{t('heading')}</h1>
      <p className="lede">{t('body')}</p>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/" className="btn-primary">
          {t('home')}
        </Link>
        <Link href="/help" className="btn-secondary">
          {t('help')}
        </Link>
      </div>
    </div>
  );
}

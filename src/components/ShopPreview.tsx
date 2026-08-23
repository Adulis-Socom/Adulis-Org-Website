import { getTranslations } from 'next-intl/server';
import { MediaPlaceholder } from './ui';

/**
 * The illustrative storefront card.
 *
 * The EXAMPLE badge belongs here and on nothing else. "Luna Fashion", the level
 * and the counts are invented, and a reader has to be able to tell that at a
 * glance. It must never appear beside the trust ladder on Trust & Safety: New,
 * Established and Trusted are the real level names, and only their thresholds
 * are undecided.
 */
export async function ShopPreview({ withArrow = false }: { withArrow?: boolean }) {
  const home = await getTranslations('home');
  const shop = await getTranslations('shopPreview');
  const common = await getTranslations('common');

  return (
    <section className="card-sunken" aria-label={home('shopPreviewTitle')}>
      <h2 className="text-h3 text-ink">{home('shopPreviewTitle')}</h2>

      <div className="mt-4 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
        <MediaPlaceholder
          label={home('socialPostAlt')}
          className="min-h-[140px] flex-1 sm:min-h-[180px]"
        />

        {withArrow && (
          <span
            aria-hidden
            className="select-none text-center text-h3 font-semibold text-ink-muted"
          >
            <span className="sm:hidden">↓</span>
            <span className="hidden sm:inline">→</span>
          </span>
        )}

        <div className="card flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-h3 text-ink">{shop('sellerName')}</span>
            <span className="badge-example">{common('exampleTag')}</span>
          </div>
          <p className="badge-level mt-2">{shop('level')}</p>
          <p className="tnum mt-1 text-small text-ink-muted">{shop('orders')}</p>
          <p className="tnum mt-1 text-small text-ink-muted">{shop('stock')}</p>
        </div>
      </div>
    </section>
  );
}

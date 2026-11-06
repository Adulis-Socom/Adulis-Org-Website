import type { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';

// A server component in its own module. `ui.tsx` is imported by a client
// component (ReportForm, for UndecidedFlag), so anything there must stay free of
// server-only APIs; this reads the catalogue with getTranslations.

type PhotoTone = 'sand' | 'clay' | 'sage' | 'stone';

/**
 * A photography-ready media area: hero, Seller, Buyer/discovery, Scene,
 * Ethiopia and Trust imagery all go through this.
 *
 * Until founder-approved photography exists it renders the prototype's slot —
 * a tonal panel carrying the shot's brief ("Photography · …"), visibly a
 * placeholder so it cannot ship unnoticed, and never a stock image.
 *
 * Size is the caller's: pass an aspect-ratio or height utility in `className`
 * (`aspect-[12/5]`, `aspect-[4/3]`, `h-80`) so the slot reserves its space and
 * nothing shifts when an image arrives. No inline styles — CSP `style-src-attr`.
 *
 * Accessibility: a slot with a `brief` is announced as an image ("Photograph to
 * come: …"); a slot without one is decorative and hidden from assistive
 * technology. When real photography lands, pass it as `children` (an `<img>`
 * with `className="photo-slot-media"`, real alt text and explicit dimensions)
 * and drop the brief. `next/image` is deliberately not used yet: it needs the
 * `sharp` upgrade that `check:assets` gates, and it emits inline style
 * attributes the CSP blocks.
 */
export async function PhotoSlot({
  brief,
  tone = 'sand',
  framed = true,
  className = 'aspect-[4/3]',
  children
}: {
  brief?: string;
  tone?: PhotoTone;
  framed?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  const t = await getTranslations('common');
  const classes = `photo-slot photo-slot-${tone}${framed ? '' : ' photo-slot-unframed'} ${className}`;

  if (children) return <div className={classes}>{children}</div>;

  if (!brief) return <div aria-hidden className={classes} />;

  return (
    <div role="img" aria-label={t('photoPending', { brief })} className={classes}>
      <span aria-hidden className="photo-slot-brief">
        {t('photoLabel')} · {brief}
      </span>
    </div>
  );
}

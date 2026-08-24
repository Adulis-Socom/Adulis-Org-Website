import type { ReactNode } from 'react';
import { Link } from '@/i18n/routing';

type CardVariant = 'plain' | 'sunken' | 'tint';

const CARD_CLASS: Record<CardVariant, string> = {
  plain: 'card',
  sunken: 'card-sunken',
  tint: 'card-tint'
};

/**
 * `index` prefixes the title with a tabular number.
 *
 * Only pass it where the content genuinely is a sequence -- the five steps on
 * How it works, the four on For buyers. Value cards, boundary cards and category
 * lists are sets, and numbering a set asserts an order that does not exist.
 */
export function InfoCard({
  title,
  body,
  variant = 'plain',
  index
}: {
  title: string;
  body?: string;
  variant?: CardVariant;
  index?: number;
}) {
  return (
    <div className={CARD_CLASS[variant]}>
      <h3 className="card-title">
        {index != null && <span className="tnum text-ink-muted">{index}. </span>}
        {title}
      </h3>
      {body && <p className="card-body">{body}</p>}
    </div>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="section-title mb-4">{children}</h2>;
}

/**
 * The one band on a page that hands the reader to the other audience. It is
 * visually heavier than a card on purpose -- it is a door, not a link.
 */
export function DoorBand({
  title,
  linkLabel,
  href
}: {
  title: string;
  linkLabel: string;
  href: string;
}) {
  return (
    <div className="door flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <h2 className="text-h3 text-ink">{title}</h2>
      <Link href={href} className="link-arrow">
        {linkLabel}
      </Link>
    </div>
  );
}

/**
 * A short horizontal flow of steps, stacking on mobile.
 *
 * The separators are decorative and hidden from assistive technology -- the
 * ordered list already conveys the sequence. The `li` deliberately does not use
 * `display: contents`, which removes the list item from the accessibility tree
 * in several browsers and silently costs the list its semantics.
 */
export function Sequence({ steps }: { steps: string[] }) {
  return (
    <ol className="mt-4 flex flex-col gap-2 md:flex-row md:items-stretch md:gap-3">
      {steps.map((step, i) => (
        <li key={step} className="flex flex-col md:flex-1 md:flex-row md:items-center">
          <span className="flex-1 rounded border border-line bg-surface px-3 py-2.5 text-body text-ink">
            {step}
          </span>
          {i < steps.length - 1 && (
            <span
              aria-hidden
              className="select-none py-1 text-center text-body font-semibold text-ink-muted md:px-3 md:py-0"
            >
              <span className="md:hidden">↓</span>
              <span className="hidden md:inline">→</span>
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}

/**
 * Lo-fi stand-in for photography and category imagery that has not been shot.
 * Visibly a placeholder, so it cannot ship unnoticed.
 */
export function MediaPlaceholder({
  label,
  className = ''
}: {
  label: string;
  className?: string;
}) {
  return (
    <div role="img" aria-label={label} className={`placeholder-media ${className}`}>
      <span className="relative bg-surface-sunken px-2">{label}</span>
    </div>
  );
}

/** An undecided item, rendered so that it is impossible to mistake for content. */
export function UndecidedFlag({ children }: { children: ReactNode }) {
  return <p className="placeholder-flag inline-block">{children}</p>;
}

import type { ReactNode } from 'react';
import { DoorLink } from './DoorLink';

/**
 * Two treatments (work order §2.2): `contained` holds a group on the secondary
 * surface with its own border; `open` is a hairline above and nothing else —
 * the second container treatment in this system is the absence of a container.
 */
type CardVariant = 'contained' | 'open';

const CARD_CLASS: Record<CardVariant, string> = {
  contained: 'card',
  open: 'card-open'
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
  variant = 'contained',
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

/**
 * A two-line display headline, with the second line in gold.
 *
 * The rule, so it is not a per-page judgement: **gold carries the second line
 * of a two-line display headline, never the first.** The first line names the
 * subject; the second names the outcome — the thing the reader is being
 * offered — and that is where the emphasis belongs. One gold phrase per page
 * keeps it meaningful.
 *
 * ⚠ Relational pages only, and display sizes only. Gold on paper is 3.24:1,
 * which clears AA for large text (≥24px, or ≥18.66px bold) and fails it
 * outright below that — every size this renders at is 32px or more. It must
 * never appear on an evidentiary page: Trust & Safety and Prohibited Products
 * carry no gold at all, headline included.
 *
 * Each part is a block, so "the second line" is a fact about the markup rather
 * than about where a particular viewport happens to wrap.
 */
export function DisplayHeading({
  lead,
  accent,
  className = 'page-title'
}: {
  lead: string;
  accent: string;
  className?: string;
}) {
  return (
    <h1 className={className}>
      <span className="block">{lead}</span>
      <span className="display-gold block">{accent}</span>
    </h1>
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
  href,
  event
}: {
  title: string;
  linkLabel: string;
  href: string;
  /** ADU-WEB-01 §12: whether the seller/buyer split is right, and the reverse. */
  event: 'buyer_door_clicked' | 'seller_door_clicked';
}) {
  return (
    <div className="door flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <h2 className="text-h3 text-ink">{title}</h2>
      <DoorLink href={href} label={linkLabel} event={event} />
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

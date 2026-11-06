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
        {index != null && <span className="tnum text-content-secondary">{index}. </span>}
        {title}
      </h3>
      {body && <p className="card-body">{body}</p>}
    </div>
  );
}

/**
 * A display headline assembled from two catalogue strings.
 *
 * The previous direction set the second phrase in gold; the approved prototype
 * has no accent colour in its headlines, so both phrases now render as one
 * heading. The split stays only until the pages that use it are rebuilt
 * (WEB-MIG-003…005), which is cheaper than re-keying the catalogue twice.
 *
 * ⚠ For translators: the two parts are separate keys and must each be
 * translated as a whole phrase — never derived positionally from the English.
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
      {lead} {accent}
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
      <h2 className="text-heading-m text-content">{title}</h2>
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
          <span className="flex-1 rounded border border-border bg-surface px-3 py-2.5 text-body text-content">
            {step}
          </span>
          {i < steps.length - 1 && (
            <span
              aria-hidden
              className="select-none py-1 text-center text-body font-semibold text-content-secondary md:px-3 md:py-0"
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

/** The prototype's eyebrow pill above a heading. Not a heading itself. */
export function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="section-label">{children}</p>;
}

type AlertTone = 'info' | 'success' | 'warning' | 'error';

/**
 * An operational message. Static by default; pass `role="status"` (polite) or
 * `role="alert"` (assertive) when it appears in response to an action.
 */
export function Alert({
  tone = 'info',
  title,
  role,
  children
}: {
  tone?: AlertTone;
  title?: string;
  role?: 'status' | 'alert';
  children: ReactNode;
}) {
  return (
    <div role={role} className={`alert alert-${tone}`}>
      {title && <p className="font-semibold">{title}</p>}
      <div className={title ? 'mt-1' : undefined}>{children}</div>
    </div>
  );
}

/** An undecided item, rendered so that it is impossible to mistake for content. */
export function UndecidedFlag({ children }: { children: ReactNode }) {
  return <p className="placeholder-flag inline-block">{children}</p>;
}

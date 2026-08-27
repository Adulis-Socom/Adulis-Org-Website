'use client';

import { Link } from '@/i18n/routing';
import { track, type AnalyticsEvent } from '@/lib/analytics';

/**
 * The link inside a `DoorBand`, as its own client component.
 *
 * A door click can only be observed in the browser — measuring the destination
 * page instead would count every arrival, including people who navigated there
 * directly, which is the opposite of what the event is for.
 *
 * This is a client component so that `ui.tsx` does not have to be. Marking that
 * file `'use client'` would drag `InfoCard`, `SectionTitle` and
 * `MediaPlaceholder` into the browser bundle on every route that renders a card,
 * which is all of them.
 *
 * The click is still a plain navigation if the bundle never arrives: `track()`
 * is fire-and-forget and the `Link` does its job either way.
 */
export function DoorLink({
  href,
  label,
  event
}: {
  href: string;
  label: string;
  event: Extract<AnalyticsEvent, 'buyer_door_clicked' | 'seller_door_clicked'>;
}) {
  return (
    <Link href={href} className="link-arrow-target" onClick={() => track(event)}>
      {label}
    </Link>
  );
}

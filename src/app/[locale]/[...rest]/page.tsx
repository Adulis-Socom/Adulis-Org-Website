import { notFound } from 'next/navigation';

/**
 * Catches any path under a valid locale that matches no page and hands it to
 * `[locale]/not-found.tsx`, so a wrong URL gets the translated 404 inside the
 * normal header and footer rather than the bare unlocalised fallback.
 *
 * Without this, an unmatched `/en/...` falls all the way through to
 * `src/app/not-found.tsx` and the localised 404 never renders.
 */
export default function CatchAllPage(): never {
  notFound();
}

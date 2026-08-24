import type { ReactNode } from 'react';

/**
 * A pass-through root layout, required by the framework rather than wanted.
 *
 * `src/app/not-found.tsx` is a page at the root of the app, and Next refuses to
 * render any root-level page without a root layout. The real document -- html,
 * body, fonts, header, footer -- is built in `[locale]/layout.tsx`, because
 * everything real about this site is locale-scoped. This file exists only so
 * that the unlocalised 404 can render at all; give it no content.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}

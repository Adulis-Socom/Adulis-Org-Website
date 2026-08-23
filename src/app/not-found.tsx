import Link from 'next/link';

/**
 * Unlocalised fallback for a request that never resolved a locale, so it never
 * entered `[locale]/layout.tsx` and has no messages, no fonts and no theme.
 *
 * It renders its own `html` and `body` because the only layout in this app lives
 * under `[locale]`, and it is styled inline because `globals.css` is imported
 * there too. English only: there is no locale context to translate into, and
 * guessing one would be worse than not trying.
 *
 * In practice almost nothing lands here -- the middleware prefixes a locale onto
 * anything it matches, so a wrong path under `/en` or `/am` gets the localised
 * 404 instead.
 */
export default function GlobalNotFound() {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem',
          backgroundColor: '#FFFFFF',
          color: '#3A424F',
          fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
          fontSize: '0.9375rem',
          lineHeight: 1.6
        }}
      >
        <main style={{ maxWidth: '32rem' }}>
          <p
            style={{
              margin: 0,
              fontSize: '2.25rem',
              fontWeight: 700,
              color: '#5B6472',
              fontVariantNumeric: 'tabular-nums'
            }}
          >
            404
          </p>
          <h1
            style={{
              margin: '0.5rem 0 0',
              fontSize: '1.875rem',
              fontWeight: 700,
              color: '#14181F'
            }}
          >
            Page not found
          </h1>
          <p style={{ margin: '0.5rem 0 0' }}>
            The page you opened does not exist or may have moved.
          </p>
          <p style={{ margin: '1.5rem 0 0' }}>
            <Link
              href="/en"
              style={{
                display: 'inline-flex',
                minHeight: '44px',
                alignItems: 'center',
                borderRadius: '8px',
                backgroundColor: '#14181F',
                color: '#FFFFFF',
                padding: '0.625rem 1.25rem',
                fontWeight: 600,
                textDecoration: 'none'
              }}
            >
              Go home
            </Link>
          </p>
        </main>
      </body>
    </html>
  );
}

import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/**
 * Content-Security-Policy.
 *
 * Strict everywhere except `script-src`, which carries `'unsafe-inline'`.
 *
 * Next emits 17 inline <script> blocks per page for the RSC bootstrap. Removing
 * `'unsafe-inline'` needs a per-request nonce, and a per-request nonce
 * deoptimises all 30 statically prerendered pages -- against a site whose
 * binding constraint is first paint on a low-end Android over a slow connection,
 * and which has no injection sink at all: no dangerouslySetInnerHTML, no eval,
 * no third-party script, no user-generated content rendered anywhere.
 *
 * What the strict directives still buy, if an XSS ever did exist: `connect-src`
 * and `form-action` block exfiltration, and `base-uri` blocks base-tag
 * injection. Those are the ones that matter when the asset worth stealing is a
 * list of seller phone numbers.
 *
 * `font-src 'self'` is enough because next/font downloads at build time -- ten
 * .woff2 files are emitted to /_next/static/media and no Google origin is
 * contacted at runtime. Verified in security audit 01 (F-10).
 *
 * ⚠ REVISIT THE MOMENT ANY USER-SUPPLIED CONTENT IS RENDERED INTO A PAGE.
 * Today nothing is: the waitlist echoes values into form inputs, which React
 * escapes. A storefront, a review, or any reflected content changes that, and
 * 'unsafe-inline' stops being defensible. The trigger and the build-time-hash
 * alternative are recorded in SECURITY.md.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self'",
  "font-src 'self'",
  "img-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  "object-src 'none'"
].join('; ');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    // Backstop under the per-field caps in the waitlist action. The framework
    // default is 1 MB, which is a default nobody chose -- a 900,000-character
    // name was accepted, validated and delivered before the caps existed
    // (security audit 01, F-09). The real form posts about 1.3 KB.
    serverActions: { bodySizeLimit: '64kb' }
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: CSP },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // `preload` is deliberately absent. It asks browsers to bake the
          // domain into their built-in HSTS list, which takes months to reverse
          // and binds every future subdomain to HTTPS -- a commitment that
          // cannot sensibly be made before the domain and its subdomain plan
          // exist. Adding it is a launch checklist item in README.md.
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains'
          },
          // Deny every browser feature, because the site uses none of them.
          //
          // `camera=()` is correct and is not an oversight: QR scanning at
          // handoff happens in the buyer app, not on this site. Do not relax it
          // here when that feature is built.
          {
            key: 'Permissions-Policy',
            value: [
              'accelerometer=()',
              'autoplay=()',
              'camera=()',
              'display-capture=()',
              'encrypted-media=()',
              'fullscreen=()',
              'geolocation=()',
              'gyroscope=()',
              'magnetometer=()',
              'microphone=()',
              'midi=()',
              'payment=()',
              'picture-in-picture=()',
              'usb=()',
              'xr-spatial-tracking=()'
            ].join(', ')
          },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' }
        ]
      }
    ];
  }
};

export default withNextIntl(nextConfig);

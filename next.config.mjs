import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/**
 * Content-Security-Policy lives in `src/middleware.ts`, not here.
 *
 * It carries a per-request nonce on `script-src`, and a value that changes per
 * request cannot be expressed in a static config. The reasoning for the nonce,
 * and for dropping the `'unsafe-inline'` this file used to carry, is documented
 * at the top of the middleware.
 *
 * The headers below stay here on purpose. The middleware matcher excludes
 * `/_next/*` and anything with a dot in the path, so headers set there never
 * reach the static asset responses. `nosniff` in particular is worth having on a
 * .woff2 and a .js chunk, which is exactly what that matcher skips.
 */

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

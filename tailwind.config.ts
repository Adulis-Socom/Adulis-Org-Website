import type { Config } from 'tailwindcss';

/**
 * Tokens are derived from the approved v4.1 wireframe set.
 * Do not introduce colours, radii or shadows that are not here -- the
 * wireframes are the visual source of truth.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#14181F', // headings, primary button fill
          soft: '#3A424F', // strong body
          muted: '#5B6472' // secondary body, helper text
        },
        line: {
          DEFAULT: '#E3E6EA', // card and input borders
          strong: '#14181F' // the buyer/seller "door" band border, and nothing else
        },
        surface: {
          DEFAULT: '#FFFFFF',
          sunken: '#F7F8FA', // grey blocks
          tint: '#F1F5FB' // paste-flow block
        },
        beta: {
          bg: '#F7E9C9',
          fg: '#6B5417'
        },
        danger: {
          DEFAULT: '#C0362C',
          bg: '#FDF3F2',
          border: '#E2A9A3'
        }
      },
      borderRadius: {
        DEFAULT: '8px',
        pill: '999px'
      },
      fontFamily: {
        // Latin first, then the four-glyph switcher subset, then the full
        // Ethiopic face -- which is only defined on Amharic routes.
        //
        // Never reorder these. The switcher subset must come before the full
        // face so the 2,648-byte file wins for the switcher's own label, and
        // both must come after Latin so digits and platform names are not drawn
        // by a font that has no glyphs for them. See src/lib/fonts.ts.
        // Each var() carries its own fallback. Without one, an undefined custom
        // property makes the whole font-family declaration invalid at
        // computed-value time -- and --font-ethiopic IS undefined on English
        // routes by design, so the bare form would break the stack on 15 of the
        // 30 pages.
        sans: [
          'var(--font-inter, system-ui)',
          'var(--font-ethiopic-switcher, Nyala)',
          'var(--font-ethiopic, Nyala)',
          'system-ui',
          'sans-serif'
        ]
      },
      fontSize: {
        // name: [size, { lineHeight, letterSpacing }]
        display: ['2.25rem', { lineHeight: '1.15', letterSpacing: '-0.021em' }],
        h1: ['1.875rem', { lineHeight: '1.2', letterSpacing: '-0.018em' }],
        h2: ['1.375rem', { lineHeight: '1.3', letterSpacing: '-0.012em' }],
        h3: ['1.0625rem', { lineHeight: '1.4', letterSpacing: '-0.006em' }],
        body: ['0.9375rem', { lineHeight: '1.6' }],
        small: ['0.8125rem', { lineHeight: '1.5' }],
        micro: ['0.6875rem', { lineHeight: '1.4', letterSpacing: '0.06em' }]
      },
      maxWidth: {
        container: '1280px',
        // Every form column is constrained to this. A full-bleed 1280px text
        // input is unusable.
        form: '600px',
        prose: '68ch'
      },
      spacing: {
        gutter: '1.5rem',
        'gutter-lg': '2.5rem'
      }
    }
  },
  plugins: []
};

export default config;

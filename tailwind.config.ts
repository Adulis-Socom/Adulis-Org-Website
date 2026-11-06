import type { Config } from 'tailwindcss';

/**
 * Design tokens — WEB-MIG-002, from the approved prototype (`f448d06`,
 * Baseline Light palette).
 *
 * Every colour is a `var()` reference into `:root` in `src/app/globals.css`.
 * That is the one definition; this file only names utilities. Change a value
 * there and every utility, `@apply` and component follows. No component carries
 * a raw colour.
 *
 * Names say what a colour is FOR — page, surface, content, border, brand,
 * accent, an interaction state, an operational state — never what it looks
 * like, so a palette change is a value change rather than a rename across the
 * markup. The paper/ink/gold names of the previous direction are retired.
 *
 * The `<alpha-value>` form keeps `/90`-style opacity utilities working against
 * a variable.
 */
const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        /* ------------------------------------------------------- surfaces */
        /** Warm off-white: the footer and tinted bands. */
        page: token('page'),
        surface: {
          /** White: the main reading surface. */
          DEFAULT: token('surface'),
          /** Secondary / raised: cards and quiet panels. */
          2: token('surface-2'),
          /** Elevated: white, separated by shadow rather than colour. */
          elevated: token('surface-elevated')
        },

        /* ---------------------------------------------------------- text */
        content: {
          DEFAULT: token('content'),
          secondary: token('content-secondary'),
          muted: token('content-muted'),
          inverse: token('content-inverse')
        },

        /* ----------------------------------------------------- structure */
        border: {
          /** Decorative boundary. Nothing depends on seeing it. */
          DEFAULT: token('border'),
          /** Stronger decorative boundary. Still NOT a control boundary. */
          strong: token('border-strong'),
          /** Form controls and outlined buttons: ≥3:1 on every surface (WCAG 1.4.11). */
          control: token('border-control')
        },
        divider: token('divider'),

        /* --------------------------------------------------------- brand */
        brand: {
          DEFAULT: token('brand'),
          /** Decorative only: 2.88:1 on the page, so never text or a boundary. */
          secondary: token('brand-secondary'),
          hover: token('brand-hover'),
          active: token('brand-active'),
          muted: token('brand-muted')
        },
        'on-brand': token('on-brand'),
        /** Quiet tinted backgrounds for hero and band compositions. */
        accent: {
          warm: token('accent-warm'),
          sage: token('accent-sage'),
          mint: token('accent-mint')
        },

        /* --------------------------------------------------- interaction */
        hover: token('hover'),
        selected: {
          DEFAULT: token('selected'),
          content: token('selected-content')
        },
        focus: token('focus'),

        /* ---------------------------------------------- operational state */
        success: { DEFAULT: token('success'), bg: token('success-bg') },
        warning: { DEFAULT: token('warning'), bg: token('warning-bg') },
        danger: {
          DEFAULT: token('danger'),
          bg: token('danger-bg'),
          border: token('danger-border')
        },
        info: { DEFAULT: token('info'), bg: token('info-bg') }
      },
      borderRadius: {
        /** Form fields. Cards use rounded-2xl, photography rounded-3xl, buttons rounded-full. */
        DEFAULT: '0.625rem'
      },
      boxShadow: {
        elevated: '0 1px 2px rgb(var(--shadow) / 0.05), 0 12px 32px rgb(var(--shadow) / 0.08)'
      },
      // Latin first, Ethiopic after, system last. Fallbacks live inside var() and
      // name only LOCAL families: a literal webfont name here would match the
      // face next/font registers and stop being a fallback (scripts/check-font.mjs).
      fontFamily: {
        sans: [
          'var(--font-outfit, system-ui)',
          'var(--font-ethiopic-switcher, Nyala)',
          'var(--font-ethiopic, Nyala)',
          'system-ui',
          'sans-serif'
        ],
        display: [
          'var(--font-fraunces, Georgia)',
          'var(--font-ethiopic-switcher, Nyala)',
          'var(--font-ethiopic, Nyala)',
          'Georgia',
          'serif'
        ],
        mono: [
          'var(--font-dm-mono, ui-monospace)',
          'var(--font-ethiopic-switcher, Nyala)',
          'var(--font-ethiopic, Nyala)',
          'ui-monospace',
          'monospace'
        ]
      },
      // The prototype's hierarchy as a named scale. Line heights are unitless so
      // they scale with Ge'ez, which runs taller and up to ~40% longer.
      fontSize: {
        'display-xl': ['3.25rem', { lineHeight: '1.12', letterSpacing: '-0.02em' }], // 52 · Home hero
        'display-l': ['3rem', { lineHeight: '1.15', letterSpacing: '-0.02em' }], // 48 · page heroes
        'display-m': ['2.5rem', { lineHeight: '1.2', letterSpacing: '-0.015em' }], // 40 · section titles
        'display-s': ['2rem', { lineHeight: '1.2', letterSpacing: '-0.01em' }], // 32 · titles on phones
        'heading-l': ['1.625rem', { lineHeight: '1.3', letterSpacing: '-0.01em' }], // 26
        'heading-m': ['1.375rem', { lineHeight: '1.35' }], // 22 · card titles
        'heading-s': ['1.125rem', { lineHeight: '1.4' }], // 18
        'body-l': ['1.125rem', { lineHeight: '1.7' }], // 18 · ledes
        body: ['1rem', { lineHeight: '1.65' }], // 16
        'body-s': ['0.875rem', { lineHeight: '1.6' }], // 14
        // Mono uppercase labels. The prototype sets these at 11px; 12px is the
        // floor here for Ge'ez and low-end screens.
        label: ['0.75rem', { lineHeight: '1.4', letterSpacing: '0.1em' }] // 12
      },
      maxWidth: {
        /** The prototype's 1120px section width. */
        container: '70rem',
        /** Every form column. A full-width text input is unusable. */
        form: '37.5rem',
        prose: '68ch'
      },
      spacing: {
        gutter: '1.25rem',
        'gutter-md': '2rem',
        'gutter-lg': '3rem'
      }
    }
  },
  plugins: []
};

export default config;

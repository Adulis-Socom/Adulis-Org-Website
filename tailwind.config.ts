import type { Config } from 'tailwindcss';

/**
 * Tokens — Phase C.
 *
 * Every colour here is a `var()` reference into `:root` in `src/app/globals.css`.
 * That is the one definition: this file only names the utilities. Change a hex
 * there, and every utility, every `@apply` and every component follows — the
 * same pattern as `nav.ts`, `INDEX_POLICY` and `reference(kind)`.
 *
 * The `<alpha-value>` form keeps `/40`-style opacity utilities working against
 * a variable, which a plain `var(--ink)` colour would not.
 *
 * ## Retired names
 *
 * The site was styled against an earlier palette (`ink-muted`, `line`,
 * `surface-sunken`, `text-h3`…). Those names stay as **exact aliases of the
 * token they now mean**, so the restyle changes the token layer and not 200
 * class attributes. Each alias says what it resolves to. They are removed once
 * no markup uses them — see docs/phase-c-report.md.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        /* ------------------------------------------------ the nine colours */
        paper: 'rgb(var(--paper) / <alpha-value>)',
        ink: {
          DEFAULT: 'rgb(var(--ink) / <alpha-value>)',
          // retired: body text is ink now
          soft: 'rgb(var(--ink) / <alpha-value>)',
          // retired: secondary text is slate
          muted: 'rgb(var(--slate) / <alpha-value>)'
        },
        slate: 'rgb(var(--slate) / <alpha-value>)',
        /** Secondary text on the ink surface. `slate` is 2.75:1 there — never use it on ink. */
        'on-ink': 'rgb(var(--on-ink) / <alpha-value>)',
        /**
         * Text only on ink. On paper it is 3.24:1, permitted only at 24px regular /
         * 18.66px bold and above — display type, a surface, or a shape. Never a
         * paragraph or a small label on light.
         */
        gold: 'rgb(var(--gold) / <alpha-value>)',
        rule: {
          /** Decorative hairlines. May stay light: nothing depends on seeing one. */
          DEFAULT: 'rgb(var(--rule) / <alpha-value>)',
          /** The Contained card's border. */
          card: 'rgb(var(--rule-card) / <alpha-value>)'
        },
        /**
         * Form-field borders. 3.08:1 on paper — WCAG 1.4.11 needs 3:1 on a
         * component boundary, and the previous hairline was ~1.25:1 on the
         * site's only conversion.
         */
        'border-control': 'rgb(var(--border-control) / <alpha-value>)',
        surface: {
          DEFAULT: 'rgb(var(--paper) / <alpha-value>)',
          /** The only secondary surface. Ink-tinted, 1.13:1 against paper. */
          2: 'rgb(var(--surface-2) / <alpha-value>)',
          // retired: both were grey blocks, both are surface-2
          sunken: 'rgb(var(--surface-2) / <alpha-value>)',
          tint: 'rgb(var(--surface-2) / <alpha-value>)'
        },
        line: {
          // retired: `rule`
          DEFAULT: 'rgb(var(--rule) / <alpha-value>)',
          // retired: the door band's border is ink
          strong: 'rgb(var(--ink) / <alpha-value>)'
        },
        danger: {
          DEFAULT: 'rgb(var(--danger) / <alpha-value>)',
          bg: 'rgb(var(--danger-bg) / <alpha-value>)',
          border: 'rgb(var(--danger-border) / <alpha-value>)'
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
        ],
        // Display and headings only. Same Ethiopic tail, for the same reasons:
        // Instrument Sans has no Ge'ez, so an Amharic heading falls through to
        // the Ethiopic face at the same fixed line height.
        display: [
          'var(--font-instrument, system-ui)',
          'var(--font-ethiopic-switcher, Nyala)',
          'var(--font-ethiopic, Nyala)',
          'system-ui',
          'sans-serif'
        ]
      },
      fontSize: {
        // The ten text styles. Line heights are FIXED PIXELS, never
        // multipliers: a Ge'ez line at the same step occupies identical
        // vertical space, so baselines do not shift on a language switch.
        //
        // name: [size, { lineHeight, letterSpacing }]
        'display-xl': ['3.5rem', { lineHeight: '4rem', letterSpacing: '-0.02em' }], // 56/64
        'display-l': ['2.5rem', { lineHeight: '3rem', letterSpacing: '-0.018em' }], // 40/48
        'display-m': ['2rem', { lineHeight: '2.5rem', letterSpacing: '-0.015em' }], // 32/40
        'heading-l': ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.01em' }], // 24/32
        'heading-m': ['1.25rem', { lineHeight: '1.75rem', letterSpacing: '-0.006em' }], // 20/28
        'body-l': ['1.125rem', { lineHeight: '1.75rem' }], // 18/28
        body: ['1rem', { lineHeight: '1.625rem' }], // 16/26
        'body-s': ['0.875rem', { lineHeight: '1.375rem' }], // 14/22
        label: ['0.875rem', { lineHeight: '1.375rem' }], // 14/22, Inter Medium via class

        // retired names — each is its nearest step, exactly
        display: ['2.5rem', { lineHeight: '3rem', letterSpacing: '-0.018em' }], // = display-l
        h1: ['2rem', { lineHeight: '2.5rem', letterSpacing: '-0.015em' }], // = display-m
        h2: ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.01em' }], // = heading-l
        h3: ['1.25rem', { lineHeight: '1.75rem', letterSpacing: '-0.006em' }], // = heading-m
        small: ['0.875rem', { lineHeight: '1.375rem' }], // = body-s
        // Tags. There is no eleventh style: a marker is Label with tracking.
        micro: ['0.875rem', { lineHeight: '1.375rem', letterSpacing: '0.06em' }] // = label
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

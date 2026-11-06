# Company Website Repository Audit

Work order: **WEB-MIG-001**. Analysis and planning only. Nothing in `src/`, `scripts/`, `tests/` or configuration was changed by this work order.

| Item | Value |
| --- | --- |
| Audit date | 2026-11-06 |
| Production repository | `Adulis-Org-Website` (`origin` → `https://github.com/Adulis-Socom/Adulis-Org-Website.git`) |
| Production baseline `main` | `cfbd33828ce238c29299a74783fd7ed5ae14efaa` |
| Working branch | `dev`, starting at `cfbd33828ce238c29299a74783fd7ed5ae14efaa` (identical to `main`, tracking `origin/dev`) |
| Prototype reference | `AdulisCommercePlatformPrototype @ f448d06b90f6cdafac0dcd48f9e70cfd2ce81d0e` (read-only, detached HEAD) |
| Authority | `../reference/MIGRATION_AUTHORITY.md` (outside this repository) |
| Companion document | [`COMPANY_WEBSITE_MIGRATION_MATRIX.md`](./COMPANY_WEBSITE_MIGRATION_MATRIX.md) |

## Contents

1. [Sources and method](#1-sources-and-method)
2. [Production baseline](#2-production-baseline)
3. [Existing architecture](#3-existing-architecture)
4. [Route inventory](#4-route-inventory)
5. [Component inventory](#5-component-inventory)
6. [Server and public-action infrastructure](#6-server-and-public-action-infrastructure)
7. [Supporting infrastructure](#7-supporting-infrastructure)
8. [SEO audit](#8-seo-audit)
9. [Test audit](#9-test-audit)
10. [Public content drift](#10-public-content-drift)
11. [Prototype Company Website audit](#11-prototype-company-website-audit)
12. [Prototype vs production differences](#12-prototype-vs-production-differences)
13. [Reference-design constraints on the migration](#13-reference-design-constraints-on-the-migration)
14. [PRODUCTION INFRASTRUCTURE THAT MUST NOT BE LOST](#14-production-infrastructure-that-must-not-be-lost)
15. [PROTOTYPE SHORTCUTS NOT TO COPY](#15-prototype-shortcuts-not-to-copy)
16. [Weaknesses](#16-weaknesses)
17. [Migration risks](#17-migration-risks)
18. [Contradictions, tensions and decisions](#18-contradictions-tensions-and-decisions)

---

## 1. Sources and method

Authority order applied: work order → `MIGRATION_AUTHORITY.md` → prototype `f448d06` → ADU-WEB-02 v4.1 → Canonical Knowledge Base v3.2 → specialist designs → existing production → historical material.

Reference documents read in full for this work order (paths relative to `../reference/`):

- `MIGRATION_AUTHORITY.md`, `REFERENCE_INDEX.md`
- `system-designs/core/ADU-WEB-02_Adulis_Company_Website_System_Design_v4.1.md`
- `system-designs/core/Adulis_Canonical_Knowledge_Base_2026-10-13_v3.2.md`
- `system-designs/website-platform/ADU-ARCH-PLATFORM-01_…_v3.2.md`
- `system-designs/website-platform/ADU-MKT-01_…_v3.2.md`
- `system-designs/website-platform/ADU-CSP-01_…_v1.1.md`
- `system-designs/website-platform/ADU-DEPLOY-01_…_v3.1.md`
- `system-designs/website-platform/ADU-PRV-01_…_v3.2.md`
- `system-designs/website-platform/ADU-ANL-01_…_v3.2.md`

Production was inspected file by file: every route, component, action, `lib/` module, middleware, configuration file, script, workflow and test spec. The prototype was traced from `src/sections/CompanyWebsite.tsx` through every module it imports.

Engineering discipline: the work order names the third-party **Ponytail** skill. It was not installed in the session that produced this audit, so its stated principles were applied directly: understand before changing, minimise code, preserve production infrastructure, add no redundant dependencies, and review architectural risk. No dependency was added.

---

## 2. Production baseline

### 2.1 Repository state

| Check | Result |
| --- | --- |
| Current branch | `dev` |
| `dev` vs `main` | Same commit `cfbd338` (`dev` starts from the approved baseline) |
| Working tree | Clean before the audit; clean after `npm ci` and `npm run build` (all build output is gitignored) |
| Remote | `origin` = `https://github.com/Adulis-Socom/Adulis-Org-Website.git` |
| Other remote branches | `audit/security-01`, `fix/security-triage` (not touched) |

### 2.2 Toolchain

| Tool | Version | Source |
| --- | --- | --- |
| Node.js | 22.19.0 | local runtime; CI uses `node-version: 22` |
| npm | 11.11.1 | local runtime |
| Next.js | 15.5.23 | `package.json` (pinned exact) |
| React / React DOM | 19.2.8 | `package.json` |
| TypeScript | 5.7.3 | `package.json` |
| Tailwind CSS | 3.4.17 | `package.json` (v3 config file, PostCSS plugin) |
| next-intl | 4.13.7 | `package.json` |
| Playwright | 1.62.1 (`@playwright/test`) | `package.json` |
| axe-core / `@axe-core/playwright` | 4.13.0 | `package.json` |
| ESLint | 9.39.5 with `eslint-config-next` 15.5.23 | `package.json` |

Runtime dependencies are only `next`, `next-intl`, `react` and `react-dom`. There is no UI library, icon library, CSS-in-JS, animation library, form library or validation library.

### 2.3 Baseline commands

| Command | Result |
| --- | --- |
| `npm ci` | **Pass.** 383 packages. `npm audit` reports 13 advisories (1 critical, 5 high, 7 moderate); see B-03. |
| `npm run typecheck` | **Pass.** `tsc --noEmit`, zero errors. |
| `npm run build` (no environment) | **Fails by design** at `prebuild → check:env`. See B-01. All earlier prebuild gates pass: `check:i18n`, `check:encoding`, `check:font`, `check:copy` (11 invariants), `check:assets`. |
| `ALLOW_UNDELIVERED_WAITLIST=1 npm run build` | **Pass.** The repository's documented local opt-out (README, `.env.example`). Compiled successfully; 34 entries generated (15 page routes × 2 locales, plus `_not-found`, catch-all, `/api/events`, `robots.txt`, `sitemap.xml`); middleware 79.9 kB; shared first-load JS 103 kB. |

### 2.4 Baseline findings (recorded, not repaired)

| ID | Finding | Status |
| --- | --- | --- |
| B-01 | `npm run build` refuses without `WAITLIST_WEBHOOK_URL`, `NEXT_PUBLIC_SELLER_CONSOLE_URL`, `WAITLIST_HASH_SECRET`, `ENQUIRY_WEBHOOK_URL`, `REPORT_WEBHOOK_URL`. This is an intentional deployability gate (`scripts/check-env.mjs`), not a code defect. CI and QA supply these values. | Expected behaviour. Future work orders validate with the same opt-out or with test values. |
| B-02 | `.env.example` is stale. It lists `CONTACT_WEBHOOK_URL`, which no code reads, and omits `NEXT_PUBLIC_SELLER_CONSOLE_URL`, `WAITLIST_HASH_SECRET`, `ENQUIRY_WEBHOOK_URL`, `REPORT_WEBHOOK_URL` and `DELETION_API_URL`. | Not repaired (outside this work order). |
| B-03 | `npm audit`: `next` 15.5.23 is in a critical advisory range whose fix is a major upgrade; `postcss` ≤ 8.5.22 inside `next` is high and already accepted in `SECURITY.md`; `sharp` < 0.35.5 is high (installed 0.35.4, override `^0.35.4`); `source-map-js` is high. | Not repaired. Needs its own security work order. `sharp` matters to the photography plan (see R-08). |
| B-04 | The build prints webpack cache warnings for `next-intl`'s extractor (`import(t)`). | Benign; does not affect output. |

---

## 3. Existing architecture

### 3.1 Stack and layout

```text
src/
├── app/
│   ├── layout.tsx              pass-through root layout (exists only for the global 404)
│   ├── not-found.tsx           unlocalised fallback 404 (inline styles, English)
│   ├── globals.css             tokens (:root RGB triplets) + component classes (@layer components)
│   ├── robots.ts / sitemap.ts  per-request, driven by NEXT_PUBLIC_SITE_URL + INDEX_POLICY
│   ├── api/events/route.ts     analytics beacon ingress (allowlisted, rate-limited)
│   └── [locale]/               every real page, one folder per route + not-found + [...rest]
├── actions/                    server actions: waitlist, contact, report, deletion
├── components/                 Header, Footer, LanguageSwitcher, forms, ui primitives, legal
├── fonts/                      ethiopic-switcher.woff2 (2,648-byte subset)
├── i18n/                       config (locales, AM_ENABLED), routing, request (catalogue merge)
├── lib/                        routes, nav, metadata, flags, fonts, analytics, ratelimit,
│                               validation, hash, spreadsheet-safe, store/*, deletion/*
├── messages/                   en.json (1,071 lines), am.json (provisional, 1 key)
└── middleware.ts               per-request CSP nonce + next-intl locale middleware
scripts/                        prebuild gates, route smoke check, font subset, translation pack
tests/qa/                       24 Playwright specs + fixtures, helpers, delivery sink
.github/workflows/ci.yml        verify → qa (chromium, webkit) → snapshots
```

### 3.2 Rendering model

- App Router with one locale-scoped layout (`src/app/[locale]/layout.tsx`) that builds `<html>`, fonts, skip link, `Header`, `<main id="main">` and `Footer`.
- **`export const dynamic = 'force-dynamic'` on the locale layout.** Every page renders per request because the CSP nonce is per request. The build table still prints `●` (SSG) because `generateStaticParams` exists; no HTML is prerendered. This is documented as a deliberate, measured trade-off in the layout and in `SECURITY.md`.
- Client components are limited to: `Header`, `LanguageSwitcher`, `DoorLink`, `form.tsx`, `WaitlistForm`, `ContactForm`, `ReportForm`, `DeleteAccountFlow`. Everything else is a server component.
- Client message payload is trimmed per route (`ROUTE_NAMESPACES` in the layout). Only `nav` is global.

### 3.3 Internationalisation

- `next-intl` 4 with `localePrefix: 'always'` and `localeDetection: false`. `/` redirects to `/en`.
- Locales `en` and `am`. **`AM_ENABLED = false`** (`src/i18n/config.ts`): `/am/*` resolves with English fallback, is `noindex`, is omitted from hreflang and the sitemap, and the language switcher is not rendered.
- `request.ts` deep-merges `am.json` over `en.json` (arrays replaced wholesale), supports a gitignored pseudo-locale for Ge'ez +40% layout tests, and sets `timeZone: 'Africa/Addis_Ababa'`.
- Fonts: Inter (body, Latin subset) and Instrument Sans 600 (display) via `next/font/google` (self-hosted at build). A 4-glyph Ethiopic subset serves the switcher label, and full Noto Sans Ethiopic loads on `/am` only. Guarded by `check:font` and `headers-fonts.spec.ts`.

### 3.4 Security

- **CSP in middleware** with a fresh nonce per request: `default-src 'self'; script-src 'self' 'nonce-…' 'strict-dynamic'; style-src 'self' 'nonce-…'; font-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'; object-src 'none'`, plus `upgrade-insecure-requests` over https only.
- Static headers in `next.config.mjs`: `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, HSTS (2 years, `includeSubDomains`, no `preload`), a Permissions-Policy denying every feature, COOP `same-origin` and CORP `same-origin`. `poweredByHeader: false`; server-action body cap 64 KB.
- No source file uses a React `style` prop except the unlocalised `app/not-found.tsx`. That matters: the nonce policy already blocks inline style attributes, and ADU-CSP-01 targets `style-src-attr 'none'`.

### 3.5 Registries (single sources of truth)

- `src/lib/routes.ts`: `ROUTES` (every locale-relative path), `INDEX_POLICY` (`unbuilt` / `unlisted`), `indexableRoutes()`, `WAITLIST_HREF`, and `SELLER_CONSOLE_URL` from `NEXT_PUBLIC_SELLER_CONSOLE_URL`.
- `src/lib/nav.ts`: `primaryNav` (6 items), `legalNav` (7 items), `LOCALE_LABELS` (drives the Ethiopic subset build) and `sellerConsoleLink` (the only sign-in affordance, enforced by `check:copy`).
- `src/lib/metadata.ts`: `buildPageMetadata()` is the only way a page sets title, robots, canonical and hreflang; `noIndexReasons()` gives independent, tested reasons.
- `src/lib/flags.ts`: `DELETION_FLOW_ENABLED` (false; `CERTIFIED = false`, test-force env only).

### 3.6 Build and CI gates

- `prebuild`: `check:i18n` (catalogue key parity), `check:encoding` (UTF-8 and Ge'ez round-trip), `check:font` (subset cmap and display-face weights), `check:copy` (11 copy/structure invariants), `check:assets` (raster/image-pipeline vs `sharp` advisory), `check:env` (deployability and forbidden test variables).
- `check:routes`: post-build smoke test; every route × locale returns 200 and an unknown path returns 404.
- CI (`.github/workflows/ci.yml`), on push to any branch:
  - `verify`: install, i18n, copy, types, lint, build, route smoke, secret diff scan, `npm audit` (report only).
  - `qa`: Playwright on chromium and webkit against a production build.
  - `snapshots`: G11 placeholder-appearance snapshots.
- Documented constraints: branch protection cannot be configured on this repository (`docs/decisions-pending.md` D7), and the push trigger has caveats (D8).

### 3.7 Hosting assumption

README says: "Cloudflare Pages + Workers *(not yet configured)*", behind Cloudflare Access, with no public deployment until the domain and IP registration exist. Nothing deploys today.

---

## 4. Route inventory

All page routes live under `src/app/[locale]/`. Every page calls `setRequestLocale` and `buildPageMetadata({ locale, path: ROUTES.x, title })`, and is a server component. "Indexable" means indexable *only* once `NEXT_PUBLIC_SITE_URL` is set and, for `/am`, once `AM_ENABLED` is true. Today every page is `noindex` because no site URL is configured.

| Route | Responsibility | Metadata | Index policy | Server / client | Current UX | Migration need |
| --- | --- | --- | --- | --- | --- | --- |
| `/[locale]` Home | Positioning and waitlist conversion | title `home.pageTitle`; description inherits layout default | indexable | server; `ShopPreview` server; `DoorLink` client | Beta badge, display heading with gold accent, Waitlist + How-it-works CTAs; ink "From bio link to product" panel with three EXAMPLE cards; "what changes for sellers"; "what it is for"; buyer door; controlled-beta cohort card | Rebuild to prototype (WEB-MIG-003). Narrative is the superseded bio-link/bank-transfer model; no Products/Scenes/discovery. |
| `/how-it-works` | Buyer-facing loop explanation | title only | indexable | server | Steps (bio link → storefront → reserve → bank transfer + receipt → QR handoff); three EXAMPLE shop previews with ETB prices and trust levels; "find again"; "money" card | Rebuild; replace payment and reservation copy (WEB-MIG-004). |
| `/for-sellers` | Seller acquisition + waitlist form (`#waitlist`) | title only | indexable | server; `WaitlistForm` client; server-side `track('waitlist_form_viewed')` | Display heading; problems; benefits; "What you handle" (Seller as payment verifier); commercial sequence (beta free → 60 days free → paid plans); waitlist; next steps | Rebuild; remove payment-verifier and free-period copy; keep the form and action (WEB-MIG-004). |
| `/for-buyers` | Buyer education | title only | indexable | server; `DoorLink` client | Steps (bio link, check, reserve, pay Seller and confirm handoff); checks; disabled app-store badges; limits (direct bank transfer); seller door | Rebuild; replace payment copy (WEB-MIG-004). |
| `/trust-and-safety` | Trust explanation | title only | indexable | server | Boundaries; verification (incl. "Government ID where required"); 3-level ladder with Product caps (card stack below md, table from md); published facts; reviews; claims; moderation; links | Rebuild; four Trust labels, no Government ID, no caps (WEB-MIG-005). |
| `/about` | Company story | title only | indexable | server | Origin story; three founders with photo placeholders (bios UNDECIDED); registration UNDECIDED; status badges; company contact UNDECIDED | Rebuild to prototype; keep UNDECIDED flags until real content exists. |
| `/help` | FAQ | title only | indexable | server | 11 FAQs in `<details>/<summary>` (works without JS) + "still need help" door to Contact | Restyle and keep the no-JS disclosure pattern; replace outdated answers. |
| `/contact` | Contact routes + contact form | title only | `unbuilt` → noindex | server; `ContactForm` client | Contact routes (addresses UNDECIDED); location (footer address); form; privacy note | Restyle; keep action and gating (WEB-MIG-006). |
| `/terms` | Legal | title only | `unbuilt` → noindex | server (`LegalSections`) | Section map + sticky contents from lg; bodies are UNDECIDED flags | Restyle only; keep fail-closed placeholder pattern (WEB-MIG-006). |
| `/privacy` | Legal | title only | `unbuilt` → noindex | server | As Terms | As Terms. |
| `/seller-terms` | Legal | title only | `unbuilt` → noindex | server | As Terms | As Terms. |
| `/refunds-and-disputes` | Legal | title only | `unbuilt` → noindex | server | As Terms | As Terms. |
| `/prohibited-products` | Policy | title only | indexable | server | 12 category cards with definitions + report link | Restyle; content review. |
| `/report-content` | Content-report intake | title only | `unbuilt` → noindex | server; `ReportForm` client | Report form (reason category UNDECIDED) + moderation cards + T&S link | Restyle; keep action (WEB-MIG-006). Integration with the Platform report API is future work. |
| `/delete-account` | App-store deletion path | title only | `unlisted` → noindex | server; `DeleteAccountFlow` client, gated server-side | `DELETION_FLOW_ENABLED = false`: explanatory content + "contact Adulis" manual route; five-step flow hidden | Restyle; keep gate. Moves to `/account-deletion` with a permanent redirect from `/delete-account` in WEB-MIG-006 (D-02). |
| `/[locale]/[...rest]` | Unknown path under a locale | none (inherits layout robots) | n/a | server → `notFound()` | Localised 404 inside the shell | Keep. |
| `[locale]/not-found.tsx` | Localised 404 | none | n/a | server | Code, heading, one Home button | Restyle. ADU-WEB-02 §97 asks for helpful links (Home, How it works, Help, Availability, Ethiopia). |
| `app/not-found.tsx` | Unlocalised fallback | none | n/a | server, own `<html>` | Inline-styled English 404 | Keep (rarely reached). Note the inline styles (W-17). |
| `/api/events` | Analytics beacon | n/a | robots `Disallow: /api/` | route handler | 204 beacon, 2 KB cap, rate-limited | Keep. |
| `/robots.txt`, `/sitemap.xml` | Crawl control | n/a | n/a | route handlers, per request | Closed without site URL; sitemap from `INDEX_POLICY` | Keep; extend for new routes. |

Routes the target requires that production lacks: `/pricing`, `/markets/ethiopia`, `/availability` and a standalone `/waitlist`, all present in the prototype and ADU-WEB-02. Production keeps the waitlist at `/for-sellers#waitlist`. `/press` is listed by ADU-WEB-02 and the Knowledge Base but absent from the prototype (D-04). The page matrix in the companion document gives the action for each.

---

## 5. Component inventory

| Component | Current responsibility | Classification | Notes |
| --- | --- | --- | --- |
| `Header.tsx` (client) | Wordmark home link, desktop nav from `primaryNav`, Seller Console outbound `<a>`, waitlist CTA, mobile disclosure panel (Escape closes, closes on navigation, body scroll lock, `aria-expanded`/`aria-controls`, 44×44 trigger), AM-gated switcher | **MIGRATE** | Rebuild the visuals to the prototype; keep every behaviour and the registry inputs. |
| `Footer.tsx` (server) | Primary nav + Contact; full `legalNav` row on every page (app-store and data-protection requirement); address; copyright | **MIGRATE** | Prototype visual; legal reachability is non-negotiable. |
| `LanguageSwitcher.tsx` (client) | Two plain `Link`s with `hrefLang`, `aria-current`, 44×44 targets; JS-free | **KEEP** (restyle) | Hidden while `AM_ENABLED` is false. |
| `ui.tsx` → `InfoCard` | Contained/open card with optional sequence number | **MIGRATE** | Becomes the shared card primitive in WEB-MIG-002. |
| `ui.tsx` → `DisplayHeading` | Display headline with gold accent phrase | **REPLACE** | Gold-accent doctrine retired by WEB-MIG-002. Keep the "accent is its own catalogue key" lesson if the prototype accents a phrase. |
| `ui.tsx` → `SectionTitle` | `h2` section title | **MIGRATE** | Heading primitive. |
| `ui.tsx` → `DoorBand` | Cross-audience band with tracked link | **REVIEW** | Keep only if the prototype has an equivalent; the analytics event is defined. |
| `ui.tsx` → `Sequence` | Horizontal step flow | **REVIEW** | Currently unused by any page (imported by `for-buyers` but not rendered). |
| `ui.tsx` → `MediaPlaceholder` | Visible lo-fi photo stand-in (`role="img"`) | **REPLACE** | By a photography-ready media slot (fixed aspect ratio, no layout shift, alt-or-decorative contract). |
| `ui.tsx` → `UndecidedFlag` | Unmistakable undecided-content marker | **KEEP** | Truthfulness control used by legal, About and Contact pages. |
| `DoorLink.tsx` (client) | Tracked door link | **KEEP** | Fire-and-forget `track()`; plain navigation without JS. |
| `ShopPreview.tsx` (server) | "From bio link to product" EXAMPLE panel on Home | **DELETE** (after WEB-MIG-003 replaces it) | Superseded narrative; Product/Scene presentation replaces it. |
| `form.tsx` (client): `Field`, `ErrorSummary`, `Honeypot`, `ConsentField`, `SubmitButton` | Shared accessible form contract (visible labels, error summary of links with focus, always-enabled submit, off-screen honeypot, consent label ≥44px) | **KEEP** (restyle in WEB-MIG-002) | Production asset; do not change semantics. |
| `WaitlistForm.tsx` (client) | Waitlist UI, `useActionState`, no-JS path, field abandonment beacon | **KEEP** (restyle) | Field set changes under D-05: email and phone both required, explicit consent kept. |
| `ContactForm.tsx` (client) | Contact UI | **KEEP** (restyle) | |
| `ReportForm.tsx` (client) | Report UI (reason category UNDECIDED) | **KEEP** (restyle) | |
| `DeleteAccountFlow.tsx` (client) | Five-step server-action flow, gated by the server | **KEEP** (restyle) | Copy review; blocker reason codes are historical (see §10). |
| `LegalSections.tsx` (server) | Legal section map, sticky contents, UNDECIDED bodies | **KEEP** (restyle) | Fail-closed legal placeholder pattern. |

---

## 6. Server and public-action infrastructure

All four actions are production assets. ADU-WEB-02, ARCH-PLATFORM-01 and DEPLOY-01 describe a future Website API and Platform APIs; the actions are the current, tested, working layer, and the migration authority requires them to stay.

| Action | What it does | Controls |
| --- | --- | --- |
| `submitWaitlist` | Validates and delivers a waitlist application; returns an `ADU-WL-YY-XXXXXX` reference | Honeypot (fake success, counted in a log line); Origin header required (closes no-Origin CSRF, F-13); per-client rate limit 5/10 min; per-field length caps; server-side validation with field errors; explicit consent (`checked()` === `'on'`); HMAC phone key with per-phone limit and 10-minute dedupe returning the original reference; spreadsheet-safe escaping at delivery; refuses in production with no store; never logs the body |
| `submitContact` | Validates and delivers an enquiry (`ADU-CON-…`) | Same pattern: honeypot, Origin, rate limit, caps, consent, spreadsheet-safe, refuse without store |
| `submitReport` | Validates and delivers a content report (`ADU-REP-…`) | Same pattern; reason category deliberately unvalidated (no approved taxonomy) |
| `advanceDeletion` | Single server-side state machine for request → verify → preview → confirm, against `DELETION_API_URL` | Origin + rate limit 10; ticket only from verify; phone never stored or logged; whole flow gated off by `DELETION_FLOW_ENABLED` |

Supporting modules:

- `lib/validation`: `FormState`, `str`, `checked`, permissive email/phone checks, and `reference(kind)` (crypto-random, transcription-safe alphabet, non-sequential).
- `lib/ratelimit`: in-memory fixed window; trusts only `cf-connecting-ip`; fails closed to one shared bucket; documented as a backstop to Cloudflare edge rules.
- `lib/store/waitlist`, `lib/store/enquiries`: store interfaces with `Webhook*Store` (relay to a founder-configured URL) and `Memory*Store` (tests and dev). The interfaces carry a deliberate "provision nothing" boundary pending the legal/DPIA decision.
- `lib/hash`: HMAC phone key from `WAITLIST_HASH_SECRET`.
- `lib/spreadsheet-safe`: formula-injection neutralisation at the delivery boundary.
- `lib/deletion/{client,state}`: typed client for the deletion API and the serialisable state shape (kept out of the `'use server'` module on purpose).

Privacy boundaries already enforced: no submission body in logs, no PII in analytics, no PII in URLs, and the reference is not authentication.

---

## 7. Supporting infrastructure

| Area | Finding |
| --- | --- |
| `src/lib/` | Covered in §3.5 and §6. Analytics: `track()` with a closed 9-event list taken from ADU-WEB-01 §12 (historical), a property allowlist, server-side events written to a `LogAnalyticsSink` (stdout) unless `ANALYTICS_DISABLED=1`, and a browser beacon to `/api/events` for field abandonment only. No IP, user agent or identifier is recorded. |
| `src/i18n/` | Covered in §3.3. Routing is prefixed (`'always'`). |
| `src/messages/` | `en.json` is the single copy source (1,071 lines); `am.json` is provisional and must be replaced wholesale by human-reviewed Amharic; `messages/README.md` gives translator rules. `docs/translation-pack/` is generated from `en.json`. |
| Middleware | CSP nonce, `x-nonce`, `x-pathname` (drives client namespaces), next-intl routing. Matcher excludes `api`, `_next`, `_vercel` and dotted paths (keeps `/.well-known/*` free). |
| Navigation | Single registry (`lib/nav.ts`) for header, mobile menu and footer. Not yet used by the sitemap, which uses `ROUTES` + `INDEX_POLICY`. |
| Metadata | `buildPageMetadata` (title, robots, canonical, hreflang). No Open Graph, Twitter or structured data anywhere. |
| Environment validation | `scripts/check-env.mjs` (build-time gate) + runtime fallbacks (`SELLER_CONSOLE_URL` → `https://console.invalid/`). |
| Design tokens | `globals.css` `:root` holds the "nine colours" (paper, ink, gold, slate, on-ink, rule, rule-card, border-control, surface-2) + danger; `tailwind.config.ts` maps them, plus legacy alias names, a 10-step type scale, container 1280px and form 600px. Component classes (`.btn-*`, `.card*`, `.field`, `.placeholder-*`, `.surface-ink`, `.skip-link`) live in `@layer components`. Focus is a dual-tone `:focus-visible` ring; reduced motion is honoured. |
| Assets | No `public/` directory. No raster images, favicon file or photography. `check:assets` ties any future raster asset or `next/image` import to the `sharp` advisory status. |

---

## 8. SEO audit

| Concern | Current state | Assessment |
| --- | --- | --- |
| Sitemap | `/sitemap.xml` per request; empty without `NEXT_PUBLIC_SITE_URL`; lists only routes with no `INDEX_POLICY` entry, in offered locales, with alternates | Strong. Extend for new routes. |
| Robots | Closed (`Disallow: /`) without site URL; otherwise allow all except `/api/`, with sitemap pointer | Strong. |
| Metadata | Per-page title via catalogue; description only from the layout default `meta.defaultDescription` | **Gap**: the default description makes outdated claims ("Sellers pay a subscription. Buyers pay sellers directly.") on every page. |
| Canonical | Per page, the page's own locale URL (`/en/about`) | Correct for the current routing model; changes if `/` becomes the unprefixed English canonical (§18). |
| hreflang | `en` + `x-default`; `am` only when `AM_ENABLED` | Correct ("only real translated equivalents", ADU-WEB-02 §49, MKT-01 §125). |
| Index policy | Central `INDEX_POLICY` + independent `noIndexReasons` (no site URL, locale not offered, unbuilt, unlisted), tested in `metadata.spec.ts` and `discovery.spec.ts` | Strong. Production asset. |
| Open Graph / Twitter | None | **Gap** (new coverage in WEB-MIG-003 / WEB-MIG-007). |
| Structured data | None | **Gap**. ADU-WEB-02 §50 allows Organization and WebSite (corporate only). |
| 404 handling | Catch-all → localised 404 with correct status; unknown path 404 asserted by `check:routes`; never redirects to Home | Correct (ADU-WEB-02 §97); add helpful links. |
| Locale root | `/` redirects to `/en` | Diverges from ADU-WEB-02 §8/§49 and MKT-01 §66/§125 (`/` is the canonical English homepage; `/en` redirects to `/`). Ruled D-01: adopt `/` before WEB-MIG-003. |

---

## 9. Test audit

24 Playwright specs (~117 tests), run on chromium and webkit against a production build, with axe, a local delivery sink (`tests/qa/sink.mjs`) and per-test rate-limit identities (`tests/qa/fixtures.ts`). The suite asserts behaviour, not only screenshots. Only `placeholder-appearance.spec.ts` uses visual snapshots.

| Spec | What it protects | Classification |
| --- | --- | --- |
| `headers-fonts.spec.ts` | Every header on every route, CSP directives, per-request nonce, nonce on every inline script, no CSP violation in a real browser, font byte budget | **KEEP** (extend when the prototype fonts change) |
| `nojs.spec.ts` | Content, waitlist (F-13 gate), validation, Help accordion, legal placeholders, contact/report all work without JS | **KEEP** |
| `keyboard.spec.ts` | Skip link first, visible focus on every stop, error-summary focus, submit always enabled | **KEEP** |
| `discovery.spec.ts` | robots and sitemap agree with `INDEX_POLICY` | **KEEP** (extend for new routes) |
| `metadata.spec.ts` | Independent noindex reasons | **KEEP** |
| `analytics.spec.ts` | Allowlist, event list, beacon behaviour, no identifiers | **KEEP** (update the event list only through the registry rule) |
| `deletion.spec.ts`, `deletion-journey.spec.ts` | Deletion client contract; five-step no-JS journey | **KEEP** |
| `enquiries.spec.ts`, `waitlist.spec.ts` | Delivery, retention date, consent, dedupe, error summaries, follower-count invariant | **KEEP** (retention assertion tied to W-08) |
| `console.spec.ts` | Clean console; client namespaces present | **KEEP** |
| `messages.spec.ts` | No message key renders as text | **KEEP** |
| `pseudo.spec.ts`, `am-rehearsal.spec.ts` | Ge'ez +40% layout; Amharic landing rehearsal | **KEEP** (re-run against the new layouts) |
| `a11y.spec.ts` | axe at viewports per route, target size, waitlist error state, mobile menu open, reduced motion | **UPDATE AFTER MIGRATION** (route list, new components) |
| `layout.spec.ts` | 360px no-overflow and 44px targets per route | **UPDATE AFTER MIGRATION** (route list; add the work order's 390–1440 widths) |
| `menu.spec.ts` | Trigger size, "six nav items", Escape, close on navigation, scroll lock | **UPDATE AFTER MIGRATION** (nav count and labels follow the prototype; behaviours stay) |
| `design.spec.ts` | EXAMPLE badge legibility, dual-tone focus, no truncation, Latin-first font stack | **UPDATE AFTER MIGRATION** (truthfulness and truncation assertions stay; focus styling follows new tokens) |
| `focus-pixels.spec.ts` | Focus changes pixels | **UPDATE AFTER MIGRATION** (keep the principle) |
| `placeholder-appearance.spec.ts` | G11 snapshots: placeholders look unfinished | **UPDATE AFTER MIGRATION** (new snapshots for new placeholders and photo slots) |
| `measure-lengths.spec.ts` | Length sensitivity at 360px | **UPDATE AFTER MIGRATION** |
| `icons.spec.ts` | Icon pipeline / favicon | **UPDATE AFTER MIGRATION** (when brand artwork lands) |
| `prow-slot.spec.ts` | Prow mask on the ink surface | **OBSOLETE ONLY IF PROVEN**: remove only if WEB-MIG-002 removes the prow motif |

**New coverage required** (assigned in the matrix):

- New routes: `/pricing` (no price, fee or plan content), `/markets/ethiopia`, `/availability` (noindex, D-08), standalone `/waitlist` (D-03). No `/press` (D-04).
- Routing: `/` serves English and `/en` redirects to `/` (D-01); `/delete-account` permanently redirects to `/account-deletion` (D-02).
- Waitlist: email and phone both required; an unconsented submission is refused (D-05).
- Copy invariants (extend `check:copy`): no public "Product Post" or "Shoppable Post", no `0.5%`, no commission or surcharge figures, no free-period promises, four Trust labels wherever labels are enumerated, no Government-ID claim, no Seller payment-confirmation claim.
- Responsive suite at 360/390/430/768/1024/1280/1440 with no page-level horizontal overflow.
- Photo-slot contract: fixed aspect ratio, alt text or `aria-hidden`, no CLS.
- No inline `style` attributes in SSR output (CSP).

---

## 10. Public content drift

Search terms from the work order were run across `src/messages/en.json` (the only public copy source), components and pages. `am.json` holds one key. No "Product Post", "Shoppable Post", `0.5%`, "commission" or "surcharge" occurs anywhere in public copy. The word "Scene" does not occur anywhere. The drift is a superseded business model, not banned terminology.

Classifications: **OUTDATED** (superseded by current authority; replace in the owning WO), **PROHIBITED** (must not survive migration), **REVIEW** (needs founder/legal approval), **OK** (consistent), **INTERNAL** (identifier, not public copy).

| Theme | Occurrences (`en.json` keys) | Current authority | Class |
| --- | --- | --- | --- |
| Buyer pays the Seller by direct bank transfer; receipt upload | `meta.defaultDescription`; `home.whatFor` ("Buyers pay by bank transfer directly to the seller"); `howItWorks.steps` ("Adulis shows the seller's bank details… uploads the receipt"); `howItWorks.moneyBody`; `forBuyers.steps`, `forBuyers.limits`; `help.faqs` ("Buyers transfer money directly to the seller's own bank account") | Gateway checkout (Chapa where enabled); provider/backend verification is canonical (KB §3.1, WEB-02 §10, ARCH INV-022–024) | **OUTDATED** |
| Seller confirms or verifies payment; "Adulis never verifies whether a payment is genuine" | `forSellers.handleBody` ("You are the payment verifier… decide whether the money arrived"); `howItWorks.steps`; `howItWorks.moneyBody`; `forBuyers.limits` ("The seller checks their own bank"); `trust.boundaries` | "A Seller cannot confirm… or manually mark a payment successful"; provider/backend verification is canonical (KB §3.1) | **PROHIBITED** |
| Reservation model ("reserve in the app") | `howItWorks.steps`, `forBuyers.steps` ("Reserve in the app"), `forBuyers.checks`, `home.sellerChanges`, `forSellers.benefits`; deletion blocker `RESERVATION_NON_TERMINAL` | No Buyer Reserve; Cart does not reserve stock (ARCH INV-019/020) | **OUTDATED** (copy); **INTERNAL/REVIEW** (blocker code) |
| Free periods and paid plans | `forSellers.sequence` ("Hand-picked cohort, free", "60 days from your own signup… free", "Paid plans"); `forSellers.sequenceNote`; `help.faqs` ("Free during the beta and for the first 60 days") | No universal free period (KB §55); no free-period promises, plans or prices (WEB-02 §6, §89) | **PROHIBITED** |
| "Sellers pay a subscription" | `meta.defaultDescription` (every page) | Seller packaging open and not publicly packaged (WEB-02 §6, KB §51) | **REVIEW** → remove unless approved |
| "Blue tick" plan feature | `forSellers.sequence` | Not defined in any current authority | **PROHIBITED** |
| Government ID | `trust.verification` ("Government ID where required"); `help.faqs` ("…and government ID where required") | Adulis does not collect Government ID or selfies (KB §53, WEB-02 §11/§13, WEB-INV-22) | **PROHIBITED** |
| Trust Ladder with three levels | `trust.ladder` (New, Established, Trusted); `forBuyers.checks` ("New, Established or Trusted"); How-it-works EXAMPLE levels | Four labels NEW / REBUILDING / ESTABLISHED / TRUSTED wherever enumerated (WEB-02 §7, §91) | **OUTDATED** |
| Trust-based Product caps | `trust.ladder[].meaning` ("Limited published products… transaction value cap", "Full catalogue for the plan · cap lifted") | No Trust level limits Product count (WEB-02 §7) | **PROHIBITED** |
| Social bio-link as the only acquisition loop; no Products/Scenes/discovery | `home.*`, `howItWorks.*`, `forBuyers.steps` | Two loops: external social → Storefront, and For You → Scene → Product (KB §5, WEB-02 §10) | **OUTDATED** |
| Seller physical location | No mandatory-shop or address claim found. Footer and Contact show the **company** address "Addis Ababa, Ethiopia"; waitlist asks for a city | Physical location optional (authority); company address is not a Seller claim | **OK** (keep the company address under REVIEW until registration is final) |
| "Not a link-in-bio, merch or tipping product… real physical products" | `home.whatFor` | Physical products are correct; "physical" refers to goods, not shops | **OK** |
| Controlled beta / not publicly available / no guarantee of access | `common.betaBadge`, `home.cohort`, `waitlist.*`, `help.faqs` | Consistent with controlled admission and disabled live payments | **OK** (prototype wording governs) |
| Follower count never a threshold | `waitlist.followers*`, `help.faqs` | "No universal follower constant" (MKT §29–35) | **OK** |
| Claims as recourse, not refund guarantee | `forBuyers.limits`, `trust.claims` | No guaranteed refunds; Seller-funded remedies (WEB-02 §13, §89) | **OK** (re-express in new copy) |
| Phone control verified; no identity photographs | `trust.verification`, `trust.verificationNote` | Consistent (KB §53) | **OK** |
| Deletion blocker codes `ORDER_AWAITING_HANDOFF`, `REFUND_UNACKNOWLEDGED`, `SUBSCRIPTION_PAST_DUE`, `RESERVATION_NON_TERMINAL` | `deleteAccount.blocked.reasons` | Website renders backend-supplied reason codes (WEB-02 §40); categories are active Orders/payments, unresolved Claims, Seller obligations, holds | **INTERNAL / REVIEW** (re-map when the Platform contract exists; flow is gated off) |
| Example shops with ETB prices and order counts | `home.bioToProduct`, `howItWorks.shopPreviews` (all carry the EXAMPLE badge) | Illustrative examples must be clearly marked (WEB-MIG-003) | **OK** while badged; replaced by the new narrative |

---

## 11. Prototype Company Website audit

Prototype `AdulisCommercePlatformPrototype @ f448d06` (Vite 8, React 19, Tailwind 4). File references use `CW` = `src/sections/CompanyWebsite.tsx`, `APP` = `src/App.tsx`, `CSS` = `src/index.css`, `TP`/`TL`/`PAL`/`TT` = `src/theme/ThemeProvider.tsx`/`ThemeLab.tsx`/`palettes.ts`/`theme-tokens.css`. Only the Company Website surface was audited; other surfaces were read only where the Website imports them.

### 11.1 How it is built

- One 2,087-line component. Pages switch with `useState<PageKey>` (CW:41); `navigate()` (CW:46-49) only sets state. There is no router, no URL, no history, no scroll reset, no focus move, no per-page title, and no 404 (`PageRouter` has no default, CW:268-289).
- It is mounted as one of twelve prototype sections (`case '03-website'`, APP:52) inside the prototype shell (sidebar, guided-flow card, floating Theme Lab) and a `StoryProvider` demo clock. It remounts on every guided-flow step (APP:244).
- It imports **nothing** from `src/components/ui/*`. Every button, card and field is styled inline. It imports `AdulisLogo` from `App.tsx` (circular) and a long list of demo-data functions (`SELLERS`, `PRODUCTS`, `SHOPPABLE_POSTS`, `forYouAt`, `trustAt`, `requestAccountDeletionAt`, `submitContentReport`, …).
- Desktop vs mobile is a prototype view toggle: a 390×844 phone bezel (`MobileFrame`, CW:196-265), decided once from `window.innerWidth` at mount (CW:42). Five pages have separate mobile-only components (CW:1877-2037); the rest reflow through `.website-compact` attribute-selector CSS overrides (CSS:583-612).
- All navigation is `<button onClick>`. There are no `<a href>` elements in CW.

### 11.2 Page inventory (approved experience)

18 page keys exist (CW:7-25). There is **no Press page** (only a dead About card with `href:'#'`), **no Refunds & Disputes page**, and **no 404**.

| Page | Sections in order (verbatim headlines) | CTAs | Forms / behaviour | Photography |
| --- | --- | --- | --- | --- |
| Home (CW:305-492) | Pill "Now in development · Ethiopia"; H1 "Discover products through the way people actually like to see them used."; "Commerce without context doesn't build trust." (3 problem cards); "Content that is commerce. Commerce that is trustworthy." (Products, Scenes, Verified Storefronts, Gateway Payments); "Products discovered in context, not in a grid." (For You); "Every seller has a public home — no app required to browse." (Storefronts); "Accountability at every step, not just at checkout." (Seller Admission, Trust Ladder, Gateway Payment, Handoff Evidence); "Nine steps. Complete accountability."; "Starting in Ethiopia. Built to expand."; CTA band "Ready to sell the right way?" | Join Seller Waitlist (primary pill); See How It Works (outline); text links to For Buyers, For Sellers, Trust, How It Works, Availability | None | Hero Scene slot (500px, radius 28) with a demo product overlay card; feed illustration (2 demo Scenes); storefront illustration (4 demo Products with ETB prices); courier handoff slot (12:5); seller slot in CTA band |
| How It Works (CW:688-767) | H1 "Nine steps. Every one accountable."; 01 Discover · 02 Product · 03 Cart · 04 Checkout · 05 Gateway Payment · 06 Seller Preparation · 07 Courier Fulfilment · 08 Handoff · 09 Review, with callouts ("No cash on delivery…", "No continuous GPS tracking…", QR handoff, Claims) | For Buyers; For Sellers (hero only) | None | Hero slot (12:5) |
| For Sellers (CW:772-827) | H1 "Everything you need to sell with confidence."; 9 features (Products, Scenes, Public Storefront, Orders, Inventory Management, Buyer Chat, Courier Fulfilment, Analytics, Trust); CTA band "Seller Console is waiting for you." | Join Seller Waitlist | None | Hero slot; CTA band slot |
| For Buyers (CW:832-874) | H1 "Discover. Trust. Receive. Review."; 9 features (For You Feed, Product Truth, Search, Collections, Seller Trust, Chat, Checkout, Verified Handoff, Reviews) | **None** | None | Hero slot |
| Trust & Safety (CW:879-962) | H1 "Accountability built in, not bolted on."; long-form sections Seller Admission (incl. "A physical shop is not required…" and "Adulis does not require government-issued ID…"), The Trust Ladder (no label enumeration), Gateway Payments, Handoff Evidence, Verified Reviews, Claims | **None** (no Report Content link) | None | Hero slot |
| Availability (CW:978-1023) | H1 "Starting in Ethiopia. Honest about where."; cards "In Development — Ethiopia — Addis Ababa" and "Architecture Ready — International Expansion… No timeline is committed."; warning note "We will not claim availability in markets we haven't built for…" | Ethiopia Market Details | None | None |
| Ethiopia (CW:1025-1062) | Label "Ethiopia Market"; H1 "Adulis in Ethiopia"; cards Focus City: Addis Ababa, Payment Infrastructure ("No specific provider is announced here."), Courier Network, Language | ← Back to Availability | None | Hero slot (Addis Ababa) |
| Pricing (CW:1068-1113) | H1 "Pricing is coming soon."; "We're not ready to publish seller plan pricing yet… no hidden fees, no invented tiers, and no asterisks."; "The tools Adulis is building for Sellers." (6 cards) | Join Waitlist to be notified; Explore the Seller tools → | None. Source comment CW:1067: no pricing, fee or surcharge figure | None |
| About (CW:1118-1165) | H1 "Building the commerce infrastructure independent sellers deserve."; Adulis-port origin; "Our Mission"; cards Press (dead), Help Centre, Contact | Help, Contact | None. No team, entity, address or contact data | None |
| Waitlist (CW:1170-1270) | H1 "Apply to sell on Adulis."; form; success "You're on the list." | Read Trust & Safety (success) | First/Last name\*, Email\*, Phone (optional), Business Name\*, Primary Category\* (9 options), Social Handle\*, Business Location (City, Country)\*; consent **text only** (no checkbox, no privacy link); client-side validation; submit only sets `submitted` (fake) | None |
| Help (CW:1340-1386) | H1 "How can we help?"; non-functional search; 4 topic cards with question titles and **no answers** | Contact us | Search has no handler | None |
| Contact (CW:1391-1432) | H1 "Get in touch"; success "Message received." "We'll reply… within 2 business days." | — | Name, Email, Subject, Message; fake submit | None |
| Legal ×4 (CW:1437-1488) | Terms, Privacy, Seller Terms, Prohibited Products; note "Prototype draft — not final legal text"; drafted section text (e.g. "retained for 7 years") | — | — | None |
| Account Deletion (CW:1504-1745) | explain → phone (+251, 9 digits) → 6-digit code ("No code is sent…") → preview (hard-wired demo person and Orders) → confirm (optional reason, type `DELETE`) → result (`role=status`; "requested, but currently blocked by active Orders") | Verify your account; Delete My Account | Fake verification; focus moves to the H1 on each step (good) | None |
| Report Content (CW:1762-1872) | H1 "Report Content"; form → phone/code verification → submit → "Report submitted." | — | Content Type\* (Product Listing / Scene / Seller Profile / Review / Other), Link or description\*, Reason\* (6 options), detail, optional email; fake verification and submit | None |

### 11.3 Header and navigation

- Desktop `WebHeader` (CW:97-140): logo → Home; nav **How It Works · For Sellers · For Buyers · Trust & Safety · Availability · About** (CW:27-34); one CTA **Join Seller Waitlist**. Sticky, 64px, translucent surface with blur. Active item = brand text on brand-muted pill, but no `aria-current` and an unlabelled `<nav>`. At ≤1200px the nav wraps to a horizontally scrolling row; there is no hamburger on desktop widths.
- Mobile (inside `MobileFrame`, CW:216-254): logo, "Join Waitlist" pill, hamburger (`aria-label`, `aria-expanded`, no `aria-controls`, 32×32 outside real ≤640px viewports). The drawer is a positioned `div` with `NAV_LINKS` only: no landmark, no Escape, no outside-click close, no focus handling, no scroll lock, no active state, and it stays open after logo or CTA taps.
- **No Seller Console link, no language switcher, no app-store links.**

### 11.4 Footer

`WebFooter` (CW:143-193): brand column ("Trusted commerce infrastructure connecting independent sellers with buyers through verified storefronts and accountable fulfilment.", © 2026) + three columns:

| Platform | Company | Legal |
| --- | --- | --- |
| How It Works, For Sellers, For Buyers, Pricing | About, Availability, Help, Contact | Terms of Service, Privacy Policy, Seller Terms, Prohibited Items, Report Content, Account Deletion |

Absent: Trust & Safety, Ethiopia, Press, Waitlist, **Refunds & Disputes**. Fixed 5-column grid with no responsive rule in the desktop view.

### 11.5 Design system

- **Colour (Baseline Light, the default and the approved values; CSS:10-64):** brand `#A04720` (light `#D97B45`, muted `#F0DDD1`, dark `#943F1A`), on-brand `#FFFFFF`; background `#FAF8F5`, surface `#FFFFFF`, raised `#F5F2ED`, overlay `rgba(26,21,18,.48)`; text primary `#1A1512`, secondary `#5C4F45`, muted `#746860`, inverse `#FAF8F5`; border `#E8E0D8`, border-strong `#C8BDB5`; success `#2D7A4F`/`#EAF5EE`, warning `#936313`/`#FDF3E1`, danger `#C2372D`/`#FDECEA`, info `#2D5CC2`/`#EBF0FC`. Semantic aliases `--adulis-*` (TT:12-64) including focus ring (= info blue) and warm/sage/mint tints used in hero gradients.
- **Palettes:** `baseline` is the default and the only one without inline overrides; 10 candidate palettes exist only for Theme Lab comparison and are explicitly "not a brand decision" (PAL:2-4).
- **Typography:** Fraunces (display, all headings weight 600), Outfit (body), DM Mono (labels, pills, prices, step numbers, footer headings), loaded by a render-blocking Google Fonts `@import` (CSS:1-3). Sizes are literal px: H1 52 (Home) / 48 (inner heroes) / 40–34 (forms, legal); H2 40 / 38 / 28 / 26 / 24; H3 22–18; body 18 / 17 / 16 / 15 / 14; labels 11px mono uppercase with 0.1em tracking. Headings line-height 1.12–1.2, body 1.65–1.75.
- **Shape and space:** pill buttons (radius 999), cards radius 16 (raised, no border) or 16 bordered, inputs radius 10; shadows `--shadow-sm…xl`. Section padding 72px vertical, max-width 1120 (footer 1152, hero media 1024, long-form 780, legal 740, forms 520–620).
- **De-facto variants:** primary pill, large full-width primary, inverted pill (CTA band), outline pill, text link with "→", danger, warning, quiet; raised and bordered cards; `Field`/`SelectField` inputs with labels via `useId`, `aria-invalid`, `aria-describedby` and `role="alert"` errors.

### 11.6 Photography areas

Every image area is `PhotoSlot` (CW:505-528): a tonal gradient panel with the visible brief "Photography · {brief}", `role="img"` + `aria-label="Photograph to come: {brief}"` when briefed, `aria-hidden` otherwise. No `<img>` exists. Briefs: "A Scene: products styled in a real home"; "A courier handing a delivery to a buyer"; "An independent seller preparing orders"; "A buyer discovering products on their phone"; "A seller photographing a product for a Scene"; "A seller packing an order for courier collection"; "A buyer browsing Scenes at home"; "A seller and a buyer: social commerce built on trust"; "Addis Ababa: sellers and couriers in the city". There are no decorative icon grids. The only icons are a Help search glyph and text arrows.

### 11.7 Responsive behaviour

- Desktop layouts are fixed inline grids (2/3/4/5 columns) with no media queries in CW; the only adaptation is the header wrap at ≤1200px. Between ~641 and 1000px the hero H1, 4-column trust cards and 5-column footer become cramped. The Home "nine steps" strip combines `overflowX:auto` with `justifyContent:center`, which clips the first steps when it overflows.
- The 390px phone view uses dedicated layouts for 5 pages and compact reflow for the rest (single-column grids, H1 28 / H2 22, 2-column footer).
- Because the view is chosen once at mount, a window narrowed to 360px after loading keeps the desktop layout and overflows horizontally.

### 11.8 Accessibility

Strengths: global 3px `:focus-visible` ring; labelled form fields with `aria-invalid`/`aria-describedby`; focus moves to the heading on each deletion and report step; reduced-motion rule; `PhotoSlot` alt-or-hidden contract.

Gaps the production build must not reproduce: no skip link; two nested `main` landmarks; mobile header and drawer are not landmarks; no `aria-current`; skipped heading levels (H2 → H4 on Home, H1 → H3 on several pages, footer `h4`); success states with H2 and no H1; drawer lacks Escape, focus and scroll handling; required asterisk announced; Contact textarea not `required`; focus not moved to the first error; Help questions are non-interactive; input borders `#E8E0D8` on white are **1.31:1** and the outline-button border **1.84:1** (WCAG 1.4.11 needs 3:1); the focus ring is **1.00:1** against the brand-coloured CTA band.

### 11.9 Terminology and claims

- Public copy uses **Products** and **Scenes** throughout. "Product Post" and "Shoppable Post" occur only as the internal identifier `SHOPPABLE_POSTS`. Minor drift: "Product Listing" (Report content type; legal drafts) and "Seller Profile".
- **No** `0.5%`, commission, surcharge figure, free period, guarantee, escrow, refund promise or payment brand appears. Pricing says "coming soon"; Ethiopia says "No specific provider is announced here."
- Physical location matches the authority: "A physical shop is not required… no Seller is asked to publish a home or residential address" (CW:907, 1045, 2018).
- Payment: "payment is confirmed before the seller prepares the order" (CW:385, 446, 703-704); "Adulis cannot manually mark an unpaid order as paid" (CW:928); "provider-verified payment status" (CW:1929); "No cash on delivery" (CW:446, 704, 840, 925, 2020); "**Adulis never holds funds**" (CW:385, 703, 926).
- Verification: "Adulis does not require government-issued ID for Seller admission. Payment-provider KYC, where required, is separate." (CW:908, 2032). "Verified" is used widely ("Verified Storefronts", "verified sellers", "verified Trust level", "Verified Handoff", "Verified Reviews").
- Launch status: "Now in development · Ethiopia"; "No timeline is committed"; Addis Ababa is the only city named.
- Commitments that no current authority approves: "We'll reply… within 2 business days" (CW:1400); "retained for 7 years for regulatory compliance" (legal draft CW:1451 and `DELETION_CONSEQUENCES`); "We will not share your details with third parties" (CW:1258); "We do not sell personal data" (legal draft); chatbot "so you don't have to be online 24/7" (CW:779).

### 11.10 Demo data

Addis Atelier and Nura Glow (Sellers), "Autumn Layers" and "Morning routine in three steps" (Scenes), Linen Overshirt ETB 2,450 and three other Products, trust label "Established", the person "Maya Tesfaye" (shown as the verified account in Deletion and Report) and Orders ADU-24091…24093. **None of it is labelled as an example on the Website**; the demo Sellers read as real businesses.

### 11.11 Theme Lab (development reference only)

A floating 44px trigger mounted in the prototype shell (APP:233-239), not inside the Website. Its `role=dialog` panel offers Previous/Next, 11 palettes, Light/Dark/System mode and Reset. It persists `{palette, mode}` in `localStorage` (`adulis.theme-lab`), applies it before first paint (`main.tsx:7-9`), and writes `data-adulis-theme`/`data-adulis-mode` plus **inline `--adulis-*` custom properties on `<html>`** (TP:55-69). Several Website colours are hard-coded hex and ignore it (photo tones, step tiles, storefront tiles, availability borders).

### 11.12 Prototype defects not to reproduce

Literal `\'` rendered in the For Buyers subcopy (CW:854); For Buyers and Trust pages have no CTA; Ethiopia and Pricing reachable only indirectly; waitlist wording varies between "waitlist" and "application"; step counts differ (Home 9, mobile 4); footer "Prohibited Items" vs page "Prohibited Products"; Privacy draft says deletion happens "through the app" while the site offers it; "Adulis supports Amharic and English" with no Amharic on the site; dead props and unreachable branches (CW:43, 48, 85, 97-102, 298, 1469, 1958).

---

## 12. Prototype vs production differences

| Dimension | Production (`cfbd338`) | Prototype (`f448d06`) | Migration direction |
| --- | --- | --- | --- |
| Architecture | App Router, real locale routes, server components, server actions | One client component, state-based page switcher | Keep production architecture; translate each prototype page into a route |
| Narrative | Social bio-link commerce layer; bank transfer; Seller-verified payment; controlled beta | Products + Scenes discovery and structured commerce; gateway payment confirmed before preparation; "Now in development · Ethiopia" | Prototype narrative replaces production copy |
| Visual language | White paper, navy ink, gold accent; Inter + Instrument Sans; 8px radius; card/open treatments | Warm off-white, terracotta brand, Fraunces + Outfit + DM Mono; pill buttons; radius 16 cards; photography slots | Prototype visual language, rebuilt as production tokens (WEB-MIG-002) |
| Primary nav | How it works, For sellers, For buyers, About, Trust & safety, Help; Log in (Seller Console); Join the waitlist | How It Works, For Sellers, For Buyers, Trust & Safety, Availability, About; Join Seller Waitlist | Prototype items and order; keep the Seller Console link and the gated language switcher |
| Mobile menu | Disclosure panel with Escape, close on navigation, scroll lock, `aria-controls`, 44px trigger | Positioned div, no Escape, focus or scroll handling | Prototype look, production behaviour |
| Footer | Primary row + full legal row (incl. Refunds & Disputes) + address + copyright | Brand column + Platform / Company / Legal; no Refunds & Disputes, no Trust & Safety | Prototype layout, production legal reachability |
| Pages | 15 routes | 18 page keys incl. Availability, Ethiopia, Pricing, standalone Waitlist; no Press, no Refunds & Disputes, no 404 | Union: add Availability, Ethiopia, Pricing, Waitlist; keep Refunds & Disputes and 404; Press deferred with no link (D-04) |
| Forms | Server actions, no-JS, server validation, explicit consent checkbox, rate limits, references | Fake submits; client validation; consent as text only; fake OTP | Keep production forms and actions; restyle to prototype |
| Waitlist fields | Name, phone\*, platform (TikTok/Instagram), handle, second platform, followers, what you sell, city, consent | First/last name, email\*, phone (optional), business name, category, social handle, location | Production form, restyled; email and phone both required with explicit consent (D-05) |
| Report | Anonymous; reason category undecided | Content type + 6 reasons; account verification required | Anonymous intake kept, no verification step, approved public reason taxonomy (D-06) |
| Deletion | Explanatory page + manual route; five-step flow gated off | Full (fake) six-step flow with "type DELETE" confirm | Keep the gate; restyle explanatory state to prototype |
| Help | 11 answered FAQs in `<details>` | Topic grid, question titles only, non-functional search | Prototype layout + production's working disclosure answers; no fake search |
| Legal | Section maps with UNDECIDED bodies (fail closed) | Drafted text labelled "Prototype draft — not final legal text" | Keep production pattern; never publish prototype legal text |
| About | Origin, founders (bios UNDECIDED), registration/contact UNDECIDED | Mission, origin, Press/Help/Contact cards; no team | Prototype structure |
| Media | `MediaPlaceholder` (visible lo-fi box) | `PhotoSlot` with photography briefs | New production photo-slot primitive following the prototype briefs |
| Example content | Every invented shop carries an EXAMPLE badge | Demo Sellers, Products and a person are unlabelled | Keep production's EXAMPLE contract on any demo content |
| Locale | en + am (gated), switcher hidden | English only, no switcher | Keep production i18n |
| Fonts | Self-hosted via `next/font`, byte-budgeted, Ethiopic subset | Google Fonts CSS `@import` | Self-host the prototype faces via `next/font`; keep Ethiopic fallback |
| Accessibility | Skip link, landmarks, 44px targets, control borders ≥3:1, tested with axe | Several gaps (§11.8) | Production standard applies to the prototype design |

---

## 13. Reference-design constraints on the migration

Only constraints that bind the visual and content migration are listed; each is cited. Higher authority overrides lower where they differ (§18).

**Experience and content**

- Public terminology is Product/Products/Scene/Scenes. The designs' "Product Post"/"Scene Post" wording yields to the authority file.
- `/pricing` shows Coming Soon only: no tiers, prices, free periods or fee arithmetic (WEB-02 §6, §89, WEB-INV-03). No `0.5%` (authority; KB §30/§51 call it an inactive concept).
- No Seller commission exists in any current source (KB; ARCH §7: "no implicit per-completion Seller commission").
- Four Trust labels; Trust cannot be purchased; no Product caps (WEB-02 §7, §91).
- Seller admission is phone/Account control, social-account control, social-commerce evidence and business information; no Government ID or selfie (KB §53, WEB-INV-22).
- Payment is provider/backend-verified gateway checkout; name Chapa only on Ethiopia content where enabled. No escrow, custody, buyer-protection or guaranteed-refund language (KB §5, §3.1, §33; WEB-02 §13, §81).
- For You is image-led and Scene-only; no native Seller video, live Courier maps, Similar Finds or Complete the Scene (WEB-02 §90, WEB-INV-06/19/21).
- Distinguish "Website available worldwide" from "commerce available in this Market" (WEB-02 §4, WEB-INV-02). Do not hard-code cities or categories beyond configuration (MKT §6, §39).
- Help content must stay statically renderable without client JS (WEB-02 §16).

**Architecture**

- Server-rendered; client components only for genuine interaction (WEB-02 §17). Core content, navigation and form submission work without JavaScript (WEB-02 §72, WEB-INV-07).
- One navigation configuration feeds header, mobile menu, footer and sitemap (WEB-02 §22).
- Locale ≠ Market: a locale must not imply commerce availability, and no IP-based redirect into a legal context (WEB-02 §23, MKT §8, ARCH §1/§15).
- 360px first, no horizontal scroll, no fixed-height text containers, ~40% Amharic expansion budget (WEB-02 §26); logical CSS properties for future RTL (MKT §79).
- Self-hosted Latin + Ethiopic fonts with `unicode-range` subsetting (WEB-02 §25, MKT §78).
- Images: responsive sizes, AVIF/WebP, explicit dimensions, lazy below the fold, optimised LCP (WEB-02 §69).
- WCAG 2.1 AA: visible focus, skip link, 44×44 targets, reduced motion, visible labels, landmarks, accessible menu state, error summary focus (WEB-02 §71).

**Security and privacy**

- CSP-PUBLIC-WEB target (CSP-01 §29, App A §63): `default-src 'none'`, nonce or hash scripts, `script-src-attr 'none'`, `style-src 'self' 'nonce-…'`, `style-src-attr 'none'`, `img-src 'self'` (+ one exact approved media origin), `font-src 'self'`, `frame-src 'none'`, `worker-src`/`manifest-src`/`media-src 'none'`, `report-to`. Consequences for the migration: no inline `style` attributes, no third-party fonts, scripts, frames or embeds, no `<video>`, no service worker or manifest, and photography from `'self'` or one registered media origin.
- Nonce-bearing HTML is never shared-cached (CSP-01 §12, §49; DEPLOY §68).
- No analytics events exist for the Website in ANL-01. Do not add events beyond the existing closed list without registration; never send form values, phone, email or social handles (WEB-02 §47, ANL §13).
- Do not hard-code retention durations (PRV §20/§22, WEB-02 §36).
- PII-collecting forms must fail closed where no approved policy exists (WEB-02 §41, DEPLOY §96). Today the production equivalent is "refuse without a delivery destination".
- Theme Lab: not ported (founder ruling D-07).

---

## 14. PRODUCTION INFRASTRUCTURE THAT MUST NOT BE LOST

Each item below is **confirmed present** in `cfbd338`. Replacing any of them requires an explicit technical justification in the work order that does it (authority file, "Production infrastructure").

| # | Asset | Where | Why it must survive |
| --- | --- | --- | --- |
| 1 | **Next.js App Router** | `src/app/` | Required stack (WEB-02 §17, MKT §115); real routes, not a client page switcher. |
| 2 | **TypeScript (strict)** | `tsconfig.json` (`strict: true`, `@/*` paths) | Typed route keys turn broken links into compile errors. |
| 3 | **next-intl** | `src/i18n/*`, `next.config.mjs` plugin | Locale routing, message loading, typed navigation `Link`. |
| 4 | **Locale-aware routing** | `[locale]` segment, `routing.ts`, middleware | URL-shared language, no JS dependency, `/am` staged behind `AM_ENABLED`. (D-01 changes the prefix mode to `as-needed`; locale routing itself stays.) |
| 5 | **Metadata helper** | `src/lib/metadata.ts` | One call sets title, robots, canonical and hreflang; prevents the per-field override defect. |
| 6 | **Sitemap** | `src/app/sitemap.ts` | Derived from `INDEX_POLICY`; never lists a noindex route. |
| 7 | **Robots** | `src/app/robots.ts` | Closed until a public site URL exists. |
| 8 | **Middleware** | `src/middleware.ts` | Per-request CSP nonce, `x-pathname` client-namespace trimming, locale middleware. |
| 9 | **Server actions** | `src/actions/*` | Server-authoritative, no-JS-capable submission for all four forms. |
| 10 | **Validation** | `src/lib/validation`, per-field caps in actions | Server-side validation, exact consent semantics, non-sequential references. |
| 11 | **Rate limiting** | `src/lib/ratelimit`, per-phone keys via `src/lib/hash` | Fail-closed backstop with a trusted-header rule that defeated a measured bypass. |
| 12 | **Environment checks** | `scripts/check-env.mjs`, `SELLER_CONSOLE_URL` fallback | Refuses undeployable builds and forbidden test variables (`PSEUDO_AM_FILE`, `DELETION_FLOW_TEST_FORCE`). |
| 13 | **Security** | CSP in middleware; headers in `next.config.mjs`; Origin check; honeypots; body-size cap; spreadsheet-safe escaping; no PII in logs or analytics | Measured, audited controls (security audit 01). |
| 14 | **Playwright** | `tests/qa/*`, `playwright.config.ts`, CI `qa` job | Behavioural regression on chromium and webkit against a production build. |
| 15 | **Accessibility testing** | `a11y.spec.ts` (axe), `keyboard.spec.ts`, `layout.spec.ts`, `focus-pixels.spec.ts`, `menu.spec.ts` | WCAG 2.1 AA evidence. |
| 16 | **Route registry** | `src/lib/routes.ts` (`ROUTES`, `INDEX_POLICY`, `indexableRoutes`) | No hand-written hrefs; one answer to "may this be indexed". |
| 17 | **Navigation registry** | `src/lib/nav.ts` (`primaryNav`, `legalNav`, `sellerConsoleLink`, `LOCALE_LABELS`) | Header, mobile menu and footer cannot diverge; legal links on every page; single allowlisted sign-in link. |

Also preserve (confirmed): prebuild gates (`check:i18n`, `check:encoding`, `check:font`, `check:copy`, `check:assets`), `check:routes`, the font pipeline (Latin-first, Ethiopic subset, Amharic-only full face), per-route client-message trimming, `AM_ENABLED` and `DELETION_FLOW_ENABLED` gates, `UndecidedFlag` and the EXAMPLE marker (truthfulness controls), the fail-closed legal placeholder pattern, `<details>`-based Help, the no-JS deletion journey, and the analytics allowlist with its beacon endpoint.

---

## 15. PROTOTYPE SHORTCUTS NOT TO COPY

Each item exists in the prototype at `f448d06` and must not enter production. The prototype controls the approved experience, not the implementation.

| # | Prototype pattern | Where | Production replacement |
| --- | --- | --- | --- |
| 1 | **Client-only multi-page switching** (`useState<PageKey>`, `navigate()`, `PageRouter`, `<button onClick>` navigation) | CW:41-49, 268-289 | App Router routes under `[locale]`, next-intl `Link`, `ROUTES` registry |
| 2 | **Prototype shell**: sidebar, twelve-section switcher, default `'10-demo-flows'`, guided-flow card, remount keying | APP:18-62, 123-256 | Production `[locale]/layout.tsx` with Header, `<main id="main">`, Footer |
| 3 | **Multi-surface controls**: Website toolbar, Desktop/390px toggle, `MOBILE_PAGES`, phone bezel with status-bar clock | CW:37, 42, 54-78, 196-265 | One responsive page per route; CSS breakpoints |
| 4 | **Duplicate mobile page components** (`MobileHomePage`, `MobileHowItWorks`, `MobileForSellers`, `MobileWaitlist`, `MobileTrust`) | CW:291-300, 1877-2037 | Same page, responsive layout; content parity across widths |
| 5 | **Demo state**: `StoryProvider`/`useStory` story clock, `demoTarget` | APP:243; CW:3, 40-41 | Static, catalogue-driven content |
| 6 | **Fake submissions**: Waitlist, MobileWaitlist, Contact, Report, Deletion only set local state or call pure demo functions | CW:1190-1195, 1410, 1770-1775, 1510-1518, 1997 | Existing server actions |
| 7 | **Fake verification**: no SMS, any 6 digits pass, always resolves to "Maya Tesfaye"; deletion reason collected and discarded | CW:1507-1518, 1570-1576, 1611-1612; `demo-data/derived.ts` | Production deletion action behind `DELETION_FLOW_ENABLED` + `DELETION_API_URL`; no verification UI without a real Platform API |
| 8 | **Demo fixtures**: Addis Atelier, Nura Glow, demo Scenes, Products with ETB prices, demo Orders and person; `HeroScene`, `FeedIllustration`, `StorefrontIllustration` | CW:551-645; `src/demo-data/*` | Illustrative content only where needed, always with the EXAMPLE marker; no demo person or Orders |
| 9 | **Mock business logic**: `requestAccountDeletionAt`, `submitContentReport`, `trustAt`, `forYouAt`, capability issuers | `src/demo-data/derived.ts` and others | None. The Website computes no Trust, feed or deletion state (WEB-INV-04, -12) |
| 10 | **Public Theme Lab**, its `localStorage` persistence, pre-paint script and inline `--adulis-*` properties on `<html>`, plus the 10 candidate palettes | APP:64-121, 233-239; TL; TP:21-69; `main.tsx:7-9`; PAL:52-123; TT:66-130; CSS:282-523 | Not ported (founder ruling D-07) |
| 11 | **Inline `style` objects** on almost every element, plus hard-coded hex (`PHOTO_TONES`, step tiles, storefront tiles, availability borders) | CW throughout; 498-503, 617, 690-715, 996, 1014 | Tailwind utilities and component classes over semantic tokens; no inline style attributes (CSP) |
| 12 | **CSS override hacks**: `.website-compact` attribute selectors with `!important`, DOM-shape header selectors | CSS:583-612, 700-725 | Ordinary responsive classes |
| 13 | **Google Fonts CSS `@import`** | CSS:1-3 | `next/font` self-hosting |
| 14 | **Non-functional UI**: Help search without handler, answerless FAQ titles, Press card with `href:'#'` | CW:1341-1371, 1147-1153 | Working `<details>` answers; no search until it works; no Press link until approved press content exists (D-04) |
| 15 | **Prototype draft legal text and unapproved commitments** ("7 years", "2 business days", "We will not share your details with third parties") | CW:1438-1477, 1258, 1400; `demo-data/account-deletion.ts` | Production UNDECIDED pattern until approved text exists |
| 16 | **Inline hard-coded configuration**: nav and footer arrays, © year, category list, report taxonomy, `+251`/9-digit rule, all copy inline with no i18n | CW:27-34, 155-177, 1252, 1573, 1822, 1836 | `lib/nav.ts`, `ROUTES`, message catalogues, server-side validation |
| 17 | **Consent as text without a checkbox** | CW:1258 | Production `ConsentField` (explicit consent is a legal record) |
| 18 | **Figma Make head**: title "Figma Make App", site-wide `noindex` | `vite.config.ts`, `.figma/make/site.json` | `buildPageMetadata` + `INDEX_POLICY` |
| 19 | **Circular import** of `AdulisLogo` from `App.tsx` | CW:2; APP:263-282 | A standalone logo component (SVG, no raster) |

---

## 16. Weaknesses

| ID | Weakness | Evidence | Disposition |
| --- | --- | --- | --- |
| W-01 | Public narrative and copy describe a superseded business model (bank transfer, Seller-verified payment, reservations, free periods, 3-level Trust with caps, Government ID; no Products, Scenes or discovery) | §10 | Replaced page by page in WEB-MIG-003…006 |
| W-02 | Layout default description carries outdated commercial claims onto every page | `meta.defaultDescription` | Replace in WEB-MIG-003; give every page its own description |
| W-03 | No Open Graph, social or structured data | `lib/metadata.ts` | New coverage (WEB-MIG-003, WEB-MIG-007) |
| W-04 | `force-dynamic` on every page: no CDN HTML caching, full RSC render per request | locale layout, `SECURITY.md` | Accepted trade-off of nonce CSP (CSP-01 §29 allows nonce SSR); REVIEW at WEB-MIG-007 |
| W-05 | CSP is weaker than CSP-01 App A §63 in places: `default-src 'self'` (target `'none'`), `img-src data:`, no explicit `script-src-attr`/`style-src-attr 'none'`, no `frame-src`/`worker-src`/`manifest-src`/`media-src 'none'`, no `report-to`/`Reporting-Endpoints` | `middleware.ts` | REVIEW at WEB-MIG-007 (security hardening; not visual) |
| W-06 | Rate limiting is per-process memory; edge rules are not configured | `lib/ratelimit` | Known and documented; out of migration scope |
| W-07 | Forms relay to webhooks; dedupe is per instance; report does not reach a Platform moderation API | `lib/store/*` | Out of migration scope; the store interface is the seam |
| W-08 | Retention is hard-coded as 12 months (`purgeAfterFor`), asserted by tests | `lib/store/*`, `waitlist.spec.ts` | REVIEW: conflicts with PRV §20/§22 and WEB-02 §36 (no invented durations in code) |
| W-09 | Waitlist has no email or country field and only TikTok/Instagram | `actions/waitlist.ts` | Ruled D-05: email and phone both required, explicit consent kept; changed in the WO that builds `/waitlist` |
| W-10 | Amharic catalogue empty; `AM_ENABLED = false` | `am.json` | Unchanged; the migration must keep layouts Ge'ez-safe (`pseudo.spec.ts`) |
| W-11 | `.env.example` stale | B-02 | Separate fix |
| W-12 | Dependency advisories incl. critical `next` range | B-03 | Separate security work order |
| W-13 | The old paper/ink/gold doctrine is encoded in comments, class names and several tests | `globals.css`, `ui.tsx`, `design.spec.ts`, `prow-slot.spec.ts` | Expect deliberate test updates in WEB-MIG-002 |
| W-14 | Legacy token aliases still in use (`ink-muted`, `line`, `surface-sunken`, `text-h3`) | `tailwind.config.ts` | Retire in WEB-MIG-002 |
| W-15 | No media or photography pipeline; `check:assets` blocks raster images and `next/image` until `sharp` is at a fixed version | `scripts/check-assets.mjs` | See R-08 |
| W-16 | Analytics event list comes from ADU-WEB-01 §12 (historical), not WEB-02 §46; transport is stdout only | `lib/analytics` | REVIEW; no new events during the migration |
| W-17 | Unlocalised `app/not-found.tsx` uses inline `style` attributes, which the nonce CSP blocks if middleware sets the header on that response | `app/not-found.tsx` | Low impact; fix in WEB-MIG-002 if the shell touches it |
| W-18 | `Sequence` component is dead code (imported, not rendered) | `for-buyers/page.tsx` | Remove when the page is rebuilt |

---

## 17. Migration risks

| ID | Risk | Mitigation |
| --- | --- | --- |
| R-01 | Copying the prototype's single-component, client-state page switcher would discard routing, SEO, metadata and no-JS behaviour | Translate each prototype page into an App Router route under `[locale]`; never port the switcher (§15) |
| R-02 | Prototype theming via inline style attributes or runtime CSS-variable injection would be blocked by the CSP | Tokens as CSS custom properties in `globals.css`; theme variants via class or `data-*` selectors only |
| R-03 | Third-party fonts or assets in the prototype would violate `font-src 'self'` and the processor register | Self-host via `next/font`; keep `check:font` byte budgets |
| R-04 | Visual rewrite breaks the no-JS guarantee (menus, accordions, forms) | Keep `nojs.spec.ts` green at every work order; disclosure patterns stay CSS/HTML-first |
| R-05 | Header/footer rebuild drops legal links or the Seller Console allowlist | Header and footer keep reading `lib/nav.ts`; `check:copy` sign-in invariants stay |
| R-06 | New routes added without registry entries create hand-written hrefs, sitemap drift or wrong index policy | Every new route goes into `ROUTES` (+ `INDEX_POLICY` if not indexable), `primaryNav`/`legalNav` and `check:routes` |
| R-07 | Restoring outdated commercial or trust copy while rebuilding pages | Extend `check:copy` with the invariants in §9 before rebuilding the pages that carry them |
| R-08 | Photography slots trip `check:assets`: `sharp` 0.35.4 is inside a new high advisory (< 0.35.5) | Placeholders only (no raster, no `next/image`) until a `sharp` upgrade lands in its own change |
| R-09 | `next/image` emits inline `style` attributes, which the CSP blocks | Prefer a CSS-class media component; evaluate `next/image` under CSP before use |
| R-10 | Theme Lab leaks into production | Not ported (D-07): no code, flag or persistence to gate |
| R-11 | Routing change (D-01) breaks canonical, hreflang, sitemap, `check:routes` and tests | Do it in one dedicated change with tests updated together; site is not indexed yet, so cost is lowest now |
| R-12 | Demo Sellers, Products or Scenes from the prototype presented as real businesses | Keep the EXAMPLE marker contract; illustrative content always badged |
| R-13 | Per-route client namespaces: new client components fail at runtime with `MISSING_MESSAGE` | Add namespaces to `ROUTE_NAMESPACES`; `console.spec.ts` catches omissions |
| R-14 | Test churn mistaken for regressions, or tests deleted to make the redesign pass | Follow the §9 classification; delete only "obsolete if proven" specs, with the proof recorded |
| R-15 | Ge'ez expansion breaks the new layouts | Run `pseudo.spec.ts` on every rebuilt page |

---

## 18. Contradictions, tensions and decisions

### 18.1 Resolved by the authority order (no decision needed)

| Topic | Sources | Resolution |
| --- | --- | --- |
| "Product Post"/"Scene Post" in public copy | WEB-02 §3, §81; KB §5, §38 vs authority file | Authority (rank 2) wins: public copy says Product/Scene. Internal identifiers may keep Post terms. |
| Greenfield `adulis-web` monorepo with NestJS Website API, CMS and PostgreSQL | WEB-02 §19–21, §105; DEPLOY §8, §14 vs authority file and work order | Authority wins for this migration: modify `Adulis-Org-Website`, preserve its infrastructure. The CMS/API architecture is long-term debt outside WEB-MIG scope. |
| Long-lived `dev` branch | DEPLOY §110 ("avoid long-lived develop branches") vs work order | Work order (rank 1) wins. |
| Nonce SSR vs static hash profile | CSP-01 §29 ("static hash profile preferred if actual deployment is static") | Production is not static; CSP-01 explicitly allows nonce SSR. Keep. |

### 18.2 Founder rulings on D-01…D-08 (2026-11-06)

The founder ruled on every decision this audit raised. The rulings are also recorded in `../reference/MIGRATION_AUTHORITY.md` (authority rank 2), which is where later work orders read them.

| ID | Decision | Final ruling | Implemented in | Consequences |
| --- | --- | --- | --- | --- |
| D-01 | `/` vs `/en` | **Adopt `/` as the canonical English URL.** Locale prefix only when needed, e.g. `/am` once Amharic launches. | **Before WEB-MIG-003** | `localePrefix: 'as-needed'`; `/en` redirects to `/`; canonical, hreflang, sitemap, `check:routes` and the route-dependent specs change together in one change |
| D-02 | Account deletion slug | **Adopt `/account-deletion`**, with a permanent compatibility redirect from `/delete-account`. | WEB-MIG-006 | `ROUTES.deleteAccount` path, `legalNav`, `ROUTE_NAMESPACES`, tests; permanent redirect for the old path |
| D-03 | Standalone Waitlist | **Adopt `/waitlist`.** | WEB-MIG-004 | New route; `WAITLIST_HREF` and every waitlist CTA point at it; production form and action reused |
| D-04 | Press page | **Defer.** No fake or empty Press page. Remove the dead Press CTA/link until real approved press content exists. | WEB-MIG-005 (About) | No `/press` route; the prototype's About "Press" card is not reproduced; no Press link in nav or footer |
| D-05 | Waitlist fields | **Require both email and phone. Keep an explicit consent checkbox.** The prototype's optional-phone / no-checkbox behaviour must not be copied. | The WO that builds `/waitlist` (WEB-MIG-004) or a dedicated WO; never WEB-MIG-002, which forbids action changes | `submitWaitlist` gains a required, validated email; phone stays required (it keys the per-phone limit and dedupe); `ConsentField` stays; store record, form and specs change together |
| D-06 | Report Content verification | **Keep anonymous report intake for MVP.** No fake account verification. Use an approved public reason taxonomy; reporting itself does not imply enforcement. | WEB-MIG-006 | No verification step; the reason becomes a required enum once the public list is confirmed; copy states that a report does not by itself mean action will be taken |
| D-07 | Theme Lab | **Do not port it.** | — | No Theme Lab code, flag, persistence or test in production |
| D-08 | Availability indexing | **`noindex` initially.** Index only after market-availability content becomes an approved public acquisition page. | WEB-MIG-005 | `availability` gets an `INDEX_POLICY` entry; excluded from the sitemap |

The D-06 taxonomy was settled by founder ruling **F-06** (below): content type *Product / Scene / Seller Profile / Review / Other*; reason *Prohibited product / Misleading or false information / Counterfeit goods / Hate speech or harassment / Spam / Other policy violation*. Storage stays extensible; implementation belongs to WEB-MIG-006.

**Additional founder rulings F-01…F-06 (2026-11-06)**, recorded in `../reference/MIGRATION_AUTHORITY.md`: F-01 no "Adulis never holds funds" or other custody/settlement claims; F-02 no invented retention period such as "7 years"; F-03 no response-time SLA such as "within 2 business days"; F-04 no absolute "We will not share your details with third parties"; F-05 no generic "Verified Seller(s)/Storefront(s)" (verified only for a specific verified event such as Verified Handoff or Verified Review); F-06 the Report Content taxonomy above.

### 18.3 Resolved by precedence and recorded for transparency

- **Pricing content.** WEB-02 §22 says `/pricing` renders "Coming Soon and nothing else"; the prototype adds a Seller-tools section. The prototype (rank 3) wins. The phrase "no hidden fees, no invented tiers, and no asterisks" is flagged for founder review as a possible soft guarantee.
- **Primary navigation.** WEB-02 §22 suggests Availability, Ethiopia, Help and Language in the header; the prototype's six items win. Help stays reachable from the footer. The production language switcher stays, gated by `AM_ENABLED`.
- **Legal text.** The prototype labels its legal copy "Prototype draft — not final legal text", so it is not approved behaviour. Production's UNDECIDED pattern stays.
- **Seller Console link.** The prototype has none. The work order (WEB-MIG-002 §2: "Seller Console outbound link where required") and production's allowlisted `sellerConsoleLink` keep it.

### 18.4 Genuine unresolved contradictions (reported, not resolved)

All four items are now settled by founder rulings. The original analysis is kept below for the record; numbering is kept stable because the matrix cites these items.

1. ~~**Waitlist data contract.**~~ **Resolved by founder ruling D-05** (email and phone both required; explicit consent checkbox kept).
2. **Resolved by F-01.** ~~**"Adulis never holds funds."**~~ The prototype (rank 3) states it on Home, How It Works and Trust & Safety. The Knowledge Base (rank 5) says the site "must not claim escrow, guaranteed buyer safety, fund custody or settlement behavior that has not been legally and technically finalized", and records provider-managed settlement as a conditional target. The authority file also says the site communicates "only approved commercial facts". Whether this sentence is an approved fact is not established.
3. **Resolved by F-02, F-03 and F-04.** ~~**Prototype factual commitments.**~~ The prototype shows "retained for 7 years for regulatory compliance" on the Account Deletion explain step, "We'll reply… within 2 business days" on Contact, and "We will not share your details with third parties" on the waitlist. PRV-01 §20/§71 says retention durations are LEGAL REVIEW REQUIRED, and no source approves the reply time or the sharing statement. Precedence ranks the prototype above PRV-01, but these read as unapproved commitments under the authority file's "no unsupported guarantees" rule. They should not be published until confirmed.
4. **Resolved by F-05.** ~~**"Verified" wording.**~~ The prototype says "Verified Storefronts", "verified sellers" and "verified Trust level". The Knowledge Base (§53) limits verification to phone/Account control, social-account control and business evidence, and forbids implying identity verification. The words may be acceptable in context, but that judgement belongs to the founder.

### 18.5 Inter-document tension recorded for later integration work (not blocking the migration)

- Account-deletion API shape: WEB-02 §39 (`/v1/me/account-deletion/start|verify|confirm|status`) vs PRV-01 §57 (`/v1/privacy/deletion-requests` … `/confirm`, `/cancel`). Production's client targets a third, provisional shape behind `DELETION_API_URL`. The flow is gated off, so this does not affect WEB-MIG work. It must be settled with the Platform owner before `DELETION_FLOW_ENABLED` can be certified.
- Hosting: README (Cloudflare Pages + Workers) vs DEPLOY-01 §3/§11 (Render compute behind Cloudflare) vs ARCH-PLATFORM App B/F ("Cloudflare edge/web"). Nothing is deployed; decide at WEB-MIG-007 or in a deployment work order.
- Initial service area: ARCH-PLATFORM ("starting with Addis Ababa") vs MKT-01 §6 ("may be"). Public copy should not state Addis Ababa as a definite service area.
- Website analytics: WEB-02 §44–47 defines a Website event envelope; ANL-01 defines no Website surface; production uses a closed 9-event list from historical ADU-WEB-01. No new events during the migration.
- Retention: production hard-codes 12 months; PRV-01 and WEB-02 forbid unapproved durations in code. Needs a Privacy/Legal value before real intake.

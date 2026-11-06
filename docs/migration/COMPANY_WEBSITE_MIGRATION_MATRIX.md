# Company Website Migration Matrix

Work order: **WEB-MIG-001**. This matrix turns [`COMPANY_WEBSITE_REPOSITORY_AUDIT.md`](./COMPANY_WEBSITE_REPOSITORY_AUDIT.md) into per-file and per-page actions for the remaining WEB-MIG work orders. Section references such as "audit §14" point into that document.

| Item | Value |
| --- | --- |
| Production baseline | `main` = `cfbd33828ce238c29299a74783fd7ed5ae14efaa` |
| Prototype reference | `AdulisCommercePlatformPrototype @ f448d06b90f6cdafac0dcd48f9e70cfd2ce81d0e` (read-only) |
| Target | Prototype-quality experience on production-quality Next.js architecture (authority file, "Architecture boundary") |

## Classifications

| Class | Meaning |
| --- | --- |
| **KEEP** | Retain behaviour and code. Restyling through shared tokens and classes is allowed; semantics are not changed. |
| **MIGRATE** | Retain the production behaviour contract; rebuild presentation and/or copy to the prototype. |
| **REPLACE** | Remove the current implementation and build a production equivalent of the prototype. |
| **DELETE** | Remove once its replacement lands. |
| **NEW** | Does not exist in production; build it. |
| **REVIEW** | Needs a founder, legal or technical decision before acting (decisions D-01…D-08 and audit §18.4). |

## Proposed work-order mapping

Inferred from the reading lists in `../reference/REFERENCE_INDEX.md`. Each work order's own text governs where it differs.

| Work order | Scope assumed by this matrix |
| --- | --- |
| WEB-MIG-002 | Tokens, fonts, global shell (Header, mobile menu, Footer), shared primitives, photo slot, form styling, focus, responsive foundations, 404 styling, navigation registry update |
| WEB-MIG-003 | Home |
| WEB-MIG-004 | How It Works, For Sellers, For Buyers, Waitlist (new), Pricing (new) |
| WEB-MIG-005 | Trust & Safety, Availability (new), Ethiopia (new), About, Help |
| WEB-MIG-006 | Contact, Report Content, Account Deletion, Terms, Privacy, Seller Terms, Refunds & Disputes, Prohibited Products |
| WEB-MIG-007 | Integrated checkpoint: SEO (descriptions, Open Graph, structured data), sitemap, CSP review, deployment, observability, analytics, media, full regression |

---

## 1. File / area matrix

### 1.1 Configuration, build and CI

| File/Area | Current Responsibility | Classification | Target State | Reason |
| --- | --- | --- | --- | --- |
| `package.json` | Scripts, four runtime dependencies, pinned dev tools | KEEP | Unchanged. Prototype fonts come through `next/font`, so no new dependency is needed. | Minimal-dependency rule (WEB-02 §87); no prototype dependency is required |
| `next.config.mjs` | next-intl plugin, static security headers, 64 KB server-action cap | KEEP | Unchanged | Audited security controls (audit §3.4) |
| `tsconfig.json`, `.eslintrc.json`, `postcss.config.mjs` | Strict TS, Next lint, Tailwind/autoprefixer | KEEP | Unchanged | Production infrastructure (audit §14) |
| `tailwind.config.ts` | Maps `:root` colour variables, legacy aliases, 10-step type scale, container widths | MIGRATE | Semantic names (page background, surface, elevated surface, text primary/secondary/muted, border, border-control, brand primary/secondary, accent, hover, selected, focus; success/warning/error/info kept separate), prototype type hierarchy as a named scale, prototype max-widths; legacy aliases removed (WEB-MIG-002) | Prototype visual authority; WEB-MIG-002 §1 forbids scattered hex |
| `src/app/globals.css` | `:root` tokens (paper/ink/gold) and component classes | MIGRATE | Prototype Baseline Light values behind semantic variables; component classes rebuilt to prototype buttons, cards and fields; **control borders ≥3:1 and a focus ring visible on brand surfaces** (fixing prototype contrast failures, audit §11.8); keep `:focus-visible`, reduced motion, `.skip-link`, `.placeholder-flag`, EXAMPLE badge (WEB-MIG-002) | Prototype look with the production accessibility standard |
| `.env.example` | Environment documentation | REVIEW | Bring in line with `check-env.mjs` (B-02) in a separate change | Stale; not migration work |
| `.github/workflows/ci.yml` | verify → qa (chromium, webkit) → snapshots | KEEP | Unchanged | Production gate |
| `scripts/check-copy.mjs` | 11 copy/structure invariants | KEEP + extend | Add invariants: no public "Product Post"/"Shoppable Post"; no `0.5%`; no commission or surcharge figures; no free-period or plan claims; no Seller payment-confirmation claim; no Government-ID claim; four Trust labels wherever labels are enumerated; no inline `style` in SSR source; no Theme Lab import in production code (land before WEB-MIG-003) | Prevents reintroducing drift (audit §10, R-07) |
| `scripts/check-font.mjs` | Display-face and subset guard | KEEP (update) | Expected faces and weights updated to the self-hosted prototype faces in WEB-MIG-002 | Font budget stays enforced |
| `scripts/check-assets.mjs` | Ties raster assets / `next/image` to the `sharp` advisory | KEEP | Unchanged. Photography stays placeholder-only until `sharp` ≥ 0.35.5 lands separately | R-08 |
| `scripts/check-env.mjs`, `check-i18n.mjs`, `check-encoding.mjs`, `check-routes.mjs`, `build-ethiopic-subset.mjs`, `make-pseudo-locale.mjs`, `build-translation-pack.mjs`, `snapshot-container.mjs`, `lib/woff2-cmap.mjs` | Build gates, smoke test, font subset, pseudo-locale, translation pack, snapshots | KEEP | Unchanged; `check:routes` picks up new `ROUTES` automatically | Production infrastructure |
| `README.md` | Operating guide, routes, invariants | KEEP (update as WOs land) | Routes and stack sections updated by the WO that changes them | Documentation accuracy |
| `SECURITY.md` | Advisory acceptances, CSP decision record | KEEP | Unchanged | Security record |
| `docs/*` (existing reports, rehearsal, amendments, translation pack) | Build history and decisions | KEEP | Unchanged (historical, rank 8) | History; do not rewrite |

### 1.2 Routing, i18n and copy

| File/Area | Current Responsibility | Classification | Target State | Reason |
| --- | --- | --- | --- | --- |
| `src/middleware.ts` | Per-request CSP nonce, `x-pathname`, locale middleware | KEEP | Unchanged during visual work. CSP hardening against CSP-01 App A §63 is reviewed at WEB-MIG-007 (W-05) | Audited control |
| `src/i18n/config.ts` | Locales, `AM_ENABLED` | KEEP | Unchanged; `AM_ENABLED` stays false until human-reviewed Amharic exists | MKT-01 §72 |
| `src/i18n/routing.ts` | `localePrefix: 'always'`, typed navigation | KEEP / REVIEW | `localePrefix: 'as-needed'` if D-01 is approved | WEB-02 §8/§49, MKT-01 §66/§125 |
| `src/i18n/request.ts` | Catalogue merge, pseudo-locale, timezone | KEEP | Unchanged | Production infrastructure |
| `src/messages/en.json` | All public copy | MIGRATE | Rewritten page by page to the prototype copy, filtered through the authority rules and audit §18.4; one namespace per page; a real `description` per page; removal of every OUTDATED/PROHIBITED key in audit §10 | Content drift |
| `src/messages/am.json` | Provisional, one key | KEEP | Unchanged; never machine-translated | MKT-01 §72, §75 |
| `src/messages/README.md` | Translator rules | KEEP | Unchanged | — |

### 1.3 Library modules

| File/Area | Current Responsibility | Classification | Target State | Reason |
| --- | --- | --- | --- | --- |
| `src/lib/routes.ts` | `ROUTES`, `INDEX_POLICY`, `WAITLIST_HREF`, `SELLER_CONSOLE_URL` | KEEP + extend | Add `pricing`, `availability`, `ethiopia` (`/markets/ethiopia`), `waitlist`; `press` only if D-04; rename `deleteAccount` → `/account-deletion` if D-02; `INDEX_POLICY` entry for `availability` (D-08); `WAITLIST_HREF` → `/waitlist` (D-03) | Route registry is protected infrastructure (audit §14 #16) |
| `src/lib/nav.ts` | `primaryNav`, `legalNav`, `LOCALE_LABELS`, `sellerConsoleLink` | MIGRATE | `primaryNav` = How It Works, For Sellers, For Buyers, Trust & Safety, Availability, About. Footer groups follow the prototype (Platform / Company / Legal) **plus** Trust & Safety and Refunds & Disputes. `sellerConsoleLink` and `LOCALE_LABELS` unchanged (WEB-MIG-002) | Prototype IA; legal reachability (WEB-MIG-002 §3) |
| `src/lib/metadata.ts` | Title, robots, canonical, hreflang | KEEP + extend | Per-page `description`; Open Graph / Twitter fields; `alternates` follow D-01 | SEO gaps W-02, W-03 |
| `src/lib/flags.ts` | `DELETION_FLOW_ENABLED` | KEEP | Unchanged. If Theme Lab is ever ported, its flag lives here, server-side, environment-based | DEPLOY §125 |
| `src/lib/fonts.ts` | Inter, Instrument Sans, Ethiopic subset, Noto Sans Ethiopic | MIGRATE | Self-hosted prototype faces (Fraunces display, Outfit body, DM Mono labels) via `next/font`, minimum weights; Ethiopic subset and Amharic-only full face unchanged; Latin-first stacks (WEB-MIG-002) | Prototype typography; production font architecture is stronger (WEB-MIG-002 §5) |
| `src/lib/analytics/*` | Closed event list, allowlist, sinks | KEEP | Unchanged; no new events during the migration | ANL-01 has no Website events (audit §13) |
| `src/lib/ratelimit`, `src/lib/validation`, `src/lib/hash.ts`, `src/lib/spreadsheet-safe.ts` | Abuse controls, validation, references, phone key, formula escaping | KEEP | Unchanged | Protected infrastructure |
| `src/lib/store/*` | Webhook/memory stores, 12-month `purgeAfter` | KEEP / REVIEW | Unchanged; retention value needs Privacy/Legal approval (W-08) | PRV-01 §20/§22 |
| `src/lib/deletion/*` | Deletion client and state | KEEP | Unchanged | Gated flow |

### 1.4 Server actions

| File/Area | Current Responsibility | Classification | Target State | Reason |
| --- | --- | --- | --- | --- |
| `src/actions/waitlist.ts` | Waitlist validation, controls, delivery | KEEP / REVIEW | Unchanged until D-05 is decided; then a dedicated work order reconciles fields with tests | Protected; WEB-MIG-002 §8 forbids changes |
| `src/actions/contact.ts` | Contact intake | KEEP | Unchanged | Protected |
| `src/actions/report.ts` | Report intake | KEEP / REVIEW | Unchanged; enum validation added only if D-06 approves a taxonomy | Protected |
| `src/actions/deletion.ts` | Deletion state machine | KEEP | Unchanged | Protected; HIGH-risk area (DEPLOY §175) |

### 1.5 App shell and special routes

| File/Area | Current Responsibility | Classification | Target State | Reason |
| --- | --- | --- | --- | --- |
| `src/app/layout.tsx` | Pass-through root layout | KEEP | Unchanged | Required by the global 404 |
| `src/app/[locale]/layout.tsx` | Document, fonts, skip link, Header/Main/Footer, client namespaces, `force-dynamic` | MIGRATE | Same structure; new Header/Footer; new font variables; `ROUTE_NAMESPACES` gains `/waitlist`; `force-dynamic` stays | Shell rebuild without architecture change |
| `src/app/[locale]/not-found.tsx` | Localised 404 | MIGRATE | Prototype styling + helpful links (Home, How It Works, Help, Availability, Ethiopia) (WEB-MIG-002) | WEB-02 §97 |
| `src/app/not-found.tsx` | Unlocalised fallback (inline styles) | KEEP / REVIEW | Optionally move styles out of `style` attributes (W-17) | CSP consistency |
| `src/app/[locale]/[...rest]/page.tsx` | Catch-all → 404 | KEEP | Unchanged | Correct status codes |
| `src/app/sitemap.ts`, `src/app/robots.ts` | Crawl control | KEEP | Unchanged; new routes flow in through `ROUTES`/`INDEX_POLICY` | Protected |
| `src/app/api/events/route.ts` | Analytics beacon | KEEP | Unchanged | Protected |

### 1.6 Components

| File/Area | Current Responsibility | Classification | Target State | Reason |
| --- | --- | --- | --- | --- |
| `src/components/Header.tsx` | Desktop nav, Seller Console link, CTA, mobile disclosure panel | MIGRATE | Prototype header (sticky, translucent surface, active pill, "Join Seller Waitlist" CTA) with production behaviour: `aria-current`, labelled nav, Escape, close on navigation, scroll lock, `aria-controls`, 44px targets, a hamburger at narrow desktop widths instead of the prototype's horizontal-scroll nav (WEB-MIG-002) | Prototype look, production behaviour (audit §12) |
| `src/components/Footer.tsx` | Primary + legal rows, address, copyright | MIGRATE | Prototype brand column and Platform/Company/Legal groups, responsive (not fixed 5 columns); every `legalNav` item reachable on every page; company address kept under REVIEW (WEB-MIG-002) | WEB-MIG-002 §3 |
| `src/components/LanguageSwitcher.tsx` | Locale links | KEEP | Restyled only | Production i18n |
| `src/components/ui.tsx` → `InfoCard`, `SectionTitle` | Card and heading primitives | MIGRATE | Become the prototype card (raised/bordered) and section heading with eyebrow label (WEB-MIG-002) | Shared primitives |
| `src/components/ui.tsx` → `DisplayHeading` | Gold accent headline | REPLACE | Prototype display heading (Fraunces 600); no gold | Old doctrine retired |
| `src/components/ui.tsx` → `MediaPlaceholder` | Lo-fi photo box | REPLACE | `PhotoSlot` primitive: fixed aspect ratio or explicit height (no CLS), tonal background from tokens, visible photography brief, `role="img"` + label when meaningful, `aria-hidden` when decorative, no inline styles, ready to take an approved image later (WEB-MIG-002) | Photography-ready media (authority, WEB-02 §69) |
| `src/components/ui.tsx` → `DoorBand`, `Sequence` | Cross-audience band; unused step flow | REVIEW / DELETE | `DoorBand` kept only where a prototype page has an equivalent link; `Sequence` deleted when For Buyers is rebuilt | W-18 |
| `src/components/ui.tsx` → `UndecidedFlag` | Undecided-content marker | KEEP | Restyled; still unmistakable | Truthfulness control |
| `src/components/DoorLink.tsx` | Tracked link | KEEP | Unchanged | Analytics hook |
| `src/components/ShopPreview.tsx` | Bio-link EXAMPLE panel | DELETE | Removed when WEB-MIG-003 lands the Product/Scene hero | Superseded narrative |
| `src/components/form.tsx` | Field, ErrorSummary, Honeypot, ConsentField, SubmitButton | KEEP | Restyled to prototype inputs (radius 10, 1.5px border at ≥3:1, error colour) without changing semantics (WEB-MIG-002) | WEB-MIG-002 §8 |
| `src/components/WaitlistForm.tsx`, `ContactForm.tsx`, `ReportForm.tsx` | Form UIs on server actions | KEEP | Restyled; field sets unchanged until D-05/D-06 | Protected forms |
| `src/components/DeleteAccountFlow.tsx` | Gated deletion UI | KEEP | Restyled; explanatory state follows the prototype "explain" step without the unapproved "7 years" claim | Gate stays |
| `src/components/LegalSections.tsx` | Legal section map | KEEP | Restyled to the prototype legal layout (pill, H1, H2 sections, max-width 740); UNDECIDED bodies stay | Fail-closed legal content |
| **NEW** shared primitives | — | NEW | `Container`, `Section`, `SectionLabel` (mono eyebrow), `Heading`, `CtaGroup`, `Button` (primary, secondary/outline, inverted, text action), `Card`, `PhotoSlot`, `Alert` (success/warning/error/info), `Pill`/`Badge`, `ExampleBadge`, form control styles for input, select, textarea and checkbox (WEB-MIG-002) | WEB-MIG-002 §4 |
| **NEW** `Logo` | — | NEW | SVG wordmark component (prototype `AdulisLogo`, no circular import, no raster) | Shell |
| Theme Lab | — (prototype only) | REVIEW | Not ported (D-07) | Authority file, "Theme Lab" |

### 1.7 Tests

| File/Area | Current Responsibility | Classification | Target State | Reason |
| --- | --- | --- | --- | --- |
| `headers-fonts`, `nojs`, `keyboard`, `discovery`, `metadata`, `analytics`, `deletion`, `deletion-journey`, `enquiries`, `waitlist`, `console`, `messages`, `pseudo`, `am-rehearsal` specs | Security, no-JS, keyboard, SEO, analytics, forms, deletion, i18n | KEEP | Green at every WO; font expectations updated in WEB-MIG-002; route lists extended as routes land | Behavioural guarantees (audit §9) |
| `a11y`, `layout`, `menu`, `design`, `focus-pixels`, `placeholder-appearance`, `measure-lengths`, `icons` specs | axe, 360px layout, menu, design truthfulness, focus pixels, G11 snapshots, lengths, icons | UPDATE AFTER MIGRATION | Updated in the WO that changes the thing they measure; principles kept | Redesign changes selectors and visuals, not the requirements |
| `prow-slot.spec.ts` | Prow mask on the ink surface | OBSOLETE ONLY IF PROVEN | Removed only if WEB-MIG-002 removes the prow motif, with that recorded | Old doctrine |
| **NEW** tests | — | NEW | Responsive overflow at 360/390/430/768/1024/1280/1440 (WEB-MIG-002); new routes in `check:routes`, `discovery`, `a11y`, `layout` (WEB-MIG-004/005); Pricing shows no price, fee or plan content (WEB-MIG-004); photo-slot accessibility (WEB-MIG-002); redirects for D-01/D-02 if adopted; Theme Lab absent in production (if ever ported) | Audit §9 |

---

## 2. Page matrix

| Route/Page | Production State | Prototype Target | Action | Risks |
| --- | --- | --- | --- | --- |
| Home `/` (`/en` today) | Bio-link narrative, gold display heading, ink EXAMPLE panel, controlled-beta cohort | Hero "Discover products through the way people actually like to see them used." with Scene photo slot; Problem; Adulis Model; For You; Storefronts; Trust; Nine steps; Availability; CTA band | **MIGRATE**: rebuild to prototype sections with shared primitives (WEB-MIG-003). Demo product card and illustrations carry EXAMPLE badges. Delete `ShopPreview`. New title, description and social metadata | Unlabelled demo Sellers; "Adulis never holds funds" (audit §18.4 #2); "Verified Storefronts" (#4); 9-step strip clipping; hero H1 squeeze at 641–1000px |
| How It Works `/how-it-works` | 5 steps around bank transfer and receipt; EXAMPLE shops; money card | Nine accountable steps with callouts; hero photo slot | **MIGRATE** (WEB-MIG-004). Replace payment and reservation copy entirely; one responsive step list (no separate 4-step mobile version) | Step count consistency (prototype has 9, 4 and Home variants); QR primary / OTP fallback wording must match KB §34 |
| For Sellers `/for-sellers` | Problems, benefits, payment-verifier card, free-period sequence, embedded waitlist | Hero + 9 Seller tools + CTA band "Seller Console is waiting for you." | **MIGRATE** (WEB-MIG-004). Remove free periods, plans, blue tick and Seller payment verification; waitlist CTAs go to `/waitlist` | "Orders are rejected automatically when stock hits zero" and "24/7" chatbot claims need checking against current designs |
| For Buyers `/for-buyers` | Steps incl. reserve and pay Seller; disabled app badges; limits | Hero + 9 Buyer features; no CTA | **MIGRATE** (WEB-MIG-004). Add one CTA (prototype has none; production has the seller door) and fix the literal `\'` bug | Do not claim app availability; keep "not yet available" truthfulness |
| Waitlist `/waitlist` | Not a route; form at `/for-sellers#waitlist` | "Apply to sell on Adulis." page with form and success state | **NEW** route (WEB-MIG-004) with prototype layout and the **production** `WaitlistForm` + `submitWaitlist`; success state shows the production reference; `/for-sellers#waitlist` links updated | D-05 field set; consent checkbox must stay; noindex the success state (WEB-02 §51) |
| Pricing `/pricing` | Not present | "Pricing is coming soon." + Seller tools | **NEW** (WEB-MIG-004): prototype content, no figures; footer link only | "no hidden fees" phrase review; never add tiers, prices or free periods (WEB-INV-03) |
| Trust & Safety `/trust-and-safety` | Government ID, 3-level ladder with caps, published facts, reviews, claims, moderation | Long-form: Seller Admission (no physical shop, no Government ID), Trust Ladder, Gateway Payments, Handoff Evidence, Verified Reviews, Claims | **MIGRATE** (WEB-MIG-005). Keep a link to Report Content and Refunds & Disputes (prototype lacks them). If labels are enumerated, all four | Losing moderation/report reachability; "verified" wording |
| Availability `/availability` | Not present | "Starting in Ethiopia. Honest about where." + In Development / Architecture Ready cards + warning | **NEW** (WEB-MIG-005); `noindex` until D-08 | Do not invent country support (WEB-02 §8) |
| Ethiopia `/markets/ethiopia` | Not present | "Adulis in Ethiopia" + Focus City, Payment Infrastructure ("No specific provider is announced here."), Courier Network, Language | **NEW** (WEB-MIG-005); reachable from Availability and the footer | Chapa named only once enabled (WEB-02 §10); "Adulis supports Amharic" vs `AM_ENABLED = false` |
| About `/about` | Origin, founder placeholders, UNDECIDED registration/contact | Mission, Adulis-port origin, Help/Contact/Press cards | **MIGRATE** (WEB-MIG-005). Prototype structure; Press card → Contact until D-04 | Removing founder cards is a content decision the prototype implies |
| Press `/press` | Not present | Dead card only | **REVIEW** (D-04); not built without approved content | Announcing unsupported facts (WEB-02 §15) |
| Help `/help` | 11 answered FAQs in `<details>` | Topic grid (4 groups), search box, question titles | **MIGRATE** (WEB-MIG-005). Prototype grouping and look with production `<details>` answers rewritten for current facts; no search until it works | Answers must reflect Scene publication, four Trust labels and Government-ID rules (WEB-02 §16) |
| Contact `/contact` | Routes UNDECIDED, location, form, privacy note; noindex | "Get in touch" form; success "Message received." | **MIGRATE** (WEB-MIG-006). Production `ContactForm`/action, prototype layout | Do not publish "within 2 business days" (audit §18.4 #3) |
| Terms / Privacy / Seller Terms `/terms`, `/privacy`, `/seller-terms` | Section maps, UNDECIDED bodies, noindex | Legal layout with draft text | **MIGRATE** (WEB-MIG-006): prototype layout only; bodies stay UNDECIDED until approved | Publishing prototype draft text ("7 years", "We do not sell personal data") |
| Refunds & Disputes `/refunds-and-disputes` | Section map, UNDECIDED, noindex | **Not in prototype** | **KEEP** (WEB-MIG-006), styled like the other legal pages; footer link kept | Dropping it because the prototype lacks it |
| Prohibited Products `/prohibited-products` | 12 categories with definitions; indexable | Legal-style page (4 draft sections) | **MIGRATE** (WEB-MIG-006). Prototype legal layout, production category content after review; label "Prohibited Products" (not "Items") | Content review against current Moderation/Catalogue rules |
| Report Content `/report-content` | Anonymous form, reason UNDECIDED, moderation cards; noindex | Content type + reason form, verification step, success "Report submitted." | **MIGRATE** (WEB-MIG-006). Production `ReportForm`/action; no fake verification; taxonomy per D-06 | Reporter identity stays out of analytics (PRV §44) |
| Account Deletion `/delete-account` (`/account-deletion` per D-02) | Explanatory content + manual route; flow gated off; unlisted | Six-step flow (explain → phone → code → preview → confirm → result) | **MIGRATE** (WEB-MIG-006). Prototype styling for the explanatory state and step layout; gate unchanged; slug per D-02 with redirect | No "7 years"; never confirm account existence; HIGH-risk change rules (DEPLOY §175) |
| 404 (localised) | Code, heading, Home button | None in prototype | **MIGRATE** (WEB-MIG-002): prototype styling + helpful links | Must keep the real 404 status |
| 404 (global) | Inline-styled English fallback | — | **KEEP** (REVIEW W-17) | — |
| Mobile-only prototype pages | — | `MobileHomePage`, `MobileHowItWorks`, `MobileForSellers`, `MobileWaitlist`, `MobileTrust` | **DELETE** concept: each route is one responsive page with the same content at every width | Content divergence between widths |

---

## 3. Decisions required before or during the owning work order

Full reasoning in audit §18.

| ID | Decision | Needed by | Recommendation |
| --- | --- | --- | --- |
| D-01 | `/` as the unprefixed English canonical (`localePrefix: 'as-needed'`) | Before WEB-MIG-003 (so pages are built on final URLs), otherwise WEB-MIG-007 | Adopt |
| D-02 | `/account-deletion` slug with redirect from `/delete-account` | WEB-MIG-006 | Adopt |
| D-03 | Standalone `/waitlist` | WEB-MIG-004 | Adopt |
| D-04 | Press page | WEB-MIG-005 | Defer until approved content exists |
| D-05 | Waitlist field set and consent control | Dedicated WO after WEB-MIG-004 | Founder/legal decision (audit §18.4 #1) |
| D-06 | Report verification and public taxonomy | WEB-MIG-006 | Keep anonymous intake; confirm taxonomy |
| D-07 | Theme Lab | WEB-MIG-002 | Do not port |
| D-08 | `/availability` indexing | WEB-MIG-005 | `noindex` until approved |
| — | Prototype claims: "Adulis never holds funds", "7 years", "2 business days", "We will not share your details with third parties", "verified" wording | Before the page carrying each claim ships | Confirm or drop (audit §18.4 #2–#4) |

## 4. Cross-references

- **Infrastructure that must not be lost:** audit §14 (17 confirmed assets plus prebuild gates, font pipeline, truthfulness controls).
- **Prototype shortcuts not to copy:** audit §15 (19 patterns with production replacements).
- **Content drift to remove:** audit §10.
- **Constraints from the reference designs:** audit §13.

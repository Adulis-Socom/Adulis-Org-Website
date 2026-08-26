# Adulis — public website

Pre-launch marketing site for **Adulis**, a commerce layer for sellers whose
audience already lives on TikTok and Instagram. A seller gets an ordered
storefront, a chatbot for repetitive buyer questions, reservations that hold
stock, verified identity, and reviews backed by evidence that a handoff
physically happened.

Sellers pay a monthly subscription. **Adulis takes no commission and never
touches buyer money** — buyers pay sellers directly by bank transfer, and the
seller confirms it against their own bank account.

The company is pre-launch and in controlled beta. The apps have not shipped.

The site has two audiences and one commercial goal: **recruit sellers to the
waitlist** (the only conversion that exists today), and explain Adulis to buyers
(a path that currently ends in "coming soon"). It is seller-weighted with one
clearly marked door to the buyer side — not a 50/50 split, not two parallel
sites.

> ⚠ **This repository is private and must stay private.** IP protection
> registration is not complete. Do not make it public, and do not deploy to any
> publicly reachable URL — put a Cloudflare Pages project behind Cloudflare
> Access before any preview build exists, because preview URLs are real,
> crawlable URLs.

---

## Running it

```bash
npm install
npm run dev        # http://localhost:3000 → redirects to /en
```

```bash
npm run build      # production build
npm run typecheck  # tsc --noEmit
npm run lint       # next lint
npm run check:i18n # partial-array guard — also runs automatically before build
```

Copy `.env.example` to `.env.local` before deploying anywhere real. Leaving
`NEXT_PUBLIC_SITE_URL` unset is deliberate: the layout emits
`robots: noindex, nofollow` whenever it is missing.

---

## Stack

| Concern | Choice | Why |
|---|---|---|
| Framework | Next.js 15, App Router, TypeScript | Server-rendered by default; first paint on a low-end Android over a slow connection is the binding constraint |
| Hosting | Cloudflare Pages + Workers *(not yet configured)* | Zero egress, edge PoPs are the closest realistic answer to "no cloud region operates in Ethiopia", one vendor alongside the R2 decision |
| i18n | `next-intl`, route-based `/en` and `/am` | Shared links land in the right language, both trees index, nothing depends on JavaScript |
| Styling | Tailwind, tokens in `tailwind.config.ts` | Tokens come from the approved v4.1 wireframes and are the single source |
| Fonts | Inter + Noto Sans Ethiopic | See below — this is load-bearing |
| Analytics | None. Self-hosted only, when it exists | The site collects personal data from prospective sellers; adding a third party creates a processor relationship nobody has assessed |

### The font stack is load-bearing

```
font-family: var(--font-inter, system-ui), var(--font-ethiopic-switcher, Nyala),
             var(--font-ethiopic, Nyala), system-ui, sans-serif;
```

An earlier wireframe round applied an **Ethiopic-only** family. It has no Latin
or numeral glyphs, so on every Amharic page `ADULIS`, `TikTok`, `Instagram` and
**every digit** rendered as tofu boxes — including every published figure the
product exists to show. Because the Ge'ez itself looked correct, a reviewer who
does not read Amharic would not have noticed. Latin must come first and Ethiopic
must be the fallback.

Each face declares its own `unicode-range`, so an Ethiopic file is fetched only
when Ge'ez glyphs actually appear.

**There are two Ethiopic faces, not one.** The full face is **198,028 bytes**,
and the only Ge'ez on an English page is the language switcher's own
four-character label:

| Face | Size | Where |
|---|---|---|
| Switcher subset | **2,648 B** | Global. Covers exactly `አማርኛ` — U+121B, U+122D, U+129B, U+12A0 |
| Full Ethiopic | 198,028 B | Applied only when `locale === 'am'` |

Measured on `/en` with the switcher visible: **246,460 font bytes before the
split, 51,080 after.**

The subset is **generated from the labels in [src/lib/nav.ts](src/lib/nav.ts)** by
`npm run check:font`, never from a hand-written codepoint list, and the build
fails if the two drift. A hand-written list is a silent failure — the glyphs it
misses render as boxes and nothing errors. The ruling that commissioned this gave
`U+123B` for `ኛ`; the correct value is `U+129B`, and `U+123B` is `ሻ`.

A useful side effect: on an English route only those four glyphs can resolve, so
any other Ge'ez appearing there renders as a box. That is the signal you want.

⚠ Two ways this broke, both invisible in review — see
[`docs/engineering-notes.md`](docs/engineering-notes.md) before touching it.

---

## Routes

Every route is locale-prefixed: `/en/...` and `/am/...`. All sixteen resolve in
both locales.

### Built (Tier 1)

| Wireframe | Route | Notes |
|---|---|---|
| W01 | `/` | Seller hero, three value cards, buyer door, cohort block |
| W02 | `/how-it-works` | Five steps, three example shop previews, finding-the-seller-again, money boundary |
| W03 | `/for-sellers` | Full pitch page, waitlist form at `#waitlist` |
| W23 | `/for-buyers` | Buyer page, store badges disabled, "what Adulis does not do" |
| W04 | `/trust-and-safety` | Boundaries, verification, ladder, published stats, claims |
| W05 | `/prohibited-products` | Twelve categories, one statement below |
| W17 | `/about` | Origin story, three founders, company status |
| W22 | `/delete-account` | Five states plus the blocked branch |
| W20 | `[locale]/not-found` | Localised 404 |

### Stubbed (Tier 2 — next)

`/help` · `/contact` · `/terms` · `/privacy` · `/seller-terms` ·
`/refunds-and-disputes` · `/report-content`

These render a visibly-unbuilt placeholder rather than a 404. A 404 behind
"Privacy", "Report content" or "Delete my account" is a legal and app-store
problem, not a cosmetic one.

---

## Invariants — do not break these

These come from the product documents, not from taste. Each one costs money or
credibility if ignored.

1. **The only sign-in affordance is one outbound link to the seller console.**
   This site has no same-origin sign-in route, no session, no cookie-based
   identity, and no buyer-facing sign-in language. Buyers never sign in on the
   web — no account, no cart, no reserve, no chat, no reviews. `/delete-account`
   proves identity by phone OTP for that request only, issues no session, and
   says so in its own copy.

   The header's **Log in** link is an outbound link to the seller console on a
   different origin, declared once as `sellerConsoleLink` in
   [src/lib/nav.ts](src/lib/nav.ts). It appears on every route, including
   `/delete-account`, because navigation is defined once and read identically by
   the header, the mobile menu and the footer; the no-sign-in rule on that page
   governs the page body, not the global chrome.

   `npm run check:copy` enforces this in three parts: the wording appears nowhere
   but that one declaration and its one catalogue key, no `/login`-shaped route
   exists in the app tree, and the link's `href` resolves to the console origin
   from the environment rather than a literal.

   > ⚠ This reverses ADU-WEB-01 §4.1, per ADU-ARCH-01 v2.0 §9 — the seller
   > console now exists as a real authenticated surface on its own origin. The
   > earlier blanket ban was written when it did not, so a Log in link led
   > nowhere. **ADU-WEB-01 is still at v1.0 and still carries the reversed text
   > as binding.** Until it is written back to v1.1, the specification and this
   > repository disagree, and the check is what runs.
2. **No table scrolls horizontally.** Every table stacks into cards below `md`.
   A sideways-scrolling table is unusable at 360px, and a scrollable region with
   no focusable content fails WCAG 2.1 SC 2.1.1 — it cannot be scrolled by
   keyboard at all. Enforced by `npm run check:copy`.
3. **No pricing anywhere.** Pricing is not public during the controlled beta.
4. **No follower threshold.** No number, no minimum, no guide. There is no
   rejection path on follower count — every applicant is accepted onto the list
   and reviewed. The count is captured as an *input* to the decision the beta
   exists to make.
5. **Never claim Adulis protects buyers.** There is no escrow. Buyer protection
   is the gap that waits on the NBE licence. Never "buyer protection",
   "guaranteed", or "safe purchase".
6. **Never label a seller.** No "scammer", "risky", "unproven". Only counted
   facts from Adulis's own records.
7. **The buyer scans a QR code at handoff.** Never "confirms receipt" — that is
   a weaker, separate tier that does not count toward trust level.
8. **No per-post product link.** TikTok and Instagram do not allow one. The
   seller's Adulis link lives in their bio.
9. **`EXAMPLE` tags mark illustrative seller cards only.** Never the real trust
   ladder — New, Established and Trusted are the actual level names; only the
   thresholds are undecided.
10. **Latin-first font stack.** See above. No element gets an Ethiopic-only
   family.
11. **No fixed heights.** Every container sizes to its content, so Amharic
    expands rather than overflowing.
12. **Submit buttons are always enabled.** A disabled button cannot take
    keyboard focus, so a keyboard user gets no way to trigger validation.
13. **Error summaries are lists of links**, each moving focus to the field it
    names — never a single sentence.
14. **Arrows are real glyphs** — `→` and `↓`, never `>` or `v`.
15. **Do not machine-translate `src/messages/am.json`.** Missing keys fall back to
    English by design. See `src/messages/README.md`.

---

## Amharic is behind a flag

`AM_ENABLED` in [`src/i18n/routing.ts`](src/i18n/routing.ts) is **`false`**, and
it is the single source of truth — never duplicate it into a component, an
environment variable or a page.

`src/messages/am.json` holds no approved translations. The Amharic carried from the
v4.1 wireframes was unreviewed machine output, and invariant 14 forbids
regenerating it. Rather than serve English under an Amharic switcher — a broken
promise on a site whose doctrine is that every claim is one Adulis can stand
behind — the locale is simply not offered yet.

While the flag is false:

- the language switcher is not rendered on any surface
- `/am/*` still resolves, so URLs stay stable and translation can land key by key
- `/am/*` is `noindex` regardless of `NEXT_PUBLIC_SITE_URL`, and only `/en` is
  advertised in `alternates.languages`
- the English fallback works exactly as it will when the catalogue arrives

It may be flipped only when all three hold: `am.json` is human-translated for
every key in `en.json`; Ge'ez layout validation has run against those real
strings; and the Ethiopic micro-subset is implemented (issue #2).

---

## Where the copy comes from

**`src/messages/en.json` is the single source of truth for copy.** It was seeded
once from the final reviewed wireframe set; from that point the wireframes govern
**layout** and the catalogue governs **words**.

Do not take copy from a wireframe again. Copy living in two reviewed artifacts
means every correction needs two edits by two different processes, and they
drift — which is exactly what produced the reconciliation in
[`docs/copy-reconciliation-01.md`](docs/copy-reconciliation-01.md), where only 94
of 295 strings had survived unchanged. That document is historical; its "Gaps and
questions" section is not, and lists five things still needing a decision.

## Traps that have already cost time

Before changing the CSP, the fonts, or anything in the build pipeline, read
[`docs/engineering-notes.md`](docs/engineering-notes.md). Every entry there is a
case where the obvious reading of the evidence was false — a build badge that
reports the opposite of the truth, a CSP that passes every server-side check
while blocking every script, a font fallback that downloads 198 KB through a line
meant to avoid it.

The shortest one, because it decides how you test: **any CSP or font change
re-runs the WebKit suite, not only Chromium.** A directive that Chromium exempts
on localhost failed 74 tests in WebKit and logged nothing that looked like a
header problem.

## Decisions taken during this build

Recorded here because they deviate from the build specification and someone will
otherwise wonder why.

- **Dependency upgrades for security.** The specified pins carried a critical
  advisory set. `next` 15.1.6 → **15.5.23**, `eslint` 9.18.0 → **9.39.5**,
  `eslint-config-next` 15.1.6 → **15.5.23**, `postcss` 8.5.1 → **8.5.26**, all
  within their majors. **`next-intl` 3.26.3 → 4.13.7** is a deliberate major
  migration: the open-redirect advisory has no fix in the v3 line. Every import
  path survived; the only behavioural change adopted is that
  `NextIntlClientProvider` now inherits messages from `i18n/request.ts`. See
  [`SECURITY.md`](SECURITY.md).
- **`.eslintrc.json` added.** Not in the original manifest, but `next lint` with
  no config drops into an interactive prompt, which hangs CI.
- **`src/app/layout.tsx` added** — a pass-through root layout. Next refuses to
  render `src/app/not-found.tsx` without one.
- **`src/app/[locale]/[...rest]/page.tsx` added** — a catch-all calling
  `notFound()`. Without it an unmatched `/en/...` falls through to the
  unlocalised fallback and `[locale]/not-found.tsx` never renders at all.

---

## Before this can go live

- [ ] **Domain.** Blocks the contact email, `NEXT_PUBLIC_SITE_URL`, and later the
      App Links / Universal Links domain association.
- [ ] **Add `preload` back to the HSTS header** in `next.config.mjs`, once the
      domain and its subdomain plan exist. It was removed because it is a
      months-to-reverse commitment that binds every future subdomain to HTTPS,
      and it was being asserted by a site with no domain (security audit 01,
      F-14). `max-age` and `includeSubDomains` still ship.
- [ ] **Set `WAITLIST_WEBHOOK_URL`.** `npm run build` refuses without it — the
      waitlist is the only conversion, and a build that cannot deliver is not
      deployable.
- [ ] **Human-translated Amharic catalogue**, then flip `AM_ENABLED`. Ge'ez
      layout validation is a launch gate and cannot be performed against machine
      output.
- [ ] **Legal text** for Terms, Privacy, Seller Terms, Refunds & Disputes.
      Privacy §2 and §9 must both read *"Waitlist data is kept for up to 12
      months."*, matching the waitlist consent line verbatim. Privacy §4 must
      read *"Adulis never stores identity photographs."*
- [ ] **Report Content reason categories.**
- [ ] **Wire the waitlist delivery.** Set `WAITLIST_WEBHOOK_URL`; without it,
      submissions are logged to the server console only and nobody receives them.
- [ ] **Replace the rate limiter.** `src/lib/rate-limit.ts` is in-memory: it does
      not survive a restart and does not coordinate across instances. On
      Cloudflare it limits almost nothing. Move to KV or Durable Objects.
- [ ] **Wire the delete-account OTP** to a real service, verify codes
      server-side, apply strict per-phone and per-IP rate limits, and **remove
      the "Preview the blocked state" demo button** in
      `src/components/DeleteAccountFlow.tsx`.
- [ ] **DPIA covering waitlist data**, before the first submission is taken.
- [ ] **Manual QA on a real low-end Android** — [`docs/manual-qa.md`](docs/manual-qa.md).
      Six checks that need a browser and were not run during the build.
- [ ] **Build Tier 2** — the seven stubbed routes. Waits until this branch is
      merged and the manual QA has been run.
- [ ] **CI** — `npm ci && npm run typecheck && npm run lint && npm run build` on
      every pull request.
- [ ] **Cloudflare Pages deployment**, behind Cloudflare Access.
- [ ] Real founder photographs and category imagery. ⚠ This re-opens the `sharp`
      advisory — see [`SECURITY.md`](SECURITY.md) before merging that work.

### Tracked separately

- **[#1](https://github.com/Adulis-Socom/Adulis-Org-Website/issues/1) — flat
  ESLint config.** `next lint` is removed in Next 16. Blocks that upgrade, which
  is the only published fix for the two advisories below.
- **[#2](https://github.com/Adulis-Socom/Adulis-Org-Website/issues/2) — Ethiopic
  micro-subset.** ADU-WEB-01 §8.1 and §9.1 contradict: rendering `አማርኛ` on an
  English page fetches the Ge'ez font. Dormant while `AM_ENABLED` is false;
  a prerequisite for flipping it.
- **`postcss` and `sharp` inside `next` 15** — accepted advisories, neither
  reachable here. Reasoning and re-assessment triggers in
  [`SECURITY.md`](SECURITY.md).

---

## Conventions

- Copy lives in `src/messages/*.json`, never in components. English is the base;
  Amharic is a partial catalogue that falls back to English key by key.
- Arrows are real glyphs — `→` and `↓`, never `>` and `v`. Inter covers them.
- Navigation is defined once in `src/lib/nav.ts`. Header, mobile menu and footer
  all read it, so a link cannot exist in one and not the others.
- Numbered markers appear only where the content genuinely is a sequence — the
  five steps on How it works, the four on For buyers. Not on value cards,
  boundary cards or category lists: numbering a set asserts an order that does
  not exist.
- Identical body text is never repeated across sibling cards. If six cards would
  carry the same sentence, it belongs once, below the set.
- Undecided items render as visibly flagged placeholders. Plausible filler ships
  unnoticed; a flag does not.

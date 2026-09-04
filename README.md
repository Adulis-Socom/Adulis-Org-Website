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
npm run check:i18n     # partial-array guard
npm run check:encoding # UTF-8 end to end, before the Amharic translation lands
npm run check:font     # the Ethiopic subset's cmap really covers the label
npm run check:copy     # 11 copy and structural invariants
npm run check:assets   # the sharp advisory condition, checked not remembered
npm run check:env      # six things that make a build undeployable
                       # all six run automatically before `npm run build`
```

```bash
npm run qa             # the Playwright suite, against a production build
npm run qa:snapshots   # the G11 placeholder baselines, in the pinned container
npm run qa:snapshots:update   # ...and regenerate them
```

`qa:snapshots` needs docker. The G11 baselines are pinned to one container
image, and CI compares them in that same image rather than on the bare runner —
`ubuntu-latest` ships a different font set, so the same three pictures differ.
`npm run qa` leaves them out entirely unless `QA_SNAPSHOTS=1`. See the header of
`tests/qa/placeholder-appearance.spec.ts` for why the pin is the point.

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

| Wireframe | Route | Notes |
|---|---|---|
| W01 | `/` | Seller hero, bio-to-product, what changes, what Adulis is for, buyer door, cohort |
| W02 | `/how-it-works` | Five steps, three example shop previews, finding-the-seller-again, money boundary |
| W03 | `/for-sellers` | Full pitch, commercial sequence, "What you handle", waitlist form at `#waitlist` |
| W23 | `/for-buyers` | Four steps, what you can check, app badges, honest limits |
| W04 | `/trust-and-safety` | Boundaries, verification, ladder, published stats, reviews, claims, moderation |
| W05 | `/prohibited-products` | Twelve categories with definitions, enforcement |
| W11 | `/help` | Eleven FAQs as `<details>` — opens with JavaScript disabled |
| W12 | `/contact` | Institutional routes, location, enquiry form, privacy principle |
| W13 | `/terms` | Section map, 11 sections |
| W14 | `/privacy` | Section map, 14 sections, 4 with approved bodies |
| W15 | `/refunds-and-disputes` | Section map, 7 sections |
| W16 | `/seller-terms` | Section map, 12 sections |
| W17 | `/about` | Origin story, three founders, company status |
| W21 | `/report-content` | Report form, moderation explanation |
| W22 | `/delete-account` | Explanation plus the manual route while the flag is off |
| W20 | `[locale]/not-found` | Localised 404 |

### What is still flagged as undecided

Every route renders real content and all three forms are built. Three things
inside them are not decided:

- **Legal bodies** — `/terms`, `/privacy`, `/seller-terms` and
  `/refunds-and-disputes` render a real section map with `UNDECIDED` bodies.
  Four Privacy sections have approved text; the rest do not.
- **Contact addresses** — every institutional address on `/contact` is
  `UNDECIDED EMAIL`.
- **Report reason categories** — `/report-content` renders that field as a
  flagged placeholder rather than a `<select>`. A moderation taxonomy published
  on a public page is a policy statement, not copy.

Those six routes stay `noindex` while that is true. `/help` does not: every
answer on it is approved copy.

### ⚠ No form can accept a live submission

The waitlist, contact and report forms are complete, tested, and **blocked**.
Choosing where submissions live is the Article 22 decision, and the DPIA lists a
legal opinion as required before any technical provisioning. `WaitlistStore` and
`EnquiryStore` are interfaces with a webhook relay and an in-memory adapter;
**nothing is provisioned.**

That is the correct shape, not a failure — the gate is legal, not technical. A
production build with no destination configured **refuses** submissions rather
than discarding them silently.

Analytics is the exception and ships. It carries counts only — no IP, no
persistent identifier — so it is not personal data. The property is recorded in
[`docs/dpia-notes.md`](docs/dpia-notes.md) and enforced by a property
allowlist plus a `check:copy` rule that fails if the beacon route so much as
mentions a user-agent or a cookie.

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

## What is left, and what it is blocked on

The code is close to complete. Most of what remains is not engineering.

| Item | Blocked on |
|---|---|
| Waitlist, contact and report going live | Article 22 legal opinion · DPIA covering these streams |
| Deletion flow functioning | The four platform endpoints in `adulis-platform` |
| Report reason categories | Founder ruling — a taxonomy is policy, not copy |
| Legal bodies on four pages | Lawyer |
| Amharic strings, then Ge'ez layout validation | Human translation |
| Favicon | An icon nobody has drawn — see the placeholder rule in the notes |
| Real-device performance pass | A physical low-end Android in Addis |
| End-to-end no-JS pass over the deletion flow | The flag flip — condition 8 in `src/lib/flags.ts` |

`robots.txt` and `sitemap.xml` are done: both read `NEXT_PUBLIC_SITE_URL` per
request, and the sitemap lists only routes with no entry in `INDEX_POLICY`, so
it can never advertise a URL the site serves with `noindex`.

## What the tests actually enforce

[`docs/enforcement.md`](docs/enforcement.md) states, per guarantee, the outcome a
person would observe, what asserts it, and what it does **not** cover — plus four
places where the implementation had to differ from the specification.

Read it before assuming the suite covers something. An audit of the previous
constraint list found that of ten claimed guarantees, **one was fully enforced,
three had no enforcement at all, and every one was breakable past its check.**

A guarantee is listed there only after it has been observed failing. A row that
has only ever passed is an assumption with a green tick beside it.

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

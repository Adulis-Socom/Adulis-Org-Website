# Security

Accepted dependency advisories, and why each is not exploitable here.

An advisory nobody wrote down becomes an advisory nobody remembers deciding
about. Every entry below names the condition that would change the assessment.

**Last reviewed:** 27 August 2026
**Next review:** 27 November 2026, or on any change listed under "What would
change this" — whichever comes first.

Run `npm audit` to check the current state against this file. If `npm audit`
reports something not listed here, it is new and needs a decision — do not add
it to this file without one.

---

## Accepted — 1 high

### 1. `postcss` ≤ 8.5.22, nested inside `next`

| | |
|---|---|
| **Advisories** | [GHSA-qx2v-qp2m-jg93](https://github.com/advisories/GHSA-qx2v-qp2m-jg93) · [GHSA-6g55-p6wh-862q](https://github.com/advisories/GHSA-6g55-p6wh-862q) · [GHSA-fxqj-rqcc-2cmp](https://github.com/advisories/GHSA-fxqj-rqcc-2cmp) · [GHSA-r28c-9q8g-f849](https://github.com/advisories/GHSA-r28c-9q8g-f849) |
| **Severity** | High |
| **Path** | `next > postcss@8.4.31` |
| **Published fix** | `next@16` — a breaking major |

**Why it is not exploitable here.** The project's own `postcss` is **8.5.26**,
which is patched; the vulnerable copy is a nested dependency of Next 15's build
pipeline. All four advisories require **attacker-controlled CSS** — either a
crafted `</style>` sequence or a crafted `sourceMappingURL` comment. The only
CSS this project compiles is `src/app/globals.css` and Tailwind's generated
output, both authored in-repo. No CSS is accepted from a user, a CMS, or any
third party, and none is compiled at runtime: the site is fully prerendered at
build time.

**What would change this.** Compiling any CSS not authored in this repository —
a themeable storefront, a CMS-supplied stylesheet, seller-supplied styling of
any kind — or moving CSS compilation to request time.

---

### 2. ~~`sharp` < 0.35.0, nested inside `next`~~ — RESOLVED

| | |
|---|---|
| **Advisory** | [GHSA-f88m-g3jw-g9cj](https://github.com/advisories/GHSA-f88m-g3jw-g9cj) — inherited libvips CVE-2026-33327, CVE-2026-33328, CVE-2026-35590, CVE-2026-35591 |
| **Severity** | High |
| **Was** | `next > sharp@0.34.5` |
| **Now** | `next > sharp@0.35.4`, forced by an override in `package.json` |

**No longer accepted — fixed.** `sharp` is an *optional* dependency of Next
(`optionalDependencies.sharp: ^0.34.3`), so an override raises it without
touching the framework. `next@16` was never required to resolve this; the
earlier entry assumed it was.

**Why the acceptance was withdrawn rather than renewed.** It rested on a
property nothing checked: that this site imports no `next/image` and ships no
raster assets. That was true, and it was one design decision away from being
false — a visual redesign brings a logo, a hero image, an icon set and a
favicon by default, and none of those would have failed anything. Two tests
even filter favicon requests out as noise, so adding one changed no result in
either direction.

An accepted risk whose reversal condition is only written down is an accepted
risk nobody will notice reversing.

**The condition is now checked, not remembered.** `npm run check:assets`
(ADU-WEB-03 G13) fails the build when `next/image` or `next/og` is imported, or
any `.png` `.jpg` `.jpeg` `.webp` `.avif` `.gif` `.tiff` appears under `public/`
or `src/`, while the installed `sharp` is below 0.35.0.

**SVG is excluded, and that was verified rather than assumed.** `src/app/icon.svg`
was added, built and served: the response bytes are identical to the source and
the content-type is `image/svg+xml`. Next serves it directly and does not route
it through sharp. If that ever changes, the exclusion is wrong and SVG joins the
list.

⚠ **Removing the override re-opens four High-severity CVEs.** It is safe only
while no raster asset exists and no image pipeline is imported — which is exactly
the condition `check:assets` now enforces, in that direction too.

---

## Why not `npm audit fix --force`

`npm audit fix --force` resolves the remaining nested `postcss` by installing
**`next@16`**, a breaking major. That would land an unreviewed framework upgrade
on a codebase with one developer, and the advisory it fixes is not reachable
here — no CSS from outside this repository is ever compiled. The upgrade risk is
real and immediate; the exposure is not. The trade is not close.

**The sharp advisory did not need it.** `sharp` is an *optional* dependency, so
an override raised it to 0.35.4 without touching Next. The earlier entry assumed
a major was the only route and was wrong about that — worth recording, because
"the published fix is a breaking major" is a sentence that closes off cheaper
options if nobody re-checks it.

Next 16 will be taken deliberately, as its own piece of work. It also forces the
flat-ESLint-config migration, since `next lint` is removed in 16.

---

## Resolved

| Date | Item | Resolution |
|---|---|---|
| 23 Aug 2026 | `next` 15.1.6 — critical set including *Authorization Bypass in Next.js Middleware*, RCE in the React flight protocol, and several SSRF and cache-poisoning advisories | Upgraded to **15.5.23** within the major. The middleware advisory mattered directly: locale routing on this site *is* middleware. |
| 23 Aug 2026 | `next-intl` ≤ 4.9.1 — open redirect ([GHSA-8f24-v5vv-gm5j](https://github.com/advisories/GHSA-8f24-v5vv-gm5j)) and prototype pollution via `experimental.messages.precompile` ([GHSA-4c35-wcg5-mm9h](https://github.com/advisories/GHSA-4c35-wcg5-mm9h)) | Migrated **v3 → v4.13.7**. No v3 fix existed. |
| 23 Aug 2026 | `eslint` / `@eslint/plugin-kit` — ReDoS ([GHSA-xffm-g5w8-qvg7](https://github.com/advisories/GHSA-xffm-g5w8-qvg7)) | Upgraded `eslint` to **9.39.5** within the major. |
| 23 Aug 2026 | `postcss` (direct dependency) | Upgraded to **8.5.26**. Only Next's nested copy remains — see above. |
| 27 Aug 2026 | `sharp` < 0.35.0 — four inherited libvips CVEs, previously **accepted** | Overridden to **0.35.4**. It is an optional dependency of Next, so no major was needed. The acceptance rested on a property nothing checked; `check:assets` now checks it. |

---

## The Content-Security-Policy decision, and why it was reversed

The policy lives in **`src/middleware.ts`**, not `next.config.mjs`. It carries a
**per-request nonce** on `script-src` and `style-src`, and no `'unsafe-inline'`
anywhere.

### The original decision, and the trigger that expired it

The site originally shipped `'unsafe-inline'` on `script-src`, on the grounds
that a nonce deoptimises static prerendering against a site with no injection
sink. That decision was recorded here **with an expiry condition**: reopen it the
moment any user-supplied content is rendered into a page.

**The trigger has fired**, in advance rather than in arrears. This origin will
also serve seller storefronts, which render seller-written product descriptions
and buyer-written review text. A policy retrofitted at that point is a policy
written under pressure, so it was written before the content arrived.

### What it cost, measured rather than estimated

| | `'unsafe-inline'`, static | nonce, dynamic |
|---|---|---|
| Prerendered `.html` files | 30 | **0** |
| Median TTFB, local | 5 ms | **13 ms** |
| Inline scripts carrying a nonce | 0 of 29 | **23 of 23** |
| Edge-cacheable | yes | **no** |

The milliseconds are not the real cost. Prerendered pages can be served from edge
cache and these cannot, so every request now runs a full RSC render.

### The trap this hid, which cost real time to find

Setting a nonce in the CSP header **is not enough**, and the failure is silent in
every direction that is easy to check. With static prerendering still in place,
the header advertised a fresh nonce per request while the prerendered HTML
carried none — 0 of 29 script tags. Because `'strict-dynamic'` makes browsers
**ignore `'self'`**, that policy blocked every script on the site, including the
external chunks. Server-side header checks all passed. Only a real browser showed
it.

The fix is `export const dynamic = 'force-dynamic'` in `src/app/[locale]/layout.tsx`.

⚠ **The build's route table still prints these pages as `●  (SSG)`.** That marker
reflects `generateStaticParams` being present, not actual prerendering. Do not
read it as evidence the pages are static — check `.next/server/app` for `.html`
files, which is where the truth is.

Removing that one line breaks the entire site in the browser while every
server-side check keeps passing. Four tests in `tests/qa/headers-fonts.spec.ts`
guard it, including one that compares each response's inline scripts against that
same response's header nonce, and one that loads a page in a real browser and
fails on any CSP violation.

### `force-dynamic` is over-broad, accepted knowingly

The fix is applied to the whole locale layout, so **every** page renders per
request. Only the form routes genuinely need that. The static content pages —
About, Help, Terms, Privacy, Seller terms, Refunds, Prohibited products, Report
content — never need per-request rendering and are paying for it anyway.

This is accepted rather than optimised, because the measurement that would
justify optimising has not been taken. The binding constraint is first paint on a
low-end Android in Addis over a slow connection, and nobody has measured it on
that device. Optimising against an unmeasured constraint is guessing, and the
current solution works and is tested.

**Recorded cost:** 30 prerendered pages to 0; edge-cacheable to not; per-request
Worker CPU on every page view, which touches the project's cost ceilings.

**Revisit trigger:** if measured first paint on the target device exceeds budget.

**Measured at Checkpoint 2 — the trigger has not fired.** Lighthouse, default
mobile preset (4x CPU throttle, slow 4G), against the production build:

| Route | Performance | FCP | LCP | TBT | CLS |
|---|---|---|---|---|---|
| `/en` | 98 | 1.2 s | 2.3 s | 80 ms | 0 |
| `/en/for-sellers` | 99 | 1.2 s | 1.9 s | 80 ms | 0 |
| `/en/terms` | 98 | 1.2 s | 2.3 s | 90 ms | 0 |

Per-request rendering is costing far less than the loss of prerendering
suggested it might — server response time is ~50 ms and TBT is negligible. This
is a throttled desktop profile rather than a real device, so it does not replace
the manual pass in `docs/manual-qa.md`, but it is enough to say the nonce is not
currently the thing to optimise.

**The fix is then one of these two, and never removing the nonce:**

1. **Edge-side nonce injection** — a Worker that rewrites the nonce into cached
   static HTML on the way out. Keeps static generation and the edge cache.
2. **Build-time script hashes** in a Cloudflare Pages `_headers` file. Keeps
   static generation, but the hashes are per-page and break whenever Next changes
   its bootstrap.

Removing the nonce is not on that list. The reason it exists — seller storefronts
rendering seller- and buyer-written text on this origin — does not go away
because the page got slow.

### What is no longer needed

`style-src` was expected to need `'unsafe-inline'`. It does not — with the nonce,
30 pages load with zero style-src violations, so the weaker value was removed
rather than left in because it happened to work.

Build-time hashes in a Cloudflare Pages `_headers` file remain the only way to
get strict `script-src` **and** static rendering. They are brittle across Next
releases and were not worth it here, but that is the path if the per-request
render cost ever becomes the binding problem.

Note that a `_headers` file would **supersede the `headers()` block in
`next.config.mjs`** on Cloudflare Pages, and the CSP is no longer in that block
at all — it is set per request in middleware, which a static `_headers` file
cannot express. Whoever configures that deployment must not assume porting
`_headers` covers the CSP.

`font-src 'self'` is sufficient because `next/font` downloads at build time — ten
`.woff2` files are emitted to `/_next/static/media` and no Google origin is
contacted at runtime.

---

## Standing rules

These are properties of the site, not of its dependencies. Breaking one is a
security change even when no advisory is involved.

- **No third-party analytics, tracking, advertising or session-recording
  script.** The site collects personal data from prospective sellers; adding a
  third party to that flow creates a processor relationship nobody has assessed.
- **No secrets in the repository.** `.env` and `.env.local` are gitignored;
  `.env.example` carries names and empty values only.
- **The repository is private** and stays private until IP protection
  registration completes. No deployment to a publicly reachable URL — a
  Cloudflare Pages project goes behind Cloudflare Access first, because preview
  URLs are real, crawlable URLs.
- **Every public form is rate limited and validated server-side.** The primary
  control is **Cloudflare's edge rate-limiting rules**, configured in the
  dashboard, where a refused request never reaches a function.
  `src/lib/rate-limit.ts` is the **fail-closed backstop** for anything not behind
  Cloudflare. **Do not replace it with KV or a Durable Object** — that was
  considered and declined, because KV still runs the function and so does not
  close the cost of refusing a request. Do not delete it either, and do not
  promote it back to primary.
- **The delete-account flow is gated off.** `DELETION_FLOW_ENABLED` in
  `src/lib/flags.ts` is `false`: the explanation ships, the interactive flow does
  not, and the demo button that jumped to account data is gone. The seven
  conditions for flipping it are in `docs/deletion-flow-design.md`. The OTP in
  the unreachable flow is still mocked and must be issued and verified
  server-side before the flag moves.

### Three things that look like bugs and are not

Each was a deliberate decision. Each will be "fixed" by somebody who does not
know that, so it is written down here.

- **Waitlist fields are prefixed with an apostrophe on delivery.**
  `src/lib/spreadsheet-safe.ts` escapes a leading `=`, `+`, `@` or `-` because
  the destination is a spreadsheet a founder reads by hand, and those characters
  start a formula there. Almost every `@handle` is affected. The spreadsheet does
  not display the apostrophe; a raw CSV export does. The stored value the seller
  typed is unchanged — escaping happens at the delivery boundary only. **This is
  destination-specific and wrong for a Postgres column**; revisit when the
  destination is chosen.
- **The waitlist rejects a request with no `Origin` header.** Added as hardening
  (audit 01 F-13). Verified safe in chromium and webkit with JavaScript disabled,
  both of which send `Origin` on a same-origin form POST. **If the no-JS form
  ever breaks in a real browser, revert this rather than working around it** —
  the real abuse control is rate limiting. There is a gating check in
  `docs/manual-qa.md` §4.
- **The waitlist refuses every submission when no destination is configured, and
  `npm run build` refuses to build.** That is deliberate. It previously returned
  a reference number while delivering nothing, which failed the site's only
  conversion silently in both directions. A reference number is a promise that
  the application exists somewhere. Local builds opt out explicitly with
  `ALLOW_UNDELIVERED_WAITLIST=1`.

---

## Reporting

This is a private, pre-launch repository with no public attack surface and no
disclosure address. Once a domain exists and the site is public, add a contact
and a disclosure policy here.

# Security

Accepted dependency advisories, and why each is not exploitable here.

An advisory nobody wrote down becomes an advisory nobody remembers deciding
about. Every entry below names the condition that would change the assessment.

**Last reviewed:** 23 August 2026
**Next review:** 23 November 2026, or on any change listed under "What would
change this" — whichever comes first.

Run `npm audit` to check the current state against this file. If `npm audit`
reports something not listed here, it is new and needs a decision — do not add
it to this file without one.

---

## Accepted — 3 high

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

### 2. `sharp` < 0.35.0, nested inside `next`

| | |
|---|---|
| **Advisory** | [GHSA-f88m-g3jw-g9cj](https://github.com/advisories/GHSA-f88m-g3jw-g9cj) — inherited libvips CVE-2026-33327, CVE-2026-33328, CVE-2026-35590, CVE-2026-35591 |
| **Severity** | High |
| **Path** | `next > sharp@0.34.5` |
| **Published fix** | `next@16` — a breaking major |

**Why it is not exploitable here.** `sharp` backs the `next/image` optimisation
pipeline. **This site does not use `next/image` anywhere, and ships no raster
assets at all** — every image slot is a CSS-drawn `.placeholder-media` box
pending real photography. `sharp` is installed but never invoked, so the libvips
decoders the CVEs sit in are never handed a byte of input.

**What would change this.** The day any page imports `next/image`, or any image
file is added under `public/` or `src/` and served through the optimiser. That
is expected when founder photographs and category imagery land — **re-assess
then, before merging that work.**

---

## Why not `npm audit fix --force`

It resolves both by installing `next@16`. That is a breaking major that would
land at the same time as an unreviewed framework upgrade, on a codebase with one
developer and seven routes still unbuilt. The advisories above are not reachable
in this application; the upgrade risk is real and immediate. The trade is not
close.

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

---

## The Content-Security-Policy decision, and when to revisit it

The policy shipped in `next.config.mjs` is strict everywhere **except
`script-src`, which carries `'unsafe-inline'`**.

### Why

Next emits 17 inline `<script>` blocks per page for its RSC bootstrap. Removing
`'unsafe-inline'` requires a per-request nonce, and a per-request nonce
deoptimises all 30 statically prerendered pages. That is a measurable, universal
cost on a site whose binding constraint is first paint on a low-end Android over
a slow connection — traded against a hypothetical XSS on a site with **no
injection sink**: no `dangerouslySetInnerHTML`, no `eval`, no third-party script,
and no user-generated content rendered anywhere.

`'unsafe-inline'` on `script-src` is weak. The directives that limit *damage* are
the strict ones, and they all hold: `connect-src 'self'` and `form-action 'self'`
block exfiltration, `base-uri 'none'` blocks base-tag injection, and
`object-src 'none'` and `frame-ancestors 'none'` close the rest. On a site whose
only asset is a list of seller phone numbers, those are the ones that matter.

`font-src 'self'` is sufficient because `next/font` downloads at build time — ten
`.woff2` files are emitted to `/_next/static/media` and no Google origin is
contacted at runtime. This was expected to be the hard part of the policy and
turned out to be free.

### ⚠ Revisit trigger — the condition that expires this decision

**Reopen this the moment any user-supplied content is rendered into a page.**

Today nothing is. The waitlist echoes submitted values back into form inputs,
which React escapes. Tier 2 adds two more forms with the same property. The day
that changes — a public storefront, a review, a report-content submission
displayed back, any reflected content at all — `'unsafe-inline'` stops being
defensible and the nonce cost becomes worth paying.

A decision whose expiry condition is not written down is a decision nobody
revisits. This is that condition.

### The third option, if the trigger fires

Build-time hashes written into a Cloudflare Pages `_headers` file give strict
`script-src` **and** static rendering — both, with no nonce. It is real work: the
hashes are per-page, and they break whenever Next changes its bootstrap. Too
expensive for the threat today, but it is the path if the trigger above fires,
and a `_headers` file will be needed for that deployment anyway.

Note that a `_headers` file would also **supersede the `headers()` block in
`next.config.mjs`** on Cloudflare Pages. Whoever configures that deployment must
port every header across, not just the CSP.

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

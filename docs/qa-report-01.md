

Playwright starts both the production server and the local delivery sink itself,
so nothing needs launching by hand.# QA report 01 — automated pass

**Target:** `test/qa-automation`, branched from `fix/security-triage` · **Date:** 23 August 2026
**Scope:** Build Amendment 08 §2.1–2.9
**Method:** Playwright 1.62.1, chromium and webkit, against a **production** build (`next build` + `next start`) on `localhost:3210`. axe-core via `@axe-core/playwright` 4.13.0.
**Run:** `npm run qa`

> **Verification only. Nothing was fixed**, per §5.4. The one permitted exception — an F-13 revert — was **not triggered**: the gate passed.
>
> ## Triaged in Build Amendment 09
>
> **Q-02 fixed** (`/70` opacity dropped) — axe is now **64 of 64 contexts clean, zero violations**.
> **Q-01 partly fixed** — the header wordmark is padded to 44px; the consent checkbox is accepted with a comment; **four `.link-arrow` instances await a ruling** and were deliberately left alone (see "Q-01 triage" below).
>
> **Q-01 closed in Amendment 10** — all four `.link-arrow` instances fixed via a second class, the inline consent link left exempt.
>
> **Suite: 289 passed · 0 failed · 1 skipped.** Zero undersized targets, zero axe violations, zero overflow. The one skip is the documented WebKit link-tabbing limitation. The original finding text below is unchanged.

---

## Result — as first reported

**215 passed · 74 failed · 1 skipped**, across 30 pages × 2 engines.

Every one of the 74 failures reduces to **two root causes**, each a single fix:

| Finding | Contexts | Root cause |
|---|---|---|
| **Q-01** Touch targets below 44×44 | 60 | 6 distinct elements, mostly one shared header link |
| **Q-02** Colour contrast 3.02:1 on placeholder labels | 14 | One opacity token in `.placeholder-media` |

The 1 skip is WebKit excluding links from the Tab order, which is an engine setting rather than a site property — explained under §2.5.

### Section results, mapped to `docs/manual-qa.md`

| Amd 08 | manual-qa.md | Result |
|---|---|---|
| §2.1 runtime console | §7 | **PASS** — 0 `MISSING_MESSAGE`, 0 React errors, across 60 page loads plus the interaction pass |
| §2.2 360px layout | §1 | **PASS** — 0 horizontal scroll, 0 elements past 360px, in 60 measurements |
| §2.3 touch targets | §1, §2 | **FAIL** — Q-01 |
| §2.4 mobile menu | §2 | **PASS** — all 7 behaviours, both engines |
| §2.5 keyboard | §3 | **PASS** — focus visible at every one of ~600 tab stops; 0 backward jumps; error-summary links move focus correctly |
| §2.6 no-JS + F-13 gate | §4 | **PASS** — both engines. **No revert needed** |
| §2.7 axe WCAG 2.1 AA | §6 | **FAIL** — Q-02, and nothing else |
| §2.8 headers | new | **PASS** — all 8 on all 30 routes, CSP complete, HSTS carries no `preload` |
| §2.9 fonts | §6 | **PASS** — 0 Ethiopic faces loaded on either locale; 0 off-origin requests |

---

## Q-01 — Touch targets below 44×44

```
Severity:  Medium
Surface:   Amendment 08 §2.3
Status:    Confirmed, both engines
Fixed:     No — reported per §5.4
```

**What it is.** ADU-WEB-01 §10 states a 44×44px minimum as an invariant. Six elements are under it. All are 24px tall or less; the width is fine in every case, so this is a vertical-padding problem, not a layout one.

| Element | Size | Pages | Note |
|---|---|---|---|
| `a` "ADULIS" | **60×24** | all 30 | The header wordmark, which is the home link. By far the biggest one — it is on every page |
| `a` "See how Adulis works for buyers →" | 276×24 | `/`, both locales | `DoorBand` |
| `a` "See how Adulis works for sellers →" | 276×24 | `/for-buyers` | `DoorBand` |
| `a` "Refunds & Disputes →" | 158×24 | `/trust-and-safety` | |
| `a` "Report content →" | 125×24 | `/trust-and-safety` | |
| `input#consent` | **20×20** | `/for-sellers` | See the nuance below |

**On the checkbox.** 20×20 is the raw input. Its `<label>` is correctly associated and clicking the label toggles it, so the *effective* target is much larger — a person is unlikely to struggle. It is still 20×20 by measurement, and WCAG 2.5.8 (AA in 2.2) asks for 24×24 even before the project's own stricter 44×44.

**Fix options.** Not chosen.
- Vertical padding on `.link-arrow` and the wordmark, which lifts four of the six at once. Changes spacing where those links sit inline in a sentence.
- A `min-height` with `inline-flex` on the affected classes. Same effect, less spacing disturbance.
- For the checkbox: enlarge the control, or accept it on the grounds that the label is the real target and record that reasoning next to the invariant.
- Relax the invariant to WCAG's own 24×24 for inline text links and keep 44×44 for controls. That is a specification change, not a code one.

**Depends on.** Nothing technical. Whether the invariant applies to inline text links is a founder call, and it is the difference between a one-line fix and a six-element one.

### Q-01 triage — Amendment 09 §3.2

> **Worth restating, because it changes the urgency:** the 44×44 invariant in
> ADU-WEB-01 §10 is stricter than the standard the site claims. WCAG 2.1 AA does
> not require it — target size at 44px is AAA, and AA (2.5.8, WCAG 2.2) asks for
> 24×24. These are violations of our own rule, not accessibility failures.

**Fixed — the header wordmark.** `inline-flex` + `min-h-[44px]`, `Header.tsx`.
It was 60×24 on all 30 pages and is the home link, the one a person reaches for
when lost. This alone removed 60 of the 74 original failures.

**Accepted — the consent checkbox, 20×20.** The `<label>` is correctly
associated, so the real target is the whole consent line. Enlarging the box
would make it the only oversized control on the form. Commented in
`WaitlistForm.tsx` so it can be closed quickly at the next audit rather than
re-investigated.

**Awaiting a ruling — four instances of one class.** Not fixed, per §3.2.

They are **all `.link-arrow`**, so this is one class to decide about, not four
elements. Each renders `display: block` because it is a flex item, which is why
the "inline links are text, not targets" exemption does not catch them.

| # | Page(s) | Size | Source | What it does |
|---|---|---|---|---|
| 1 | `/` (both locales) | 276×24 | `ui.tsx:61`, inside `.door` | **The buyer door** — the single marked crossing from the seller-weighted home page to the buyer side. ADU-WEB-01 §2.1 makes this the one navigational decision on the page |
| 2 | `/for-buyers` (both locales) | 276×24 | `ui.tsx:61`, inside `.door` | The reverse door, back to the seller side |
| 3 | `/trust-and-safety` (both locales) | 158×24 | `page.tsx:93`, inside `p.mt-4.flex` | "Refunds & Disputes →" — routes a buyer with a problem to the policy |
| 4 | `/trust-and-safety` (both locales) | 125×24 | `page.tsx:96`, inside `p.mt-4.flex` | "Report content →" — an app-store-required reporting route |

**The catch that makes this a decision rather than a fix.** `.link-arrow` has a
**fifth** usage, and it is genuinely inline: the Privacy link inside the waitlist
consent `<label>` (`WaitlistForm.tsx:237`), measuring 62×16 with
`display: inline`. It is correctly *not* reported, because a link inside a
sentence is text rather than a tap target and WCAG exempts it.

So a blanket `min-height` on `.link-arrow` fixes all four **and** turns that
inline link into a 44px-tall element inside a sentence, disturbing the consent
line's layout.

Options, not chosen:

- **`min-h-[44px]` + `inline-flex` on `.link-arrow`.** One line, fixes all four.
  Costs the consent line's inline flow.
- **Split the class** — `.link-arrow` stays inline-safe, a new `.link-arrow-block`
  carries the target size, and the four call sites move to it. Correct, and four
  files instead of one.
- **Vertical padding only** (`py-2.5`), which reaches 44px through padding rather
  than `min-height`. Least disruptive to the inline case, but still affects it.
- **Accept all four** on the grounds that they are inline-styled text links that
  happen to sit in a flex container, and narrow the invariant to controls.
  A specification change to ADU-WEB-01 §10, not a code change.

**Depends on.** Whether ADU-WEB-01 §10's 44×44 applies to text links or only to
controls. That is the actual question, and it decides all four at once.

---

## Q-02 — Colour contrast 3.02:1 on placeholder labels

```
Severity:  Serious (axe), WCAG 2.1 AA 1.4.3
Surface:   Amendment 08 §2.7
Status:    Confirmed, both engines
Fixed:     No — reported per §5.4
```

**What it is.** The label text inside `MediaPlaceholder` fails AA contrast. **This is the only axe violation in the entire suite** — 50 of 64 scanned contexts are completely clean, and the other 14 are this same rule.

**Evidence.** axe, verbatim:

```
Element has insufficient color contrast of 3.02
  foreground #8a909b, background #f7f8fa
  font size 8.3pt (11px), weight normal
  Expected contrast ratio of 4.5:1
```

**Root cause.** One token: `.placeholder-media` in `src/app/globals.css:208` uses `text-ink-muted/70`. At full opacity `ink-muted` (`#5B6472`) on `surface-sunken` (`#F7F8FA`) passes comfortably; the `/70` is what drops it to 3.02.

**Where.** 8 distinct nodes across 6 pages plus the menu-open state: the shop-preview image slot on `/`, the three category slots on `/how-it-works`, and the three founder photo slots on `/about` — in both locales.

### Q-02 triage — FIXED, Amendment 09 §3.1

The `/70` was dropped in `globals.css`. Re-scanned: **64 of 64 contexts clean,
zero axe violations across the whole suite, both engines.** The class carries a
comment recording why the opacity is not to come back.

**Fix options.** Not chosen at the time of the report.
- Drop the `/70` opacity. One character. Contrast becomes roughly 6.4:1. ← taken
- Raise the font size above 18.66px, which changes the AA threshold to 3:1 and would pass at 3.02 — technically compliant, uncomfortably marginal, and it changes the visual design.
- Accept until real imagery lands, since these are lo-fi placeholders that will be replaced. **The risk in that:** the placeholders ship if photography is late, and the `.placeholder-media` class is also used for anything else that needs a media slot.

**Depends on.** Nothing.

---

## §2.6 — the F-13 gate, in full

**PASS in both engines. No revert.**

| Engine | Submission succeeded | `Origin` sent | Value | Rate limited | Reference issued |
|---|---|---|---|---|---|
| chromium | **yes** | yes | `http://localhost:3210` | no | `ADL-WL-26-3354` |
| webkit | **yes** | yes | `http://localhost:3210` | no | `ADL-WL-26-5450` |

Both engines send `Origin` on a same-origin no-JS form POST, so the Amendment 07 §3.5 requirement does not break the no-JavaScript path. F-13 (`a775a2e`) **stands**.

Also passing with JavaScript disabled, in both engines: pages render, the **Second handle field is visible** before hydration, server-side validation returns the error summary as a list of links, and all four footer legal links resolve 200.

> **One caveat, stated plainly.** WebKit-in-Playwright is not Safari-on-iOS. It is the same engine, but not the same form-submission stack, and not the same OS integration. This lowers the risk on F-13 considerably; it does not eliminate it, and the real-Safari check stays in the human checklist.

### The false alarm, and what caused it

The first full run reported this gate **failing in webkit**, and it was not an F-13 failure.

The recorded evidence said so: `originHeaderPresent: true`, `originHeaderValue: http://localhost:3210`. The Origin header was sent perfectly well. The real cause was my own harness — the waitlist allows five submissions per ten minutes per client, `clientKey()` trusts only `cf-connecting-ip` (F-04), and Playwright sends no such header, so in a production build every request in the suite shared the single `waitlist:unidentified` bucket. Chromium ran first and spent the allowance; webkit was refused.

Fixed in `tests/qa/fixtures.ts` by giving each test its own `cf-connecting-ip`. The gate now also asserts `rateLimited === false` separately, so this specific confusion cannot recur silently: a rate-limited run fails with "this run says nothing about F-13" rather than looking like an Origin problem.

---

## Other results worth stating

**§2.1 — the highest-value check passed.** 0 `MISSING_MESSAGE`, 0 React errors, 0 unhandled rejections across 60 page loads and a dedicated interaction pass that opens and closes the mobile menu, focuses every waitlist field, reveals the conditional second handle, triggers the full validation error state, and loads the deletion page in both locales. This is the failure mode that scoping the client payload to three namespaces introduced, and nothing else can catch it.

**§2.2 — no overflow anywhere.** 60 measurements, 0 pages with horizontal scroll, 0 elements extending past 360px. The no-fixed-heights invariant is holding.

**§2.5 — focus visible at every stop.** Roughly 600 tab stops across 60 page-scans, 0 without a visible indicator. Every error-summary link moves focus to the field it names, and the submit button stays enabled and focusable in the error state.

**§2.8 — all 8 security headers on all 30 routes**, CSP carrying all 10 directives from Amendment 07 §4, and HSTS carrying `includeSubDomains` but **not** `preload`.

**§2.9 — 0 Ethiopic faces loaded** on either locale, and 0 off-origin requests of any kind. 13 faces are *declared* and none load, which is `unicode-range` doing its job. `/am` currently renders English, so this becomes a real test only when `AM_ENABLED` flips.

---

## Two measurement bugs I caught and fixed, rather than reporting

Recorded because the first version of each would have read as an authoritative finding.

1. **"30 of 30 pages have backward tab jumps."** The heuristic compared `getBoundingClientRect().top` across tab stops, but tabbing scrolls the page, so it was comparing viewport-relative positions taken at different scroll offsets. Corrected to absolute document position: the real number is **0**.
2. **"Every page has a 1×1 touch target."** That was the skip link, which is `sr-only` and clipped to 1px until focused — the measurement working correctly on an element that is not on screen. Clipped elements are now excluded, and the skip link's *focused* size is asserted separately instead.

A third, smaller one: the no-JS success detector matched raw HTML, and `waitlist.success.title` and `waitlist.errors.*` both ship in the client message payload on every page, so it reported a success and an error on the same response. It now strips `<script>` blocks first. This is the same mistake the security audit caught in itself, in a new place.

---

## What this suite does not establish

Per §4. **None of these are covered, and the automated pass does not substitute for them.**

| Check | Why not |
|---|---|
| **Real low-end Android, real slow connection** | Headless timings on a developer machine say nothing about first paint on the device the product is built around. The suite proves nothing overflows at 360px; it does not prove the page arrives quickly |
| **Real Safari on real iOS** | WebKit in Playwright is the same engine, not the same browser — different form-submission stack, different OS integration. Directly relevant to F-13 |
| **Keyboard access in Safari** | WebKit excludes links from the Tab order by default, so the skip-link assertion is chromium-only. Real Safari with Full Keyboard Access enabled is untested |
| **Whether the page reads well** | Whether the seller pitch persuades is not a test |
| **Whether the screenshots look right** | 60 full-page screenshots are in `tests/qa/screenshots/`. Automation proves nothing overflows; a person judges whether it looks like a company a seller would trust |
| **Ge'ez layout validation** | Blocked on human translation regardless. `/am` renders English today, so the tofu check is moot until `AM_ENABLED` flips |
| **Touch targets in practice** | 44px passes a measurement and can still be awkward to hit |
| **Lighthouse performance** | Not run. Throttled Lighthouse on a real device profile is a separate exercise and belongs with the low-end Android pass |
| **Headers as actually deployed** | ⚠ These were read from `next start`. Whether they survive to Cloudflare Pages depends on the adapter, and there is no `_headers` file in the repo. Added to `docs/manual-qa.md` §8 as a deployment check — assuming the adapter translates `headers()` is the same shape of mistake as the canonical bug: correct locally, absent at launch, invisible until someone looks |

---

## Artefacts

| Path | Contents |
|---|---|
| `tests/qa/screenshots/` | 60 full-page screenshots, 7.4 MB — the artefact the human pass reviews |
| `tests/qa/.artifacts/overflow.jsonl` | Per-page scroll width and any overflowing elements |
| `tests/qa/.artifacts/touch-targets.jsonl` | Every undersized target with selector and measured size |
| `tests/qa/.artifacts/keyboard.jsonl` | Tab stops, focus visibility, tab-order jumps |
| `tests/qa/.artifacts/axe.jsonl` | Full violation list per context |
| `tests/qa/.artifacts/nojs.jsonl` | The F-13 gate record per engine |
| `tests/qa/.artifacts/fonts.jsonl` | Font requests and Ethiopic face status per locale |
| `tests/qa/.artifacts/headers.jsonl` | Full response headers |

All are gitignored — they are run output, regenerated by `npm run qa`.

## Running it

```bash
node tests/qa/sink.mjs &          # local delivery sink, so the waitlist has a destination
WAITLIST_WEBHOOK_URL=http://localhost:4556/ npm run build
npm run qa                        # both engines
npm run qa -- --project=chromium  # one engine
```

`npm run qa` runs in CI as a separate, non-blocking job. It is expected to fail on Q-01 and Q-02 until those are triaged; the job reports rather than gates, which is the point of introducing it before the findings are fixed.

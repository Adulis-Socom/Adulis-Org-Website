# Phase C report

Written as the run went, not at the end. Unattended, 4 September 2026, from
the Phase C work order and ADU-WEB-03 v1.2. Every choice this run could not make
is in [`decisions-pending.md`](./decisions-pending.md).

**PR:** https://github.com/Adulis-Socom/Adulis-Org-Website/pull/13

**A CI finding on the way in.** PR #12 (Phase A) had been **merged into
`main`** before this run, so the first Phase C push had no open pull request
and triggered no CI. Its last CI run, on `bd31ebd`, was **red**: `verify` and
`qa` failed in ten seconds at `npm ci` — *Missing: @swc/helpers@0.5.23 from
lock file* — while the pinned `snapshots` job passed. The branch's
`package-lock.json` was consistent **to npm 11** — local, and the Playwright
container that ran `npm ci` cleanly all day is Node 24 / npm 11.16 — but the
runner's Node 22.23.2 bundles **npm 10.9.8**, and npm 10 requires a nested
entry (`node_modules/next-intl/node_modules/@swc/helpers`, 0.5.23) that npm 11
lets a lock omit. Reproduced exactly in `node:22-slim`: `EUSAGE` before,
clean after `npm install --package-lock-only` under npm 10. The regenerated
lock differs by that one added entry — 464 packages to 465, no version moved —
and passes `npm ci --dry-run` under both majors. PR #13's first two runs
failed the same way before any test ran; the run after the lock fix is the one
reported below. **This is why PR #12 merged red.**

---

## 0 · Before Phase C — the v1.2 amendments

Applied first, as instructed.

| Amendment | Done |
|---|---|
| §1 third failure mode | `enforcement.md` §0 now lists all three, with the 231-pixel case |
| §2 G6 row | Matches v1.2 wording; integration with the real API stays on condition 8 |
| §3 G11 and G12 rows | G12 now records that the same pixel baseline holds its appearance |
| §4 **G14** | `tests/qa/messages.spec.ts` — every route, both locales. Anchored to the top-level keys of `en.json`, read at test time |
| §5 engineering notes | Two entries: a client-component flag is a build-time constant; a policy that blocks the tooling is the policy working |

**G14 observed failing.** `common.onThisPage` deleted from `en.json`, rebuilt,
run: **8 failed** — the four legal pages in both locales — each naming
`common.onThisPage` as visible text. Restored, and the key is back.

---

## 1 · Token changes (work order §1)

| Change | Applied |
|---|---|
| `surface-2` → `#EFF1F5` | `:root` in `globals.css`; ink on it 14.9:1 |
| Contained card border → `#DDE1E8` | `--rule-card`, used by `.card` |
| Focus ring reverses — paper inner, ink outer | `:focus-visible` written as the spec's `box-shadow` |
| Design rule: no paper-filled control on the ink surface | `.surface-ink` carries `.btn-gold` (ink on gold 5.31:1) or ink controls; documented at the rule |
| G-row focus test | Adds a **visible-edge** assertion — see the difference below |

**The focus assertion, as implemented.** §1.2 asks that the inner tone contrast
≥3:1 with the element's own background. No single fixed ring does that on both
a paper input and an ink button; paper-inner fails the first, ink-inner fails
the second, and the ruling that made the ring dual-tone was that it must not
need to know its context. What the requirement protects against is a ring that
merges on *both* edges. So the test asserts at least one edge is visible — inner
against the element, or outer against the page — and reports both. It fails the
merged case on the CTA and passes paper-inner/ink-outer everywhere. Recorded in
`enforcement.md` under "Where this differs".

_(observed-failing result recorded in §3 · C1 below)_

---

## 2 · The design system (work order §2)

### ⚠ The file was never empty. I queried the wrong node and stopped.

The supplied link ends `?node-id=0-1`. Node `0:1` is a page called "Page 1" and
it is genuinely empty — and asking the tool to list the document's pages
returned **only that page**. Two readings agreed, so I recorded the file as
empty and built from the text.

The work is on pages the listing did not return: **Components `9:22`**,
**Foundations `9:23`**, Compositions `9:24` (that one genuinely empty). One
further query would have found them.

This is the same shape as every defect this project has recorded — a check that
reported truthfully about the wrong thing — and I made it about the artefact I
was told to build against. What follows is the comparison that §5.3 asked for
and that D1 wrongly declared impossible.

### The tokens matched exactly

The Foundations board carries all nine colours with their contrast figures
written on it. Every value I derived from the text is identical, including the
reasoning:

| Token | Figma | Built | Board's note |
|---|---|---|---|
| ink | `#0E1A33` | ✓ | Primary text. Dark surfaces |
| gold | `#B8862B` | ✓ | Text on ink only (5.34). On paper, large text only (3.24) |
| paper | `#FFFFFF` | ✓ | Page background |
| slate | `#55607A` | ✓ | Secondary text on paper. 2.75 on ink — never use it there |
| on-ink | `#8890A2` | ✓ | Secondary text on ink (5.40) |
| surface-2 | `#EFF1F5` | ✓ | Contained surfaces (1.13). Revised from `#F8F8F9`, which was imperceptible |
| rule | `#E3E6ED` | ✓ | Decorative dividers only. 1.25 — never a control boundary |
| border-control | `#8E939F` | ✓ | Form field borders. 3.1 on paper, per WCAG 1.4.11 |
| danger | `#C0362C` | ✓ | Validation errors. 5.52 on paper |

All ten text styles match at the pixel: Display/XL 56/64 · L 40/48 · M 32/40 ·
Heading/L 24/32 · M 20/28 · Body/L 18/28 · M 16/26 · M Strong · S 14/22 ·
Label 14/22. The board states the fixed-line-height reasoning in the same terms
the work order does, and carries its own `UNDECIDED` flag noting that Ge'ez
cannot be previewed in Figma.

The board's Focus section confirms the ring exactly — *"Paper inner (2px), ink
outer (2px). The ring must contrast with the element, not only the surface"* —
and shows the two cases: an ink button on paper, and a **gold** button on the
navy surface, which is `.btn-gold`.

**One value is not on the board:** `rule-card` `#DDE1E8`, the Contained card's
border. It comes from work order §1.1 rather than from Foundations, so the
board lists nine colours and the build has ten.

### Component divergences, measured

Figma's dimensions come from the component set; mine from the rendered page at
1280px. **Adopted** means the code moved to Figma.

| Component | Figma | Was | Divergence | Outcome |
|---|---|---|---|---|
| Button | 50px tall | 46px | 10px vertical padding, not 12 | **Adopted** — `py-3`; secondary takes `py-[11px]` so its 1px boundary does not make it 2px taller in the same row |
| Field | 72px block | 76px | label→input gap | **Kept.** The 6px gap is the Amharic collision rule; the input itself must stay ≥44px. 4px, reported |
| Card/Contained | 24px padding | 20px | `md:p-5` | **Adopted** — `md:p-6`, and `card-open` follows |
| Tag/Marker | outlined pill, ink edge, paper fill, ink text | 8px radius, no edge, surface-2 fill, slate text | treatment | **Adopted.** This is the truthfulness control; Figma's outlined pill is the stronger reading of "must never be missed". Ink on paper is 17.4:1 |
| Tag/Status | filled pill, no edge | filled pill **with** edge | border | **Adopted** — dropped. Marker outlined, Status filled, which is a real distinction between the two kinds |
| Tag sizes | Marker 12/18 | 14/22 | type size | **Figma diverges.** The ruling is 14/22 for both; the code was already there. The Figma set is the artefact to update |
| Placeholder/Flag | dashed neutral on paper | dashed **gold** on gold tint | colour, padding | **Adopted.** Gold was wrong twice: the ruling permits none on an evidentiary page, and flags appear on Trust & Safety and all four legal pages |
| Placeholder/Media | dashed edge, no cross | solid edge, diagonal cross | both | **Split.** Took the dashed edge; **kept the cross.** Removing it weakens G11, and §0.2 says a design that weakens a guarantee is the thing that changes |

Two divergences were therefore left standing on purpose (Field, and the Media
cross), one is Figma's to fix (Tag size), and five were adopted.

**Compositions `9:24` is empty**, so there are still no page comps to compare
whole pages against — §2.3's guidance remains the only source for those, as the
work order said it would be.

---

## 3 · Phase C

### C1 · Tokens

**Changed:** `tailwind.config.ts`, `src/app/globals.css`, `src/lib/fonts.ts`,
`src/app/[locale]/layout.tsx`, `scripts/check-font.mjs` (new), `package.json`,
`tests/qa/design.spec.ts`, `tests/qa/headers-fonts.spec.ts`.

- Every colour is a `var()` into `:root` in `globals.css` — one definition. The
  nine colours plus the Contained border and the three danger values.
- The old utility names (`text-ink-muted`, `border-line`, `bg-surface-sunken`,
  `text-h3`, …) stay as **exact aliases** of the token they now mean, so the
  token layer changed under 200 class attributes without touching them. Each
  alias says what it resolves to; they go when no markup uses them.
- Ten text styles, fixed pixel line heights. `font-display` is Instrument Sans
  SemiBold with the same Ethiopic tail as the body stack.
- `rule` and `border-control` are separate. Form fields now sit at 3.08:1 —
  the existing 1.4.11 failure on the conversion path is closed.
- Instrument Sans through `next/font/google`, Latin subset, weight 600 only.

**Guards, each observed failing:**

| Guard | Broken by | Result |
|---|---|---|
| `check:font` display-face declaration | `weight: ['600', '700']` | exit 1: *weights are [600,700] — expected [600]* |
| Focus visible-edge assertion | ring reversed to ink inner, paper outer | **1 failed, 3 passed** — the submit button: *inner stop 1:1 against the element (rgb(14,26,51)), outer stop 1:1 against the page*. The input, the wordmark and the summary still had a visible edge, which is why the assertion is "either edge" and not "inner" |

Baseline before the reversal: the four focus cases pass on paper-inner/ink-outer.

**Font bytes, measured.** `/en/for-sellers` after the display face landed:

| File | Bytes |
|---|---|
| Inter, Latin | 48,432 |
| Instrument Sans SemiBold, Latin | 17,232 |
| **Total** | **65,664** |

The 80,000 cap in `headers-fonts.spec.ts` stays. It was set with headroom above
51,080; it now sits between the measured 65,664 and the next unwanted addition —
a second display weight is ~17,000 more and would fail it, which is the right
outcome. The switcher subset (2,648) fits inside the remaining room for the day
`AM_ENABLED` flips. D4 closes on that measurement.

**C1 verification (chromium):** design, fonts, axe, console, layout, G14 —
**282 passed, 1 failed**, and the failure was the new font assertion's own
regex: `U\+13` matched `U+131`, dotless i, on a correct face. Fixed to
four-digit Ethiopic blocks; the face was Latin-only and weight 600 throughout.

### C2 · Components

Every state of Button, Field, Card, Tag and Placeholder lives in
`globals.css` as a class, and the pages consume classes — so the component pass
is mostly the C1 stylesheet. Markup changed in two places:

- `src/components/ui.tsx` — `InfoCard` gains `contained` and `open`; the three
  retired names map to `contained` until no page uses them.
- `src/components/Header.tsx` — the menu trigger's border moves from `rule` to
  `border-control`: it is a control's boundary, and 1.4.11 applies.

| Component | States | Where |
|---|---|---|
| Button | Primary / Secondary / Gold-on-ink / Danger × default, hover, focus, disabled | `.btn-*`, `:focus-visible`, `.btn:disabled` |
| Field | default, focus, filled, error | `.input` `.select` `.textarea` `.input-invalid` |
| Card | Contained / Open | `.card` `.card-open` |
| Tag | Status / Marker | `.tag-status` `.tag-marker` (aliases `badge-beta`, `badge-example`) |
| Placeholder | Flag / Media | `.placeholder-flag` `.placeholder-media` |

**G11 baselines regenerated** in the pinned container after the deliberate
restyle — the flag's dashed edge is now gold (a shape, where gold is allowed on
paper) with ink text; the media box keeps its cross; the EXAMPLE stamp is Label
size. All three still read as unfinished at a glance.

**The control was then re-proven:** the flag tidied into a solid `rule-card`
border on `surface-2` — the designed-callout failure G11 exists for — compared
against the new baselines: **1 failed, 449 differing pixels** (ratio 0.03), the two
untouched images unchanged. The control survived the restyle.

### C3 · Pages

Five groups. Full suite after each, both engines, runtime recorded.

#### Group 1 — Home · How it works · For sellers (the conversion path)

**Changed:** `src/app/[locale]/page.tsx`, `src/components/ShopPreview.tsx`,
`src/app/[locale]/how-it-works/page.tsx`, `src/app/[locale]/for-sellers/page.tsx`.

- **Home** opens as §2.3 describes: Tag/Status, Display/XL, Body/L, primary +
  secondary (the secondary is the existing *How it works* label and route — no
  new copy). The three value items are Card/Open with generous spacing; the
  physical-goods block and the cohort block stay Contained, with Open items
  inside the cohort block and the second primary button.
- **The one ink surface** is `ShopPreview`: paper heading, on-ink connectors,
  each invented step a Contained card carrying its EXAMPLE marker. Once per
  page. The prow is D2.
- **How it works** and **For sellers** drop the retired card names; the form
  is neutral, Field components throughout, the error summary a list of links.

**A guarantee touched — by being triggered, not weakened.** The first full-suite
run after Home was composed failed axe on `/en` and `/am`: the ink surface's
text rules (paper headings, on-ink body) bled into the three Contained cards
nested inside it, which sit back on surface-2. Paper on surface-2 measured
**1.13:1**, on-ink on surface-2 **2.83:1**. G4 caught it on the first pass; a
screenshot did not. Fixed by stopping those rules at a nested card's edge.

#### Group 2 — For buyers · About

**Changed:** `src/app/[locale]/for-buyers/page.tsx`, `src/app/[locale]/about/page.tsx`.
Retired card names gone; the three buyer checks are a set and render Open, as
the value items do on Home. The founders' cards stay Contained around their
photo placeholders; both `UNDECIDED` flags are untouched.

Authored while group 1's suite was running, and then group 1's suite failed
on the ink-surface contrast above. Rather than run a sixteen-minute suite
twice for two alias renames and one grid, **one suite covers groups 1 and 2**
and is recorded as such.

**Suite (groups 1 + 2, both engines):** first run **799 passed, 8 failed, 1
skipped, 14.2 min**. Both failure clusters were the suite doing its job on my
own work:

- **The display-face test (2).** It asserted every loaded "Instrument" face is
  weight 600, and `next/font` also registers **`Instrument Sans Fallback`** —
  a local, metric-adjusted stand-in, always loaded, weight normal. The real
  faces were 600 throughout. The filter now excludes the fallback.
- **Keyboard focus, WebKit, the three form pages in both locales (6).** Native
  checkboxes and selects reported *neither outline nor ring*. WebKit paints no
  author `box-shadow` on native-appearance controls, so a ring built purely
  from shadow layers is invisible on exactly the controls in the site's only
  conversion, in Safari. **It had passed for two checkpoints only because
  Tailwind's `outline-none` leaves a 2px *transparent* outline behind and
  `focusIsVisible()` counted it.** Two fixes: the ring's ink stop is now a real
  `outline` at 2px offset over a 2px paper shadow — identical geometry to the
  spec's two layers, painted everywhere — and the helper no longer counts a
  transparent outline. The visible-edge assertion reads the outline as the
  outer stop.

Targeted re-run after both fixes — keyboard, design, fonts, **both engines**:
**243 passed, 1 skipped, 0 failed** (3.9 min). The reversal break was then
re-run under the outline mechanism, since the edge measurement's outline path
had only been exercised in the passing direction: **1 failed, 3 passed** — the submit button again, *inner stop 1:1 against the element, outer stop 1:1 against the page*. Same case, same numbers, through the outline path.

**A correction to the cadence.** Groups 3 and 4 were authored while this suite
was queued, and `next build` builds the working tree, not the git index — so
this run validated **groups 1 through 4**, whatever the staging said. It is
recorded as such and the four groups are committed together, because that is
what was tested. Group 5 gets its own build and suite.

Full suite, second run (groups 1–4, both engines): **805 passed, 2 failed, 1
skipped, 13.6 min (818 s)**. The two were the deletion journey's retired-class
selector, described under group 4; with the structural locator the journey
spec passes **8 of 8** in both engines against the same build. Effective:
**807 passing, 0 failing, 1 skipped.**

#### Group 3 — Trust & Safety · Prohibited Products (the evidentiary register)

**Changed:** `src/app/[locale]/trust-and-safety/page.tsx`,
`src/app/[locale]/prohibited-products/page.tsx`.

Paper ground, ink text, **no gold, no surfaces, no Contained cards**. Every
section on Trust & Safety is Card/Open: boundaries, verification, the ladder
(a table from `md`, Open rows below it), its notes, reviews, claims,
moderation, and the closing routes with no fill. Published statistics are a
**hairline-separated single-column list** rather than a grid of cards.
Prohibited Products follows: Open category cards, Open note block. The
`UNDECIDED` flag on the ladder thresholds is untouched, and the EXAMPLE marker
stays absent from the ladder — those level names are real.

Trust & Safety now reads plainer than Home. That contrast is the point.

#### Group 4 — Help · Contact · Report content · Delete account

**Changed:** `src/app/[locale]/contact/page.tsx`, `src/components/ReportForm.tsx`,
`src/components/ContactForm.tsx`, `src/components/WaitlistForm.tsx`,
`src/components/DeleteAccountFlow.tsx`.

Retired card names only — eight occurrences, every grey block is Contained.
Help's `<details>` accordion and its door are unchanged; the report-content
reason category stays a flagged placeholder; the deletion flow's markup is
untouched (its journey is G6's subject and nothing here may move it).

After this group, **no markup in `src` carries `card-sunken`, `card-tint`,
`variant="sunken"` or `variant="tint"`** — verified by grep. The aliases in
`globals.css` and `ui.tsx` are removed in group 5.

**Suite:** covered by the groups 1–4 run above. It found one coupling of its
own: the deletion journey's blocked-branch test located items by
`ul li.card-sunken`, a styling class the restyle retired, and failed in both
engines the moment the name went. A journey test coupled to a token asserts
the token. It now locates the list structurally (`main ul li`).

#### Group 5 — Four legal pages · 404

**Changed:** `src/components/LegalSections.tsx`, `src/app/[locale]/not-found.tsx`,
`src/app/globals.css`, `src/components/ui.tsx`.

- **Legal pages** — sidebar and body from `INDEX_POLICY`'s single section map:
  the contents list stacks above the body on a phone and becomes a sticky
  sidebar from `lg`; each section is Heading/M over Body/M with a hairline
  between; `Placeholder/Flag` for every undecided body, untouched. Evidentiary
  register — no gold, no surfaces.
- **404** — the numeral is Display/L in slate, Instrument Sans; the page stays
  inside 360px, which G1 walks.
- **Aliases retired.** `card-sunken` and `card-tint` are gone from `globals.css`
  and `InfoCard` has exactly two variants, `contained` (the default) and
  `open`. The old *utility* names (`text-ink-muted`, `border-line`, …) remain
  as documented aliases in `tailwind.config.ts`: renaming ~200 class
  attributes is rebuilding, not restyling, and each alias says what it is.

**Suite (group 5, both engines):** **807 passed, 0 failed, 1 skipped, 14.2 min
(855 s).** Green in both engines on every route.

### Screenshots

Chromium at 360px, the product's stated floor, captured by the layout spec on
the final build. There is no Figma component set to place beside them (D1).

| Page | File |
|---|---|
| Home — relational: Tag/Status, Display/XL, the one ink surface, Open value items | [`360-home.png`](./phase-c-screenshots/360-home.png) |
| How it works — Contained cards, EXAMPLE markers, media placeholders | [`360-how-it-works.png`](./phase-c-screenshots/360-how-it-works.png) |
| For sellers — the conversion form, `border-control` fields, error-summary form | [`360-for-sellers.png`](./phase-c-screenshots/360-for-sellers.png) |
| Trust & Safety — evidentiary: Open only, no gold, hairline list | [`360-trust-and-safety.png`](./phase-c-screenshots/360-trust-and-safety.png) |
| Terms — legal: contents list over a document, UNDECIDED flags | [`360-terms.png`](./phase-c-screenshots/360-terms.png) |
| 404 — Display/L numeral inside 360px | [`360-404.png`](./phase-c-screenshots/360-404.png) |

The full set (every route, both locales, both engines) is the `qa-artefacts`
artifact on every CI run.

---

## 4 · Everything else (work order §4)

### 4.1 `sharp` — still closed

`npm run check:assets` after the design pass: *no raster assets and no image
pipeline import (sharp 0.35.4 present but unreachable)*. The design pass added
no image files — the only new asset is a font, self-hosted by `next/font`, and
fonts do not touch sharp. SVG stays excluded; `tests/qa/icons.spec.ts` will
exercise that exclusion the day `icon.svg` lands.

### 4.2 The favicon — pipeline built, artwork not drawn

`tests/qa/icons.spec.ts` reads `src/app` and asserts the state the filesystem
implies: today, `/icon.svg`, `/apple-icon.png` and `/favicon.ico` are a plain
**404** and no page carries a `<link rel="icon">` to a file that is not there.
When the artwork is dropped into `src/app`, the same test asserts 200 with the
right content-type and the link present. Recorded as D5. **Run: 5 passed** on the 404 branch.

### 4.3 Founder biographies

Two of three are `UNDECIDED` flags. Not written. The About page's flag **is**
the G11 `undecided-flag` baseline, so its appearance is pinned, and G14 proves
the copy behind it renders from the catalogue.

### 4.4 Report content reason categories

Still a flagged placeholder inside an otherwise complete form
(`ReportForm.tsx`). Not invented. It renders through the same `UndecidedFlag`
component G11 pins.

### 4.5 Suite runtime

_(measured after group 5)_

### 4.6 Docs pass

Reconciled against what the code now does:

| Document | State | Change |
|---|---|---|
| `enforcement.md` | Rewritten to v1.2 in §0 above; G6, G11, G12, G14 rows current; focus-ring difference recorded | — |
| `engineering-notes.md` | Two entries added (§0 amendments) | — |
| `SECURITY.md` | Current: postcss accepted, `sharp` marked resolved with the override | none needed |
| `dpia-notes.md` | Current: three forms blocked on Article 22, analytics not personal data | none needed |
| `manual-qa.md` | **Overstated an open state**: still called Q-01 and Q-02 "expected failures". Both are closed | corrected — the suite is expected green |
| `README.md` | Stack table said tokens come from the v4.1 wireframes and listed two fonts | corrected — tokens are the `:root` definition; three fonts |
| `tests/qa/README.md` | Spec index | `messages.spec.ts` and `icons.spec.ts` added |

Nothing was found to overstate *enforcement*; one document overstated a gap.

---

## 5 · Suite runtime

| Run | Wall time | Note |
|---|---|---|
| Groups 1–2, first | 853 s (14.2 min) | 8 failures, all the suite's own |
| Groups 1–4, second | 818 s (13.6 min) | 2 failures, a selector |

| Group 5 | 855 s (14.2 min) | green |
| Closing rulings | 880 s (14.6 min) | green — **821 passed, 0 failed, 1 skipped**, up from 807 with the seven focus-pixel cases in both engines |

**CI on PR #14 (`e495cfb`) — green on all four jobs:**

| Job | Wall time |
|---|---|
| `verify` | 71 s |
| `snapshots` | 99 s |
| `qa (chromium)` | 497 s |
| `qa (webkit)` | 822 s (13.7 min) |

WebKit is the long pole, as expected — it is the engine carrying the focus
cases this work was written for. The matrix's wall time is 13.7 minutes, under
the fifteen §4.5 names.

All three under the fifteen minutes §4.5 names — **on this machine**, at
roughly 95% of it. CI is the number that decides it:

| CI job (PR #13, `b87df1a`) | Wall time | Result |
|---|---|---|
| `verify` | 467 s | green |
| `snapshots` (pinned container) | 396 s | green |
| `qa` — the browser matrix, both engines | **1,209 s (20.2 min)** | green |

**Decision: split.** The `qa` job now runs as one job per engine, in
parallel, through a matrix — every spec still runs in both engines; nothing
is thinned; wall time becomes the slower engine rather than the sum. The
split's own per-engine durations, from its first run (`3e83406`):

| CI job | Wall time | Result |
|---|---|---|
| `qa (chromium)` | 738 s (12.3 min) | green |
| `qa (webkit)` | 773 s (12.9 min) | green |
| `snapshots` | 103 s (image cached) | green |
| `verify` | 892 s | green |

The browser matrix's wall time is now the slower engine — **12.9 minutes** —
under the fifteen, with every spec still running in both.

---

## 6 · What complete looks like (work order §6)

| | State |
|---|---|
| Sixteen routes carrying a design system, in two registers | Done. Trust & Safety reads plainer than Home |
| Every ADU-WEB-03 guarantee green, none weakened | **821 passed / 0 failed / 1 skipped**, both engines. Three guards were *touched*: the focus assertion (now pixels, strictly stronger), the journey selector (a coupling, fixed) and G11's baselines (regenerated after a deliberate restyle, then re-proved). None weakened |
| `Placeholder` treatments still failing a snapshot when tidied | **602 pixels** against the regenerated baselines |
| Four blocked items still blocked, visibly flagged, not invented | No store, no deletion stub, no Ge'ez, no legal text |
| A decisions file listing every choice not made | **D1–D7** in `decisions-pending.md`. D1 corrected — it was my error, not a missing artefact. D4 closed by measurement; D2, D3, D5, D6 ruled; **D7 is blocked by GitHub's plan, not by engineering** |

The site still will not launch. What remains is a lawyer, a translator, an
illustrator, a domain, a second repository — and, if a red merge is ever to be
impossible rather than merely noticed, a GitHub plan that permits a required
check.

---

## 7 · Closing rulings (post-Phase-C)

### 7.1 Component comparison — done, §2 above

Five divergences adopted, two kept deliberately, one is Figma's. D1 corrected
and the mistake recorded rather than quietly fixed.

### 7.2 Focus asserted in pixels

`tests/qa/focus-pixels.spec.ts` replaces the property inspection as the
guarantee. Screenshot unfocused, focus, screenshot again, require a real change
in the 8px band outside the element. Seven controls, both engines, including
the native checkbox and select WebKit will not paint a box-shadow on.

| | Band changed |
|---|---|
| Signal, as built, 14 cases | **21.1% – 45.8%** |
| Noise, ring reduced to a transparent outline | **0.0% — zero pixels, all 14** |
| Interior, as built | 0.0% – 3.7% |

Threshold **0.10**, set from that, not from intuition. All three historical
failures paint nothing outside the element and land on exactly zero.

It needs no pinned container: it compares two screenshots from the same browser
seconds apart, so the platform cancels and it runs in the ordinary suite.

**One thing it caught in itself, before it caught anything else.** The first run
failed five WebKit cases at 6%. The cause was mine: the screenshot is in device
pixels and the element rect in CSS pixels, WebKit runs this suite at
`deviceScaleFactor` 2, so the element landed at a quarter of its area and most
of its interior was counted as band. The ratio was diluted about twelvefold. It
now scales by the measured image-to-clip ratio and is correct at any factor.

**G11 re-proved against the regenerated baselines.** The placeholders changed
deliberately, so the control had to be re-earned rather than assumed: the flag
tidied into a solid `rule-card` callout on `surface-2` fails at **602 differing
pixels**, the two untouched images unchanged.

### 7.3 Tag size — both sides now agree

The code was already at 14/22, so the divergent artefact was Figma. **It has
been updated:** the Marker's text node (`15:10`) moved from 12/18 to 14/22, and
the Marker variant now stands at 30px like Status. Verified by screenshot.

Two smaller differences are reported rather than changed, since the ruling
covered size: the Marker's letter-spacing (Figma 0%, code 0.06em) and its
vertical padding (Figma 4px, code 2px, which is why the built marker is 26px
against Figma's 30px). Recorded in D3 for whichever side is touched next.

### 7.4 The gold rule — corrected from a line to a phrase

The first rule said *gold carries the second line of a two-line display
headline*, and each part was a block so that "second line" was true of the
markup. **At 360px the headline reflows to four lines**, so "the second line"
became three of them and most of the headline went gold. A mechanism named where
the guarantee was semantic — the project's signature failure, in my own work.

> **Gold marks a phrase, not a line.** Choose the words once. They stay gold at
> every width, in every locale. The phrase names the outcome, and never exceeds
> roughly half the rendered headline at 360px.

Now one inline span and two catalogue strings, so the choice lives where a
translator can see it. Home takes the approved alternative split.

| Page | Gold phrase | Share at 360px |
|---|---|---|
| Home | "already knows you." | 30% |
| For sellers | "Stop losing the orders you're already getting." | 37% |
| For buyers | "This is where you buy from them." | 39% |

**Measured by rendered area, not character count** — and that mattered. On
characters, two of the three read 60% and 63% and would have prompted a rewrite
of approved copy; by the area they actually occupy at 360px all three are
comfortably under half, because the lead text wraps across more line-boxes than
its length suggests. The third time on this project that measuring a threshold
instead of estimating it changed the decision.

Carried into `src/messages/README.md`: the accent is translated as its own
phrase and **never derived positionally**, because Ge'ez reflows differently and
any positional rule lands on the wrong words.

### 7.5 The push trigger — the third gap closed at the trigger

The gap had no signal at all: a branch whose PR has closed still accepts pushes,
and under `pull_request` + `push: [main]` those pushes ran nothing. Not a red
run — no run, and nothing to notice.

`push` now fires on **every branch**, with the jobs split by cost rather than
duplicated across events:

| Job | Runs on | Cost |
|---|---|---|
| `verify`, `snapshots` | every push, every branch | ~3 min |
| `qa` (chromium + webkit) | `pull_request`, `main`, `workflow_dispatch` | ~22 min |

The split is deliberate arithmetic, not caution: the free private-repo allowance
is 2,000 minutes a month, and the matrix on every push would exhaust it in about
a fortnight. Assigning jobs to events rather than duplicating them also means a
push to a branch with an open PR — which fires **both** events — runs each job
exactly once, with all four attaching to the same commit.

**This matters more than an ordinary CI tweak because §7.6 means there is no
gate.** A trigger that always fires is the only available mechanism that does
not depend on a person remembering to look.

**⚠ And it does not reach the branches it was written for.** Reviewing the
change adversarially before shipping it — rather than waiting for it to fail —
turned up a blocking defect and two real bugs:

| Found | Severity |
|---|---|
| For a `push`, GitHub resolves the workflow from **the pushed commit's tree, not main**. Nine of the ten other branches still carry the old `push: [main]`; two have no workflow file at all. The incident is unchanged on every one of them | **blocking** |
| `cancel-in-progress` on `main`: two merges within ~14 minutes cancel the first merge's run mid-WebKit, leaving that commit with no verdict and a grey mark that reads like infrastructure noise | fixed |
| `workflow_dispatch` and `push` resolve `github.ref` to the same string, so a trivial push cancels a deliberately requested matrix — and the push run does not run `qa`, so nothing replaces it | fixed |
| While a PR has a merge conflict, no `pull_request` workflow runs; the push run still paints two green rows and the merge box reads "All checks have passed" with `qa` simply **absent** | documented, D8 |

The first is the important one, and its shape is the lesson: **verifying it
would have confirmed it.** Anyone checking pushes to the branch carrying the
change, sees the jobs run, and concludes it works everywhere. It works there.
The same error as reading one Figma node twice — a check performed where the
defect cannot appear.

**Verified live on PR #15**, which is also the first commit to exercise the new
design end to end:

| Run | Jobs | Result |
|---|---|---|
| `push` | `verify` 74 s, `snapshots` 106 s (`qa` skipped) | green |
| `pull_request` | `qa (chromium)` 509 s, `qa (webkit)` 783 s (`verify`, `snapshots` skipped) | green |

Both events fired for the same commit, each ran exactly its half, nothing ran
twice, and all four results attach to the same SHA. ⚠ **That proves the design,
not the rollout** — this is the branch carrying the change, which is the one
branch where it cannot fail.

The remedy is branch hygiene, not YAML, and it deletes shared state, so it is
recorded in **D8** with the branch-by-branch table rather than done here:
enable *Automatically delete head branches* (currently off), delete the seven
branches that outlived merged PRs, and decide about the two that never had a
PR at all. Verify by pushing an empty commit to an **old** branch.

### 7.6 Branch protection — **blocked, and the decision is the founder's**

`Settings → Branches` and repository rulesets both return **403: Upgrade to
GitHub Pro or make this repository public.** `Adulis-Socom` is an organization
on the **free** plan and the repository is **private** — the combination GitHub
excludes. The token has `repo` scope, so this is a plan limit, not permissions.

Making the repository public is forbidden while IP registration is incomplete.
So **there is no way to make a red merge impossible on this plan**, and the
compensating control is weaker than a gate:

**Reporting format, changed as ruled** — every report and PR now carries the PR
URL **and its check status**, so a red run must be stated rather than merely not
looked at.

Full detail and the two options in `decisions-pending.md` **D7**.

### 7.7 PR #13 merged green — and the next two commits had no CI at all

Worth recording, because it is the same class of gap as §7.5 wearing different
clothes.

**PR #13 was merged at `dacd097` with all four jobs green.** That is the process
working: a verified merge, and the first one on this project that can be shown
to have been verified.

But the closing-rulings work was pushed **after** that merge, and with the PR
closed there was no open pull request for the branch — so `9dfff9d` and
`65d1fe9` triggered **no CI run of any kind**. Not a red run: no run. Nothing
reports that, and nothing would have.

The branch is not the danger; the *appearance of coverage* is. A commit sitting
on a branch whose PR has closed looks exactly like a commit awaiting review.
Those two commits are now **PR #14**, with their own run.

Under branch protection this would be moot — the commits could not reach `main`
unverified. Without it (§7.6), the only control was noticing, which is precisely
the control that failed twice before. **§7.5 removes this shape entirely**: every
push now runs `verify` and `snapshots`, so there is no longer a way to add a
commit and get no signal.

### 7.8 The argument for the cadence

In `engineering-notes.md`: three of this phase's four findings had been present
for multiple checkpoints and were passing every check. None would have surfaced
without a phase that touched every route and re-ran everything after each group.

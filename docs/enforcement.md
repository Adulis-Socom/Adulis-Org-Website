# Enforcement — what each guarantee actually checks

Implements **ADU-WEB-03 v1.2**, which replaces §2.2 of the UI Work Order.

Every row states the **outcome** first, then what asserts it, then what it does
not cover. A guarantee appears here only after it has been **observed failing**
against a realistic change and passing again once restored.

> **The rule this file exists for:** the test asserts the mechanism, the
> guarantee is about the outcome. Nonce present, not *no unguarded inline
> execution*. Class name present, not *visibly flagged*. Colour stops present,
> not *pixels rendered*. Subset covers four codepoints, not *the stack resolves
> Latin-first*.

Three ways a guarantee fails while its test stays green, each learned here:

1. **The test asserts the mechanism rather than the outcome.** Above.
2. **The test cannot fail in the current configuration.** G9 was blind because no
   Ge'ez rendered on any English page.
3. **A threshold chosen by intuition is an unmeasured assumption wearing a
   number.** `maxDiffPixelRatio: 0.02` was plausible, correctly wired, and passed
   on the exact restyle the guarantee exists to catch — 231 differing pixels
   landed at precisely 0.02. **Measure the noise floor, then set the threshold
   from it.** In a pinned container two untouched renders differ by zero pixels,
   so any non-zero tolerance was slack nobody had quantified.

   This applies to every numeric threshold in the suite, not only snapshots —
   timeouts, retry counts, size budgets. If a number was picked because it felt
   right, it is a guess with a green tick beside it.

---

## Where this differs from ADU-WEB-03 v1.0

Four rows could not be implemented as written. Per the work order, the document
changes rather than the test — these are the differences, reported not resolved.

### G8 — "restricted to Ethiopic blocks" is false for a correct build

ADU-WEB-03 asks that the Ethiopic `@font-face` carry a `unicode-range`
restricted to Ethiopic blocks. Asserting that **fails on correct typography**.

`next/font` emits several faces under the family `Noto Sans Ethiopic`: Google
ships latin, latin-ext, cyrillic, greek and vietnamese subsets of that family
alongside the Ethiopic one, each a separate file with its own range. So the
family legitimately declares `u+00??`. It also legitimately claims **U+030E**, a
combining mark Ethiopic uses, which is outside every Ethiopic block.

**Implemented instead:** the *switcher subset* must be Ethiopic-only — that face
exists to serve four glyphs, and a wider range means English pages start
fetching it. Stack order is asserted separately, and G9 covers the download.

### G9 — currently cannot catch the regression it was written for

G9 passes today for a reason that will stop being true. With `AM_ENABLED` false
the switcher does not render, so **no Ge'ez appears on any English page at all**
and no Ethiopic file is fetched whatever the CSS says.

Verified: re-introducing the `:root` variable that caused the original 198 KB
regression **does not fail G9**.

**Added:** a direct assertion that Ge'ez outside the switcher's four codepoints,
injected into `/en`, fetches **zero** bytes. That holds in both flag states, and
it catches the original incident at 198,028 bytes.

### G3 — `target-size` needs its own pass

Enabling it through `.options({ rules })` alongside `.withTags()` **replaces
`runOnly` entirely**, so every axe rule runs, best-practice rules included. The
scan silently stops being "WCAG 2.1 AA" and becomes "everything axe knows" —
widening a guarantee by accident is the same error as narrowing one. It surfaced
`heading-order` on `/how-it-works`, which is a real finding but outside the
stated scope.

**Implemented instead:** a separate `runOnly: { type: 'rule' }` pass, so both
scopes stay exact.

### Focus ring (work order §1.2) — "inner tone" cannot be asserted literally

§1.2 asks that the inner stop contrast ≥3:1 with the element's own background.
**No single fixed ring satisfies that on both a paper input and an ink button**:
paper-inner fails the input, ink-inner fails the button. The ruling that made the
ring dual-tone was precisely that it must not need to know its context.

What the requirement protects against is a ring that merges on *both* edges — an
ink inner on the ink CTA, a paper outer on the paper page. Invisible.

**Implemented instead:** at least one edge is visible — the inner stop against
the element's background, or the outer stop against what surrounds it — in
addition to the existing stop-pair contrast. It fails the merged case on the CTA
and passes paper-inner/ink-outer on every element. Both measurements are
reported in the failure message. Observed failing by reversing the ring order.

**And the ring's outer stop is an `outline`, not a second shadow layer.** WebKit
paints no author `box-shadow` on native-appearance controls — checkboxes,
selects — so a shadow-only ring was invisible on the conversion form in Safari.
It had passed for two checkpoints because Tailwind's `outline-none` leaves a
2px *transparent* outline and `focusIsVisible()` counted it: a presence check
passing on nothing. The helper now ignores transparent outlines, and the outline
at 2px offset over a 2px paper shadow reproduces the spec's geometry exactly.

### G10 — the mechanism chosen, as the work order asked

A gitignored `.pseudo/am.json`, generated by `scripts/make-pseudo-locale.mjs`,
read only when `PSEUDO_AM_FILE` points at it, served by a **separate server
instance** on its own port.

Separate because setting that variable on the main server would make every
existing `/am` assertion read generated nonsense instead of the English fallback
they are written against. Two servers keeps both truths testable.

Three things stop it shipping: the path is gitignored, `check:env` refuses a
production build with the variable set, and the ordinary `/am` tests would fail
loudly if it ever leaked into the main instance.

---

## Enforced

| | Outcome | Asserted by | Does not cover |
|---|---|---|---|
| **G1** | Nobody scrolls sideways at 360px | `scrollWidth <= clientWidth`, every route, both locales, **including 404** | Viewports above 360px |
| **G2** | No sentence is cut off | `scrollHeight > clientHeight` fails on any text-bearing element with `overflow: hidden\|clip`, at 360px and desktop | Deliberate truncation with a visible affordance — needs an exemption, not a weaker assertion |
| **G3** | Every control is thumb-sized | `smallTargets()` geometry **plus** an axe `target-size` pass | Targets that meet the size but overlap in ways axe misses |
| **G4** | Usable with a screen reader and keyboard | axe, all routes, both locales, at **360px and 1280px** | Most of WCAG. Roughly a third of failures are machine-detectable |
| **G5** | An injected inline script does not run | The CSP header — nonce `script-src`, no `unsafe-inline` in any directive. Demonstrated unprompted: it blocked G11's own `page.addStyleTag` helper | — |
| **G6** | A person whose bundle never arrives can still submit | Waitlist, contact and report end-to-end with scripting off; **the deletion flow's five steps driven end to end** with an injected adapter — the ticket surviving three form-post boundaries in hidden fields, never reaching a cookie, unknown blocker reasons still rendering, a wrong code advancing nothing | Integration with the real deletion API. Condition 8 on the flag-flip checklist |
| **G7** | No visitor data reaches an unassessed party | Off-origin assertions on **every route, both locales** | — |
| **G8** | Latin renders from the Latin face | Computed `font-family` resolves Latin first; the switcher subset is Ethiopic-only | See the difference above |
| **G9** | `/en` does not pay 198 KB | `headers-fonts`, plus the stray-Ge'ez assertion added here | See the difference above |
| **G10** | Amharic does not overflow, clip or box | A generated pseudo-locale at +48%, every route, asserting no scroll, no clipping, and that the full Ethiopic face loaded | **Real translation.** Word order and break opportunities differ. This does **not** clear the Ge'ez validation launch gate |
| **G11** | An undecided item looks unfinished | Pixel snapshots of the EXAMPLE badge, the media placeholder and the UNDECIDED flag, `maxDiffPixels` 20 — measured, see below. Its own CI job, in the same container `npm run qa:snapshots` uses, because `ubuntu-latest` ships a different font set. Baselines regenerate only on a deliberate restyle, and the tidy-callout break test is re-run against every new baseline | Anything but that image, where it skips loudly rather than comparing against a baseline it cannot trust |
| **G12** | An illustrative card is legibly marked | Computed contrast ≥ 4.5, non-zero rendered size, opacity, visibility — **and** the same pixel baseline as G11, so its appearance is held, not only its legibility | — |
| **G13** | Four accepted libvips CVEs stay unreachable | `check:assets` fails when `next/image`/`next/og` is imported or a raster file exists under `public/`/`src/`, while `sharp` < 0.35.0 | SVG, verified excluded: `icon.svg` is served byte-identical and is not routed through sharp |
| **G14** | No visitor reads a message key as body copy | `messages.spec.ts`: every route, both locales; no visible text, placeholder or `<option>` token begins with a top-level `en.json` namespace followed by a dot. Anchored to the catalogue's own keys, not a generic dotted-identifier pattern, which false-positives on domains. **Observed failing** with `common.onThisPage` deleted: 8 tests, the four legal pages in both locales, naming the key | Keys that render only after an interaction the walk does not perform — the deletion journey carries its own copy of this check for that reason |

---

## Not enforced, and why

| Property | Why not | Closes when |
|---|---|---|
| Real-device performance | Lighthouse models CPU and network, not memory pressure, thermals or an Android rendering path | A physical low-end Android on an Addis connection |
| Deletion API integration | The four endpoints do not exist | `adulis-platform` ships them |
| Real Amharic layout | G10 is synthetic | Translation lands, then a human pass |
| Live form submission | No store provisioned — blocked on the Article 22 opinion | The opinion lands and a store is chosen |

---

## Adding a guarantee

1. State the **outcome** a person would observe. Not the mechanism.
2. Write the assertion.
3. **Break the thing it protects. Watch it fail. Restore.**
4. Add the row, with what it does not cover.

Step 3 is not optional. Every enforcement failure on this project would have
been caught by it — including two found *during* this phase.

A focus test that counted colour stops and passed on a collapsed ring, because
Tailwind still emits the offset layer at zero spread.

And the deletion flow, which is the cleanest example this file has. `check:copy`
asserted every form carries an `action` and none uses `onSubmit`. It passed.
Meanwhile the page rendered its terminal *"Your account has been deleted"* panel
to anyone who merely opened it — `initialDeletionState` was a plain object
exported from a `'use server'` module, so it arrived at the component as a server
reference with no fields, and every step check fell through. Typechecked, built,
shipped-looking. Two catalogue keys were also missing, and `next-intl` renders a
missing message as its own key path, so `phone.intro` would have appeared as body
copy to a store reviewer.

Neither was visible until the journey was actually driven. The `action`
attribute was the mechanism; whether a person can delete their account was the
guarantee.

And a third, in the G11 snapshots, which is the subtlest of them. The tolerance
was set to `maxDiffPixelRatio: 0.02` — a number chosen by intuition as "small but
not zero". Restyling `.placeholder-flag` from a dashed amber box into a solid
grey callout, *precisely* the change the guarantee names, produced **231
differing pixels: a ratio of 0.02**. It passed. The guard was sitting exactly on
top of its own signal, and every part of it was otherwise correct — right
element, right image, right platform.

Measuring instead of guessing settled it: two untouched images differ by **0**
pixels in the pinned container. Noise floor zero, signal 231, tolerance now 20.

**A threshold nobody has measured is a guess, and a guess is as likely to sit on
the signal as beside it.** Step 3 is what turns it into a number.

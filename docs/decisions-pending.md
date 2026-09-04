# Decisions pending

Choices this run could not make. Each entry states the options and what each
would cost, so the person who can decide has what they need without re-deriving
it. Nothing here was resolved in code.

Written during the unattended Phase C run, 4 September 2026. The rule it follows
is §0.2 of the Phase C work order: **never invent to unblock yourself.**

---

## D1 · The Figma file is empty at the key supplied

**Observed:** `hndzWhYFqg1kLwCaUr0asC` contains one page, "Page 1", with zero
nodes and a canvas of 0×0. No Foundations board, no Components, no
Compositions, no variables reachable.

The work order describes 45 variables, 10 text styles and five component sets in
that file. They are not there — either the key is a different file, the system
was built in a branch that has not been merged, or it was never saved to this
file.

**What was done instead.** Phase C proceeded from the textual specification,
which the work order says governs on any conflict (§0.2 item 3): §1 token
changes, §2.1 type scale, §2.2 registers, §2.3 composition guidance, plus the
palette and derived tokens from the Design Direction and Token Rulings documents.
Every value is recorded in `src/app/globals.css` with its source.

**Consequence for §5.3 of the work order** ("screenshots against the Figma
component sets"): there is nothing to compare against. `docs/phase-c-report.md`
carries screenshots of the built components alone.

**Decision needed:**

| Option | Cost |
|---|---|
| Supply the correct file key or branch | None beyond a re-check that the built tokens match the Figma variables |
| Confirm the file is genuinely empty and the text spec is the system of record | The Figma build (Phase B) is redone or dropped. `docs/phase-c-report.md` already documents what was built |

---

## D2 · The mark's double-curl prow on the ink surface

**Specified:** the mark's double-curl prow becomes the top edge of the single
ink surface on relational pages, used once per page.

**Not done.** The mark's vector is not in this repository, and no favicon or
logo asset exists (see D5). Drawing an approximation of brand geometry is
inventing — the same class of error as a placeholder icon that silently becomes
the brand mark.

**What exists:** `.surface-ink` is complete and positioned (`relative`), so the
prow drops in as a `mask-image` on a `::before` pseudo-element without changing
markup.

| Option | Cost |
|---|---|
| Supply the mark as SVG | One CSS rule and a G11-style baseline for the surface |
| Ship the surface with a straight top edge | Nothing further; the "one bold element" is absent until the mark lands |

---

## D3 · Tag text size

The Figma system has ten text styles and the smallest is Label, 14/22. The
EXAMPLE marker and the beta chip were 11px. There is no eleventh style, and
introducing one is a design decision.

**Done:** both tags are set at Label size with tracking. Slate on surface-2 is
5.56:1, above the 4.5 a marker needs, and the marker no longer needs a size
exemption of its own.

| Option | Cost |
|---|---|
| Accept Label-sized tags | None |
| Add a Tag text style below Label | A new style in Figma and here, and a contrast re-check at the smaller size |

---

## D4 · The English font byte budget

`tests/qa/headers-fonts.spec.ts` caps total font bytes on `/en` at 80,000,
set when the page carried ~51,000. Instrument Sans adds one file. The number
was **measured** rather than assumed: Instrument Sans SemiBold adds 17,232
bytes for a total of **65,664**. The cap stays at 80,000 — it now sits between
the measured value and the next unwanted addition (a second weight, ~17,000,
would fail it). **Resolved by measurement; no decision needed.**

---

## D5 · The favicon artwork

The icon commission has not landed. Per work order §4.2 the pipeline is built
and tested and the artwork is **not** drawn — a placeholder icon cannot be
visibly flagged and silently becomes the brand mark.

| Option | Cost |
|---|---|
| Deliver `src/app/icon.svg` and `src/app/apple-icon.png` | Drop-in; the tests flip from expecting a deliberate 404 to expecting 200 |
| Keep shipping no icon | A console 404 on every page and a dented best-practices score, both visible on purpose |

---

## D6 · Which words of the Home headline are gold

§2.3: *Display/XL headline with the second line in gold.* The headline is one
catalogue string — "Sell where your audience already knows you." — and where it
breaks depends on viewport and, later, on the Amharic translation. Choosing the
words that carry the gold is a copy decision, not a styling one.

**Done:** the headline renders whole at Display/XL in ink. `.display-gold` is
defined and unused.

| Option | Cost |
|---|---|
| Name the accent span in the catalogue (e.g. `home.headingAccent`) | One key in `en.json`, one `<span>`, and the same decision again when the Amharic lands |
| Keep the headline in one tone | None; the gold display type appears on the ink surface instead |

---

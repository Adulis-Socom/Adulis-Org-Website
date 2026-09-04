# Decisions pending

Choices this run could not make. Each entry states the options and what each
would cost, so the person who can decide has what they need without re-deriving
it. Nothing here was resolved in code.

Written during the unattended Phase C run, 4 September 2026. The rule it follows
is §0.2 of the Phase C work order: **never invent to unblock yourself.**

---

## D1 · ~~The Figma file is empty at the key supplied~~ — RESOLVED, and I was wrong

**The file is not empty. I queried the wrong node and stopped.**

The link ends `?node-id=0-1`, and `0:1` is a genuinely empty page called
"Page 1". Asking the tool for the document's pages returned **only that page**,
so both readings agreed and I concluded the file was empty. It was not: the
work is on pages the listing did not return — Components `9:22`, Foundations
`9:23`, Compositions `9:24` (that last one genuinely empty).

**What the mistake was, precisely:** an absence of evidence from one incomplete
listing, treated as evidence of absence, when a second query would have settled
it. The same shape as every other defect this project has recorded — a check
that reported truthfully about the wrong thing.

Everything below is retained as originally written, because what was built from
the text specification is what shipped, and the comparison against the real
Figma sets is in `docs/phase-c-report.md`. The tokens matched exactly; five
component divergences were found and are reported there.

### What was originally recorded

**Observed:** `hndzWhYFqg1kLwCaUr0asC` appeared to contain one page, "Page 1",
with zero nodes.

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

**Resolved.** No decision needed.

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

**RULED: defer, and do not approximate it.** The prow is derived from the mark,
and the vector redraw has not been commissioned. Drawing an approximation now
means either replacing it later or shipping something that is nearly the brand.
The ink surface keeps a plain top edge.

It is **one drawing serving three purposes** — the app icon, the trademark
vector, and this edge — so it is pending against the same commission as D5, not
a separate piece of work.

---

## D3 · Tag text size

The Figma system has ten text styles and the smallest is Label, 14/22. The
EXAMPLE marker and the beta chip were 11px. There is no eleventh style, and
introducing one is a design decision.

**Done:** both tags are set at Label size with tracking. Slate on surface-2 is
5.56:1, above the 4.5 a marker needs, and the marker no longer needs a size
exemption of its own.

**RULED: 14px for both variants.** 12/18 is below the comfortable floor for a
low-end Android at arm's length, and `EXAMPLE` is a truthfulness control — the
one label that must never be missed. Marker and Status are both Body/S, 14/22.

The code was already at 14/22 and needed no change. **The Figma Tag set was the
side that diverged**, and it has been updated: node `15:10` (the Marker's text)
moved from 12/18 to 14/22, so the Marker variant is now 30px tall and matches
Status. Done, not pending.

Two smaller differences were **left and are reported rather than changed**,
because the ruling covered size:

| | Figma | Code |
|---|---|---|
| Marker letter-spacing | 0% | 0.06em (0.84px at 14px) |
| Marker vertical padding | 4px | 2px |

The second makes the built marker 26px against Figma's 30px. Neither is worth a
baseline regeneration and a fifteen-minute suite on its own; both are worth
fixing on whichever side is touched next.

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

**RULED: founder commission, not an engineering decision.** The pipeline is
built and the deliberate 404 is correct until the file exists. Delivering
`src/app/icon.svg` and `src/app/apple-icon.png` flips `tests/qa/icons.spec.ts`
from asserting a 404 to asserting 200 with no code change. Carries D2 with it.

---

## D6 · Which words of the Home headline are gold

§2.3: *Display/XL headline with the second line in gold.* The headline is one
catalogue string — "Sell where your audience already knows you." — and where it
breaks depends on viewport and, later, on the Amharic translation. Choosing the
words that carry the gold is a copy decision, not a styling one.

**Done:** the headline renders whole at Display/XL in ink. `.display-gold` is
defined and unused.

**RULED, as a rule rather than a per-page judgement:**

> **Gold carries the second line of a two-line display headline, never the
> first.** The first line names the subject. The second names the outcome — the
> thing the reader is being offered. One gold phrase per page keeps it
> meaningful.

Relational pages only, display sizes only (gold on paper is 3.24:1, which needs
≥24px). **No gold on any evidentiary page, headline included.**

**Applied** to the three relational headings that are genuinely two-part, each
split into `heading` + `headingAccent` and rendered by one `DisplayHeading`
component:

| Page | Subject | Outcome, in gold |
|---|---|---|
| Home | "Sell where" | "your audience already knows you." |
| For sellers | "You already have the audience." | "Stop losing the orders you're already getting." |
| For buyers | "You followed them." | "This is where you buy from them." |

*How it works* ("How Adulis works") and *About* ("Why we're building Adulis")
are single-part and take no gold. Trust & Safety and Prohibited Products are
evidentiary and take none by rule.

⚠ **Where each line breaks is a copy judgement**, and it is the one part of this
that was not ruled.

Home's is worth a look before it settles. `Sell where` is two words, so at 360px
the gold runs to **three of the headline's four lines** — see
`docs/phase-c-screenshots/360-home.png`. It obeys the rule exactly (gold carries
the second line) while sitting oddly against *"one gold phrase per page keeps it
meaningful"*. On desktop at 56px it is one ink line over one gold line, which is
what the rule describes.

The alternative split, `Sell where your audience` / `already knows you.`, is
balanced at both sizes and puts the emphasis on the relationship rather than on
the whole claim. It is two catalogue strings either way, and I have left the
ruled reading in place rather than substitute my own.

---

---

## D7 · Branch protection cannot be configured on this repository

**Blocked, and not by me.** The ruling asks for `Settings → Branches → main`
with a required status check. That feature returns **403** here:

> Upgrade to GitHub Pro or make this repository public to enable this feature.

Repository rulesets, the modern replacement, return the same. `Adulis-Socom` is
an **organization on the free plan** and the repository is **private**, which is
the combination GitHub excludes. The token used has `repo` scope, so this is a
plan limit and not a permissions problem.

**The two documented ways out are both decisions, not engineering:**

| Option | Cost |
|---|---|
| A paid GitHub plan for the org | A subscription. Restores required checks, and is the only option that makes a red merge *impossible* |
| Make the repository public | **Forbidden today** — IP registration is incomplete and `README.md` says the repo must stay private |

**What exists in the meantime is a compensating control, not enforcement:** the
reporting format now requires the PR URL **and its check status**, so a red run
has to be stated rather than merely not looked at. That is weaker than a gate
and should not be mistaken for one — nothing currently prevents a third
unverified merge.

**A third shape of the same gap turned up within the hour.** PR #13 was merged
green — correctly — and the next two commits were pushed to the branch after it
closed. With no open PR, they triggered **no CI at all**: not a red run, no run.
A commit on a branch whose PR has closed is indistinguishable, at a glance, from
one awaiting review. They are now PR #14. A required status check makes the
whole category impossible; noticing does not.

---

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

## D6 · Which words are gold

§2.3 asked for *a Display/XL headline with the second line in gold*, leaving
open which words carry it — a copy decision, not a styling one.

**RULED — and then corrected, because the first rule was a mechanism.**

The first version said *gold carries the second line of a two-line display
headline*. That is a **visual line**, and at 360px the headline reflows to four:
"the second line" became three of them, most of the headline went gold, and the
emphasis was gone. The same failure this project keeps recording — naming the
mechanism when the guarantee is semantic.

> **Gold marks a phrase, not a line.**
>
> Choose the words once. They stay gold at every width, in every locale. The
> phrase names the **outcome** — what the reader is being offered, not the
> subject — and is short enough that it never exceeds roughly half the rendered
> headline at 360px.

Relational pages only, display sizes only (gold on paper is 3.24:1, which needs
≥24px; every size this renders at is 32px or more). **No gold on any evidentiary
page, headline included.**

**Implemented** as two catalogue strings and one inline span, so the choice
lives where a translator can see it rather than in a CSS rule reflow can break:

| Page | Subject | Outcome, in gold | Gold share at 360px |
|---|---|---|---|
| Home | "Sell where your audience" | "already knows you." | **30%** |
| For sellers | "You already have the audience." | "Stop losing the orders you're already getting." | **37%** |
| For buyers | "You followed them." | "This is where you buy from them." | **39%** |

All three clear the half constraint. **Measured, not estimated** — by rendered
area at 360px, counting the line-boxes each part actually occupies. A character
count had put two of them at 60% and 63% and would have prompted a needless
rewrite of approved copy; the lead text wraps across more line-boxes than its
length suggests. Same lesson as the snapshot tolerance and the focus threshold.

*How it works* ("How Adulis works") and *About* ("Why we're building Adulis") are
single-part and take no gold.

⚠ **Carried into the translation brief** (`src/messages/README.md`): the accent
must be translated as its own phrase and **never derived positionally**. Ge'ez
reflows differently again, so "the second line" or "the last N words" would land
on the wrong words. If Amharic word order puts the outcome first, the component
takes its parts in a fixed order and would need changing rather than the copy
being bent to fit.

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

**Three options, and the third is not one:**

| Option | Cost |
|---|---|
| **GitHub Team** | A small per-user monthly fee — check current pricing. Enables required status checks on private repos, and is the only option that makes a red merge *impossible* |
| Compensating controls only | What exists now. Reporting is not a gate |
| Make the repository public | **Forbidden.** Nothing goes public before the trademark filing |

**The upgrade is evidenced rather than theoretical.** Two unverified merges have
already reached `main`, and the platform repository will need the same control
shortly. Roughly the cost of a coffee a month against a defect class that has
fired twice in six weeks.

**What exists in the meantime is a compensating control, not enforcement:** the
reporting format now requires the PR URL **and its check status**, so a red run
has to be stated rather than merely not looked at. That is weaker than a gate
and should not be mistaken for one — nothing currently prevents a third
unverified merge.

**A third shape of the same gap turned up within the hour.** PR #13 was merged
green — correctly — and the next two commits were pushed to the branch after it
closed. With no open PR, they triggered **no CI at all**: not a red run, no run.
A commit on a branch whose PR has closed is indistinguishable, at a glance, from
one awaiting review.

**That shape is now closed at the trigger.** `push` fires on every branch, with
`verify` and `snapshots` on every push (~3 min) and the expensive matrix still
limited to pull requests and `main` (~22 min, against a 2,000-minute monthly
allowance). Every push produces a signal, so the one shape a human could not
catch no longer exists. See `docs/phase-c-report.md` §7.5.

The other two shapes remain possible: a required status check is what makes them
impossible, and noticing is what is left until the plan allows one.

---

---

## D8 · The push trigger does not reach the branches it was written for

**Found by adversarially reviewing the trigger change, not by it failing.** It
would have shipped looking correct, and the way it fails is self-concealing.

### The mechanism

For a `push` event, **GitHub resolves the workflow file from the tree of the
pushed commit, not from `main`.** A branch created before this change still
carries the old `push: [main]`, so a push to it still matches nothing and still
runs nothing — which is the incident, unchanged.

State of the repository the day the change was written:

| Branch | `ci.yml` push trigger | PR | Last commit |
|---|---|---|---|
| `main` | `[main]` → `['**']` after merge | — | 2026-09-04 |
| `feat/checkpoint-4` | `['**']` (carries the change) | #10–14, all merged | 2026-09-04 |
| `ci/qa-blocking` | `[main]` | #6 merged | 2026-08-24 |
| `feat/backend-checkpoint-1` | `[main]` | #7 merged | 2026-08-26 |
| `feat/checkpoint-2` | `[main]` | #8 merged | 2026-08-26 |
| `feat/checkpoint-3` | `[main]` | #9 merged | 2026-08-26 |
| `test/qa-automation` | `[main]` | #5 merged | 2026-08-24 |
| `feat/initial-build` | **no workflow file at all** | #3 merged | 2026-08-23 |
| `audit/security-01` | **no workflow file at all** | none ever | 2026-08-23 |
| `fix/security-triage` | `[main]` | none ever | 2026-08-23 |

**Eight of the nine branches besides `main` still reproduce the incident**, and
two of them can never produce a signal from any trigger change, because their
tree holds no workflow file. Six are branches that outlived a merged PR — the
exact shape — and two never had a PR at all, which is the *first* shape.

### Why it is self-concealing

Anyone verifying the fix will push to the branch that carries it, watch
`verify` and `snapshots` run, and conclude it works. It does — there. That is
the same error as reading one Figma node twice: **a check performed where the
defect cannot appear.**

### The fix is branch hygiene, not YAML

No trigger design can reach a tree that does not contain it.

1. **Enable *Automatically delete head branches*** (`delete_branch_on_merge`,
   currently **false**). The incident is "a branch outlives its PR"; deleting
   the branch at merge removes the shape outright, which no workflow edit can.
2. **Delete the six stale merged branches.** Their PRs are merged and their
   content is in `main`. While they exist they are push targets that produce
   no signal.
3. **`audit/security-01` and `fix/security-triage` never had a PR.** Decide
   whether they hold anything wanted; if so, open a PR, and if not, delete them.
4. Verify by pushing an empty commit to an **old** branch — never to the branch
   carrying the change.

⚠ **Not done here, because all of it deletes or reconfigures shared state.**
Steps 1–3 are the founder's to run; the reasoning and the exact list are above
so it is a few minutes of work rather than an investigation.

### One shape the trigger cannot close either

While a pull request has a **merge conflict**, GitHub runs no `pull_request`
workflows at all — `refs/pull/N/merge` cannot be computed. The push run still
goes green on `verify` and `snapshots`, both attach to the head SHA, and the
merge box reads **"All checks have passed"** with `qa` absent rather than red
or pending.

Under the old triggers that PR showed an *empty* check list, which is visibly
wrong. This change replaces it with two reassuring green rows — absence
rendered as green, which is the presentation a human control cannot catch.

The exposure is narrow: resolving a conflict is a push to the head branch,
which re-fires everything. It is real only when a base-side change removes the
conflict with no head push. Closing it properly needs a job that asks the API
whether the head SHA has completed `qa` check runs — more machinery than this
repository has wanted so far, and pointless next to simply having a required
status check (D7). Documented rather than built.

---

# Landing rehearsals

Three artefacts are being made elsewhere — a vector mark, an Amharic
catalogue, four legal bodies. Each returns as a file that has to drop into code
that already exists.

**A rehearsal puts a stand-in where the real artefact will go, runs everything,
and records what broke.** Doing that now costs a branch. Doing it after a paid
artefact arrives costs a follow-up round with a supplier.

⚠ **Nothing here is the real thing.** No icon was drawn, nothing was
translated, no legal sentence was written, no report taxonomy was invented.
Every stand-in is deliberately, visibly fake, and §4 below confirms none
survived.

---

## 1 · D8 — branch hygiene

The trigger fix was not true until this landed: nine of ten branches carried
`push: [main]` and two had no workflow file at all, so a push to any of them
still produced **no run**.

### 1.1 Automatic head-branch deletion — **enabled**

`delete_branch_on_merge` was `false`; it is now `true`. This is what stops the
third failure shape recurring rather than being cleaned up repeatedly: the
incident is "a branch outlives its PR", and deleting the branch at merge
removes the shape outright.

### 1.2 Verified where the defect lives, in both directions

This is the part worth having done. `test/qa-automation` — merged PR #5, last
touched 24 August — was used as the proving ground before deletion.

| Step | Result |
|---|---|
| Push an empty commit to the stale branch **as it was** | **Zero runs.** Not a red run, no run |
| Push again with the new `ci.yml` carried into its tree | **A run fired**: `verify` green, `snapshots` red, `qa` correctly skipped |

Both halves matter. The first reproduces the incident on the branch where it
actually lives, rather than on the branch carrying the fix — which is the
self-concealing check D8 warns about. The second proves the rollout step works.

**The red `snapshots` is not a problem; it is the point.** That August tree
predates the G11 baselines and the whole restyle, so it genuinely differs from
`main` — and CI now *says so*, where before it said nothing at all. A signal
that can be red is the thing that was missing.

### 1.3 Seven branches deleted

All seven had merged PRs and were **0 commits ahead of `main`** — nothing was
lost. Tips recorded so any deletion is reversible from this file alone:

| Branch | PR | Tip at deletion |
|---|---|---|
| `ci/qa-blocking` | #6 | `23b79b3666` |
| `feat/backend-checkpoint-1` | #7 | `ed57c395f8` |
| `feat/checkpoint-2` | #8 | `43c93bc457` |
| `feat/checkpoint-3` | #9 | `7179687f60` |
| `feat/checkpoint-4` | #10–14 | `d7bcf8400c` |
| `feat/initial-build` | #3 | `15ec005daa` |
| `test/qa-automation` | #5 | `eb261fe692` (includes the two probe commits) |

### 1.4 The two with no PR — **not deleted, and the facts say why**

Both were reported rather than guessed at, as instructed:

| | `audit/security-01` | `fix/security-triage` |
|---|---|---|
| Commits ahead of `main` | **0** | **0** |
| Commits behind | 62 | 45 |
| Files differing from the merge base | **none** | **none** |
| Last commit | `7ede09f`, 2026-08-23 | `e75d7d8`, 2026-08-23 |
| Author | Naod Solomon | Naod Solomon |
| Subject | *docs: security audit 01 — report only, no fixes* | *docs: mark every audit finding with its triage outcome* |

**Nothing is unique to either branch.** Their content reached `main` by another
route, so deleting them is provably lossless — but the work order asked for a
decision rather than a guess, and the decision is not mine. Both remain, and
both are still carriers of a stale workflow until deleted.

⚠ `audit/security-01` has **no workflow file at all**, so no trigger change can
ever give it a signal. It is the one branch where the fix is not merely absent
but impossible.

---

## 2 · The translator handoff pack

`docs/translation-pack/` — 601 strings, plus everything a translator needs that
a flat list cannot carry.

| File | What it answers |
|---|---|
| `en.json` | The catalogue, byte-identical to what the site reads |
| `context.md` | Where every string appears: route and element type, 21 namespaces |
| `glossary-candidates.md` | Recurring terms, their frequency and their keys — **no Amharic proposed** |
| `accent-pairs.md` | The three split headlines, shown as pairs with their gold share |
| `length-sensitive.md` | Measured headroom at 360px, banded |

### 2.1 The measured answer — 24 strings

`length-sensitive.md` measures the headroom of every rendered string at 360px
and bands it. **408 of 601 strings** matched a rendered element; the rest are
error messages, success states and later deletion-flow steps that no static page
load renders.

| Band | Count | Meaning |
|---|---|---|
| Under 15% headroom | **133** — of which **24 are single-line** | Tight |
| 15–60% | 192 | Normal |
| Over 60% | 83 | Length is not a constraint |

**The number that answers the brief is 24.** Those are single-line strings with
under 15% slack — section titles, card headings and short bodies that already
fill a 312px line. They have nowhere to grow. The other 109 in the tight band
wrap, so a full line is not a full container; paragraphs grow downward and every
container here is built for it.

The brief currently asks the translator to *"flag it if a string runs long."*
They cannot know which containers are tight. This converts that into a list of
twenty-four.

⚠ **Two caveats, both in the file the translator reads.** The measurement is
English, and Ge'ez is wider at the same point size, so real headroom is smaller
than shown — the bands are an ordering, not a budget. And the tight band is not
dominated by buttons and form labels as the work order expected: it is dominated
by **card titles and one-line bodies**. Buttons sit in generously sized blocks
and mostly land in the normal band. Worth knowing before the brief goes out,
because it changes which strings to warn about.

### 2.2 Two measurement errors, both caught by a suspicious number

The first version measured each string against **its own element's box**. Most
text on this site sits in a shrink-to-fit box — an inline link, a flex item, a
pill — whose width *is* its text width, so headroom came out at exactly 0% for
**101 strings**. A file of 101 equally-urgent strings would have been worse than
no file: it would have sent a translator compressing headings that have room.

The second version walked up to the nearest block, and still landed on flex
*items*, which shrink-wrap too. The third walks past any box whose parent sizes
it, and stops at the first box in normal block flow — the one the text actually
has to fit.

Both were caught the same way: **a suspiciously round number repeated across
unrelated strings.** Not by the test failing — it passed every time.


---

## 3 · The rehearsals

All three ran on `rehearsal/landings`, which is **never merged**. What came off
it is in §3.5.

### 3.1 The icon landing — clean, with one design error in my own slot

Stand-in: a grey square SVG carrying the word `TEST`. Not a vessel, not gold,
not navy.

| Check | Result |
|---|---|
| `src/app/icon.svg` serves 200, `image/svg+xml` | pass |
| Served bytes are the source bytes | pass — proof it is not routed through an image pipeline, which is the premise the `sharp` CVE acceptance rests on |
| `check:assets` does **not** trip | pass — the SVG exclusion is correct |
| CSP permits it, no failed request in a real browser | pass |
| A `rel="icon"` link appears once the file exists | pass |
| Removing it restores the deliberate 404 | pass — `icons.spec.ts` reads filesystem state, so this needs no code change |

**The prow slot is built.** A masked band on the ink surface, off until a
drawing exists. When `prow.svg` arrives it is a file drop plus one rule:
`:root { --prow: url('/prow.svg'); --prow-on: 1; }`. Verified with an inline
path at **360px and 1440px** — the band turns on and spans the surface at both.

⚠ **The first version of the slot did not work, and the rehearsal is the only
reason I know.** It switched on a *descendant* selector, when the variable is
set on the surface itself. It would have shipped as a slot that silently
ignored the drawing. It now uses a companion variable, where there is no
selector to get wrong.

### 3.2 The Amharic landing — one defect, and it is not in Amharic

Stand-in: a full synthetic catalogue generated from `en.json` by the G10
pseudo-locale generator — 613 strings, **96% longer**, padded with Ge'ez —
written to the real catalogue location, with the flag flipped on.

**Full suite, both engines: 755 passed, 80 failed, 16.0 minutes.** The eighty
sort into three groups, and only one is a defect.

#### The defect: one undersized tap target, on every route

**The `EN` link in the language switcher renders at 27 by 44 pixels** — under
the 44 by 44 invariant on its width. It fails the 360px layout check on **every
route in both locales**, which is 66 of the 80 failures from a single cause.

It has never been catchable. The switcher does not render while the flag is
false, so the target has not existed to be measured. It would have appeared the
day Amharic landed, on every page.

#### What did not break, which is the more surprising half

| | |
|---|---|
| Horizontal scroll at 360px, any route, either locale | **none** |
| Clipped text at 96% longer strings | **none** |
| Ge'ez rendering as missing-glyph boxes | **none**, on any route |
| axe on the Amharic routes, both viewports | clean |
| G14 message keys | none leaked |

The layouts absorbed a catalogue 96% longer than English without a single
overflow. That is what G10's pseudo-locale was built to check, and this is the
first time it has been checked with the locale actually switched on.

Five further assertions, written for this and passing:

- **The Amharic tree lifts its noindex, and for the right reason.** With the
  flag on, `locale-not-offered` disappears while `tier-2-stub-not-built`
  survives on genuinely unbuilt routes. This is the assertion that proves the
  two reasons were correctly separated — the thing `metadata.spec.ts` was
  written to protect and could never demonstrate.
- The switcher renders, and shows **both scripts**.
- **The switcher subset covers every glyph it renders** — no missing-glyph box
  in the control that offers Amharic.
- **The full Ethiopic face loads on the Amharic routes and still not on the
  English ones.** The two-face split survives the locale going live; the 198 KB
  regression does not return.
- No Ge'ez anywhere that a loaded face cannot draw.

#### The tests that encode "Amharic is off" — five, and they are the checklist

These fail *correctly* when the flag flips. Naming them now turns the landing
from an experiment into a list of five edits:

| Test | What it becomes |
|---|---|
| `menu.spec.ts` — *language switcher is absent while the flag is false* | The switcher now renders. Invert it |
| `discovery.spec.ts` — *sitemap lists exactly the routes with no index policy* | Amharic routes now belong in the sitemap |
| `metadata.spec.ts` — *Amharic is noindex for its locale* | No longer true, which is the point of flipping |
| `metadata.spec.ts` — *an Amharic route with undecided content carries both reasons* | Only one reason survives |
| `headers-fonts.spec.ts` — *no Ethiopic font requested on the Amharic routes* | ⚠ **Wrong for the future, not merely flag-dependent.** It asserts the Amharic tree must never load the full Ethiopic face. Once Amharic is real it **must**, or the Ge'ez is drawn from a fallback. It has to become "the English routes must not", which is the guarantee that was always meant |

### 3.3 The legal-bodies landing — clean

Stand-in: all eleven Terms sections filled with visibly-marked placeholder prose
at realistic length, about 8,250 characters, the longest sections doubled.

| Check | Result |
|---|---|
| Every sidebar anchor resolves to a section that exists | pass, 11 of 11 |
| Sidebar and body stay in sync from the one section map | pass, counts match |
| No clipping with full bodies | pass |
| No horizontal scroll at 360px | pass |
| G14 fires nothing | pass |

The legal bodies are a **pure drop-in**: they are catalogue strings, and the
page derives everything else from the single section map.

⚠ One thing this cannot rehearse. `indexPolicy('terms').unbuilt` must be
cleared by hand when the real bodies land, or the pages stay `noindex` after
they are finished. No test can catch it, because "the bodies are real now" is
not a fact the code can read.

### 3.4 The report-content categories — a defect on the live conversion path

Stand-in: a select with three obviously-fake options.

The field takes an option list and is reachable by keyboard. But **a chosen
value did not survive a failed submission** — and chasing that found something
larger than the rehearsal.

**React applies `defaultValue` to a select at mount only.** A text input keeps
what was typed because its DOM node is never replaced, so `defaultValue` never
has to work. A select is remounted on re-render and reset.

The decisive experiment: **with JavaScript disabled the same submission returns
the chosen value intact.** So the server echo was never at fault, and React is
the difference.

**This is live today, on the site's only conversion.** The waitlist form's
*Primary platform* select is uncontrolled. Measured on the real form: a rejected
submission kept the name and the handle, and returned the platform empty. A
seller who misses a required field silently loses their platform.

**Every text field passing was not evidence that echoing works. It was evidence
that text inputs do not need it.**

The fix is a keyed remount, **not** a controlled select. Controlling it also
works, and was rejected: a controlled select is written from React state on
hydration, so a choice made before the bundle arrives would be wiped. A slow
connection on a low-end Android is the constraint this whole site is built
around, so that trade is the wrong way round. The controlled version was also
measured, and it failed this same check.

#### The guard for it passed on a broken build, twice

A permanent test now covers this, asserted on the select **and** on a text field
so the text field is the control. Reverting the fix to confirm it fails was not
a formality — it passed.

The second false pass, on a genuinely fresh server, is the one worth recording.
Sampling every 250 ms shows the chosen value **survives the error summary and is
cleared about 250 ms later, in a later commit**. A retrying assertion helps only
when a value moves toward what you expect; this one starts correct and moves
away, so the first poll passes instantly.

The guard settles before reading, and is now verified in both directions: it
fails with the fix reverted and passes with it in place. Recorded in
`docs/engineering-notes.md`.

### 3.5 What came off the rehearsal branch

Nothing that was a stand-in. Four things that were not:

| Landed | Where | Why |
|---|---|---|
| The **prow slot**, and its guard | here | §3.1 asked for it built, and the guard keeps it a file drop |
| The **switcher tap-target fix** | **PR #16** | A real defect that only the flag flip could reveal |
| The **platform select fix**, and its guard | **PR #16** | A real defect on the site's only conversion path |
| `am-rehearsal.spec.ts` | here | Skips while the flag is false and becomes live exactly when Amharic lands. A landing asset, not a stand-in |

The two **fixes** are on their own branch off `main`, as the work order asks:
they are small, independently verifiable, and both defects are on `main` today,
so they should not wait on the CI-trigger and gold decisions this PR also
carries. The two engineering notes behind them stay here, with the report,
because splitting `docs/engineering-notes.md` across two branches would only
manufacture a conflict.

`rehearsal.spec.ts` did **not** land: its icon and report-select assertions
depend on stand-ins that no longer exist.

---

## 4 · Confirmation that no stand-in survives

Checked on the branch that carries the fixes, after reverting:

| Stand-in | State |
|---|---|
| The grey `TEST` icon | **absent** |
| The Amharic flag | **false** |
| `src/messages/am.json` | **782 bytes** — the real stub, not the 75,553-byte synthetic one |
| Terms section bodies | **0 of 11 filled** |
| Report-content reason select | **reverted** to the flagged placeholder |

No synthetic catalogue, no placeholder prose, no stand-in icon and no invented
category reached a branch that can merge. The rehearsal branch itself is
unmerged and can be deleted.

---

## 5 · For `decisions-pending.md`

Three, all recorded there:

1. **The two branches with no PR** (D8) — provably lossless to delete, but the
   decision is the founder's.
2. **The index policy must be cleared by hand** when the legal bodies land, or
   the four pages stay `noindex` after they are finished.
3. **The Ethiopic font assertion is wrong for the future** — it says the
   Amharic tree must never load the full face, which stops being true the day
   Amharic is real.

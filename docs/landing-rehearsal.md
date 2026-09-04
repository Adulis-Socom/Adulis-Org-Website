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

_(in progress)_

---

## 4 · Confirmation that no stand-in survives

_(written after the rehearsals)_

---

## 5 · For `decisions-pending.md`

_(as found)_

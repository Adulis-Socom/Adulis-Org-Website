# Message catalogues

`en.json` is the base. Every key lives here first, and no copy lives in a
component.

`am.json` is a **partial** catalogue. Any key it does not define falls back to
the English string automatically — see the deep merge in `src/i18n/request.ts`.
That means a half-finished Amharic file renders a working page rather than raw
key paths, and translation can proceed key by key.

## Status

`am.json` currently defines almost nothing.

The Amharic previously carried in this file was **machine output** taken from the
v4.1 wireframes, never reviewed by a native speaker. It is not present in this
build, and it must not be reinstated or extended: Ge'ez layout validation is a
launch gate (ADU-PROJ-01 v9.0 §12, ADU-WEB-01 §8.3) and **cannot be performed
against machine output**, because the string lengths are not trustworthy. Human
translation is a prerequisite for the gate, not a follow-up to it.

Until a human-translated catalogue arrives, `/am` renders English text under an
`/am` prefix with the language switcher working. That is the intended failure
mode, not a bug — but it does mean **the Ge'ez layout pass cannot be run yet**.

## Run this after every edit to `am.json`

```bash
npm run check:i18n
```

**Do this as you go, not at the end.** It takes about a second, and it catches
the one mistake that is otherwise invisible: a partially translated list.

Arrays are replaced wholesale, never merged entry by entry (see rule 5). So if
you translate three of the five `howItWorks.steps`, the other two do not fall
back to English — **they disappear from the page**, with no error anywhere.

What it prints when that happens:

```
i18n: am.json has 1 problem(s):

  howItWorks.steps
    3 entries, but en.json has 5
    Arrays are replaced wholesale, not merged entry by entry, so the
    missing entries would disappear from the page. Translate all of them,
    or remove the key entirely and let it fall back to English.

i18n check failed.
```

Either finish the list or delete the key — a key that is not there falls back to
English cleanly, and that is a perfectly good intermediate state.

It also runs automatically before `npm run build`, so a partial array can never
reach a deployment. That is the backstop; running it yourself is how you find out
while you still remember what you were doing.

`en.json` has twelve arrays, so expect this to fire during the translation work.
It is a guard rail, not a bug.

## Rules when translating

1. **Never concatenate fragments.** Every string is a complete sentence with
   named slots (`{reference}`, `{phone}`, `{seconds}`). Word order differs
   between English and Amharic, and fragment assembly produces text that is
   grammatically wrong in one of them.
2. **Leave Latin text as Latin.** `Adulis`, `ADULIS`, `TikTok`, `Instagram`,
   `App Store` and `Google Play` are proper nouns and stay in Latin script
   inside Amharic sentences. The font stack renders both — that is the whole
   reason it is Latin-first.
3. **Keep the arrows.** `→` and `↓` are real glyphs, never `>` and `v`. Inter
   covers them.
4. **Assume 40% expansion.** No container in the site has a fixed height, but
   check every button label and every form label after translating — those are
   where expansion shows first.
5. **Arrays are replaced, never merged entry by entry.** An array key in
   `am.json` overrides the whole English array. Translate **all** of its entries
   or leave the key out entirely — a partially translated array silently drops
   the entries you did not get to, because the English ones are not merged back
   in.

   `npm run check:i18n` enforces this and runs automatically before
   `npm run build`. It fails with the path and both lengths. `en.json` holds
   twelve arrays, so this will fire during the translation work — it is a
   guard rail, not a bug.
6. **Highest priority for review**, per ADU-PRD-01 §23.1: every button label,
   every form label and validation message, and the delete-account flow.

---

## `headingAccent` — translate it as a phrase, never derive it

Three relational pages carry a headline in two keys:

| Key | Role |
|---|---|
| `heading` | The subject — what the sentence is about |
| `headingAccent` | The **outcome** — what the reader is being offered. Rendered in gold |

The rule the design follows is **gold marks a phrase, not a line**. The accent
is one inline span inside the headline; where it wraps is the browser's
business, and the same words stay gold at every width.

⚠ **Do not derive the accent positionally.** It is not "the second line", "the
second sentence" or "the last N words" — an earlier version of this rule said
"the second line" and broke at 360px, where the headline reflows to four lines
and three of them went gold. Ge'ez reflows differently again, so any rule based
on position lands on the wrong words in Amharic.

**For the translator:** `headingAccent` is its own string and needs its own
translation. Choose the Amharic words that name the outcome, and keep them
short enough that the gold never exceeds roughly half the rendered headline at
360px. Measured on the English at that width: 30%, 37% and 39%.

The two parts are joined by a single space in that order, so the translation
must read correctly as `heading + " " + headingAccent`. If Amharic word order
puts the outcome first, say so — the component takes the parts in a fixed
order and would need changing rather than the copy being bent to fit.

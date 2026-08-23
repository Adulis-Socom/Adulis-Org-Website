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
   `am.json` overrides the whole English array. Translate all of its entries or
   leave the key out; a half-translated array cannot be reviewed.
6. **Highest priority for review**, per ADU-PRD-01 §23.1: every button label,
   every form label and validation message, and the delete-account flow.

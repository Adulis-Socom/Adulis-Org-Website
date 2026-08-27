# Engineering notes

Things that cost real time to find, recorded so they cost nobody else the same.
Each one produced a convincing, wrong conclusion before it was understood.

These are not style preferences. Every entry below is something where the
obvious reading of the evidence was false.

---

## The build's `●  (SSG)` badge does not mean a page is prerendered

The route table prints `●  (SSG)` whenever a route has `generateStaticParams`,
**whether or not any HTML was actually prerendered**. With
`export const dynamic = 'force-dynamic'` in the locale layout, all 30 locale
pages still print `●` and not one `.html` file is emitted.

This matters because the badge is the thing people check.

**Check the artefacts instead:**

```bash
find .next/server/app -name '*.html' | grep -v '_not-found\|/404\|/500' | wc -l
```

`0` means genuinely dynamic. `30` means genuinely prerendered. A second
confirmation is to request the same URL twice and compare bytes — a dynamic
response differs, because the CSP nonce differs.

---

## A CSP nonce in the header does not reach prerendered HTML

Middleware can set a perfect per-request nonce and every server-side check will
pass while the site is completely broken in a browser.

With static prerendering, **0 of 29** `<script>` tags carried the nonce. Because
`'strict-dynamic'` makes browsers **ignore `'self'`**, that policy blocked every
script on the site, including the external chunks. Header assertions, directive
assertions and nonce-rotation assertions all passed throughout.

Only a real browser shows it. `tests/qa/headers-fonts.spec.ts` now compares each
response's inline scripts against that same response's header nonce.

---

## `upgrade-insecure-requests` breaks everything over http, silently

That directive rewrites http subresource URLs to https. Over `http://localhost`
nothing is listening on https, so every stylesheet and chunk fails.

**It logs no CSP violation**, because nothing was blocked by policy — the
requests were reissued to a port that is not there and failed as SSL errors.

Chromium exempts localhost and showed nothing at all. WebKit does not, and **74
QA tests failed with symptoms that look like layout and hydration bugs**: a 36px
menu trigger, `aria-expanded` stuck at `false`. Nothing about it looked like a
header problem.

It is now emitted only when the request is actually https. Two lessons:

- assert on **requests**, not on console output, when testing subresource loading
- **any CSP or font change re-runs the WebKit suite, not only Chromium**

---

## `next/font/google` keeps the real family name; `next/font/local` does not

`next/font/local` mangles its family (`ethiopicSwitcher`). `next/font/google`
registers the webfont under its **real** name, `Noto Sans Ethiopic`.

So a `:root` fallback written as a supposedly-local stack:

```css
--font-ethiopic: 'Noto Sans Ethiopic', 'Nyala', serif;   /* wrong */
```

matched the 198 KB webfont `@font-face` and every English page downloaded the
entire face — while the route-scoped variable was doing its job perfectly. The
scoping was never the problem, and looked like it was.

Only genuinely local families belong in a fallback.

---

## A `:root` custom property can silently outrank `next/font`'s own class

`next/font` sets `--font-*` on a class on `<html>`. A `:root` declaration has the
same specificity, so whichever comes later in stylesheet order wins.

`:root` won. The Ethiopic subset was therefore **never used**: the switcher
rendered from a locally installed Nyala on a Windows reviewing machine, and would
have been four missing-glyph boxes on the low-end Android the site is built for.
It looked correct to the person reviewing it. That is the whole danger.

Fallbacks belong **inside `var()`**, not in a competing `:root` rule:

```ts
'var(--font-ethiopic, Nyala)'
```

which is also required for a second reason: an **undefined** custom property
makes the entire `font-family` declaration invalid at computed-value time, and
`--font-ethiopic` is deliberately undefined on all 15 English routes.

---

## No table on this site scrolls horizontally

The trust ladder was first built as a table inside `overflow-x-auto`. It failed
twice, and both failures generalise:

- at 360px it became a sideways scroll on exactly the device this site's
  performance doctrine is written around;
- axe failed it **`scrollable-region-focusable`** — WCAG 2.1 SC 2.1.1. A
  scrollable region containing no focusable element cannot be reached or
  scrolled by keyboard **at all**.

**Every table stacks into cards below `md`.** More tables are coming — Published
statistics is a table in all but markup, and several Tier 2 section maps will
want one.

`npm run check:copy` fails on a table inside `overflow-x-auto`. The QA suite
catches it too, at 360px and via axe on every route; the source check just fails
in a second rather than six minutes.

---

## If an undecided item cannot be visibly flagged, do not render a stand-in

A legal body can carry an `UNDECIDED` marker and a reader sees it is not real. A
placeholder **icon** cannot. It silently becomes the brand mark, because nothing
about it says "temporary" and nobody is prompted to replace it.

That is why the site currently ships **no favicon at all** and takes a 404 on
`/favicon.ico` instead. The 404 is visible in the console and dents the
best-practices score; a plausible-looking icon would be invisible and permanent.

The same rule decided two other things here: `/contact` and `/report-content`
render **no `<form>`** rather than a form with no action behind it, and the
seller-side "What you handle" copy was written rather than seeded as filler.

The general form: **a placeholder is only safe when its placeholder-ness is part
of what the reader sees.** Where it cannot be, ship nothing and record the gap.
This is the same failure class as plausible filler shipping unnoticed, and the
favicon is its second instance.

## `pkill` does not kill Next servers on Windows, and Playwright reuses them

`reuseExistingServer: !process.env.CI` means a local Playwright run **adopts
whatever is already listening on the port**. Combined with `pkill -f "next start"`
silently failing on Windows, that produces the most misleading failure mode in
this project: tests run against a build from twenty minutes ago.

It cost several cycles in Checkpoint 4. Three contact tests failed with
`Loading chunk 638 failed` and a missing `.field-error`, which reads exactly like
a hydration bug in new code. The code was fine; the server was stale.

**Kill by port, not by name:**

```powershell
Get-NetTCPConnection -LocalPort 3210 -State Listen |
  ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

Symptoms that mean "stale server", not "broken code":

- a chunk 404s or fails to load while the same file exists on disk and serves 200
- a test passes alone and fails in a suite, or vice versa
- behaviour that does not match the source you just changed

Check `curl -s -o /dev/null -w '%{http_code}' http://localhost:3210/en` before
diagnosing anything else. CI is unaffected — `reuseExistingServer` is false there.

## Never substring-match a catalogue string against page HTML

`NextIntlClientProvider` serialises `nav`, `waitlist` and `deleteAccount` into
**every** page's RSC payload, so any string in those namespaces is present in the
HTML of every page whether or not it is rendered.

This produced false results twice — a success detector that reported submissions
on pages with no form, and a no-JS gate that reported success and an error on the
same response. Assert on rendered content. Details in
[`tests/qa/README.md`](../tests/qa/README.md).

---

## Everything in an automated environment shares one rate-limit bucket

`clientKey()` trusts only `cf-connecting-ip` and fails closed without it. Nothing
in CI or Playwright sends it, so every request shares `waitlist:unidentified` and
the fifth submission in ten minutes is the last that works.

This nearly caused a correct security fix to be reverted. `tests/qa/fixtures.ts`
gives every test its own identity.

---

## Backslash escapes do not survive a Bash heredoc on Windows

Writing `\b` into a source file through `cat <<'EOF'` — including one feeding
`python - <<'PY'` — lands a literal **backspace byte (0x08)** in the file, and
`\n` lands as a real newline, even though the delimiter is quoted.

The damage is invisible: `sed`, `cat` and Playwright's own error output all
render the backspace as nothing, so the broken line looks correct everywhere you
would check it. `/<script\b[^>]*>/` became `/<script␈[^>]*>/`, matched nothing,
and the test failed pointing at the wrong cause.

Use the editor tools for files containing escapes, or write the pattern with no
backslashes at all. `od -c` reveals it; `grep '\b'` does not.

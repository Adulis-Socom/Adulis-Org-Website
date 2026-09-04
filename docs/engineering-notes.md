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

---

## A flag read in a client component is a build-time constant, not a runtime one

`process.env.X` inside a file that a `'use client'` component imports is
**inlined by the bundler at build time**. The value the browser sees is whatever
the build machine had; a value set on the server afterwards never arrives.

The deletion flow's gate was decided that way. It rendered the gated state
regardless of configuration — correct today by accident, and wrong the moment
the flag flips, because the decision would be baked into the bundle and
unreachable by configuration.

**Anything that must be changeable by configuration is decided server-side**
and arrives at the client as a prop. Server components read the environment per
request; client components read a snapshot of it.

---

## When a security policy blocks your own tooling, that is the policy working

The G11 snapshot helper injected a stylesheet with `page.addStyleTag` to freeze
animations. The site's CSP — `style-src 'self' 'nonce-…'`, no `unsafe-inline` —
refused it.

Nothing in the suite asked the policy to prove itself; it did so unprompted, on
a test. That is better evidence than any header assertion that the policy is
real rather than declared. The helper was also unnecessary: `toHaveScreenshot`
already disables animations and hides the caret. The fix was to delete the
helper, not to loosen the policy.

**General form:** if a guard obstructs the test tooling, first ask whether the
tooling is doing something the guard exists to forbid. Usually it is.

---

## `outline-none` is not "no outline", and WebKit ignores box-shadow on native controls

Two facts that together produced a focus ring that passed in both engines
while being invisible in Safari on every checkbox and select.

Tailwind's `outline-none` emits `outline: 2px solid transparent` (for Windows
high-contrast mode). Any check written as *outline present and wider than 0*
passes on it. `focusIsVisible()` was written that way, so every element on the
site had a "visible" focus indicator by construction.

WebKit does not paint author `box-shadow` on controls with native appearance.
The ring was box-shadow only. In Chromium it painted; in WebKit it did not, and
nothing failed, because the transparent outline was carrying the assertion.

The moment the ring switched to an honest `outline: none`, six WebKit tests
failed — and that was the first time the check had ever measured anything.

**Two rules:** a focus indicator that must paint on native controls uses
`outline`; and a visibility check must reject transparent colours, or it is a
presence check that passes on nothing.

---

## npm 10 and npm 11 disagree about whether a lockfile is "in sync"

`npm ci` on CI failed in ten seconds — *Missing: @swc/helpers@0.5.23 from lock
file* — on a lockfile that installed cleanly on the developer machine and
inside the Playwright container, repeatedly, the same day. Every local check
said the lock was fine. PR #12 was merged on that basis, red.

The runner's Node 22.23.2 bundles **npm 10.9.8**. The machine and the
container run **npm 11**. npm 10 requires a nested entry for a dependency
whose hoisted copy is a different version (`next-intl` wants `@swc/helpers`
0.5.23; the hoisted one is 0.5.15); npm 11 lets a lock omit it and resolves
anyway. So "in sync" is a property of the npm that reads the lock, not of the
lock.

**Reproduce with the CI's npm, not yours:**

```bash
docker run --rm -v "$PWD":/w -w /w node:22-slim npm ci --dry-run
```

and regenerate under it (`npm install --package-lock-only`) when it complains.
The resulting lock passed both majors. A container that verifies `npm ci` is
only evidence for the npm inside it.

---

## Run the whole suite after every group, not once at the end

Phase C ran the full suite after each group of pages. Three of the four defects
it found had been present for **multiple checkpoints and were passing every
check**:

- a focus ring invisible in Safari on every checkbox and select, since the ring
  was introduced;
- a contrast failure in cards nested on the ink surface, introduced and caught
  within one group;
- a CI pipeline that had not executed a single test since Phase A, because the
  install step failed before any of them ran.

None would have surfaced without a phase that touched every route and re-ran
everything. Two of them were found by a suite run that was only supposed to
confirm a page group, and the third by looking at CI because a run had been
recorded rather than assumed.

**The cost is real** — roughly fourteen minutes per group locally. The
alternative is finding all of it at the end, in one pile, without knowing which
change caused which failure. A regression found three groups later costs more
than the group took, and this phase paid that cost once and never again.

---

## Two sources agreeing is only evidence when they could have disagreed

I reported a Figma file as empty. Two checks agreed: the node in the supplied
URL had no children, and the tool's page listing returned only that one page.
Two independent-looking readings, same answer, so I stopped.

They were not independent. **Both resolved the same node**, so they shared a
blind spot and confirmed each other inside it. The file had three more pages and
a complete component library on them; one query with a different node id would
have found it.

The test is not "did two things agree" but **"could they have disagreed?"** Two
checks that fail the same way under the same condition are one check counted
twice. Corroboration requires a source that would have said something different
if the conclusion were wrong.

This generalises well past Figma. The same shape has appeared here as a green
suite confirming a green local run — same machine, same npm, same blind spot —
and as a header assertion agreeing with a directive assertion while the browser
blocked every script on the page.

**Its worst form is a check performed where the defect cannot appear.** The
push-trigger fix (D8) is the clearest instance: for a `push`, GitHub reads the
workflow from the pushed commit's tree, so the change only works on branches
that already contain it. Verifying it the obvious way — push to the branch you
just edited, watch the jobs run — confirms it, on the one branch that cannot
reveal the problem. Eight other branches were unaffected by the fix and still
reproduced the incident.

**So ask where the check would have to run to be able to fail.** If the answer
is "somewhere other than where I ran it", the green means nothing yet.

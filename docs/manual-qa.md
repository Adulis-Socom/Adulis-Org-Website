# Manual QA checklist

> ## Much of this is now automated — run `npm run qa` first
>
> Build Amendment 08 installed Playwright and automated everything in this
> checklist that a browser engine can establish. Results are in
> [`docs/qa-report-01.md`](./qa-report-01.md).
>
> **Automated, both chromium and webkit** — do not re-do by hand:
> §1 overflow at 360px · §2 mobile menu · §3 keyboard and focus · §4 JavaScript
> disabled · §6 axe WCAG 2.1 AA · §7 client-component namespaces · plus new
> checks for security headers and font loading.
>
> **Still human, and not covered by any of it** — §1's real-device pass, §4's
> real-Safari confirmation, §5 the tofu check, §6's Lighthouse, §8 the deployed
> headers, and judging whether the screenshots look right. Each is marked
> **HUMAN** below.
>
> Two findings are open from the automated pass and are **expected failures**
> until triaged: undersized touch targets (Q-01) and one colour-contrast
> violation (Q-02).

The sections below keep their original wording. Anything marked **AUTOMATED** is
covered by `npm run qa`; anything marked **HUMAN** still needs a person.

Do not mark anything here done from a desktop browser window resized to look
like a phone. The product's target seller is on a low-end Android over a slow
connection, and that is the device the 360px and performance checks mean.

```bash
npm run dev     # http://localhost:3000 -> /en
```

**Tester:** ______________  **Device:** ______________  **Date:** ____________

Record results in the pull request, including failures. A check that fails is a
more useful result than a check that was skipped.

---

## The sixteen routes

Both locales for each: `/en/...` and `/am/...`.

`/` · `/how-it-works` · `/for-sellers` · `/for-buyers` · `/trust-and-safety` ·
`/prohibited-products` · `/about` · `/delete-account` · `/help` · `/contact` ·
`/terms` · `/privacy` · `/seller-terms` · `/refunds-and-disputes` ·
`/report-content` · a nonexistent path such as `/en/no-such-page`

---

## 1 · 360px pass  —  **AUTOMATED** (overflow) + **HUMAN** (real device)

**On a real low-end Android**, not a desktop emulator.

- [ ] Every route is complete and usable at 360px
- [ ] **No horizontal scrolling on any page.** Swipe left on each one; a page
      that scrolls sideways by even a few pixels fails
- [ ] Two-column sections stack rather than losing content — mobile carries the
      same content as desktop, nothing is deleted
- [ ] No text is clipped, truncated or overlapping
- [ ] The For Sellers waitlist form is usable one-handed; no input is cut off

## 2 · Mobile menu  —  **AUTOMATED**

At 360px, on every page.

- [ ] The trigger is at least 44×44px and easy to hit with a thumb
- [ ] It opens, and shows **all six** nav items
- [ ] The waitlist button in the panel is **full width**, not a compressed sliver
- [ ] The icon becomes an **×** while open and a hamburger while closed
- [ ] It closes on **Escape**
- [ ] It closes **on navigation** — tap an item, confirm the panel is not still
      over the new page
- [ ] The page behind does not scroll while the panel is open
- [ ] Language switcher slot: **currently absent by design.** `AM_ENABLED` is
      `false` in `src/i18n/routing.ts`. Confirm no switcher appears anywhere —
      header, panel or footer

## 3 · Keyboard only  —  **AUTOMATED** (chromium) + **HUMAN** (Safari, Full Keyboard Access)

Unplug the mouse. Tab through every route.

- [ ] **Visible focus on every interactive element**, everywhere, never removed
      without a replacement
- [ ] Tab order follows reading order
- [ ] The **skip link** is the first thing focused, becomes visible when focused,
      and jumps to `#main`
- [ ] Every link and button is reachable and activates with Enter or Space
- [ ] On `/for-sellers`, submit the empty waitlist form: the **error summary is a
      list of links**, and activating one **moves focus to the field it names**
- [ ] The submit button is **still focusable and still enabled** in the error
      state
- [ ] On `/delete-account`, the whole flow is operable by keyboard, including the
      confirm checkbox and Cancel

## 4 · JavaScript disabled  —  **AUTOMATED** (both engines) + **HUMAN** (real Safari)

Turn JavaScript off in the browser and reload — do not just block a script.

- [ ] Every page renders its content
- [ ] The **Second handle** field on the waitlist form is **visible** (it starts
      visible and only narrows once hydrated)
- [ ] The waitlist form **submits**
- [ ] Server-side validation fires: submitting empty returns the page with the
      error summary rendered
- [ ] A valid submission returns the success state with a reference number
- [ ] Footer links to Terms, Privacy, Report content and Delete my account all
      work

⚠ **This section now gates a revert.** The waitlist action rejects a request with
no `Origin` header (security audit 01, F-13). Every current browser sends
`Origin` on a POST, but some have historically omitted it on **same-origin form
POSTs** — which is exactly the no-JavaScript path above.

- [ ] With JavaScript disabled, a valid submission **succeeds** in **Safari**
- [ ] With JavaScript disabled, a valid submission **succeeds** in **Chrome**
- [ ] If either fails with the generic "Something went wrong on our side" error,
      **revert the `Origin` check** in `src/app/actions/waitlist.ts` and say so.
      The real abuse control is rate limiting; that check is hardening, and it is
      not worth breaking the no-JS path for.

## 4a · Translation workflow — `npm run check:i18n`

Not a browser check, but it belongs to whoever does the Amharic work rather than
to whoever runs the QA pass.

```bash
npm run check:i18n     # after every edit to messages/am.json
```

Arrays in `am.json` replace the English array wholesale rather than merging entry
by entry, so a **partially** translated list silently drops the entries nobody
got to. This is the guard. It names the path and both lengths. Full details and
an example of the output are in [`src/messages/README.md`](../src/messages/README.md).

- [ ] Translator has run `npm run check:i18n` and it passes
- [ ] It was run **during** the work, not only at the end — it also runs
      automatically before `npm run build`, but that is the backstop, not the
      workflow

## 5 · Missing-glyph (tofu) check  —  **HUMAN**, and moot until AM_ENABLED flips

**Currently moot — `/am` renders English because `AM_ENABLED` is `false`.**

**This becomes mandatory the day `AM_ENABLED` flips to `true`.** Do not skip it
then: the failure it catches is invisible to a reviewer who does not read
Amharic, because the Ge'ez itself looks correct.

On **every** Amharic page:

- [ ] The wordmark `ADULIS` renders as characters, not `□`
- [ ] `TikTok` renders as characters
- [ ] `Instagram` renders as characters
- [ ] At least one figure renders as digits — handoff counts, stock timestamps,
      the waitlist reference, `© 2026`
- [ ] The language switcher reads `EN / አማርኛ`, with both scripts legible
- [ ] **A single missing-glyph box anywhere fails the gate**
- [ ] Ge'ez layout validation against the real translated strings: no layout
      break, no truncated button, no clipped label. Not placeholder text —
      realistic Amharic, at 40% expansion over English

## 6 · axe / Lighthouse  —  **AUTOMATED** (axe) + **HUMAN** (Lighthouse on a real device)

Every route, both locales. Target **WCAG 2.1 AA**.

- [ ] axe DevTools clean on all 16 routes in `/en`
- [ ] axe DevTools clean on all 16 routes in `/am`
- [ ] Colour contrast passes AA — check `.note`, `.field-help`, `.card-body` and
      the disabled store badges on For Buyers, which are the lowest-contrast text
      on the site
- [ ] `prefers-reduced-motion` respected
- [ ] Lighthouse on `/en` and `/am`, throttled to a low-end Android on a slow
      connection
- [ ] **The Ethiopic font file is not downloaded on `/en` routes.** Check the
      Network tab. It should be excluded by `unicode-range`

      ⚠ **Known conflict, deferred.** When `AM_ENABLED` flips, the switcher
      renders `አማርኛ` on every page, which *will* pull the Ge'ez subset onto
      `/en`. The fix is the four-glyph micro-subset — `U+12A0`, `U+121B`,
      `U+122D`, `U+129B` — and it is a prerequisite for flipping the flag.
      Until then this check should pass trivially, because no Ge'ez is rendered
      anywhere

- [ ] Record the Lighthouse numbers in the PR, not just pass or fail

## 7 · Client-component message namespaces  —  **AUTOMATED**

The provider sends only three namespaces to the browser — `nav`, `waitlist` and
`deleteAccount` (see `CLIENT_NAMESPACES` in
[`src/app/[locale]/layout.tsx`](../src/app/[locale]/layout.tsx)). A client
component reaching for anything else **fails at runtime, not at build**.

Server-rendered branches are already covered: the production build prerenders
every client component, so a missing namespace would have failed the build. What
is *not* covered is any branch that only ever renders after an interaction.

Walk these with the console open. **Any `MISSING_MESSAGE` error is a failure.**

- [ ] `/delete-account` — step through **every** state: explain → phone → OTP →
      confirm → success. Enter six digits to pass the OTP step
- [ ] `/delete-account` — the **blocked** branch, via "Preview the blocked state"
      on the OTP step
- [ ] `/delete-account` — Cancel from the confirm step returns to explain
- [ ] `/delete-account` — trigger each validation message: a bad phone number, a
      bad code, submitting confirm without ticking the box
- [ ] `/delete-account` — the OTP resend cooldown text renders its countdown
- [ ] `/for-sellers` — submit empty, and confirm every error string renders
- [ ] `/for-sellers` — submit valid, and confirm the success state and its
      reference number render
- [ ] `/for-sellers` — choose a second platform and confirm the second-handle
      field appears with its help text
- [ ] Mobile menu open and closed on any route
- [ ] No `MISSING_MESSAGE` anywhere in the console on any route

## 8 · Headers as actually deployed  —  **HUMAN**, at deployment

`npm run qa` proves all eight security headers arrive from `next start`. It
**cannot** prove they arrive from Cloudflare Pages. Whether `headers()` in
`next.config.mjs` survives depends on the adapter, and there is no `_headers`
file in this repo.

Assuming the adapter translates it is the same shape of mistake as the canonical
bug: correct locally, absent at launch, invisible until someone looks.

Against the deployed URL, once one exists:

```bash
curl -sS -D - -o /dev/null https://<domain>/en | grep -iE \
  '^(content-security-policy|permissions-policy|cross-origin-|x-frame-options|x-content-type-options|referrer-policy|strict-transport-security):'
```

- [ ] `Content-Security-Policy` present, with all ten directives
- [ ] `Permissions-Policy`, `Cross-Origin-Opener-Policy`,
      `Cross-Origin-Resource-Policy` present
- [ ] `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` present
- [ ] `Strict-Transport-Security` present **without** `preload`
- [ ] If any are missing, port them into a Cloudflare Pages `_headers` file —
      and note that a `_headers` file **supersedes** the `next.config.mjs` block
      entirely, so every header must be carried across, not just the missing one
      ([`SECURITY.md`](../SECURITY.md))

## 9 · Do the screenshots look right  —  **HUMAN**

`npm run qa` writes 60 full-page screenshots to `tests/qa/screenshots/`, one per
route per engine. Automation proves nothing overflows; it cannot judge whether
the result looks like a company a seller would trust their business to.

- [ ] Walk the screenshots. Flag anything that is technically correct and still
      looks wrong: cramped spacing, an orphaned heading, a placeholder that reads
      as a broken image, a card that looks empty
- [ ] Check the pages a seller actually decides on — `/`, `/for-sellers`,
      `/trust-and-safety` — with more care than the rest

---

## Known properties that are not defects

Written down so they are recognised rather than re-investigated.

**Safari does not Tab to links.** WebKit omits `<a>` elements from the Tab order
by default — Safari's Full Keyboard Access setting, off unless a person turns it
on. Verified directly: chromium tabs skip-link → wordmark → menu button → anchor
CTA → form fields; webkit goes straight to the menu button and then the fields,
reaching no link at all.

The consequence for this site: **on Safari with default settings, the skip link
and every in-page link are unreachable by Tab.** Buttons, inputs and selects are
reachable normally, so the waitlist form is fully operable. Nothing here is fixable
in the site — it is an OS and browser setting — but it is worth a line if an
accessibility statement is ever published, and it is why the automated
skip-link check is chromium-only.

- [ ] **HUMAN**: confirm the skip link and in-page links work in Safari with
      *Full Keyboard Access* enabled (System Settings → Keyboard)

**Automated environments share one rate-limit bucket.** `clientKey()` trusts only
`cf-connecting-ip` and fails closed without it, so CI, Playwright, a local
harness, or any staging box not behind Cloudflare all share the single
`waitlist:unidentified` bucket — the fifth submission in ten minutes is the last
one that works. If a QA run or a staging environment starts refusing submissions
with no obvious cause, this is almost always why. It nearly caused a correct
security fix to be reverted once already. Details in
[`tests/qa/README.md`](../tests/qa/README.md).

---

## Already verified — do not re-do

Confirmed programmatically during the build:

`typecheck`, `lint` and `build` pass · all 16 routes return 200 in both locales ·
`/` redirects to `/en` under Accept-Language `am`, `am-ET` and `en` alike · no
locale cookie is set · `/en/no-such-page` returns **404** and renders the
localised W20 inside the normal header and footer · every `nav.ts` href has a
matching page · the copy-regression greps are clean · the second-handle field is
present in server-rendered HTML · no submit button is disabled · the skip link is
present · the Ethiopic face carries its own `unicode-range` · `/am` is `noindex`
regardless of `NEXT_PUBLIC_SITE_URL` · no raw message key renders in either
locale · the deep-merge English fallback resolves per key, not per object.

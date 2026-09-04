# QA suite

Playwright, chromium and webkit, against a **production** build. `npm run qa`.

```bash
WAITLIST_WEBHOOK_URL=http://localhost:4556/ npm run build
npm run qa                            # both engines
npm run qa -- --project=chromium      # one engine
npm run qa -- tests/qa/nojs.spec.ts   # one spec
```

Playwright starts both the production server and the local delivery sink itself
(the `webServer` array in `playwright.config.ts`), so there is nothing to launch
by hand. The build still needs `WAITLIST_WEBHOOK_URL` because `check:env` gates
on it — point it at the sink port, or use `ALLOW_UNDELIVERED_WAITLIST=1`.

Results and reasoning: [`docs/qa-report-01.md`](../../docs/qa-report-01.md).
What still needs a person: [`docs/manual-qa.md`](../../docs/manual-qa.md).

---

## Two traps that have already cost time

Both of these produced convincing, wrong results before being caught. Read them
before writing a new assertion.

### 1. Never substring-match a message-catalogue string against page HTML

`NextIntlClientProvider` serialises three namespaces — `nav`, `waitlist` and
`deleteAccount` — into **every** page's RSC payload. So **any string in those
namespaces is present in the HTML of every page, whether or not it is
rendered.** A substring match proves nothing.

This has now caused a false result twice, in two different places:

- the security audit's success detector reported a submission had succeeded on
  pages where no form had been submitted, because `waitlist.success.title` is in
  the payload everywhere;
- the no-JS gate reported a success *and* a generic error on the same response,
  because `waitlist.errors.unexpected` is there too.

**Assert on rendered content instead.** `getByRole`, `getByText` with `exact`, a
DOM query scoped to the element, or — if you must work on raw HTML — strip
`<script>` blocks first, as `nojs.spec.ts` does:

```ts
const visible = html.replace(/<script[\s\S]*?<\/script>/g, '');
```

The same trap applies to the Ge'ez check when `AM_ENABLED` flips: `አማርኛ` appears
in the payload of every page via `nav.languageSwitch` while being rendered on
none of them.

### 2. Everything in an automated environment shares one rate-limit bucket

`clientKey()` in `src/lib/ratelimit/index.ts` trusts **only** `cf-connecting-ip`, and
fails closed when it is absent (audit 01, F-04). Nothing in CI, in Playwright, in
a local harness, or on a staging box that is not behind Cloudflare sends that
header — so in a production build **every such request shares the single
`waitlist:unidentified` bucket**, and the fifth submission in ten minutes is the
last one that works.

This was not anticipated when the fail-closed change was written, and it nearly
caused a correct security fix to be reverted: the first full QA run showed the
F-13 no-JS gate failing in webkit, which is exactly the symptom §2.6 was watching
for. It was rate limiting. The recorded `originHeaderPresent: true` is what
settled it.

`fixtures.ts` gives every test its own `cf-connecting-ip` so tests cannot starve
each other. **Import `test` from `./fixtures`, never from `@playwright/test`
directly**, or your spec will inherit the shared bucket.

If you see unexplained refusals or generic errors in any automated environment,
check this before anything else.

---

## Layout of the suite

| File | Covers |
|---|---|
| `fixtures.ts` | Per-test rate-limit identity. Import `test` and `expect` from here |
| `helpers.ts` | Route list read from `src/lib/routes.ts`, console capture, overflow and target measurement, focus visibility |
| `console.spec.ts` | §2.1 `MISSING_MESSAGE` and runtime errors — the check nothing else can do. ⚠ It only sees pages that render: the deletion flow's two missing keys were invisible to it while the flow was gated off |
| `layout.spec.ts` | §2.2 360px overflow, §2.3 touch targets, screenshots |
| `menu.spec.ts` | §2.4 mobile menu |
| `keyboard.spec.ts` | §2.5 focus visibility, tab order, error-summary focus |
| `nojs.spec.ts` | §2.6 JavaScript disabled, and the F-13 revert gate |
| `a11y.spec.ts` | §2.7 axe, WCAG 2.1 AA |
| `headers-fonts.spec.ts` | §2.8 security headers, §2.9 font loading |
| `deletion-journey.spec.ts` | ADU-WEB-03 G6 — five steps chained with JS off, on the forced-on instance (port 3212) |
| `messages.spec.ts` | ADU-WEB-03 G14 — no visible text on any route begins with an `en.json` namespace and a dot |
| `focus-pixels.spec.ts` | The focus guarantee, in pixels: focusing a control must change the 8px band outside it. Seven controls, both engines |
| `icons.spec.ts` | Work order §4.2 — the icon pipeline: a deliberate 404 while no artwork exists, 200 the day it does, read from the filesystem |
| `placeholder-appearance.spec.ts` | ADU-WEB-03 G11 — pixel baselines. Excluded from `npm run qa`; run `npm run qa:snapshots` |
| `sink.mjs` | Local delivery sink, so the waitlist has a destination — and the deletion API double |

## Things that are not defects

- **The skip-link test is chromium-only.** WebKit omits `<a>` elements from the
  Tab order entirely — Safari's Full Keyboard Access default. Verified directly:
  chromium tabs skip-link → wordmark → button → CTA → fields, webkit goes
  straight to the button. Asserting link focus in webkit tests the engine's
  setting, not the site.
- **Measure absolute document position, not `getBoundingClientRect().top`,** when
  comparing tab stops. Tabbing scrolls the page, so viewport-relative values come
  from different scroll offsets. That produced a phantom "backward tab jumps on
  30 of 30 pages"; the real number is zero.
- **`sr-only` elements measure 1×1** until focused. The skip link is clipped, not
  broken. `smallTargets()` excludes clipped elements and the focused size is
  asserted separately.
- **Inline links in running text are excluded from the 44×44 check.** A link
  inside a sentence is text, not a tap target, and WCAG exempts it. The Privacy
  link in the waitlist consent line is the case here.

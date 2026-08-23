# Amendments to apply to the Adulis Website Build Specification

**Source of these changes:** Build Amendment 01, 23 August 2026, §2, §4 and §10.5.

> **Why this file exists.** The build specification is not held in this
> repository — it was supplied as a prompt. These are the exact edits to apply to
> the master document, written so they can be transcribed without re-deriving
> them. **Delete this file once the master document carries them**, or move the
> specification into `docs/` so it can be amended in place and this indirection
> disappears.

---

## 1 · Part 1 — manifest goes from 46 to 50 files

Four files were discovered during the build to be load-bearing rather than
optional. Add them to the manifest with these reasons, so a future rebuild does
not rediscover them the hard way.

```
src/app/layout.tsx
src/app/[locale]/[...rest]/page.tsx
.eslintrc.json
package-lock.json
```

| File | Why it is required |
|---|---|
| `src/app/layout.tsx` | Next's App Router requires a root layout. The manifest's own `src/app/not-found.tsx` returned its own `<html>` without one, which is why `/en/no-such-page` returned **500**. It is a pass-through: the real document is built in `[locale]/layout.tsx`. |
| `src/app/[locale]/[...rest]/page.tsx` | Without a catch-all calling `notFound()`, an unmatched `/en/...` falls through to the unlocalised root fallback, `[locale]/not-found.tsx` never renders, and W20 is dead code. |
| `.eslintrc.json` | `next lint` with no config drops into an interactive prompt, which hangs CI. |
| `package-lock.json` | `npm ci` requires it. |

**Note on the count.** Amendment 01 §2 sets the manifest at **50**, counting the
four build files above. Added since:

| File | Source |
|---|---|
| `SECURITY.md` | Amendment 01 §5 |
| `docs/manual-qa.md` | Amendment 01 §9 |
| `docs/build-spec-amendments.md` | Amendment 01 §10.5 (this file) |
| `scripts/check-i18n.mjs` | Amendment 02 §3.2 |
| `src/lib/metadata.ts` | Amendment 03 §2 |
| `src/lib/routes.ts` | Amendment 04 §2.3 |

**56 tracked files.** Part 9's file-count check should assert the number the
manifest actually lists, and be updated whenever a file is added rather than
being treated as a fixed constant.

---

## 2 · Part 4 — next-intl APIs move to v4

The specification was written against next-intl v3. The project is now on
**4.13.7**. Replace the v3 guidance with the following.

**Import paths are unchanged.** `defineRouting` from `next-intl/routing`,
`createNavigation` from `next-intl/navigation`, the default export of
`next-intl/middleware`, and `getRequestConfig` / `getTranslations` /
`getMessages` / `setRequestLocale` from `next-intl/server` all survive the
migration under the same names.

### `src/i18n/routing.ts`

Unchanged from the v3 text, except that it now also declares the `AM_ENABLED`
flag (§3 below). `localePrefix: 'always'` and `localeDetection: false` are both
still valid v4 options and still do what the specification intends —
`localeDetection: false` disables negotiation from the `accept-language` header
*and* from any cookie left by a previous visit.

> Do **not** substitute `localeCookie: false` here. It is a different option
> controlling only whether the preference cookie is written, and it would leave
> `accept-language` negotiation switched on — so `/` would stop resolving
> deterministically to `/en`.

**`localeDetection` is confirmed live in v4, not an ignored leftover.** Three
independent checks, worth re-running at the next major upgrade:

1. `defineRouting` rejects unknown options — passing a made-up key fails with
   `TS2353`, and the error enumerates the accepted set including
   `localeDetection?: boolean`.
2. `dist/.../routing/config.js` defaults it: `localeDetection: e.localeDetection ?? !0`.
3. `dist/.../middleware/resolveLocale.js` gates **both** detection paths on it —
   `!i && e.localeDetection && (i = c(e, t))` for the cookie and
   `!i && e.localeDetection && (i = a(o, e.locales, e.defaultLocale))` for
   `accept-language` — falling through to `i || (i = e.defaultLocale)`.

That last line is what produces the deterministic `/` → `/en`.

### `src/i18n/request.ts`

Unchanged. `getRequestConfig`, the awaited `requestLocale`, and returning
`{locale, messages, timeZone}` all behave as before, and the recursive
`merge(base, override)` English fallback is untouched.

> `requestLocale` is marked deprecated in v4 in favour of `next/root-params`.
> That API requires Next 16. **Stay on `requestLocale`** until the Next 16
> upgrade is taken deliberately.

### `[locale]/layout.tsx` — the one behavioural change

`NextIntlClientProvider` now inherits `messages`, `formats` and `locale` from
`i18n/request.ts` when it is rendered from a Server Component.

```diff
-import {getMessages, getTranslations, setRequestLocale} from 'next-intl/server';
+import {getTranslations, setRequestLocale} from 'next-intl/server';
...
-  const messages = await getMessages();
-  <NextIntlClientProvider messages={messages}>
+  <NextIntlClientProvider>
```

Pass `messages={null}` to opt out of the inheritance. Everything else about the
provider is unchanged.

### Other v4 changes, and why they do not apply here

| v4 change | Applies? |
|---|---|
| `AppConfig` type augmentation for `Messages`, `Formats`, `Locale` | Available, **not adopted**. Optional; would enable strict message-key typing. |
| Locale cookie now a session cookie, only set on an explicit switch | Moot — `localeDetection: false` means no cookie is written at all. Verified. |
| `format.relativeTime` may need an explicit `now` in Client Components | Not used. |
| Domain routing now requires per-domain `locales` | Not used. |
| ESM-only output; TypeScript ≥ 5; React ≥ 17 JSX transform | Already satisfied — TypeScript 5.7.3, React 19, `next.config.mjs`. |

---

## 3 · Part 4 — record the `AM_ENABLED` flag

Add to the `src/i18n/routing.ts` description:

> Declare `export const AM_ENABLED = false;` in this module.
>
> **INVARIANT — the flag is read from this one module. It is never duplicated
> into a component, an environment variable, or a conditional in a page.**
>
> While `false`: the language switcher is not rendered on any surface; `/am/*`
> still resolves so URLs stay stable and translation can land incrementally;
> `/am/*` is `noindex` regardless of `NEXT_PUBLIC_SITE_URL`, and only `/en` is
> advertised in `alternates.languages`; the English fallback is unaffected.
>
> It may be set `true` only when all three hold: `am.json` contains
> human-approved translations for every key in `en.json`; Ge'ez layout validation
> has run against those real strings; and the Ethiopic micro-subset for the
> switcher label is implemented.

---

## 4 · Part 7 — Header component

Amend the Header description:

> The language switcher is rendered **only when `AM_ENABLED` is true**, in both
> the desktop bar and the mobile panel. Import the flag from
> `@/i18n/routing`; do not re-derive it.

No other component changes. `LanguageSwitcher`, `Footer`, `ui.tsx`,
`ShopPreview`, `WaitlistForm`, `DeleteAccountFlow` and `TierTwoStub` are
unaffected by the v4 migration.

---

## 5 · Part 8 — layout metadata

> ### A page's `metadata` replaces the layout's value for each field it sets
>
> **This is the Next.js behaviour to know once rather than rediscover.** Metadata
> merges *per field*, and the page wins. There is no error, no warning and no
> build failure when a page silently overrides something the layout computed.
>
> It is not a wholesale replacement — a page setting only `robots` keeps the
> layout's `title` template, `canonical` and `alternates`. That is precisely what
> makes it easy to miss: the page looks fine, and one field is quietly wrong.
>
> How it was found: the Tier 2 stubs exported a static
> `metadata = {robots: {index: false}}`, which replaced the layout's
> `{index: false, follow: false}` on `/am` routes. `/am/help` said `noindex`
> while `/am/about` said `noindex, nofollow`, and nothing anywhere reported the
> disagreement. On a private pre-launch site `follow` is worth almost nothing —
> the point is that the same mechanism will clobber `alternates.languages`, the
> canonical URL or the title template the day someone sets one on a page.
>
> **Two rules follow.**
>
> 1. **No page hand-writes a robots object.** Every `generateMetadata` calls
>    `buildRobots()` from `src/lib/metadata.ts`, declaring its *intent*
>    (`unbuilt` for a Tier 2 stub, `unlisted` for the account-deletion path) and
>    letting one module decide what that means. The three reasons compose: any of
>    unbuilt, unlisted, `locale === 'am' && !AM_ENABLED`, or a missing
>    `NEXT_PUBLIC_SITE_URL` produces `{index: false, follow: false}`.
> 2. **A page that needs locale-aware metadata must use `generateMetadata`, not a
>    static `metadata` export.** A static export cannot see `locale`, so it
>    cannot ask the right question — and whatever it answers replaces the
>    layout's value anyway. Converting the seven stubs is what actually closed
>    this; the directive string was only the symptom.

Amend the `[locale]/layout.tsx` description:

> `robots: buildRobots({locale})`. `alternates.languages` lists only locales
> actually on offer.

### 5.1 The canonical defect — resolved

`[locale]/layout.tsx` used to set `alternates.canonical: '/' + locale`, which no
page overrode, so **every route declared the locale root as its canonical** —
telling a search engine all fifteen pages were duplicates of the home page. It
was inert while everything was `noindex`, and would have armed itself at exactly
the moment the domain landed, since setting `NEXT_PUBLIC_SITE_URL` is the same
change that makes the site indexable.

It survived *because* the override is per-field: `robots` was centralised and
`alternates` was not, every page silently inherited the layout's, and nothing
looked broken.

**Resolved by merging robots and alternates into one entry point**, rather than
adding a second helper beside the first. Two helpers would have preserved the
failure mode — a page can call one and forget the other. One helper means a page
cannot half-adopt it, and there is deliberately no exported `buildRobots` any
more, because a helper that still exists will get called.

```ts
buildPageMetadata({ locale, path, unbuilt?, unlisted?, title?, description? })
```

| Field | Rule |
|---|---|
| `canonical` | `/{locale}{path}` — the page's own URL, never the locale root |
| `languages.en` | `/en{path}` — always |
| `languages.am` | `/am{path}` — **only when `AM_ENABLED`** |
| `x-default` | `/en{path}` |
| `robots` | composed from the three reasons above |

Omitting `path` yields no `alternates` at all, which is how the 404 and the
catch-all correctly emit no canonical. The layout no longer declares
`alternates` — that is what lets those two inherit nothing.

**On suppressing the `am` alternate.** While `AM_ENABLED` is false, `/am` is
`noindex`. An hreflang alternate pointing at a noindex page is
self-contradictory: search engines discard it, and it advertises an unfinished
surface. It returns with the flag, using the same composition logic as robots.

### 5.2 Route paths live in one typed constant

A hardcoded path string can diverge from its route folder on a rename, which
reproduces this same class of silent bug. `src/lib/routes.ts` holds every path;
pages reference `ROUTES.about` rather than `'/about'`, so a typo or a stale path
is a compile error caught by `npm run typecheck` — no new tooling.

`src/lib/nav.ts` now reads from it, `Footer` takes Contact from it, and no
component hand-writes an href. The one exception is `src/app/not-found.tsx`,
which renders outside the router with a plain `<a href="/en">` and has no locale
context to build one from.

---

## 6 · Part 9 — add to the verification list

Add these checks:

```
- [ ] `/en/no-such-page` returns 404, and renders the localised W20 inside the
      normal header and footer -- not the unlocalised root fallback
- [ ] `/` redirects to `/en` under `Accept-Language: am`, `am-ET` and `en` alike
- [ ] No `Set-Cookie` header is issued for locale
- [ ] `/am` carries `robots: noindex` even when `NEXT_PUBLIC_SITE_URL` is set
- [ ] No language switcher is rendered anywhere while `AM_ENABLED` is false
- [ ] A key present in `am.json` renders its Amharic value while its siblings
      fall back to English -- proving the merge is per key, not per object
- [ ] No raw message key path renders in either locale
```

And amend the file-count check to read the number the manifest lists, rather
than the literal `46`.

---

## 6A · ADU-WEB-01 §10 — the touch-target invariant needs its exemption

**Source:** Build Amendment 10 §2.4. This one amends **ADU-WEB-01**, not the
build specification — the founders hold that document, so it is recorded here
for transcription.

§10 currently reads only:

> **INVARIANT — minimum 44×44px touch targets.**

That sentence is what produced the Q-01 question: taken literally it fails a link
sitting inside a sentence, whose height is set by the surrounding line-height and
cannot be changed without disturbing the text. Replace it with:

> **INVARIANT — minimum 44×44px touch targets for any standalone interactive
> element.** A link inline within a sentence is exempt, since its size is
> constrained by the line-height of the text around it — the same exemption
> carried by WCAG 2.1 SC 2.5.5 and WCAG 2.2 SC 2.5.8. The test is the role, not
> the element type: a standalone `<a>` is a target; a `<button>` inside a
> paragraph is not exempt merely for being a button.

**How the codebase expresses this**, so the rule and the code stay legible
together:

| Class | Role | 44×44 |
|---|---|---|
| `.link-arrow` | A link inline within a sentence | Exempt |
| `.link-arrow-target` | A standalone link styled as text | Applies |

Choosing between them is choosing a role. There is deliberately **no** blanket
`min-height` on `.link-arrow`: that would reach 44px by disturbing the one usage
that should not change.

Worth noting for context: at 24px the four affected links already cleared WCAG
2.2 AA's 24×24 minimum. They were fixed because 44×44 is Adulis's own stricter
invariant, and because two of them earn it on their job — the buyer door is the
single marked crossing between the site's two audiences (ADU-WEB-01 §2.1), and
Report content is an app-store requirement a reviewer will tap on a phone.

---

## 7 · Part 2 — dependency versions

Update the `package.json` block to the versions actually shipped, and keep the
note that they are a starting point:

| Package | Was | Now | Why |
|---|---|---|---|
| `next` | 15.1.6 | **15.5.23** | Critical advisory set, including an authorization bypass in middleware — and locale routing on this site *is* middleware |
| `next-intl` | 3.26.3 | **4.13.7** | Open redirect with no fix in the v3 line |
| `eslint` | 9.18.0 | **9.39.5** | ReDoS in `@eslint/plugin-kit` |
| `eslint-config-next` | 15.1.6 | **15.5.23** | Track `next` |
| `postcss` | 8.5.1 | **8.5.26** | Advisory set in ≤ 8.5.22 |

Cross-reference `SECURITY.md` for the two advisories knowingly left open.

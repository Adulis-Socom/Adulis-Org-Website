# Copy reconciliation 01 — catalogue vs final wireframe set

Generated from the authoritative copy inventory (extracted from the wireframe
SVG text nodes) against `src/messages/en.json` as it stood at commit `f1e67fb`.

**This document is historical.** Per the Checkpoint 1 ruling R6, the catalogue is
now the single source of truth for copy. Wireframes govern layout; the catalogue
governs words. Do not treat the wireframes as a copy source again.

| | count |
|---|---|
| Leaf strings before | 295 |
| Leaf strings after | 567 |
| Identical (survived) | 94 |
| **Changed text** | **117** |
| Removed keys | 84 |
| Added keys | 356 |

Only 94 of 295 strings survived unchanged, and most of those are
navigation labels and page titles. The wireframe voice is materially more
restrained than the copy that was shipped.

---

## Changed strings

### `about`

| Key | Was | Now |
|---|---|---|
| `about.heading` | About Adulis | **Why we're building Adulis** |
| `about.sub` | Adulis gives sellers the tools to run their business professionally, protect their reputation and grow with their audience. | **The company story for sellers, investors, accelerators and grant reviewers.** |
| `about.originTitle` | Where it started | **Origin story** |
| `about.foundersHeading` | The founders | **Founders** |
| `about.founders[1].role` | COO / CTO | **COO/CTO** |
| `about.founders[2].role` | CMO / CSO | **CMO/CSO** |

### `common`

| Key | Was | Now |
|---|---|---|
| `common.betaBadge` | In controlled beta | **Controlled beta · not publicly available yet** |
| `common.exampleTag` | Example | **EXAMPLE** |
| `common.required` | required | **Required** |

### `deleteAccount`

| Key | Was | Now |
|---|---|---|
| `deleteAccount.explain.continue` | Continue | **Continue to phone** |
| `deleteAccount.phone.placeholder` | +251 ... | **+251 9XX XXX XXX** |
| `deleteAccount.phone.submit` | Send code | **Send deletion OTP** |
| `deleteAccount.phone.note` | This is a one-time check for this request only. It does not sign you in. | **This phone check proves identity for this deletion request alone.** |
| `deleteAccount.otp.label` | Verification code | **Six-digit code** |
| `deleteAccount.otp.submit` | Verify | **Verify code** |
| `deleteAccount.otp.resendIn` | You can request another code in {seconds}s. | **Resend available in {time}** |
| `deleteAccount.confirm.title` | This cannot be undone. | **Confirm account deletion** |
| `deleteAccount.confirm.checkbox` | I understand this cannot be undone. | **I understand this action is irreversible.** |
| `deleteAccount.confirm.submit` | Delete account | **Delete my account** |
| `deleteAccount.confirm.cancel` | Cancel | **Cancel and return** |
| `deleteAccount.confirm.error` | Confirm you understand this cannot be undone. | **Confirm you understand this action is irreversible.** |
| `deleteAccount.blocked.title` | We can't delete this account yet. | **Deletion is temporarily blocked** |
| `deleteAccount.blocked.intro` | These need to be resolved first: | **The request cannot complete while specific obligations remain unresolved.** |
| `deleteAccount.blocked.note` | Once these are clear, come back and start again. | **Deletion can proceed after every outstanding item above is cleared.** |
| `deleteAccount.success.title` | Your account has been deleted. | **Account deleted** |
| `deleteAccount.success.body` | Reviews and transactional records are retained in anonymised form, and moderation records are kept in full. | **Your account has been deleted. Reviews were anonymised rather than removed, and the verification record was retained as previously explained.** |

### `footer`

| Key | Was | Now |
|---|---|---|
| `footer.address` | ADULIS · Addis Ababa, Ethiopia | **Addis Ababa, Ethiopia** |

### `forBuyers`

| Key | Was | Now |
|---|---|---|
| `forBuyers.heading` | Buy from the people you already follow. | **You followed them. This is where you buy from them.** |
| `forBuyers.sub` | You found them on TikTok or Instagram. Adulis is where the order actually happens — with real stock, a real identity, and a record of the handoff. | **Adulis gives buyers a factual shop view for sellers they already know from TikTok or Instagram.** |
| `forBuyers.steps[0].title` | Tap the seller's link | **Open the seller's shop** |
| `forBuyers.steps[0].body` | From their TikTok or Instagram bio. Their shop opens — you can browse without an account. | **Use the seller's Adulis bio link.** |
| `forBuyers.steps[1].title` | Reserve in the app | **See real stock and history** |
| `forBuyers.steps[1].body` | Sign in with your phone the first time. Your items are held while you pay. | **Check verification status, trust level, completed orders and stock timestamps.** |
| `forBuyers.steps[2].title` | Pay the seller directly | **Reserve in the app** |
| `forBuyers.steps[2].body` | Transfer to their bank account and upload the receipt. They confirm it against their own bank. | **Identity begins when you reserve.** |
| `forBuyers.steps[3].title` | Scan at handoff | **Pay the seller and confirm the handoff** |
| `forBuyers.steps[3].body` | When your order arrives, you scan the QR code. The order closes with evidence on both sides. | **Transfer directly to the seller, then confirm the item handoff.** |
| `forBuyers.sellerDoorTitle` | Selling to your followers? | **Selling on TikTok or Instagram?** |
| `forBuyers.sellerDoorLink` | See how Adulis works for sellers → | **For sellers →** |

### `forSellers`

| Key | Was | Now |
|---|---|---|
| `forSellers.heading` | Built for sellers who already have an audience. | **You already have the audience. Stop losing the orders you're already getting.** |
| `forSellers.sub` | You built the following. Adulis turns it into a shop that runs itself between posts. | **For creators, small businesses and shops selling through TikTok or Instagram.** |
| `forSellers.problemsHeading` | What breaks when you sell in DMs | **The problem** |
| `forSellers.problems[0].body` | A real order should not disappear inside a long chat thread. | **Commercial intent disappears inside a personal messaging queue.** |
| `forSellers.problems[1].title` | The same question 40 times | **The same question forty times** |
| `forSellers.problems[1].body` | Price, size, stock and delivery should not need the same reply all week. | **Repeated buyer questions consume seller time.** |
| `forSellers.problems[2].title` | No way to prove you're real | **Proving you're real repeatedly** |
| `forSellers.problems[2].body` | Anyone can buy followers. Nothing separates you from someone who did. | **Sellers repeatedly rebuild basic credibility with each buyer.** |
| `forSellers.problems[3].title` | Reputation lives in comments | **Run the business you already have** |
| `forSellers.problems[3].body` | A good record should be countable, not argued about. | **Structure existing demand rather than asking sellers to become something else.** |
| `forSellers.getHeading` | What you get | **What Adulis gives you** |
| `forSellers.benefits[0].title` | An ordered storefront | **Structured shop** |
| `forSellers.benefits[0].body` | Your products in the order you choose, not in the order you posted them. | **Products and policies in one ordered destination.** |
| `forSellers.benefits[1].title` | A chatbot that answers for you | **Repetitive-question handling** |
| `forSellers.benefits[1].body` | Price, stock, sizes and delivery, answered from your own product data. Free during the beta and for your first 60 days. Part of a paid plan after that. | **Bounded assistance for repeated buyer questions.** |
| `forSellers.benefits[2].title` | Reservations that hold stock | **Stock timestamps** |
| `forSellers.benefits[2].body` | A buyer reserves, stock is held, and it releases automatically if they don't pay. | **Buyers can see when stock was last confirmed.** |
| `forSellers.benefits[3].title` | Verified identity | **Buyer communication** |
| `forSellers.benefits[3].body` | Prove you control your social account. Government ID verification available. | **Keep commerce conversations tied to the product and order.** |
| `forSellers.benefits[4].title` | Reviews backed by evidence | **Order records** |
| `forSellers.benefits[4].body` | A review carries its strongest badge when the buyer scanned at handoff. | **Reservation, transfer evidence, seller confirmation and handoff are recorded.** |

### `home`

| Key | Was | Now |
|---|---|---|
| `home.sub` | The people following you already ask for prices, sizes, stock and delivery. Adulis gives those existing buyers a proper shop instead of another chat thread. | **Adulis gives creators, small businesses and shops a structured place for the orders now getting buried in direct messages.** |
| `home.buyerDoorTitle` | Buying from someone you follow? | **Buying from a seller you follow?** |
| `home.buyerDoorLink` | See how Adulis works for buyers → | **For buyers →** |

### `howItWorks`

| Key | Was | Now |
|---|---|---|
| `howItWorks.sub` | Simple for buyers. Powerful for sellers. | **A buyer-facing explanation of the loop—from the seller's social bio to a recorded handoff.** |
| `howItWorks.steps[0].title` | The seller posts as usual | **The seller shares their shop** |
| `howItWorks.steps[0].body` | They keep posting on TikTok and Instagram. Their Adulis shop link sits in their bio. | **One Adulis link in their TikTok or Instagram bio.** |
| `howItWorks.steps[1].title` | The follower sees the real thing | **The buyer sees the real thing** |
| `howItWorks.steps[1].body` | They tap the bio link and land on the seller's Adulis shop — identity, verification, completed orders, live stock, and when stock was last confirmed. | **Seller identity, verification status, trust level, completed order count, live stock and when it was last confirmed.** |
| `howItWorks.steps[2].body` | Browsing the web shop needs no account. The first time a buyer reserves, they sign in with their phone — in the app. | **Browsing needs no account. A buyer signs in with their phone the first time they reserve.** |
| `howItWorks.steps[4].body` | The buyer scans a QR code in the app. The order closes with evidence both sides can point to. | **The item changes hands, the handoff is confirmed by QR scan, and the order becomes a record both sides can point to.** |
| `howItWorks.shopSectionTitle` | What your shop looks like | **Shop previews** |
| `howItWorks.moneyTitle` | The money never passes through Adulis. | **Money boundary** |
| `howItWorks.moneyBody` | The buyer transfers directly to the seller's bank account. The seller confirms it against their own records. Adulis holds no funds and verifies no payments — it records what both sides did. | **Adulis never holds or processes buyer money and never decides whether a transfer is genuine. It records the buyer's receipt upload and the seller's confirmation.** |

### `notFound`

| Key | Was | Now |
|---|---|---|
| `notFound.heading` | Page not found | **We couldn't find that page.** |
| `notFound.home` | Go home | **Home** |

### `prohibited`

| Key | Was | Now |
|---|---|---|
| `prohibited.heading` | Prohibited Products | **Prohibited products** |
| `prohibited.noteTitle` | Not allowed on Adulis | **Enforcement** |
| `prohibited.noteBody` | These categories cannot be sold through Adulis. Applicable law and Adulis policy always apply. | **Adulis uses report-and-takedown and safety suspension.** |

### `trust`

| Key | Was | Now |
|---|---|---|
| `trust.heading` | Trust built on facts, not opinions. | **Trust & Safety** |
| `trust.sub` | Adulis publishes what it can prove from its own records — and is explicit about what it does not do. | **These are the mechanics that make buying from someone you follow accountable.** |
| `trust.boundaries[0].title` | We never hold your money | **Never holds buyer money** |
| `trust.boundaries[0].body` | Buyers pay the seller. No escrow. No wallet. No middleman. | **Adulis never holds or touches buyer money.** |
| `trust.boundaries[1].title` | We never verify your payments | **Never authenticates payment** |
| `trust.boundaries[1].body` | Buyers upload receipts. Sellers confirm in their own bank account. Adulis records both. | **Adulis never verifies whether a payment is genuine.** |
| `trust.boundaries[2].title` | We never characterise sellers | **Never labels a seller** |
| `trust.boundaries[2].body` | We publish counted facts from our records — completed orders, cancellation rate and stock accuracy. | **Adulis never labels a seller good, bad, safe or risky.** |
| `trust.verifiedHeading` | How a seller is verified | **Verification** |
| `trust.verification[0].title` | Account control | **Phone** |
| `trust.verification[0].body` | The seller posts a one-time code to their linked social account. Adulis checks it. Free, all sellers. | **Phone control is verified.** |
| `trust.verification[1].title` | Government ID | **Proven control of a real social account** |
| `trust.verification[1].body` | Verified through a third-party provider. Adulis never stores identity photographs — only a record that the check happened. | **The seller proves control of a real TikTok or Instagram account.** |
| `trust.ladderHeading` | How trust is earned | **The trust ladder** |
| `trust.publishHeading` | What we publish | **Published statistics** |
| `trust.published[0]` | completed handoffs | **Trust level** |
| `trust.published[1]` | cancellation rate | **Completed handoff count** |
| `trust.published[2]` | confirmation rate | **Cancellation rate** |
| `trust.published[3]` | scan completion rate | **Confirmation rate** |
| `trust.published[4]` | unresolved claims | **Scan completion rate** |
| `trust.published[5]` | stock confidence | **Unresolved claims** |
| `trust.publishNote` | Every one of these is a count from our own records. Adulis never calls a seller a scammer, a fraud or a criminal, and never asserts wrongdoing. | **These are counted from Adulis's own records. There is no free-text field, and no opinion is published about anyone.** |

### `waitlist`

| Key | Was | Now |
|---|---|---|
| `waitlist.errorSummaryTitle` | Please fix the following: | **There is a problem** |
| `waitlist.fields.fullNamePlaceholder` | Your name | **Enter full name** |
| `waitlist.fields.phonePlaceholder` | +251 ... | **+251 911 284 763** |
| `waitlist.fields.platformPlaceholder` | Choose TikTok or Instagram | **Select…** |
| `waitlist.fields.handlePlaceholder` | @yourhandle | **@mekdesstyle** |
| `waitlist.fields.alsoSellOnPlaceholder` | TikTok / Instagram / Neither | **Instagram** |
| `waitlist.fields.secondHandlePlaceholder` | @yourhandle | **@mekdes.style** |
| `waitlist.fields.followersPlaceholder` | Approximate count | **18,400** |
| `waitlist.fields.sellsPlaceholder` | For example: women's clothing | **Women's clothing and accessories** |
| `waitlist.fields.cityPlaceholder` | For example: Addis Ababa | **Addis Ababa** |
| `waitlist.fields.consent` | I confirm I understand how Adulis uses this information. Waitlist data is kept for up to 12 months. | **I consent to Adulis using this information to review my seller application. Waitlist data is kept for up to 12 months.** |
| `waitlist.submit` | Join the seller waitlist | **Submit seller waitlist** |
| `waitlist.errors.platformRequired` | Choose the platform where most of your audience is. | **Choose TikTok or Instagram.** |
| `waitlist.errors.consentRequired` | Confirm you understand how Adulis uses this information. | **Consent is required to submit.** |
| `waitlist.success.title` | You are on the waitlist. | **Application received** |
| `waitlist.success.next` | We review applications within 5–7 business days and contact selected sellers directly. | **A founder will read the application within 5–7 business days. Selected sellers are contacted by phone.** |
| `waitlist.success.correctPhone` | Correct phone number | **Mistyped your phone number? Correct it →** |

---

## Removed keys

These had no counterpart in the final wireframe set.

| Key | Was |
|---|---|
| `home.headlineLine1` | Sell where your audience already knows you. |
| `home.headlineLine2` | Give those orders somewhere better than your DMs. |
| `home.shopPreviewTitle` | Social post → real shop |
| `home.socialPostAlt` | Social post |
| `home.value.goodsTitle` | Built for physical goods |
| `home.value.goodsBody` | Cosmetics, clothing and electronics — real delivery, real buyers. |
| `home.value.payTitle` | Buyers pay sellers directly |
| `home.value.payBody` | By bank transfer. Adulis never holds or touches buyer money. |
| `home.value.evidenceTitle` | Evidence over opinions |
| `home.value.evidenceBody` | Reviews backed by evidence of a handoff, not just comments. |
| `home.cohortTitle` | We're building the first commerce layer for sellers on TikTok and Instagram. |
| `home.cohortBody` | Selected sellers join our beta cohort. Buyers pay nothing. |
| `shopPreview.sellerName` | Luna Fashion |
| `shopPreview.level` | Trusted |
| `shopPreview.orders` | 340 completed orders |
| `shopPreview.stock` | Live stock · updated 12 min ago |
| `howItWorks.categories.clothing` | Clothing |
| `howItWorks.categories.cosmetics` | Cosmetics |
| `howItWorks.categories.electronics` | Electronics |
| `paste.titleSeller` | Saved the video but not the link? |
| `paste.titleBuyer` | Saved the video but lost the link? |
| `paste.bodySeller` | A buyer who saved the post can paste that link into the Adulis app. Because one video often shows several items, Adulis returns every product that seller tagged with that post — and the buyer picks the one they want. |
| `paste.bodyBuyer` | Paste the post link into Adulis. If the video showed several items, you'll see all of them and can pick. |
| `paste.step1` | Paste link |
| `paste.step2` | Several matching products |
| `paste.step3` | Choose one |
| `forSellers.anchorCta` | Join the waitlist ↓ |
| `forSellers.benefits[5].title` | Your numbers, published |
| `forSellers.benefits[5].body` | Completed orders, cancellation rate, stock accuracy. Facts, not opinions. |
| `forSellers.notDoTitle` | What Adulis does not do |
| `forSellers.notDoBody` | Adulis does not hold your money, take a commission, deliver your goods, or handle your refunds. You own your product, your price, your stock accuracy and your fulfilment. Adulis gives you the tools and the record. |
| `forSellers.betaTitle` | Selected sellers only, for now. |
| `forSellers.betaBody` | The beta cohort is small and hand-picked. Beta sellers pay nothing. We contact everyone who applies. |
| `forBuyers.comingSoon` | Coming soon |
| `forBuyers.value[0].title` | See what's actually in stock |
| `forBuyers.value[0].body` | Live stock counts with the time they were last confirmed. Not a guess in a DM. |
| `forBuyers.value[1].title` | Know who you're buying from |
| `forBuyers.value[1].body` | Verified identity, completed order count, and published cancellation and stock-accuracy rates. |
| `forBuyers.value[2].title` | A record of the handoff |
| `forBuyers.value[2].body` | You scan a QR code when you receive your order. That's what makes your review count. |
| `forBuyers.notDoTitle` | What Adulis does not do |
| `forBuyers.notDoBody` | Adulis never holds your money and never verifies a transfer. You pay the seller directly, and the seller is responsible for your order, delivery and any refund. If something goes wrong you can raise a claim, and Adulis will give you everything it has on record — but it cannot refund you. |
| `trust.boundaries[3].title` | Evidence over opinions |
| `trust.boundaries[3].body` | Reviews are tied to completed handoffs. Opinions without proof do not determine reputation. |
| `trust.ladder[0]` | New |
| `trust.ladder[1]` | Established |
| `trust.ladder[2]` | Trusted |
| `trust.ladderNote` | A level is earned, never bought. No subscription tier, payment or advertising spend moves a seller up. Levels fall as well as rise. Thresholds are undecided. |
| `trust.wrongTitle` | If something goes wrong |
| `trust.wrongBody` | A buyer can raise a claim. Adulis reviews it against the evidence it already holds — chat history, scan records, payment receipts, stock history — and produces an evidence export the buyer can use. Adulis does not refund buyers and does not file police reports. |
| `prohibited.categories[0]` | Illegal |
| `prohibited.categories[1]` | Stolen |
| `prohibited.categories[2]` | Counterfeit |
| `prohibited.categories[3]` | Fraudulent or exploitative |
| `prohibited.categories[4]` | Firearms, ammunition, explosives |
| `prohibited.categories[5]` | Prohibited weapons |
| `prohibited.categories[6]` | Illegal drugs |
| `prohibited.categories[7]` | Unauthorised controlled substances |
| `prohibited.categories[8]` | Sexual-exploitation material |
| `prohibited.categories[9]` | Prohibited hazardous goods |
| `prohibited.categories[10]` | IP-infringing |
| `prohibited.categories[11]` | Locally prohibited |
| `about.originBody1` | Naod Solomon ran a shop selling through TikTok and Instagram for three years, handling around 50 orders a month there — against about five a month on Jiji and Facebook Marketplace combined. |
| `about.originBody2` | Adulis is being built around that behaviour: people follow a seller, want a real physical product, then have to finish the purchase inside a DM thread. |
| `about.founders[0].body` | Product direction and first-hand social-selling experience. |
| `about.founders[1].body` | Product engineering, technical systems and launch execution. |
| `about.founders[2].body` | Market research, seller outreach, sales, onboarding and growth. |
| `about.companyTitle` | Company |
| `about.companyBody` | Addis Ababa, Ethiopia. Company registration number will be added when available. |
| `deleteAccount.explain.buyerTitle` | If you're a buyer |
| `deleteAccount.explain.buyerBody` | Your identity is scrubbed. Active unpaid reservations are released. Reviews you wrote are anonymised, not deleted. Transactional records are kept in anonymised form. |
| `deleteAccount.explain.sellerTitle` | If you're a seller |
| `deleteAccount.explain.sellerBody` | Deletion is blocked while any order, payment, refund or claim is unresolved — we'll show you exactly what's outstanding. Your storefront is unpublished immediately. Reviews buyers wrote about you are anonymised, not deleted. Your verification record is retained. |
| `deleteAccount.phone.intro` | Enter the phone number on the account. We'll send a code to prove the account is yours. |
| `deleteAccount.otp.intro` | Enter the six-digit code we sent to {phone}. |
| `deleteAccount.otp.resend` | Resend code |
| `deleteAccount.blocked.items[0].title` | 2 orders awaiting handoff |
| `deleteAccount.blocked.items[0].action` | complete or cancel these in the app |
| `deleteAccount.blocked.items[1].title` | 1 payment awaiting your confirmation |
| `deleteAccount.blocked.items[1].action` | confirm or reject it in the app |
| `deleteAccount.blocked.items[2].title` | 1 open claim |
| `deleteAccount.blocked.items[2].action` | this closes when the claim is resolved |
| `notFound.body` | The page you opened does not exist or may have moved. |
| `notFound.help` | Open Help |

---

## Added keys

356 new strings. The bulk are the seven Tier 2 routes, which the
catalogue had only as stubs: `help`, `contact`, `terms`, `privacy`, `refunds`,
`sellerTerms` and `report`.

| Namespace | New strings |
|---|---|
| `about` | 12 |
| `common` | 7 |
| `contact` | 37 |
| `deleteAccount` | 27 |
| `forBuyers` | 22 |
| `forSellers` | 15 |
| `help` | 27 |
| `home` | 28 |
| `howItWorks` | 20 |
| `privacy` | 21 |
| `prohibited` | 26 |
| `refunds` | 10 |
| `report` | 27 |
| `sellerTerms` | 15 |
| `terms` | 14 |
| `trust` | 46 |
| `waitlist` | 2 |

---

## Gaps and questions raised by the reconciliation

> **All five were ruled on and the rulings are applied.** Each gap below records
> what was found; the **Ruling** line under it records what was decided and what
> shipped. Kept together so the reasoning and the outcome do not drift apart.

These are places where the inventory could not be applied as-is. Nothing here was
invented to fill a hole — each is left visibly unresolved.

### 1. `trust.claims` — "What can be claimed" has no body

The inventory lists it as a heading and the next line is the next heading:

```
- What can be claimed
- Review time
- Claims are reviewed within 2 days.
```

Every other item in that block is a title/body pair, so this one appears to have
lost its body in the wireframe. Seeded as a title with no body rather than
guessed at. **The sentence that defines what a buyer may actually claim is
missing, on the page that exists to answer that.**

**Ruling — confirmed missing; copy seeded.** The wireframer deleted the
mismatched body and never added the replacement, and the revision was reviewed as
fixed. Cross-checked against **ADU-PRD-01 §14**, whose trigger list matches
exactly: *payment confirmed with no seller response within SLA · seller cancels
for stock not updated · goods not received after payment · goods materially not
as described · refund promised and not delivered.* Seeded as a lead sentence plus
those five, in plain language. The card is deliberately taller than its siblings:
the no-repeated-sibling-text rule forbids identical filler, not unequal length.

### 2. Contact and report reference numbers look like counters

```
ADU-CON-0826-104
ADU-REP-0826-041
```

`0826` reads as a date (26 August) and `104` / `041` read as sequential
counters. R4 ruled that the waitlist reference must not be a counter, because it
tells every applicant how many came before them. The same reasoning applies here
— arguably harder, since a report reference tells a reporter how many reports
exist. These have been seeded as `{reference}` placeholders and the generator is
**not yet written**; it should reuse `waitlistReference()`'s alphabet and shape.

**Ruling — one generator, three prefixes.** `waitlistReference()` is now
`reference(kind)` emitting `ADU-WL-`, `ADU-CON-` and `ADU-REP-`, sharing the
transcription-safe alphabet, `crypto.getRandomValues`, six characters and no
counter. Three generators with different properties is three things to get wrong.

The report reference matters more than volume disclosure suggests: report counts
are a **moderation signal**. Someone who learns reports are rare learns
enforcement is thin, which is what a bad actor wants to know before testing it.

### 3. Store badges moved

W23 places the App Store and Google Play badges in an `Apps` section below the
buying steps, not in the hero, and replaces the per-badge "Coming soon" with one
statement: *"The apps have not shipped yet."* Seeded as the wireframe has it.

### 4. Copy that was dropped, and is worth a second look

Three strings had no counterpart in the final set and are now gone:

- **The 50-vs-5 comparison** in About. Replaced by *"roughly eighty orders a
  month through direct messages, against almost nothing on the classifieds sites
  everyone recommends."* The README described the old comparison as carrying the
  page. The new line is less precise but makes a broader claim; it is the
  reviewed one, so it ships.

  **Ruling — stays as written.** A specific number on both sides would be more
  credible than a specific number against a vague absence, but the CEO confirms
  the classifieds figure was never tracked precisely. "Almost nothing" is the
  accurate sentence. Being caught on a fabricated figure on the credibility page
  is far worse than a vague one, so no number is invented here.
- **`forSellers.notDoTitle` / `notDoBody`** — the explicit "What Adulis does not
  do" block on the seller page. The buyer page keeps its equivalent as
  `forBuyers.limits`; the seller page no longer has one.

  **Ruling — added, reframed as "What you handle".** Not mirrored from the buyer
  page: W23's block is titled *honest limits* because a buyer needs to know what
  protection does not exist, whereas a seller reading disclaimers on a
  recruitment page reads defensiveness. The same content as a job description
  fits the positioning. One line inside the existing block, not a new section —
  W03 is the conversion page and every block costs. The substance is the
  obligation that genuinely surprises people: **the seller, not Adulis, decides
  whether a payment is real.**
- **`paste`** — the whole namespace. W02 keeps the behaviour under
  `howItWorks.findAgain` but drops the three-step Paste → Several matching
  products → Choose one sequence.

### 5. `notFound` lost its body and its Help button

W20 is now the code, one sentence and a single `Home` button. The previous
version had an explanatory line and a second button to Help.

**Ruling — correct as dropped, no action.** Both seller-recovery paths survive
under `howItWorks.findAgain`; what went was the *numbered* presentation, and
rightly: those are two alternatives, not two steps. Numbers appear only where
content is a genuine sequence — W02's five, W23's four, W22's five states.

/**
 * Feature flags that gate a surface on work that does not exist yet.
 *
 * One module, one constant each, conditions recorded beside the declaration —
 * the same pattern as `AM_ENABLED`, which stays in `src/i18n/routing.ts` because
 * it is genuinely a routing concern: it changes which locales are advertised and
 * which are indexable. This module is for flags that are not.
 */

/**
 * Whether the self-service account-deletion flow is offered.
 *
 * **`false`, and it must stay false until a real backend exists.**
 *
 * The specification asked for a working flow now. That was the wrong
 * requirement: the app-store obligation is that a person can *find and
 * understand* the deletion path, not that a flow authenticates against a backend
 * that has not been built. What existed instead was a state machine held entirely
 * in React state — every transition a client decision, `confirm` reachable
 * without passing `otp` by construction, and a blocked state rendering a seller's
 * outstanding orders, payments and claims (security audit 01, F-02).
 *
 * While `false`:
 *   - the explanatory content stays, in full — that is what a store reviewer
 *     reads and what a person actually needs
 *   - no phone entry, no OTP, no confirm step, no blocked state renders
 *   - one honest line points to the manual route; it does not imply self-service
 *   - the page stays reachable from the footer and stays noindex
 *
 * It may be set `true` only when ALL of these hold. They are the design
 * requirements from `docs/deletion-flow-design.md`:
 *
 *   1. A server-authoritative state machine. The server owns every transition;
 *      reaching `confirm` requires proof that `otp` was passed.
 *   2. Uniform response — body, status AND timing — whether or not an account
 *      exists for the number. Send-code must not be an enumeration oracle.
 *   3. Per-phone AND per-IP rate limiting, independently. Per-IP alone lets one
 *      attacker walk many numbers; per-phone alone lets a botnet grind one.
 *   4. An attempt cap per code with lockout. Six digits is 10^6.
 *   5. OTP expiry, single-use, and invalidation of prior codes on reissue.
 *   6. Constant-time comparison of the submitted code.
 *   7. The blocked list returned only after the code is verified server-side,
 *      never in the same response as the check.
 *   8. **An end-to-end no-JavaScript pass over all five steps**, with the ticket
 *      surviving three boundaries. `check:copy` asserts every form carries an
 *      `action` and none uses `onSubmit`, which proves the flow CAN work without
 *      a bundle — it cannot prove the five steps chain, because nothing can
 *      drive them while this flag is false and no API exists.
 *
 *      A guard that has only ever asserted a mechanism is the same shape as a
 *      guard that has only ever passed. This is a precondition, not a follow-up.
 */
export const DELETION_FLOW_ENABLED = false;

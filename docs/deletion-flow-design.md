# Account deletion — design requirements

**Status:** specification. Not built.
**Gated by:** `DELETION_FLOW_ENABLED` in [`src/lib/flags.ts`](../src/lib/flags.ts), currently `false`.
**Source:** security audit 01 F-02, accepted as the specification in Build Amendment 07 §5.
**Blocked on:** the account backend, which does not exist yet.

---

## What ships today, and why that is correct

The app-store obligation is that a person can **find and understand** the
deletion path. It is not that a flow authenticates against a backend that has not
been built.

So `/delete-account` currently renders the full explanation — what deletion does
for a buyer, what it does for a seller, what is retained and what is anonymised —
followed by one line pointing at the manual route. The page stays reachable from
the footer on every page and stays `noindex, nofollow`.

The interactive flow does not render. It exists in
[`DeleteAccountFlow.tsx`](../src/components/DeleteAccountFlow.tsx) below the flag
check, because it is the shape the real one will take, and it is unreachable
while the flag is false.

## Why the previous shape could not be wired

The state machine was held entirely in React state: `explain → phone → otp →
confirm → success`, plus `blocked`. Every transition was a client decision, so
`confirm` was reachable without passing `otp` by construction, and there was no
server counterpart of any kind — no action, no route, nothing.

The sharpest part was the `blocked` branch. It lists a seller's outstanding
orders, unconfirmed payments and open claims. **That is account data, and the
only thing that would stand in front of it is a six-digit code.**

## The seven conditions

`DELETION_FLOW_ENABLED` may be set `true` only when **all** of these hold. They
are duplicated beside the flag declaration so nobody flips it without reading
them.

### 1. The server owns the state

Each step presents a short-lived, single-use token bound to the previous step.
Reaching `confirm` requires proof that `otp` was passed. The client renders
whatever step the server says it is on; it never decides.

### 2. Uniform response whether or not an account exists

Same body, same status code, and **same timing**, for a number with an account
and a number without one. Send-code must not be an enumeration oracle.

Timing is the one that gets missed. If a real number triggers an SMS send and an
unknown number returns immediately, the difference is measurable and the endpoint
enumerates whether a given phone number belongs to an Adulis seller. That is a
list worth having for exactly the adversary in the threat model.

### 3. Per-phone **and** per-IP rate limiting, independently

Per-IP alone lets one attacker walk many numbers from one machine. Per-phone
alone lets a botnet grind one number from many machines. Both, counted
separately, both enforced.

Note that the in-app limiter is a backstop only — see
[`SECURITY.md`](../SECURITY.md) and `src/lib/rate-limit.ts`. Per-phone limiting
cannot come from Cloudflare's edge rules, because the phone number is in the
request body, so this one needs real shared state (KV or a Durable Object).

### 4. An attempt cap per code, with lockout

Six digits is 10⁶. At five attempts per code with lockout, an attacker gets
5 in 1,000,000 per issued code. Without a cap, a script exhausts the space.

### 5. Expiry, single use, and invalidation on reissue

A code expires (ten minutes or less), is consumed on first use whether or not it
was correct, and requesting a new code invalidates every prior one for that
number. Replay of a consumed code fails closed.

### 6. Constant-time comparison

Compare the submitted code against the stored one in constant time. A
short-circuiting string compare leaks the correct prefix.

### 7. The blocked list is returned only after verification

The outstanding orders, payments and claims are returned **after** the code is
verified server-side, and never in the same response as the code check. A
response that carries account data alongside a "wrong code" result has already
leaked it.

## Also required, outside the seven

- **The OTP is not a sign-in.** It proves identity for the deletion request
  alone: no session, no access to any other surface. The copy on the phone step
  already says so, and must keep saying so — there is no web sign-in anywhere on
  this site (ADU-WEB-01 §6.1).
- **Deletion is blocked while obligations are unresolved**, and the person is
  shown exactly which (ADU-PRD-01 §16.9). That is what the `blocked` state is
  for.
- **The confirm step offers a cancel** and requires an explicit acknowledgement
  (ADU-WEB-01 §6.2).
- **What deletion actually does** is specified in ADU-PRD-01 §16.9, not here:
  reviews anonymised rather than deleted, the keyed ID hash retained, moderation
  history retained in full. The page copy already reflects it.

## When this becomes build work

When the account backend exists. Not before — and the flag is what keeps that
honest, because there is no way to half-ship this.

import type { DeletionBlocker } from './client';

/**
 * The deletion flow's state, kept OUT of `src/actions/deletion.ts`.
 *
 * ⚠ It cannot live beside the action. A module marked `'use server'` may export
 * only async functions: every other export is rewritten into a server
 * *reference*, so a plain object imported from one arrives at the component as a
 * proxy with none of its fields. `initialDeletionState.step` read as `undefined`
 * there, every step check fell through, and the page rendered its terminal
 * "account deleted" panel to anyone who merely opened it. It typechecked, it
 * built, and it was wrong at runtime.
 *
 * The other three forms already do this correctly — `emptyFormState` lives in
 * `@/lib/validation`, not in the action. This one had diverged.
 */
export type DeletionStep =
  | 'explain'
  | 'phone'
  | 'otp'
  | 'confirm'
  | 'blocked'
  | 'success'
  | 'unreachable';

export type DeletionState = {
  step: DeletionStep;
  /** Carried across steps in a hidden field. Never persisted. */
  phone: string;
  /** Carried across steps in a hidden field. Never a cookie. */
  ticket: string | null;
  /** Exactly as the server returned them. */
  blockers: DeletionBlocker[];
  /** A key into the `deleteAccount` namespace, never a rendered sentence. */
  error: string | null;
};

export const initialDeletionState: DeletionState = {
  step: 'explain',
  phone: '',
  ticket: null,
  blockers: [],
  error: null
};

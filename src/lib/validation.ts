export type FieldErrors = Record<string, string>;

export type FormState = {
  ok: boolean;
  errors: FieldErrors;
  /** Echoed back so a failed submission re-renders with the person's answers intact. */
  values: Record<string, string>;
  reference?: string;
};

export const emptyFormState: FormState = { ok: false, errors: {}, values: {} };

/** Trimmed string from a FormData entry. Non-string entries read as empty. */
export function str(data: FormData, key: string): string {
  const value = data.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Whether a checkbox was ticked.
 *
 * This used to be `data.get(key) != null`, which counted any present entry --
 * including a file upload or an arbitrary string (security audit 01, F-19).
 * Consent is a legal record under Proclamation 1321/2024, so what counts as
 * having given it should be exact rather than inferred from field presence.
 *
 * An unchecked HTML checkbox submits nothing at all; a checked one submits its
 * `value`, defaulting to `on`. Anything else did not come from the checkbox.
 */
export function checked(data: FormData, key: string): boolean {
  const value = data.get(key);
  return typeof value === 'string' && value === 'on';
}

/** Deliberately permissive -- enough to catch a typo, not enough to reject a real address. */
export function isPlausibleEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

/**
 * Deliberately permissive. Ethiopian numbers are entered several ways
 * (+251 9..., 09..., 9...) and rejecting a real seller over formatting costs
 * more than accepting a malformed one we can call back about.
 */
export function isPlausiblePhone(value: string): boolean {
  const digits = value.replace(/[^\d]/g, '');
  return digits.length >= 9 && digits.length <= 15;
}

/** ADL-WL-26-1042 */
export function waitlistReference(now = new Date()): string {
  const yy = String(now.getFullYear()).slice(-2);
  const n = Math.floor(1000 + Math.random() * 9000);
  return `ADL-WL-${yy}-${n}`;
}

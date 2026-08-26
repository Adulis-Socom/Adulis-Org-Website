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

/**
 * Transcription-safe alphabet: no `0`/`O`, no `1`/`I`/`L`.
 *
 * A founder calls every applicant within 5-7 business days and the applicant
 * reads this reference back over a phone line, often a poor one. Every pair a
 * person can mishear or mis-transcribe is removed rather than relied on.
 *
 * `U` is out too, which the ruling did not ask for: with letters and digits
 * mixed at random, keeping vowels lets the generator occasionally produce a
 * real word, and some of those words are ones nobody wants to read out to a
 * stranger. Dropping one vowel costs almost nothing here.
 */
const REF_ALPHABET = '23456789ABCDEFGHJKMNPQRSTVWXYZ';

/** The three things this site issues a reference for. */
export type ReferenceKind = 'WL' | 'CON' | 'REP';

/**
 * ADU-WL-26-K7M4XP · ADU-CON-26-K7M4XP · ADU-REP-26-K7M4XP
 *
 * One generator, three prefixes. Three generators with different properties is
 * three things to get wrong.
 *
 * `ADU-` matches the document series and the brand. It was `ADL-`, which matched
 * nothing.
 *
 * **Never a counter.** The wireframes showed `ADU-CON-0826-104` and
 * `ADU-REP-0826-041` — a date plus a sequence. A counter on the waitlist tells
 * every applicant how many applied before them, which is competitively sensitive
 * for a company recruiting a cohort.
 *
 * On a **report** reference it is worse than commercial leakage. Report volume is
 * a moderation signal: someone who learns reports are rare learns enforcement is
 * thin, which is exactly what a bad actor wants to know before testing it. The
 * number is withheld from the person best placed to exploit it.
 *
 * Six characters, not the four in the wireframe example. Four characters of this
 * alphabet is 810,000 values, and across a 2,000-seller cohort that is about
 * two or three expected collisions -- two applicants holding the same reference,
 * discovered by a founder looking at a spreadsheet trying to work out which one
 * they are speaking to. Six characters is 729 million and about 0.003 expected.
 * The extra two characters cost one syllable each on the phone call.
 *
 * `crypto.getRandomValues` rather than `Math.random`, which is not uniform and
 * is predictable from prior outputs -- neither property is wanted on an
 * identifier a stranger can request repeatedly.
 */
export function reference(kind: ReferenceKind, now = new Date()): string {
  const yy = String(now.getFullYear()).slice(-2);
  // Rejection-free modulo bias is not worth chasing here, but a 256-wide byte
  // over a 30-wide alphabet does skew the first 16 symbols slightly. Masking to
  // the largest multiple of the alphabet and resampling keeps it uniform.
  const limit = Math.floor(256 / REF_ALPHABET.length) * REF_ALPHABET.length;
  let out = '';
  while (out.length < 6) {
    const b = new Uint8Array(1);
    crypto.getRandomValues(b);
    if (b[0] >= limit) continue;
    out += REF_ALPHABET[b[0] % REF_ALPHABET.length];
  }
  return `ADU-${kind}-${yy}-${out}`;
}


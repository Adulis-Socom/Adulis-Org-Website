'use client';

import type { ReactNode, RefObject } from 'react';
import { Link } from '@/i18n/routing';
import { ROUTES } from '@/lib/routes';

/**
 * The pieces every form on this site shares.
 *
 * Three forms now use them — waitlist, contact, report content — and all three
 * have to behave identically under the §5.3 rules: server-authoritative
 * validation, an error summary that is a list of links each moving focus to the
 * field it names, a submit button that is always enabled, valid fields keeping
 * their values through a failure, and every message with its own vertical space.
 *
 * Extracted rather than copied, because three copies of an accessibility
 * contract is three places for it to drift, and drift here is invisible until
 * somebody using a screen reader hits it.
 */

export function Field({
  id,
  label,
  required,
  help,
  error,
  children
}: {
  id: string;
  label: string;
  required?: boolean;
  help?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="field">
      <label htmlFor={id} className="label">
        {label}
        {required && (
          <span className="text-danger" aria-hidden>
            {' '}
            *
          </span>
        )}
        {!required && <span className="label-optional"> (optional)</span>}
      </label>
      {children}
      {error && <span className="field-error">{error}</span>}
      {help && !error && <span className="field-help">{help}</span>}
    </div>
  );
}

/**
 * Links, not a sentence. Each entry moves focus to the field it names, which is
 * the difference between "something is wrong" and "here is where".
 *
 * `role="alert"` plus `tabIndex={-1}` so the caller can move focus here after a
 * failed submission and a screen-reader user is told what happened.
 */
export function ErrorSummary({
  title,
  formError,
  fields,
  labelFor,
  summaryRef
}: {
  title: string;
  formError?: string;
  fields: string[];
  labelFor: (field: string) => string;
  summaryRef: RefObject<HTMLDivElement | null>;
}) {
  if (fields.length === 0 && !formError) return null;
  return (
    <div ref={summaryRef} tabIndex={-1} role="alert" className="error-summary mb-5">
      <p className="text-body font-semibold text-danger">{title}</p>
      {formError && <p className="mt-2 text-body text-danger">{formError}</p>}
      <ul className="mt-2 space-y-1">
        {fields.map((field) => (
          <li key={field}>
            <a href={`#${field}`} className="text-body font-semibold text-danger underline">
              {labelFor(field)} →
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Off-screen, not hidden. A bot that checks `display: none` or `visibility`
 * still fills a field positioned off the left edge.
 */
export function Honeypot() {
  return (
    <div aria-hidden className="absolute left-[-9999px]">
      <label htmlFor="company">Company</label>
      <input id="company" name="company" type="text" tabIndex={-1} autoComplete="off" />
    </div>
  );
}

/**
 * The consent checkbox and its privacy link.
 *
 * The input measures 20x20, under the 44x44 invariant, and that is accepted
 * rather than a finding: the label is correctly associated, so the real target
 * is the whole consent line, which is far larger. Enlarging the box itself would
 * make it the only oversized control on the form. Re-reported by every audit that
 * measures the raw element — this comment is here so it can be closed quickly.
 */
export function ConsentField({
  label,
  linkLabel,
  error
}: {
  label: string;
  linkLabel: string;
  error?: string;
}) {
  return (
    <div className="field">
      <div className="flex items-start gap-3">
        <input
          id="consent"
          name="consent"
          type="checkbox"
          aria-describedby={error ? 'consent-error' : undefined}
          className="checkbox"
        />
        {/* min-h-[44px] on the LABEL, not on a wrapper.
            The checkbox itself is 20x20 and the real target is the label it is
            associated with — so the label is what has to satisfy the 44px
            invariant. The waitlist passed only because its consent sentence is
            long enough to wrap to three lines; contact's is shorter and landed
            at about 40px, which is how this surfaced. Relying on sentence length
            for a tap target is not a design.

            `block`, NOT `flex`: a flex container blockifies its children, which
            turned the inline "Privacy →" link into something the 44px check
            measures as a control. An inline link inside running text is text. */}
        <label
          htmlFor="consent"
          className="block min-h-[44px] py-1.5 text-small text-ink-muted"
        >
          {label}{' '}
          <Link href={ROUTES.privacy} className="link-arrow">
            {linkLabel}
          </Link>
        </label>
      </div>
      {error && (
        <span id="consent-error" className="field-error">
          {error}
        </span>
      )}
    </div>
  );
}

/**
 * Always enabled, deliberately. A disabled button cannot take keyboard focus, so
 * a keyboard user gets no way to trigger validation and no explanation of why
 * nothing happened.
 */
export function SubmitButton({ label, pending }: { label: string; pending: boolean }) {
  return (
    <button type="submit" className="btn-primary btn-block mt-6" aria-busy={pending}>
      {label}
    </button>
  );
}

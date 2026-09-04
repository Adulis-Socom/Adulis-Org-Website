'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { submitWaitlist } from '@/actions/waitlist';
import { emptyFormState } from '@/lib/validation';
import { track } from '@/lib/analytics';
import { ROUTES, WAITLIST_HREF } from '@/lib/routes';

/**
 * Order matters: the error summary lists fields in the order they appear on the
 * page, so the links run top to bottom. The two optional fields are here because
 * they can now fail a length check even though they can never fail a presence
 * one — an error with no link in the summary is unreachable by keyboard.
 */
const FIELD_ORDER = [
  'fullName',
  'phone',
  'platform',
  'handle',
  'secondHandle',
  'followers',
  'sells',
  'city',
  'consent'
] as const;

export function WaitlistForm() {
  const t = useTranslations('waitlist');
  const [state, action, pending] = useActionState(submitWaitlist, emptyFormState);
  const summaryRef = useRef<HTMLDivElement>(null);

  // Second handle is revealed once a second platform is chosen. It starts
  // visible so that it is present without JavaScript, and this component only
  // ever narrows it -- never the other way round.
  const [alsoSellOn, setAlsoSellOn] = useState(state.values.alsoSellOn ?? '');
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const showSecondHandle = !hydrated || (alsoSellOn !== '' && alsoSellOn !== 'neither');

  // Which fields a person focused and left empty, emitted once each on blur.
  // Reported as field names only -- never a value, because the values here are a
  // name and a phone number, and an analytics event is not a place either
  // belongs. No transport until Checkpoint 4; see src/lib/analytics.
  const abandoned = useRef<Set<string>>(new Set());
  const onBlurCapture = (event: React.FocusEvent<HTMLFormElement>) => {
    // React types FocusEvent<HTMLFormElement>.target as the form, but with
    // capture the real target is whichever control was left. Narrow through
    // unknown rather than widening the handler's type.
    const el = event.target as unknown as HTMLInputElement | HTMLSelectElement | null;
    if (!el || !el.name || el.type === 'checkbox' || el.name === 'company') return;
    if (el.value.trim() !== '' || abandoned.current.has(el.name)) return;
    abandoned.current.add(el.name);
    track('waitlist_field_abandoned', { field: el.name });
  };

  // Move focus to the summary so a screen-reader user is told what failed.
  useEffect(() => {
    if (Object.keys(state.errors).length > 0) summaryRef.current?.focus();
  }, [state]);

  if (state.ok && state.reference) {
    return (
      <div className="form-column">
        <div className="card" role="status">
          <h2 className="section-title">{t('success.title')}</h2>
          <p className="tnum mt-2 text-body font-semibold text-ink">
            {t('success.reference', { reference: state.reference })}
          </p>
          <p className="card-body">{t('success.next')}</p>
          {/* W03's submitted state states this outright rather than leaving the
              applicant to infer it from a reference number that looks like an
              acceptance. */}
          <p className="note">{t('success.noGuarantee')}</p>
          <p className="field-help">{t('success.correctPhoneHelp')}</p>
          <Link href={WAITLIST_HREF} className="btn-secondary mt-4">
            {t('success.correctPhone')}
          </Link>
        </div>
      </div>
    );
  }

  const err = (field: string) =>
    state.errors[field] ? t(`errors.${state.errors[field]}`) : undefined;

  const listed = FIELD_ORDER.filter((f) => state.errors[f]);

  return (
    <form action={action} noValidate className="form-column" onBlurCapture={onBlurCapture}>
      {(listed.length > 0 || state.errors._form) && (
        <div ref={summaryRef} tabIndex={-1} role="alert" className="error-summary mb-5">
          <p className="text-body font-semibold text-danger">{t('errorSummaryTitle')}</p>
          {state.errors._form && (
            <p className="mt-2 text-body text-danger">{t(`errors.${state.errors._form}`)}</p>
          )}
          {/* Links, not a sentence -- each one moves focus to the field it names. */}
          <ul className="mt-2 space-y-1">
            {listed.map((field) => (
              <li key={field}>
                <a href={`#${field}`} className="text-body font-semibold text-danger underline">
                  {t(`fields.${field}`)} →
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Honeypot -- off-screen, not hidden, so bots that check visibility still fill it. */}
      <div aria-hidden className="absolute left-[-9999px]">
        <label htmlFor="company">Company</label>
        <input id="company" name="company" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <Field id="fullName" label={t('fields.fullName')} required error={err('fullName')}>
        <input
          id="fullName"
          name="fullName"
          type="text"
          autoComplete="name"
          defaultValue={state.values.fullName}
          placeholder={t('fields.fullNamePlaceholder')}
          className={`input ${err('fullName') ? 'input-invalid' : ''}`}
        />
      </Field>

      <Field id="phone" label={t('fields.phone')} required error={err('phone')}>
        <input
          id="phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          defaultValue={state.values.phone}
          placeholder={t('fields.phonePlaceholder')}
          className={`input ${err('phone') ? 'input-invalid' : ''}`}
        />
      </Field>

      <Field id="platform" label={t('fields.platform')} required error={err('platform')}>
        <select
          id="platform"
          name="platform"
          defaultValue={state.values.platform ?? ''}
          className={`select ${err('platform') ? 'input-invalid' : ''}`}
        >
          <option value="">{t('fields.platformPlaceholder')}</option>
          <option value="tiktok">{t('options.tiktok')}</option>
          <option value="instagram">{t('options.instagram')}</option>
        </select>
      </Field>

      <Field id="handle" label={t('fields.handle')} required error={err('handle')}>
        <input
          id="handle"
          name="handle"
          type="text"
          defaultValue={state.values.handle}
          placeholder={t('fields.handlePlaceholder')}
          className={`input ${err('handle') ? 'input-invalid' : ''}`}
        />
      </Field>

      <Field id="alsoSellOn" label={t('fields.alsoSellOn')}>
        <select
          id="alsoSellOn"
          name="alsoSellOn"
          value={alsoSellOn}
          onChange={(e) => setAlsoSellOn(e.target.value)}
          className="select"
        >
          <option value="">{t('fields.alsoSellOnPlaceholder')}</option>
          <option value="tiktok">{t('options.tiktok')}</option>
          <option value="instagram">{t('options.instagram')}</option>
          <option value="neither">{t('options.neither')}</option>
        </select>
      </Field>

      {showSecondHandle && (
        <Field
          id="secondHandle"
          label={t('fields.secondHandle')}
          help={t('fields.secondHandleHelp')}
          error={err('secondHandle')}
        >
          <input
            id="secondHandle"
            name="secondHandle"
            type="text"
            defaultValue={state.values.secondHandle}
            placeholder={t('fields.secondHandlePlaceholder')}
            className={`input ${err('secondHandle') ? 'input-invalid' : ''}`}
          />
        </Field>
      )}

      {/* No threshold, no minimum, no rejection. Captured to inform the
          decision the beta exists to make. */}
      <Field
        id="followers"
        label={t('fields.followers')}
        help={t('fields.followersHelp')}
        error={err('followers')}
      >
        <input
          id="followers"
          name="followers"
          type="text"
          inputMode="numeric"
          defaultValue={state.values.followers}
          placeholder={t('fields.followersPlaceholder')}
          className={`input tnum ${err('followers') ? 'input-invalid' : ''}`}
        />
      </Field>

      <Field id="sells" label={t('fields.sells')} required error={err('sells')}>
        <input
          id="sells"
          name="sells"
          type="text"
          defaultValue={state.values.sells}
          placeholder={t('fields.sellsPlaceholder')}
          className={`input ${err('sells') ? 'input-invalid' : ''}`}
        />
      </Field>

      <Field id="city" label={t('fields.city')} required error={err('city')}>
        <input
          id="city"
          name="city"
          type="text"
          autoComplete="address-level2"
          defaultValue={state.values.city}
          placeholder={t('fields.cityPlaceholder')}
          className={`input ${err('city') ? 'input-invalid' : ''}`}
        />
      </Field>

      <div className="field">
        {/* The input measures 20x20, under the 44x44 invariant, and that is
            accepted rather than a finding: the label is correctly associated, so
            the real target is the whole consent line, which is far larger.
            Enlarging the box itself would make it the only oversized control on
            the form. Re-reported by every audit that measures the raw element —
            this comment is here so it can be closed quickly next time. */}
        <div className="flex items-start gap-3">
          <input
            id="consent"
            name="consent"
            type="checkbox"
            aria-describedby={err('consent') ? 'consent-error' : undefined}
            className="checkbox"
          />
          {/* Same 44px floor as the shared ConsentField in form.tsx — see the
              note there. This form still has its own consent block; the two must
              not drift, because the invariant is identical on both. */}
          <label
            htmlFor="consent"
            className="block min-h-[44px] py-1.5 text-small text-ink-muted"
          >
            {t('fields.consent')}{' '}
            <Link href={ROUTES.privacy} className="link-arrow">
              {t('fields.consentLink')}
            </Link>
          </label>
        </div>
        {err('consent') && (
          <span id="consent-error" className="field-error">
            {err('consent')}
          </span>
        )}
      </div>

      {/* Always enabled. A disabled button cannot take keyboard focus, so a
          keyboard user gets no way to trigger validation and no explanation. */}
      <button type="submit" className="btn-primary btn-block mt-6" aria-busy={pending}>
        {t('submit')}
      </button>
    </form>
  );
}

function Field({
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
  children: React.ReactNode;
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

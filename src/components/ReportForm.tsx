'use client';

import { useActionState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { submitReport } from '@/actions/report';
import { emptyFormState } from '@/lib/validation';
import { ConsentField, ErrorSummary, Field, Honeypot, SubmitButton } from './form';
import { UndecidedFlag } from './ui';

const FIELD_ORDER = ['what', 'description', 'contact', 'consent'];

/**
 * W21's two states: form and success.
 *
 * ⚠ The reason category is rendered as a visibly flagged placeholder, not as a
 * select with invented options. A moderation taxonomy published on a public page
 * is a policy statement rather than copy, and this page becomes an app-store
 * requirement at app launch — so the gap is shown rather than filled.
 *
 * The rest of the form works. Someone can report content today and describe the
 * problem in their own words; what is missing is the structure that makes triage
 * possible at volume, which is a founder decision.
 */
export function ReportForm() {
  const t = useTranslations('report');
  const [state, action, pending] = useActionState(submitReport, emptyFormState);
  const summaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (Object.keys(state.errors).length > 0) summaryRef.current?.focus();
  }, [state]);

  if (state.ok && state.reference) {
    return (
      <div className="card" role="status">
        <h2 className="section-title">{t('success.title')}</h2>
        {/* States the 24-hour commitment outright. Someone who has just reported
            harmful content should not have to guess whether anyone will look. */}
        <p className="card-body max-w-prose">{t('success.body')}</p>
        <p className="tnum mt-2 text-body font-semibold text-ink">
          {t('success.reference', { reference: state.reference })}
        </p>
      </div>
    );
  }

  const err = (field: string) =>
    state.errors[field] ? t(`errors.${state.errors[field]}`) : undefined;

  return (
    <form action={action} noValidate className="form-column">
      <ErrorSummary
        title={t('errorSummaryTitle')}
        formError={state.errors._form ? t(`errors.${state.errors._form}`) : undefined}
        fields={FIELD_ORDER.filter((f) => state.errors[f])}
        // 'Consent', not the entire consent sentence — a summary entry is a
        // signpost, and a paragraph-long link is hostile to a screen reader
        // moving through the list.
        labelFor={(f) => t(`fields.${f === 'consent' ? 'consentLabel' : f}`)}
        summaryRef={summaryRef}
      />

      <Honeypot />

      <Field id="what" label={t('fields.what')} required error={err('what')}>
        <input
          id="what"
          name="what"
          type="text"
          defaultValue={state.values.what}
          placeholder={t('fields.whatPlaceholder')}
          className={`input ${err('what') ? 'input-invalid' : ''}`}
        />
      </Field>

      {/* No <select>. There are no categories to put in it, and inventing them
          would publish a moderation policy nobody approved. */}
      <div className="field">
        <span className="label">{t('fields.reason')}</span>
        <UndecidedFlag>{t('fields.reasonPlaceholder')}</UndecidedFlag>
      </div>

      <Field id="description" label={t('fields.description')} required error={err('description')}>
        <textarea
          id="description"
          name="description"
          rows={6}
          defaultValue={state.values.description}
          placeholder={t('fields.descriptionPlaceholder')}
          className={`input ${err('description') ? 'input-invalid' : ''}`}
        />
      </Field>

      <Field id="link" label={t('fields.link')} error={err('link')}>
        <input
          id="link"
          name="link"
          type="text"
          defaultValue={state.values.link}
          placeholder={t('fields.linkPlaceholder')}
          className={`input ${err('link') ? 'input-invalid' : ''}`}
        />
      </Field>

      <Field id="contact" label={t('fields.contact')} required error={err('contact')}>
        <input
          id="contact"
          name="contact"
          type="text"
          defaultValue={state.values.contact}
          placeholder={t('fields.contactPlaceholder')}
          className={`input ${err('contact') ? 'input-invalid' : ''}`}
        />
      </Field>

      <ConsentField
        label={t('fields.consent')}
        linkLabel={t('fields.consentLink')}
        error={err('consent')}
      />

      <SubmitButton label={t('submit')} pending={pending} />
    </form>
  );
}

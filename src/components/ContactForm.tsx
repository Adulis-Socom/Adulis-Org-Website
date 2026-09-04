'use client';

import { useActionState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { submitContact } from '@/actions/contact';
import { emptyFormState } from '@/lib/validation';
import { ConsentField, ErrorSummary, Field, Honeypot, SubmitButton } from './form';

/** Summary order matches visual order, so the list reads down the page. */
const FIELD_ORDER = ['name', 'email', 'subject', 'message', 'consent'];

/**
 * W12's three states: form, submitted, error.
 *
 * Progressive enhancement throughout — with JavaScript disabled the form posts,
 * the server validates, and the page comes back with the summary and the values
 * still in place. Nothing here is required for the form to work.
 */
export function ContactForm() {
  const t = useTranslations('contact');
  const [state, action, pending] = useActionState(submitContact, emptyFormState);
  const summaryRef = useRef<HTMLDivElement>(null);

  // Move focus to the summary so a screen-reader user is told what failed.
  useEffect(() => {
    if (Object.keys(state.errors).length > 0) summaryRef.current?.focus();
  }, [state]);

  if (state.ok && state.reference) {
    return (
      <div className="card" role="status">
        <h2 className="section-title">{t('success.title')}</h2>
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

      <Field id="name" label={t('fields.name')} required error={err('name')}>
        <input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          defaultValue={state.values.name}
          placeholder={t('fields.namePlaceholder')}
          className={`input ${err('name') ? 'input-invalid' : ''}`}
        />
      </Field>

      <Field id="email" label={t('fields.email')} required error={err('email')}>
        <input
          id="email"
          name="email"
          // `type="email"` for the mobile keyboard, not for validation. Validation
          // is server-authoritative; `noValidate` on the form stops the browser
          // pre-empting it with a message this site did not write and cannot
          // translate.
          type="email"
          autoComplete="email"
          defaultValue={state.values.email}
          placeholder={t('fields.emailPlaceholder')}
          className={`input ${err('email') ? 'input-invalid' : ''}`}
        />
      </Field>

      <Field id="subject" label={t('fields.subject')} required error={err('subject')}>
        <input
          id="subject"
          name="subject"
          type="text"
          defaultValue={state.values.subject}
          placeholder={t('fields.subjectPlaceholder')}
          className={`input ${err('subject') ? 'input-invalid' : ''}`}
        />
      </Field>

      <Field id="message" label={t('fields.message')} required error={err('message')}>
        <textarea
          id="message"
          name="message"
          rows={6}
          defaultValue={state.values.message}
          placeholder={t('fields.messagePlaceholder')}
          className={`input ${err('message') ? 'input-invalid' : ''}`}
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

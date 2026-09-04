'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { ROUTES } from '@/lib/routes';
import { advanceDeletion } from '@/actions/deletion';
// NOT from '@/actions/deletion' — see the warning in @/lib/deletion/state.
import { initialDeletionState } from '@/lib/deletion/state';

/**
 * The account-deletion path required by both app stores before either app may be
 * submitted. It ships with the website, not with the app.
 *
 * **Every step is a real form post to a server action**, so the flow works with
 * JavaScript disabled — the same invariant every other form on this site holds.
 * It used to advance through `onSubmit` handlers with `preventDefault`, which
 * works only when a bundle arrives. The person that failed is the one on a slow
 * connection, which is the population this site is built for, and this page is
 * also the app-store gate.
 *
 * The ticket and the phone number cross step boundaries in **hidden fields**.
 * That is no weaker than the React state it replaces — both put the value in the
 * DOM, and neither transmits automatically. What matters is that neither is a
 * cookie, so neither is ever attached to an unrelated request.
 *
 * **Gated by the server, not here.** `enabled` is computed in the page from
 * `DELETION_FLOW_ENABLED` (a person certifying the eight conditions in
 * `src/lib/flags.ts`) AND a configured `DELETION_API_URL`.
 *
 * ⚠ The decision moved out of this component because it could not be made here.
 * `flags.ts` reads `process.env`, and a **client component inlines that at BUILD
 * time**, so a runtime value never arrives — the gated state rendered regardless
 * of configuration. Correct today by accident, and wrong the moment the flag
 * flips. Server components read the environment per request; client components
 * read a snapshot of it.
 */
export function DeleteAccountFlow({ enabled = false }: { enabled?: boolean }) {
  const t = useTranslations('deleteAccount');
  const [state, action] = useActionState(advanceDeletion, initialDeletionState);

  // Three items: what deletion does, what is retained, and what this OTP is not.
  // Rendered from the catalogue rather than as fixed slots, so adding a fourth
  // does not need a component change.
  const explainItems = t.raw('explain.items') as { title: string; body: string }[];
  const error = state.error ? t(`errors.${state.error}`) : null;

  /** The phone and ticket, carried forward. Never a cookie, never a store. */
  const carry = (
    <>
      <input type="hidden" name="phone" value={state.phone} />
      <input type="hidden" name="ticket" value={state.ticket ?? ''} />
    </>
  );

  // The explanation, then the manual route. No phone entry, no OTP, no confirm,
  // no blocked state. The wording must not imply a self-service path exists.
  if (!enabled) {
    return (
      <div className="form-column">
        <h1 className="page-title">{t('heading')}</h1>
        <p className="lede">{t('sub')}</p>

        <div className="mt-6 space-y-4">
          {explainItems.map((item) => (
            <div key={item.title} className="card">
              <h2 className="card-title">{item.title}</h2>
              <p className="card-body">{item.body}</p>
            </div>
          ))}
        </div>

        <div className="card mt-6">
          <h2 className="section-title">{t('manual.title')}</h2>
          <p className="card-body max-w-prose">{t('manual.body')}</p>
          <Link href={ROUTES.contact} className="btn-primary mt-4">
            {t('manual.cta')}
          </Link>
        </div>
      </div>
    );
  }

  if (state.step === 'explain') {
    return (
      <form action={action} className="form-column">
        <h1 className="page-title">{t('heading')}</h1>
        <p className="lede">{t('sub')}</p>

        {/* The explanation comes before any phone entry. A person should know
            what they are requesting before identifying themselves, and a store
            reviewer looks for it on the landing step. */}
        <div className="mt-6 space-y-4">
          {explainItems.map((item) => (
            <div key={item.title} className="card">
              <h2 className="card-title">{item.title}</h2>
              <p className="card-body">{item.body}</p>
            </div>
          ))}
        </div>

        <input type="hidden" name="intent" value="explain" />
        <button type="submit" className="btn-primary btn-block mt-6">
          {t('explain.continue')}
        </button>
      </form>
    );
  }

  if (state.step === 'phone') {
    return (
      <form action={action} noValidate className="form-column">
        <h1 className="page-title">{t('heading')}</h1>
        <p className="lede">{t('phone.intro')}</p>

        <div className="field mt-6">
          <label htmlFor="delete-phone" className="label">
            {t('phone.label')}
          </label>
          <input
            id="delete-phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            defaultValue={state.phone}
            placeholder={t('phone.placeholder')}
            aria-describedby="delete-phone-note"
            aria-invalid={error ? true : undefined}
            className={`input ${error ? 'input-invalid' : ''}`}
          />
          {error && <span className="field-error">{error}</span>}
          <span id="delete-phone-note" className="field-help">
            {t('phone.note')}
          </span>
        </div>

        <input type="hidden" name="ticket" value="" />
        <input type="hidden" name="intent" value="request" />
        <button type="submit" className="btn-primary btn-block mt-6">
          {t('phone.submit')}
        </button>
      </form>
    );
  }

  if (state.step === 'otp') {
    return (
      <div className="form-column">
        <h1 className="page-title">{t('heading')}</h1>
        <p className="lede">{t('otp.intro')}</p>

        <form action={action} noValidate className="mt-6">
          {carry}
          <div className="field">
            <label htmlFor="delete-otp" className="label">
              {t('otp.label')}
            </label>
            <input
              id="delete-otp"
              name="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              aria-invalid={error ? true : undefined}
              className={`input tnum ${error ? 'input-invalid' : ''}`}
            />
            {error && <span className="field-error">{error}</span>}
          </div>

          <input type="hidden" name="intent" value="verify" />
          <button type="submit" className="btn-primary btn-block mt-6">
            {t('otp.submit')}
          </button>
        </form>

        {/* A separate form, so resending does not carry the typed code. */}
        <form action={action} className="mt-3">
          {carry}
          <input type="hidden" name="intent" value="resend" />
          <button type="submit" className="btn-secondary btn-block">
            {t('otp.resend')}
          </button>
        </form>
      </div>
    );
  }

  if (state.step === 'confirm') {
    return (
      <form action={action} noValidate className="form-column">
        <h1 className="page-title">{t('heading')}</h1>
        {carry}

        <div className="card mt-6">
          <h2 className="section-title">{t('confirm.title')}</h2>
          <p className="card-body max-w-prose">{t('confirm.body')}</p>

          <div className="field mt-4">
            <div className="flex items-start gap-3">
              <input
                id="delete-ack"
                name="acknowledge"
                type="checkbox"
                aria-describedby={error ? 'delete-ack-error' : undefined}
                className="checkbox"
              />
              <label
                htmlFor="delete-ack"
                className="block min-h-[44px] py-1.5 text-small text-ink-muted"
              >
                {t('confirm.checkbox')}
              </label>
            </div>
            {error && (
              <span id="delete-ack-error" className="field-error">
                {error}
              </span>
            )}
          </div>
        </div>

        <input type="hidden" name="intent" value="confirm" />
        <button type="submit" className="btn-danger btn-block mt-6">
          {t('confirm.submit')}
        </button>
      </form>
    );
  }

  /**
   * Reachable only from a verified server response.
   *
   * ⚠ The list comes from `items[]` as the server returned it. The catalogue
   * supplies a translated title and action **per reason code**; it does not
   * supply the list. A blocker whose reason this build has never heard of still
   * renders, using the server's own `detail` — because a new blocker type on the
   * server must not silently vanish from the page.
   */
  if (state.step === 'blocked') {
    const reasons = t.raw('blocked.reasons') as Record<
      string,
      { title: string; action: string } | undefined
    >;

    return (
      <div className="form-column">
        <h1 className="page-title">{t('blocked.title')}</h1>
        <p className="lede">{t('blocked.intro')}</p>

        <ul className="mt-6 space-y-3">
          {state.blockers.map((item, i) => {
            const known = reasons[item.reason];
            return (
              <li key={`${item.reason}-${i}`} className="card">
                <p className="card-title">{known?.title ?? t('blocked.unknownTitle')}</p>
                <p className="card-body">
                  {known?.action ?? item.detail ?? t('blocked.unknownAction')}
                </p>
              </li>
            );
          })}
        </ul>

        <p className="note mt-4">{t('blocked.note')}</p>

        <Link href={ROUTES.home} className="btn-secondary mt-6">
          {t('blocked.home')}
        </Link>
      </div>
    );
  }

  /**
   * The API is not answering — today's expected outcome, since the four
   * endpoints are being built in adulis-platform and do not exist yet. Nothing
   * fakes a success path: a person is told plainly and pointed at the route that
   * does work.
   */
  if (state.step === 'unreachable') {
    return (
      <div className="form-column" role="status">
        <h1 className="page-title">{t('heading')}</h1>
        <div className="card mt-6">
          <h2 className="section-title">{t('unreachable.title')}</h2>
          <p className="card-body max-w-prose">{t('unreachable.body')}</p>
          <Link href={ROUTES.contact} className="btn-primary mt-4">
            {t('manual.cta')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="form-column" role="status">
      <h1 className="page-title">{t('success.title')}</h1>
      <p className="lede">{t('success.body')}</p>
      <Link href={ROUTES.home} className="btn-secondary mt-6">
        {t('success.home')}
      </Link>
    </div>
  );
}

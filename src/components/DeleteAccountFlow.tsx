'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { isPlausiblePhone } from '@/lib/validation';
import { ROUTES } from '@/lib/routes';
import { DELETION_FLOW_ENABLED } from '@/lib/flags';
import {
  completeDeletion,
  loadDeletionPreview,
  startDeletion,
  verifyDeletionCode
} from '@/actions/deletion';
import type { DeletionBlocker } from '@/lib/deletion/client';

type Step = 'explain' | 'phone' | 'otp' | 'confirm' | 'blocked' | 'success' | 'unreachable';

const RESEND_SECONDS = 30;

/**
 * The account-deletion path required by both app stores before either app may be
 * submitted. It ships with the website, not with the app.
 *
 * **Gated on `DELETION_FLOW_ENABLED`, which is `false`.** The store requirement
 * is that a person can find and understand the deletion path — not that a flow
 * authenticates against a backend that does not exist. So the explanation ships
 * and the interactive flow does not.
 *
 * Everything below the flag check is the mocked flow, kept because it is the
 * shape the real one will take. It is unreachable while the flag is false. The
 * OTP in it is mocked: nothing is sent and nothing is checked. See
 * `src/lib/flags.ts` for the seven conditions that must hold before the flag can
 * be flipped, and `docs/deletion-flow-design.md` for the design itself.
 *
 * When it is live, this flow proves identity for the deletion request alone. It
 * issues no session and grants access to no other surface, and the copy on the
 * phone step says so — there is no web sign-in anywhere on this site.
 */
export function DeleteAccountFlow({ apiConfigured = false }: { apiConfigured?: boolean }) {
  const t = useTranslations('deleteAccount');
  // Three items now, not a buyer/seller pair: what deletion does, what is
  // retained, and what this OTP is not. Rendered from the catalogue rather than
  // as fixed slots, so adding a fourth does not need a component change.
  const explainItems = t.raw('explain.items') as { title: string; body: string }[];
  const [step, setStep] = useState<Step>('explain');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [busy, setBusy] = useState(false);

  /**
   * The ticket, held here and nowhere else.
   *
   * ⚠ Never write this to a cookie, localStorage or sessionStorage, and never
   * attach it to a request other than preview and confirm. A ticket in a cookie
   * is a session, and this site has no session — which is the entire reason the
   * deletion path uses an OTP rather than a sign-in. It dies with this component.
   */
  const [ticket, setTicket] = useState<string | null>(null);

  /**
   * Blockers exactly as the server returned them.
   *
   * The server decides what blocks a deletion; this page renders what it is told.
   * Hard-coding the list would mean a new blocker type on the server silently
   * disappearing from the page.
   */
  const [blockers, setBlockers] = useState<DeletionBlocker[]>([]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const go = (next: Step) => {
    setError(null);
    setStep(next);
  };

  /** Turns a non-ok result into either an inline error or a step change. */
  const handleFailure = (status: 'invalid' | 'expired' | 'rateLimited' | 'unreachable', inline: string) => {
    if (status === 'unreachable') {
      setStep('unreachable');
      return;
    }
    if (status === 'expired') {
      // The ticket or the code has expired. Sending someone back to the phone
      // step is the only honest option — there is nothing left to resume.
      setTicket(null);
      setError(t('errors.expired'));
      setStep('phone');
      return;
    }
    setError(status === 'rateLimited' ? t('errors.rateLimited') : inline);
  };

  // The explanation, then the manual route. No phone entry, no OTP, no confirm,
  // no blocked state. The wording must not imply a self-service path exists.
  if (!DELETION_FLOW_ENABLED || !apiConfigured) {
    return (
      <div className="form-column">
        <h1 className="page-title">{t('heading')}</h1>

        <div className="mt-6 space-y-4">
          {explainItems.map((item) => (
            <div key={item.title} className="card">
              <h2 className="card-title">{item.title}</h2>
              <p className="card-body">{item.body}</p>
            </div>
          ))}
        </div>

        <div className="card-sunken mt-6">
          <h2 className="section-title">{t('manual.title')}</h2>
          <p className="card-body max-w-prose">{t('manual.body')}</p>
          <Link href={ROUTES.contact} className="btn-primary mt-4">
            {t('manual.cta')}
          </Link>
        </div>
      </div>
    );
  }

  if (step === 'explain') {
    return (
      <div className="form-column">
        <h1 className="page-title">{t('heading')}</h1>

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

        <button type="button" className="btn-primary btn-block mt-6" onClick={() => go('phone')}>
          {t('explain.continue')}
        </button>
      </div>
    );
  }

  if (step === 'phone') {
    return (
      <div className="form-column">
        <h1 className="page-title">{t('heading')}</h1>
        <p className="lede">{t('phone.intro')}</p>

        <form
          className="mt-6"
          onSubmit={async (event) => {
            event.preventDefault();
            // A format check only, so somebody is not sent to wait for a code
            // that was never going to arrive. It is not authorisation — the
            // server owns whether a number gets an OTP, and answers identically
            // whether or not an account exists.
            if (!isPlausiblePhone(phone)) {
              setError(t('phone.error'));
              return;
            }
            setBusy(true);
            const result = await startDeletion(phone);
            setBusy(false);
            if (result.status !== 'ok') {
              handleFailure(result.status, t('phone.error'));
              return;
            }
            setCooldown(RESEND_SECONDS);
            go('otp');
          }}
        >
          <div className="field">
            <label htmlFor="delete-phone" className="label">
              {t('phone.label')}
            </label>
            <input
              id="delete-phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
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

          <button type="submit" className="btn-primary btn-block mt-6" aria-busy={busy}>
            {t('phone.submit')}
          </button>
        </form>
      </div>
    );
  }

  if (step === 'otp') {
    return (
      <div className="form-column">
        <h1 className="page-title">{t('heading')}</h1>
        <p className="lede">{t('otp.intro', { phone })}</p>

        <form
          className="mt-6"
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            const verified = await verifyDeletionCode(phone, code);
            if (verified.status !== 'ok') {
              setBusy(false);
              handleFailure(verified.status, t('otp.error'));
              return;
            }

            // The ticket exists only from here, and only in memory.
            setTicket(verified.data.ticket);

            // The blocked list is requested only AFTER the code is verified, and
            // never in the same response as the check — otherwise the check
            // itself becomes an oracle for whether an account exists.
            const preview = await loadDeletionPreview(verified.data.ticket);
            setBusy(false);
            if (preview.status !== 'ok') {
              handleFailure(preview.status, t('otp.error'));
              return;
            }

            if (preview.data.length > 0) {
              setBlockers(preview.data);
              go('blocked');
              return;
            }
            go('confirm');
          }}
        >
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
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/[^\d]/g, ''))}
              aria-invalid={error ? true : undefined}
              className={`input tnum ${error ? 'input-invalid' : ''}`}
            />
            {error && <span className="field-error">{error}</span>}
          </div>

          <button type="submit" className="btn-primary btn-block mt-6" aria-busy={busy}>
            {t('otp.submit')}
          </button>

          <button
            type="button"
            className="btn-secondary btn-block mt-3"
            disabled={cooldown > 0}
            onClick={async () => {
              setBusy(true);
              const again = await startDeletion(phone);
              setBusy(false);
              if (again.status !== 'ok') {
                handleFailure(again.status, t('otp.error'));
                return;
              }
              setCooldown(RESEND_SECONDS);
            }}
          >
            {t('otp.resend')}
          </button>
          {cooldown > 0 && (
            <span className="field-help tnum">{t('otp.resendIn', { seconds: cooldown })}</span>
          )}
        </form>
      </div>
    );
  }

  if (step === 'confirm') {
    return (
      <div className="form-column">
        <h1 className="page-title">{t('heading')}</h1>

        <form
          className="mt-6"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!acknowledged) {
              setError(t('confirm.error'));
              return;
            }
            if (!ticket) {
              // Reaching confirm without a ticket means the flow was entered by
              // something other than a verified code. There is no local path
              // here by construction, and if one ever appears this refuses it.
              setStep('phone');
              return;
            }
            setBusy(true);
            const done = await completeDeletion(ticket);
            setBusy(false);
            if (done.status !== 'ok') {
              handleFailure(done.status, t('confirm.error'));
              return;
            }
            setTicket(null);
            go('success');
          }}
        >
          <div className="card-sunken">
            <h2 className="section-title">{t('confirm.title')}</h2>

            <div className="field mt-4">
              <div className="flex items-start gap-3">
                <input
                  id="delete-ack"
                  type="checkbox"
                  checked={acknowledged}
                  onChange={(event) => setAcknowledged(event.target.checked)}
                  aria-describedby={error ? 'delete-ack-error' : undefined}
                  className="checkbox"
                />
                <label htmlFor="delete-ack" className="text-small text-ink-muted">
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

          <button type="submit" className="btn-danger btn-block mt-6" aria-busy={busy}>
            {t('confirm.submit')}
          </button>

          {/* An irreversible action always offers a way out. */}
          <button
            type="button"
            className="btn-secondary btn-block mt-3"
            onClick={() => {
              setAcknowledged(false);
              go('explain');
            }}
          >
            {t('confirm.cancel')}
          </button>
        </form>
      </div>
    );
  }

  /**
   * Reachable only from a verified server response.
   *
   * There is deliberately no client-side transition into this state: it renders a
   * seller's outstanding orders, payments and claims, and nothing in the browser
   * should be able to put the page here. The demo button that used to do so is
   * gone (security audit 01, F-02).
   *
   * ⚠ The list comes from `items[]` as the server returned it. The catalogue
   * supplies a translated title and action **per reason code**; it does not
   * supply the list. A blocker whose reason this build has never heard of still
   * renders, using the server's own `detail` — because a new blocker type
   * appearing on the server must not silently vanish from the page.
   */
  if (step === 'blocked') {
    const reasons = t.raw('blocked.reasons') as Record<
      string,
      { title: string; action: string } | undefined
    >;

    return (
      <div className="form-column">
        <h1 className="page-title">{t('blocked.title')}</h1>
        <p className="lede">{t('blocked.intro')}</p>

        <ul className="mt-6 space-y-3">
          {blockers.map((item, i) => {
            const known = reasons[item.reason];
            return (
              <li key={`${item.reason}-${i}`} className="card-sunken">
                <p className="card-title">{known?.title ?? t('blocked.unknownTitle')}</p>
                <p className="card-body">{known?.action ?? item.detail ?? t('blocked.unknownAction')}</p>
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
   * The API is not answering.
   *
   * Today this is the expected outcome: the four endpoints are being built in
   * adulis-platform and do not exist yet. Nothing here fakes a success path — a
   * person is told plainly that self-service is unavailable and pointed at the
   * route that does work.
   */
  if (step === 'unreachable') {
    return (
      <div className="form-column" role="status">
        <h1 className="page-title">{t('heading')}</h1>
        <div className="card-sunken mt-6">
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

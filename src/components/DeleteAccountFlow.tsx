'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { isPlausiblePhone } from '@/lib/validation';

type Step = 'explain' | 'phone' | 'otp' | 'confirm' | 'blocked' | 'success';

type BlockedItem = { title: string; action: string };

const RESEND_SECONDS = 30;

/**
 * The account-deletion path required by both app stores before either app may be
 * submitted. It ships with the website, not with the app.
 *
 * !! The OTP here is MOCKED. Nothing is sent and nothing is checked. Before this
 * page is reachable the code must be issued and verified server-side, with
 * strict per-phone and per-IP rate limits, and the "Preview the blocked state"
 * button below must be removed.
 *
 * This flow proves identity for the deletion request alone. It issues no
 * session and grants access to no other surface, and the copy on the phone step
 * says so -- there is no web sign-in anywhere on this site.
 */
export function DeleteAccountFlow() {
  const t = useTranslations('deleteAccount');
  const [step, setStep] = useState<Step>('explain');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const go = (next: Step) => {
    setError(null);
    setStep(next);
  };

  if (step === 'explain') {
    return (
      <div className="form-column">
        <h1 className="page-title">{t('heading')}</h1>

        {/* The explanation comes before any phone entry. A person should know
            what they are requesting before identifying themselves, and a store
            reviewer looks for it on the landing step. */}
        <div className="mt-6 space-y-4">
          <div className="card">
            <h2 className="card-title">{t('explain.buyerTitle')}</h2>
            <p className="card-body">{t('explain.buyerBody')}</p>
          </div>
          <div className="card">
            <h2 className="card-title">{t('explain.sellerTitle')}</h2>
            <p className="card-body">{t('explain.sellerBody')}</p>
          </div>
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
          onSubmit={(event) => {
            event.preventDefault();
            if (!isPlausiblePhone(phone)) {
              setError(t('phone.error'));
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

          <button type="submit" className="btn-primary btn-block mt-6">
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
          onSubmit={(event) => {
            event.preventDefault();
            // Mocked. The real implementation verifies this server-side.
            if (!/^\d{6}$/.test(code)) {
              setError(t('otp.error'));
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

          <button type="submit" className="btn-primary btn-block mt-6">
            {t('otp.submit')}
          </button>

          <button
            type="button"
            className="btn-secondary btn-block mt-3"
            disabled={cooldown > 0}
            onClick={() => setCooldown(RESEND_SECONDS)}
          >
            {t('otp.resend')}
          </button>
          {cooldown > 0 && (
            <span className="field-help tnum">{t('otp.resendIn', { seconds: cooldown })}</span>
          )}
        </form>

        {/* DEMO AFFORDANCE -- REMOVE when the real obligation lookup is wired.
            The blocked branch is otherwise unreachable for review, and it is the
            branch an app-store reviewer is most likely to ask about. */}
        <button
          type="button"
          className="note mt-6 underline underline-offset-4"
          onClick={() => go('blocked')}
        >
          Preview the blocked state
        </button>
      </div>
    );
  }

  if (step === 'confirm') {
    return (
      <div className="form-column">
        <h1 className="page-title">{t('heading')}</h1>

        <form
          className="mt-6"
          onSubmit={(event) => {
            event.preventDefault();
            if (!acknowledged) {
              setError(t('confirm.error'));
              return;
            }
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

          <button type="submit" className="btn-danger btn-block mt-6">
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

  if (step === 'blocked') {
    const items = t.raw('blocked.items') as BlockedItem[];

    return (
      <div className="form-column">
        <h1 className="page-title">{t('blocked.title')}</h1>
        <p className="lede">{t('blocked.intro')}</p>

        <ul className="mt-6 space-y-3">
          {items.map((item) => (
            <li key={item.title} className="card-sunken">
              <p className="tnum card-title">{item.title}</p>
              <p className="card-body">{item.action}</p>
            </li>
          ))}
        </ul>

        <p className="note mt-4">{t('blocked.note')}</p>

        <Link href="/" className="btn-secondary mt-6">
          {t('blocked.home')}
        </Link>
      </div>
    );
  }

  return (
    <div className="form-column" role="status">
      <h1 className="page-title">{t('success.title')}</h1>
      <p className="lede">{t('success.body')}</p>
      <Link href="/" className="btn-secondary mt-6">
        {t('success.home')}
      </Link>
    </div>
  );
}

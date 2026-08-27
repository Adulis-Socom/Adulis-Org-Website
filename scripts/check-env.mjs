#!/usr/bin/env node
/**
 * Refuses to build something that is not deployable.
 *
 * Five things make a build undeployable, and each fails here — at build time,
 * where somebody is watching — rather than at request time, where nobody is.
 * A runtime warning would scroll past.
 *
 *   WAITLIST_WEBHOOK_URL              no delivery destination for applications
 *   ENQUIRY_WEBHOOK_URL               contact and report submissions refused
 *   NEXT_PUBLIC_SELLER_CONSOLE_URL    the header's Log in link goes nowhere
 *   WAITLIST_HASH_SECRET              phone numbers keyed with no key
 *   DELETION_FLOW_ENABLED without
 *   DELETION_API_URL                  the flow offers itself and cannot work
 *
 * The last one is the only check about a contradiction rather than an absence.
 * Two gates that can disagree are one gate and a bug waiting.
 *
 * Local builds without these are legitimate. They need the opt-out to be
 * explicit and visible in the command, not a default:
 *
 *     ALLOW_UNDELIVERED_WAITLIST=1 npm run build
 *
 * That one flag covers all of them, because it already means "I know this build
 * is not deployable". Requiring a flag each would only train people to set them
 * all without reading any.
 *
 * Run: npm run check:env   (also runs automatically before `npm run build`)
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const optOut = Boolean(process.env.ALLOW_UNDELIVERED_WAITLIST);
const problems = [];
const notes = [];

/* ---------------------------------------------------------------- waitlist */
{
  const url = process.env.WAITLIST_WEBHOOK_URL;
  if (url) {
    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      problems.push('WAITLIST_WEBHOOK_URL is set but is not a valid URL.');
      parsed = null;
    }
    if (parsed && parsed.protocol !== 'https:' && parsed.hostname !== 'localhost') {
      problems.push(
        `WAITLIST_WEBHOOK_URL must be https (got ${parsed.protocol}//).\n` +
          '     Waitlist submissions carry names and phone numbers.'
      );
    }
    if (parsed && problems.length === 0) notes.push('waitlist delivery destination configured');
  } else if (optOut) {
    notes.push(
      'WARNING — no waitlist delivery destination.\n' +
        '     In this build the waitlist REJECTS every submission in production,\n' +
        '     and returns a DEV-NOT-DELIVERED reference in development.\n' +
        '     Do not deploy this build.'
    );
  } else {
    problems.push(
      'WAITLIST_WEBHOOK_URL is not set.\n' +
        '\n     The waitlist is the only conversion on this site. Without a delivery\n' +
        '     destination every application is refused, so this build is not\n' +
        '     deployable and the build stops here rather than letting you find out\n' +
        '     on the first day of cohort recruitment.'
    );
  }
}

/* ---------------------------------------------------------- seller console */
{
  const url = process.env.NEXT_PUBLIC_SELLER_CONSOLE_URL;
  if (url) {
    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      problems.push('NEXT_PUBLIC_SELLER_CONSOLE_URL is set but is not a valid URL.');
      parsed = null;
    }
    if (parsed && parsed.protocol !== 'https:' && parsed.hostname !== 'localhost') {
      problems.push(
        `NEXT_PUBLIC_SELLER_CONSOLE_URL must be https (got ${parsed.protocol}//).\n` +
          '     It is where sellers type their credentials.'
      );
    }
    if (parsed && parsed.hostname === 'console.invalid') {
      problems.push('NEXT_PUBLIC_SELLER_CONSOLE_URL is still the development placeholder.');
    }
    if (parsed && problems.length === 0) notes.push(`seller console: ${parsed.origin}`);
  } else if (optOut) {
    notes.push(
      'WARNING — no seller console origin.\n' +
        '     The header Log in link falls back to https://console.invalid/ and\n' +
        '     will not resolve. Do not deploy this build.'
    );
  } else {
    problems.push(
      'NEXT_PUBLIC_SELLER_CONSOLE_URL is not set.\n' +
        '\n     Every page header carries a Log in link to the seller console. With\n' +
        '     no origin configured it falls back to a placeholder that does not\n' +
        '     resolve, so every seller who tries to sign in hits a dead link.'
    );
  }
}

/* ------------------------------------------------------- phone hash secret */
{
  const secret = process.env.WAITLIST_HASH_SECRET;
  if (secret) {
    // Ethiopian mobile numbers span roughly 10^8 candidates, so an unkeyed
    // digest is exhaustively reversible in seconds. A short key is barely better
    // than none, because the key becomes the guessable part.
    if (secret.length < 32) {
      problems.push(
        `WAITLIST_HASH_SECRET is ${secret.length} characters. Use at least 32.\n` +
          '     It keys the HMAC that stops rate-limit rows being reversible back\n' +
          '     to phone numbers.'
      );
    } else {
      notes.push('waitlist phone hashing keyed');
    }
  } else if (optOut) {
    notes.push(
      'WARNING — no WAITLIST_HASH_SECRET.\n' +
        '     Per-phone rate limiting and double-submission dedupe are both off.\n' +
        '     IP-based limiting still applies. Do not deploy this build.'
    );
  } else {
    problems.push(
      'WAITLIST_HASH_SECRET is not set.\n' +
        '\n     Without it the waitlist cannot key phone numbers, so per-phone rate\n' +
        '     limiting and double-submission dedupe are both off. Generate one with:\n' +
        '         node -e "console.log(crypto.randomUUID()+crypto.randomUUID())"'
    );
  }
}

/* ------------------------------------------------------ enquiry destination */
{
  const url = process.env.ENQUIRY_WEBHOOK_URL;
  if (url) {
    let parsed = null;
    try {
      parsed = new URL(url);
    } catch {
      problems.push('ENQUIRY_WEBHOOK_URL is set but is not a valid URL.');
    }
    if (parsed && parsed.protocol !== 'https:' && parsed.hostname !== 'localhost') {
      problems.push(
        `ENQUIRY_WEBHOOK_URL must be https (got ${parsed.protocol}//).\n` +
          '     Contact and report submissions carry names, email addresses and\n' +
          '     free-text complaint content.'
      );
    } else if (parsed) {
      notes.push('enquiry destination configured');
    }
  } else if (optOut) {
    notes.push(
      'WARNING — no enquiry destination.\n' +
        '     The contact and report forms REJECT every submission in production.\n' +
        '     Do not deploy this build.'
    );
  } else {
    problems.push(
      'ENQUIRY_WEBHOOK_URL is not set.\n' +
        '\n     Without it the contact and report forms refuse every submission.\n' +
        '     /report-content is an app-store requirement, so a build that cannot\n' +
        '     take a report is not deployable.'
    );
  }
}

/* ------------------------------------------------------------ deletion gates */
/*
 * Two gates that can contradict each other are one gate and a bug waiting.
 *
 * DELETION_FLOW_ENABLED is a person certifying the seven conditions in
 * src/lib/flags.ts. DELETION_API_URL is the technical precondition. If the flag
 * is true and the URL is missing, the flow offers itself and then cannot work —
 * on the page both app stores check before either app may be submitted.
 *
 * The reverse — URL set, flag false — renders the explanatory state and is
 * correct, so it is not checked.
 */
{
  const problemsBefore = problems.length;
  let flagged = false;
  try {
    const flags = readFileSync(join(ROOT, 'src/lib/flags.ts'), 'utf8');
    flagged = /export const DELETION_FLOW_ENABLED\s*=\s*true/.test(flags);
  } catch {
    problems.push('src/lib/flags.ts could not be read.');
  }

  if (flagged) {
    const url = process.env.DELETION_API_URL;
    if (!url) {
      problems.push(
        'DELETION_FLOW_ENABLED is true but DELETION_API_URL is not set.\n' +
          '\n     The deletion flow would offer itself and then fail on the page both\n' +
          '     app stores check. Set the URL, or set the flag back to false.'
      );
    } else if (/example\.com|localhost|changeme|TODO/i.test(url)) {
      problems.push(`DELETION_API_URL still looks like a placeholder: ${url}`);
    } else {
      notes.push('deletion flow enabled and pointed at an API');
    }
  }
  if (problems.length === problemsBefore && !flagged) {
    notes.push('deletion flow gated off (DELETION_FLOW_ENABLED is false)');
  }
}

for (const note of notes) console[note.startsWith('WARNING') ? 'warn' : 'log'](`env: ${note}`);

if (problems.length > 0) {
  console.error('');
  for (const p of problems) console.error(`env: ${p}\n`);
  console.error(
    '     Set them, or build with the opt-out if you know what you are doing:\n' +
      '         ALLOW_UNDELIVERED_WAITLIST=1 npm run build\n'
  );
  process.exit(1);
}

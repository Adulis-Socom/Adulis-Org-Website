#!/usr/bin/env node
/**
 * Refuses to build something that is not deployable.
 *
 * Two things make a build undeployable, and both fail here — at build time,
 * where somebody is watching — rather than at request time, where nobody is.
 * A runtime warning would scroll past.
 *
 *   WAITLIST_WEBHOOK_URL              no delivery destination for applications
 *   NEXT_PUBLIC_SELLER_CONSOLE_URL    the header's Log in link goes nowhere
 *
 * Local builds without either are legitimate. They need the opt-out to be
 * explicit and visible in the command, not a default:
 *
 *     ALLOW_UNDELIVERED_WAITLIST=1 npm run build
 *
 * That one flag covers both, because it already means "I know this build is not
 * deployable". Requiring a second flag to say the same thing would only train
 * people to set both without reading either.
 *
 * Run: npm run check:env   (also runs automatically before `npm run build`)
 */
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

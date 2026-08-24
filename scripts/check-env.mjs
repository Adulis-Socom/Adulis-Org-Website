#!/usr/bin/env node
/**
 * Refuses to build without a waitlist delivery destination.
 *
 * The waitlist is the site's only conversion. Without `WAITLIST_WEBHOOK_URL` the
 * action now rejects submissions outright rather than issuing a reference number
 * for an application nobody receives (security audit 01, F-07) — which is the
 * honest behaviour, but a deployed site that refuses every application is not
 * much better than one that silently loses them.
 *
 * So this fails at build time, where somebody is watching, rather than at
 * request time, where nobody is. A runtime warning would scroll past.
 *
 * Local builds without a destination are legitimate. They need the opt-out to be
 * explicit and visible in the command, not a default:
 *
 *     ALLOW_UNDELIVERED_WAITLIST=1 npm run build
 *
 * Run: npm run check:env   (also runs automatically before `npm run build`)
 */
const url = process.env.WAITLIST_WEBHOOK_URL;
const optOut = process.env.ALLOW_UNDELIVERED_WAITLIST;

if (url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    console.error('\nenv: WAITLIST_WEBHOOK_URL is set but is not a valid URL.\n');
    process.exit(1);
  }
  if (parsed.protocol !== 'https:' && parsed.hostname !== 'localhost') {
    console.error(
      `\nenv: WAITLIST_WEBHOOK_URL must be https (got ${parsed.protocol}//).` +
        '\n     Waitlist submissions carry names and phone numbers.\n'
    );
    process.exit(1);
  }
  console.log('env: waitlist delivery destination configured');
  process.exit(0);
}

if (optOut) {
  console.warn(
    '\nenv: WARNING — building with no waitlist delivery destination.' +
      '\n     ALLOW_UNDELIVERED_WAITLIST is set, so this is allowed.' +
      '\n     In this build the waitlist will REJECT every submission in production,' +
      '\n     and return a DEV-NOT-DELIVERED reference in development.' +
      '\n     Do not deploy this build.\n'
  );
  process.exit(0);
}

console.error(
  '\nenv: WAITLIST_WEBHOOK_URL is not set.' +
    '\n' +
    '\n     The waitlist is the only conversion on this site. Without a delivery' +
    '\n     destination every application is refused, so this build is not' +
    '\n     deployable and the build stops here rather than letting you find out' +
    '\n     on the first day of cohort recruitment.' +
    '\n' +
    '\n     Set it, or build with the opt-out if you know what you are doing:' +
    '\n         ALLOW_UNDELIVERED_WAITLIST=1 npm run build' +
    '\n'
);
process.exit(1);

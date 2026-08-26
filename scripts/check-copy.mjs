#!/usr/bin/env node
/**
 * The copy invariants from build specification Part 9, machine-checked.
 *
 * These were reviewer-checked, which means they held until somebody forgot.
 * Each one traces to a product, legal or regulatory constraint, and each costs
 * money or credibility if broken — see README.md and ADU-WEB-01 §3.
 *
 * Run: npm run check:copy   (also runs in CI on every pull request)
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const CHECKS = [
  {
    name: 'no buyer-protection claim',
    why: 'There is no escrow. ADU-WEB-01 §3.1.',
    dirs: ['src'],
    pattern: /protects buyers|buyer protection|guaranteed|confirms receipt/i
  },
  {
    name: 'arrows are real glyphs',
    why: 'ASCII > and v are not arrows. ADU-WEB-01 §5.4.',
    dirs: ['src/messages'],
    pattern: /"[^"]*\. >"|waitlist v"/
  },
  {
    name: 'no follower threshold',
    why: 'Every applicant is accepted and reviewed. ADU-WEB-01 §3.3.',
    dirs: ['src'],
    pattern: /\b5,?000\b|\b2,?500\b/
  },
  {
    name: 'no subscription pricing',
    why: 'Pricing is not public during the controlled beta. ADU-WEB-01 §3.3.',
    dirs: ['src'],
    pattern: /\$\d/
  }
];

const SKIP_DIRS = new Set(['node_modules', '.next', '.git']);

/**
 * Only text files carry copy.
 *
 * Without this, the committed Ethiopic font subset gets scanned as if it were
 * source: 2,648 bytes of compressed glyph outlines contain a `$` next to a digit
 * often enough that the "no subscription pricing" rule failed on a font file.
 * The message was a line of mojibake, which is not a useful thing to hand
 * somebody at 9am.
 */
const TEXT_FILE = /\.(ts|tsx|js|jsx|mjs|cjs|json|css|md|txt|html)$/;

function walk(dir, acc = []) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const e of entries) {
    if (SKIP_DIRS.has(e.name)) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (statSync(p).isFile()) acc.push(p);
  }
  return acc;
}

/** Strip // and block comments so a comment explaining a rule cannot trip it. */
function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

const rel = (file) => file.slice(ROOT.length + 1).replace(/\\/g, '/');

let failed = 0;
function report(name, why, hits) {
  if (hits.length === 0) {
    console.log(`copy: ok   ${name}`);
    return;
  }
  failed++;
  console.error(`\ncopy: FAIL ${name}`);
  console.error(`      ${why}`);
  for (const h of hits) console.error(`      ${h}`);
  console.error('');
}

for (const check of CHECKS) {
  const hits = [];
  for (const dir of check.dirs) {
    for (const file of walk(join(ROOT, dir))) {
      if (!TEXT_FILE.test(file)) continue;
      const raw = readFileSync(file, 'utf8');
      const body = file.endsWith('.json') ? raw : stripComments(raw);
      body.split('\n').forEach((line, i) => {
        if (!check.pattern.test(line)) return;
        if (check.allow && check.allow.test(line)) return;
        hits.push(`${rel(file)}:${i + 1}: ${line.trim().slice(0, 100)}`);
      });
    }
  }
  report(check.name, check.why, hits);
}

/* ------------------------------------------------------------------------- *
 * The sign-in invariant.
 *
 * INVARIANT — the only sign-in affordance on this site is a single outbound
 * link to the seller console origin. This site has no same-origin sign-in
 * route, no session, no cookie-based identity, and no buyer-facing sign-in
 * language. Buyers never sign in on the web.
 *
 * This replaces a blanket grep for /log ?in|sign ?in/ that banned the wording
 * outright. That rule was written when no seller console existed, so a Log in
 * link led nowhere; ADU-ARCH-01 v2.0 §9 reverses it now that the console is a
 * real authenticated surface on its own origin.
 *
 * The blanket ban is not simply deleted, because deleting it loses the
 * protection entirely. It is replaced by three structural checks that permit
 * exactly one link and fail on what the invariant actually protects against.
 *
 * ⚠ ADU-WEB-01 is still at v1.0 and still carries the reversed invariant as
 * binding text. Until it is written back to v1.1, the specification and this
 * check disagree, and this check is the one that runs.
 * ------------------------------------------------------------------------- */

const SIGNIN_WORDING = /\blog ?in\b|\blogin\b|\bsign ?in\b/i;

/**
 * Copy that legitimately talks about signing in *somewhere else* — the phone app,
 * or the deletion OTP explicitly disclaiming that it is a sign-in. These are the
 * sentences the invariant exists to protect, so they must survive it.
 */
const LEGITIMATE_PROSE = /does not sign you in|is not a sign-?in|sign in with your phone|they sign in with their phone/i;

/** The one allowlisted declaration, and the one catalogue key it names. */
const NAV_FILE = 'src/lib/nav.ts';
const CATALOGUE_KEY = /"logIn"\s*:/;

{
  const hits = [];
  for (const file of walk(join(ROOT, 'src'))) {
    if (!/\.(ts|tsx|json|mjs)$/.test(file)) continue;
    const path = rel(file);
    const raw = readFileSync(file, 'utf8');
    const body = file.endsWith('.json') ? raw : stripComments(raw);

    body.split('\n').forEach((line, i) => {
      if (!SIGNIN_WORDING.test(line)) return;
      if (LEGITIMATE_PROSE.test(line)) return;
      // The single declaration, by key name, in the single allowlisted file.
      if (path === NAV_FILE && /key:\s*'logIn'/.test(line)) return;
      // The single catalogue string per locale that renders that link's label.
      if (path.startsWith('src/messages/') && CATALOGUE_KEY.test(line)) return;
      hits.push(`${path}:${i + 1}: ${line.trim().slice(0, 100)}`);
    });
  }
  report(
    'sign-in wording appears only in the one allowlisted link',
    `Permitted in ${NAV_FILE} (key: 'logIn') and as "logIn" in src/messages/*.json. Nowhere else.`,
    hits
  );
}

{
  // No same-origin sign-in route may exist in the app tree.
  const hits = [];
  const appDir = join(ROOT, 'src/app');
  for (const file of walk(appDir)) {
    const path = rel(file);
    if (/\/(login|signin|sign-in|log-in)\//.test('/' + path + '/')) {
      hits.push(`${path}: a same-origin sign-in route exists`);
    }
  }
  report(
    'no same-origin sign-in route',
    'Sign-in happens on the seller console origin. This site has no session and no /login.',
    hits
  );
}

{
  // The nav entry must point at the console origin and nowhere else.
  const hits = [];
  const navPath = join(ROOT, NAV_FILE);
  if (!existsSync(navPath)) {
    hits.push(`${NAV_FILE} is missing`);
  } else {
    const src = readFileSync(navPath, 'utf8');
    const decl = src.slice(src.indexOf('export const sellerConsoleLink'));
    const body = decl.slice(0, decl.indexOf('}') + 1);
    if (!body || !decl.startsWith('export const sellerConsoleLink')) {
      hits.push(`${NAV_FILE}: sellerConsoleLink is not declared`);
    } else {
      if (!/href:\s*SELLER_CONSOLE_URL\b/.test(body)) {
        hits.push(`${NAV_FILE}: href must be SELLER_CONSOLE_URL, not a literal — got ${body.replace(/\s+/g, ' ').slice(0, 90)}`);
      }
      if (/href:\s*['"`]/.test(body)) {
        hits.push(`${NAV_FILE}: href is a hardcoded string`);
      }
    }

    // And the origin itself must be off-site https, never a same-origin path.
    const routes = readFileSync(join(ROOT, 'src/lib/routes.ts'), 'utf8');
    const m = routes.match(/SELLER_CONSOLE_URL\s*=[\s\S]*?;/);
    if (!m) hits.push('src/lib/routes.ts: SELLER_CONSOLE_URL is not declared');
    else if (!/process\.env\.NEXT_PUBLIC_SELLER_CONSOLE_URL/.test(m[0])) {
      hits.push('src/lib/routes.ts: SELLER_CONSOLE_URL must come from the environment');
    }
  }
  report(
    'the sign-in link points at the console origin',
    'A sign-in link pointing anywhere else is the thing this invariant exists to prevent.',
    hits
  );
}

if (failed > 0) {
  console.error(`copy check failed: ${failed} invariant(s) violated.\n`);
  process.exit(1);
}
console.log(`copy: ${CHECKS.length + 3} invariants hold`);

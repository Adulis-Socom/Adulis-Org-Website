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
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const CHECKS = [
  {
    name: 'no buyer-protection claim',
    why: 'There is no escrow. ADU-WEB-01 §3.1.',
    dirs: ['src', 'messages'],
    pattern: /protects buyers|buyer protection|guaranteed|confirms receipt/i
  },
  {
    name: 'no web sign-in',
    why: 'There is no account on the public web. ADU-WEB-01 §6.1.',
    dirs: ['src/components', 'src/app'],
    pattern: /\blog ?in\b|\bsign ?in\b/i,
    allow: /does not sign you in|sign in with your phone|they sign in with their phone/i
  },
  {
    name: 'arrows are real glyphs',
    why: 'ASCII > and v are not arrows. ADU-WEB-01 §5.4.',
    dirs: ['messages'],
    pattern: /"[^"]*\. >"|waitlist v"/
  },
  {
    name: 'no follower threshold',
    why: 'Every applicant is accepted and reviewed. ADU-WEB-01 §3.3.',
    dirs: ['src', 'messages'],
    pattern: /\b5,?000\b|\b2,?500\b/
  },
  {
    name: 'no subscription pricing',
    why: 'Pricing is not public during the controlled beta. ADU-WEB-01 §3.3.',
    dirs: ['src', 'messages'],
    pattern: /\$\d/
  }
];

const SKIP_DIRS = new Set(['node_modules', '.next', '.git']);

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

/** Strip // and /* *​/ comments so a comment explaining a rule cannot trip it. */
function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

let failed = 0;

for (const check of CHECKS) {
  const hits = [];
  for (const dir of check.dirs) {
    for (const file of walk(join(ROOT, dir))) {
      const raw = readFileSync(file, 'utf8');
      const body = file.endsWith('.json') ? raw : stripComments(raw);
      body.split('\n').forEach((line, i) => {
        if (!check.pattern.test(line)) return;
        if (check.allow && check.allow.test(line)) return;
        hits.push(`${file.slice(ROOT.length + 1).replace(/\\/g, '/')}:${i + 1}: ${line.trim().slice(0, 100)}`);
      });
    }
  }
  if (hits.length === 0) {
    console.log(`copy: ok   ${check.name}`);
  } else {
    failed++;
    console.error(`\ncopy: FAIL ${check.name}`);
    console.error(`      ${check.why}`);
    for (const h of hits) console.error(`      ${h}`);
    console.error('');
  }
}

if (failed > 0) {
  console.error(`copy check failed: ${failed} invariant(s) violated.\n`);
  process.exit(1);
}
console.log(`copy: ${CHECKS.length} invariants hold`);

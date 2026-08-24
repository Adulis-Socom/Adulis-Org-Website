#!/usr/bin/env node
/**
 * Post-build smoke check: every route in ROUTES, in both locales, returns 200,
 * and an unknown path returns 404.
 *
 * This exists because of security audit 01, F-16. A build over a stale `.next`
 * silently served 404 for two real routes whose prerendered HTML was present on
 * disk. Nothing caught it — `next build` reported success, and the pages simply
 * did not resolve. A route that 404s in production is exactly the failure that
 * should never reach anyone, and it costs one HTTP request per route to rule out.
 *
 * Starts the production server itself, checks, and shuts it down.
 *
 * Run: npm run check:routes   (requires a prior `npm run build`)
 */
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.SMOKE_PORT ?? 3999);
const BASE = `http://localhost:${PORT}`;

// Read the route paths straight out of src/lib/routes.ts rather than restating
// them, so this cannot drift from the constant it is checking.
const routesSource = readFileSync(join(ROOT, 'src/lib/routes.ts'), 'utf8');
const block = routesSource.slice(
  routesSource.indexOf('export const ROUTES'),
  routesSource.indexOf('} as const')
);
const paths = [...block.matchAll(/:\s*'([^']+)'/g)].map((m) => m[1]);
const locales = ['en', 'am'];

if (paths.length === 0) {
  console.error('routes: could not parse any path out of src/lib/routes.ts');
  process.exit(1);
}

const server = spawn('npx', ['next', 'start', '-p', String(PORT)], {
  cwd: ROOT,
  env: { ...process.env, NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL ?? BASE },
  stdio: 'ignore',
  shell: process.platform === 'win32'
});

const stop = () => {
  try {
    server.kill();
  } catch {
    /* already gone */
  }
};
process.on('exit', stop);

async function waitForServer(deadlineMs = 60_000) {
  const started = Date.now();
  while (Date.now() - started < deadlineMs) {
    try {
      await fetch(`${BASE}/en`);
      return true;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  return false;
}

if (!(await waitForServer())) {
  console.error(`routes: server did not come up on ${BASE}`);
  stop();
  process.exit(1);
}

const failures = [];
let checked = 0;

for (const locale of locales) {
  for (const path of paths) {
    const url = `${BASE}/${locale}${path === '/' ? '' : path}`;
    checked++;
    try {
      const res = await fetch(url, { redirect: 'manual' });
      if (res.status !== 200) failures.push(`${res.status}  ${url}`);
    } catch (error) {
      failures.push(`ERR  ${url}  ${String(error)}`);
    }
  }
}

// An unknown path must 404, not 200. A soft-404 is indexable and invisible to
// monitoring.
for (const url of [`${BASE}/en/no-such-page`, `${BASE}/am/no-such-page`]) {
  checked++;
  const res = await fetch(url, { redirect: 'manual' });
  if (res.status !== 404) failures.push(`${res.status} (expected 404)  ${url}`);
}

// / must resolve to the default locale deterministically.
checked++;
const root = await fetch(`${BASE}/`, { redirect: 'manual' });
const location = root.headers.get('location') ?? '';
if (![307, 308].includes(root.status) || !location.endsWith('/en')) {
  failures.push(`${root.status} -> ${location || '(none)'} (expected redirect to /en)  ${BASE}/`);
}

stop();

if (failures.length > 0) {
  console.error(`\nroutes: ${failures.length} of ${checked} checks failed\n`);
  for (const f of failures) console.error(`  ${f}`);
  console.error('');
  process.exit(1);
}

console.log(`routes: ${checked} checks passed (${paths.length} routes x ${locales.length} locales, plus 404s and /)`);
process.exit(0);

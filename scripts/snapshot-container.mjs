// Runs the G11 placeholder snapshots inside the pinned Playwright container.
//
// ## Why a script and not a docker one-liner in package.json
//
// Two portability problems that a shell string cannot solve at once:
//
//  1. **Git Bash rewrites container paths.** MSYS path conversion turns
//     `-w /w` into `-w W:/` before docker ever sees it, and the daemon rejects
//     it. Suppressing that needs an env prefix, which cmd.exe — the shell npm
//     uses on Windows — cannot parse.
//  2. **`$PWD` / `%CD%`** are different variables in the two shells.
//
// Spawning with an argv array sidesteps both: no shell, so nothing is rewritten
// and nothing needs quoting.
//
// ## Why a container at all
//
// The baselines are pinned to Linux because that is what CI runs
// (`ubuntu-latest`). Font rasterisation and dashed-border phase differ enough
// between platforms that a Windows-generated baseline fails on Linux every
// time — and a snapshot test that always fails gets disabled, which is worse
// than not having one.
import { spawnSync } from 'node:child_process';

/** Must track the installed Playwright, or the browser comparing the pictures
 *  is not the browser that drew them. */
const IMAGE = 'mcr.microsoft.com/playwright:v1.62.1-noble';

const update = process.argv.includes('--update');
const cwd = process.cwd();

// These volumes mask the host's node_modules and .next. Both hold
// platform-native binaries (sharp, the SWC binding); a Windows tree mounted
// into Linux fails at require time. `npm ci` inside installs the Linux ones
// without touching what the developer has on disk.
const args = [
  'run', '--rm',
  '-v', `${cwd}:/w`,
  // Anonymous, so `--rm` discards them with the container. The host's copies
  // hold platform-native binaries and cannot be reused from Linux.
  '-v', '/w/node_modules',
  '-v', '/w/.next',
  '-w', '/w',
  '-e', 'CI=1',
  '-e', 'ALLOW_UNDELIVERED_WAITLIST=1',
  // Lifts the config's testIgnore. Without it this file selects zero tests and
  // exits 0, which reads exactly like a pass.
  '-e', 'QA_SNAPSHOTS=1',
  IMAGE,
  'sh', '-c',
  // --no-audit/--no-fund drop two registry round-trips that are pure latency
  // here. The retry and timeout settings matter more: without them a dropped
  // connection leaves `npm ci` parked at 0% CPU indefinitely, which is what it
  // did twice while this script was being written. Better to fail and be rerun.
  'npm ci --silent --no-audit --no-fund ' +
    '--fetch-retries=5 --fetch-retry-maxtimeout=20000 --fetch-timeout=120000 ' +
    '&& npm run build && npx playwright test ' +
    'tests/qa/placeholder-appearance.spec.ts --project=chromium' +
    (update ? ' --update-snapshots' : '')
];

console.log(`${update ? 'Regenerating' : 'Comparing'} G11 baselines in ${IMAGE}`);
const result = spawnSync('docker', args, { stdio: 'inherit', shell: false });

if (result.error?.code === 'ENOENT') {
  console.error(
    '\ndocker is not on PATH. These baselines are pinned to Linux on purpose —\n' +
      'see the header of tests/qa/placeholder-appearance.spec.ts. Without a\n' +
      'container the comparison cannot be trusted, so this does not fall back\n' +
      'to the host browser.'
  );
  process.exit(1);
}
process.exit(result.status ?? 1);

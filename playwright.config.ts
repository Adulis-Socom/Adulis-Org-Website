import { defineConfig, devices } from '@playwright/test';

/**
 * QA verification suite. Not part of the build — run with `npm run qa`.
 *
 * Runs against a **production** build, started by `webServer` below. Headers,
 * caching and server-action behaviour all differ from `next dev`, and every one
 * of those is something this suite asserts.
 *
 * localhost only. Nothing here contacts a host we do not control.
 */
const PORT = Number(process.env.QA_PORT ?? 3210);
const SINK_PORT = Number(process.env.QA_SINK_PORT ?? 4556);

export default defineConfig({
  testDir: './tests/qa',
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['json', { outputFile: 'tests/qa/.results.json' }]],
  timeout: 90_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: `http://localhost:${PORT}`,
    // 360px is the product's stated floor: the target seller is on a low-end
    // Android. Individual tests widen this where a desktop view is the subject.
    viewport: { width: 360, height: 640 },
    trace: 'off',
    screenshot: 'off'
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 360, height: 640 } } },
    // WebKit is what Safari uses. It carries the F-13 no-JS revert gate.
    { name: 'webkit', use: { ...devices['Desktop Safari'], viewport: { width: 360, height: 640 } } }
  ],

  // Playwright starts both servers, so `npm run qa` is self-contained and CI
  // needs no background-process step. A step that backgrounds a process with
  // `&` is unreliable in GitHub Actions -- each `run:` is its own shell -- and
  // relying on it was one of the things standing between the qa job and a pass.
  webServer: [
    {
      // Local delivery sink. The suite exercises the waitlist end to end, and
      // with no destination the action refuses every submission (F-07).
      command: 'node tests/qa/sink.mjs',
      url: `http://localhost:${SINK_PORT}/`,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
      env: { QA_SINK_PORT: String(SINK_PORT) }
    },
    {
      command: 'npx next start -p ' + PORT,
      url: `http://localhost:${PORT}/en`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        NEXT_PUBLIC_SITE_URL: `http://localhost:${PORT}`,
        WAITLIST_WEBHOOK_URL: `http://localhost:${SINK_PORT}/`,
        // Separate variable, same sink: the suite asserts on both streams and
        // the sink tags them by `kind`.
        ENQUIRY_WEBHOOK_URL: `http://localhost:${SINK_PORT}/`,
        REPORT_WEBHOOK_URL: `http://localhost:${SINK_PORT}/`,
        // Present so the suite exercises the keyed phone hash, per-phone rate
        // limiting and double-submission dedupe. Without it those three paths
        // are skipped and the tests covering them silently assert nothing.
        // Fixed rather than random, because dedupe behaviour must not differ
        // between runs. A throwaway localhost value, not a deployment secret.
        WAITLIST_HASH_SECRET: 'qa-only-secret-not-for-any-deployment-0123456789'
      }
    }
  ]
});

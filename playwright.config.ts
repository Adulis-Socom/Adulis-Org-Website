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

  webServer: {
    command: 'npx next start -p ' + PORT,
    url: `http://localhost:${PORT}/en`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      NEXT_PUBLIC_SITE_URL: `http://localhost:${PORT}`,
      // The suite exercises the waitlist end to end. Without a destination the
      // action refuses every submission (F-07), so point it at the local sink
      // the suite starts itself.
      WAITLIST_WEBHOOK_URL: `http://localhost:${Number(process.env.QA_SINK_PORT ?? 4556)}/`
    }
  }
});

import { defineConfig, devices } from '@playwright/test'
import { loadTestEnv } from './e2e/env'

loadTestEnv()

const PORT = Number(process.env.E2E_PORT ?? 3000)
const BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`

/**
 * The `realtime` project asserts Ably push propagation. Without a key the
 * `/api/ably` token endpoint returns 503 and nothing can propagate, so the
 * project is dropped rather than left to fail.
 */
const hasAbly = Boolean(process.env.ABLY_API_KEY)

export default defineConfig({
  testDir: './e2e/specs',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  globalSetup: './e2e/global-setup.ts',
  timeout: 45_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: BASE_URL,
    // Kills the particle canvas (`use-reduced-motion`) and pins
    // `.flip-card-inner` to 0deg, so reveals are observable immediately
    // instead of after a staggered 3D transition.
    // As of Playwright 1.5x this lives under contextOptions, not top-level.
    contextOptions: { reducedMotion: 'reduce' },
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      grepInvert: /@realtime|@auth/,
    },
    {
      name: 'auth',
      use: { ...devices['Desktop Chrome'], storageState: './e2e/.auth/user.json' },
      grep: /@auth/,
    },
    ...(hasAbly
      ? [
        {
          name: 'realtime',
          use: { ...devices['Desktop Chrome'] },
          grep: /@realtime/,
        },
      ]
      : []),
  ],

  webServer: {
    command: 'pnpm build && pnpm start',
    // /api/health runs `SELECT 1`, so a 200 proves the DB is reachable too —
    // a plain page load would pass against a dead database.
    url: `${BASE_URL}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
})

import path from 'node:path'
import fs from 'node:fs'
import dotenv from 'dotenv'

const APP_ROOT = path.resolve(__dirname, '..')
const ENV_TEST = path.join(APP_ROOT, '.env.test')

/**
 * Loads `.env.test` into `process.env` for both the Playwright process and the
 * `webServer` child it spawns.
 *
 * Fails loudly rather than silently falling back to `.env`: the suite creates
 * and mutates real rows, so running it against the dev database would quietly
 * pollute real data.
 */
export function loadTestEnv(): void {
  if (!fs.existsSync(ENV_TEST)) {
    throw new Error(
      `Missing ${ENV_TEST}\n\n` +
      `The E2E suite needs its own database. Copy the template and fill it in:\n` +
      `  cp apps/web/.env.test.example apps/web/.env.test\n\n` +
      `DATABASE_URL must point at a DIFFERENT database than apps/web/.env — the\n` +
      `suite runs migrations and seeds against it.`,
    )
  }

  // A value set in `.env.test` always wins over the ambient shell — that is
  // what keeps DATABASE_URL from falling back to a dev value. But a key left
  // blank in the file must NOT clobber one the caller exported deliberately,
  // so `ABLY_API_KEY=... playwright test --project=realtime` works.
  const parsed = dotenv.parse(fs.readFileSync(ENV_TEST))
  for (const [key, value] of Object.entries(parsed)) {
    if (value !== '' || process.env[key] === undefined) {
      process.env[key] = value
    }
  }

  const missing = ['DATABASE_URL', 'NEXTAUTH_SECRET'].filter((k) => !process.env[k])
  if (missing.length > 0) {
    throw new Error(`apps/web/.env.test is missing: ${missing.join(', ')}`)
  }

  assertNotDevDatabase()
}

/**
 * Guards against the most damaging misconfiguration: pointing `.env.test` at
 * the same database `pnpm dev` uses.
 */
function assertNotDevDatabase(): void {
  const devEnvPath = path.join(APP_ROOT, '.env')
  if (!fs.existsSync(devEnvPath)) return

  const dev = dotenv.parse(fs.readFileSync(devEnvPath))
  if (dev.DATABASE_URL && dev.DATABASE_URL === process.env.DATABASE_URL) {
    throw new Error(
      'Refusing to run: apps/web/.env.test DATABASE_URL is identical to apps/web/.env.\n' +
      'Point the test suite at a separate database (a Neon/Supabase branch or a local Postgres).',
    )
  }
}

export const APP_DIR = APP_ROOT

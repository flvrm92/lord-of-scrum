import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { PrismaClient } from '@prisma/client'
import { encode } from 'next-auth/jwt'
import { loadTestEnv, APP_DIR } from './env'
import { AUTH_USER } from './fixtures/auth-user'

const SESSION_MAX_AGE = 30 * 24 * 60 * 60 // NextAuth default

export default async function globalSetup(): Promise<void> {
  loadTestEnv()

  prepareDatabase()
  await writeAuthStorageState()
}

/**
 * Migrate + seed the test database. The seed (`prisma/seed.ts`) upserts on
 * fixed ids, so it is safe to re-run before every suite — and it is required,
 * because creating a session needs a seeded estimation scale.
 */
function prepareDatabase(): void {
  const run = (args: string[]) =>
    execFileSync('npx', ['prisma', ...args], {
      cwd: APP_DIR,
      stdio: 'inherit',
      env: process.env,
      shell: process.platform === 'win32',
    })

  run(['migrate', 'deploy'])
  run(['db', 'seed'])
}

/**
 * `authOptions` uses `session: { strategy: 'jwt' }`, so a valid session is just
 * a JWE signed with NEXTAUTH_SECRET — no OAuth round-trip needed. We mint one
 * for the fixture user and hand it to Playwright as storage state.
 */
async function writeAuthStorageState(): Promise<void> {
  const prisma = new PrismaClient()
  try {
    await prisma.user.upsert({
      where: { id: AUTH_USER.id },
      create: {
        id: AUTH_USER.id,
        name: AUTH_USER.name,
        email: AUTH_USER.email,
        lotrTitle: AUTH_USER.lotrTitle,
      },
      // Reset the title each run so the reroll spec always starts from a
      // known value and can assert it actually changed.
      update: { name: AUTH_USER.name, lotrTitle: AUTH_USER.lotrTitle },
    })
  } finally {
    await prisma.$disconnect()
  }

  const token = await encode({
    token: {
      sub: AUTH_USER.id,
      name: AUTH_USER.name,
      email: AUTH_USER.email,
      lotrTitle: AUTH_USER.lotrTitle,
    },
    secret: process.env.NEXTAUTH_SECRET!,
    maxAge: SESSION_MAX_AGE,
  })

  const baseUrl = new URL(process.env.E2E_BASE_URL ?? 'http://localhost:3000')

  const storageState = {
    cookies: [
      {
        // Non-secure name: the suite runs over plain http on localhost, where
        // NextAuth omits the `__Secure-` prefix.
        name: 'next-auth.session-token',
        value: token,
        domain: baseUrl.hostname,
        path: '/',
        expires: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE,
        httpOnly: true,
        secure: false,
        sameSite: 'Lax' as const,
      },
    ],
    origins: [],
  }

  const outPath = path.join(APP_DIR, 'e2e', '.auth', 'user.json')
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, JSON.stringify(storageState, null, 2))
}

import { test, expect } from '../fixtures/test'
import { HomePage } from '../pages/home'
import { SessionRoom } from '../pages/session-room'
import { AUTH_USER } from '../fixtures/auth-user'

/**
 * These run in the `auth` project, which loads the forged NextAuth session
 * cookie written by global setup. `authOptions` uses `strategy: 'jwt'`, so a
 * valid session needs no OAuth provider — see `e2e/global-setup.ts`.
 *
 * Serial, because every test in this block shares the one fixture user row and
 * the reroll tests mutate its title.
 */
test.describe('Signed in @auth', () => {
  test.describe.configure({ mode: 'serial' })

  test('the user menu shows the traveller and their title', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByTestId('user-menu')).toHaveAttribute('data-state', 'authenticated')
    await expect(page.getByTestId('user-name')).toHaveText(AUTH_USER.name)
    await expect(page.getByTestId('user-title')).toHaveText(AUTH_USER.lotrTitle)
    await expect(page.getByTestId('signout-button')).toBeVisible()
  })

  test('the display name fields prefill from the profile', async ({ page }) => {
    const home = new HomePage(page)
    await home.goto()

    await expect(home.hostName).toHaveValue(AUTH_USER.name)
    await home.tabJoin.click()
    await expect(home.joinName).toHaveValue(AUTH_USER.name)
  })

  test('a signed-in facilitator can still run a council', async ({ page }) => {
    const home = new HomePage(page)
    await home.goto()
    await home.create({ name: 'An Authenticated Council', hostName: AUTH_USER.name })

    await page.waitForURL(/\/session\/[A-Z0-9]{8}$/)
    await expect(page.getByTestId('session-name')).toHaveText('An Authenticated Council')
    await expect(page.getByTestId('host-badge')).toBeVisible()
    await expect(page.getByTestId('participant-list')).toContainText(AUTH_USER.name)
  })

  test('a council link leaves a signed-in traveller one click from joining', async ({
    page,
    makeCouncil,
  }) => {
    const council = await makeCouncil({ hostName: 'Gandalf' })

    const room = new SessionRoom(page, council.session.inviteCode)
    await room.goto()

    // The seal comes from the link and the name from the profile, so the form
    // arrives complete — nothing left to type.
    const home = new HomePage(page)
    await expect(home.joinForm).toBeVisible()
    await expect(home.inviteCode).toHaveValue(council.session.inviteCode)
    await expect(home.joinName).toHaveValue(AUTH_USER.name)

    await home.submitJoin.click()

    await page.waitForURL(`/session/${council.session.inviteCode}`)
    await expect(page.getByTestId('current-player')).toHaveText(AUTH_USER.name)
  })

  test('rerolling swaps the title in the header', async ({ page }) => {
    await page.goto('/')
    const title = page.getByTestId('user-title')
    await expect(title).toHaveText(AUTH_USER.lotrTitle)

    await page.getByTestId('reroll-title').click()

    // The endpoint guarantees a title distinct from the current one.
    await expect(title).not.toHaveText(AUTH_USER.lotrTitle)
    await expect(title).not.toBeEmpty()
  })

  test('a rerolled title is persisted, even though the header reverts on reload', async ({
    page,
  }) => {
    const res = await page.request.post('/api/users/me/reroll-title')
    expect(res.ok()).toBe(true)
    const { lotrTitle } = await res.json()
    expect(typeof lotrTitle).toBe('string')
    expect(lotrTitle).not.toBe('')

    // The new title really is stored — a fresh reroll refuses to repeat it.
    const again = await page.request.post('/api/users/me/reroll-title')
    expect((await again.json()).lotrTitle).not.toBe(lotrTitle)

    // But the header is fed by `session.user.lotrTitle`, which comes from the
    // JWT, and `authOptions.callbacks.jwt` only refreshes the title on
    // sign-in. So a reload shows the title the token was minted with, not the
    // stored one. Asserted as-is; see the E2E notes in docs/09-testing.md.
    await page.goto('/')
    await expect(page.getByTestId('user-title')).toHaveText(AUTH_USER.lotrTitle)
  })
})

test.describe('Signed out', () => {
  test('the user menu offers a way in', async ({ page }) => {
    await page.goto('/')

    const menu = page.getByTestId('user-menu')
    await expect(menu).toHaveAttribute('data-state', 'unauthenticated')
    await expect(menu).toHaveText('Sign In')
    await expect(menu).toHaveAttribute('href', '/auth/signin')
  })

  test('the sign-in page offers GitHub', async ({ page }) => {
    await page.goto('/auth/signin')

    await expect(page.getByRole('heading', { name: 'Speak, Friend, and Enter' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Continue with GitHub' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Return to the Shire' })).toBeVisible()
  })
})

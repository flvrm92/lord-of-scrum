import { test, expect } from '../fixtures/test'
import { HomePage } from '../pages/home'

test.describe('Landing page', () => {
  test('renders the hero and defaults to the create tab', async ({ page }) => {
    const home = new HomePage(page)
    await home.goto()

    await expect(page.getByRole('heading', { name: 'Lord of Scrum' })).toBeVisible()
    await expect(home.tabCreate).toHaveAttribute('data-active', 'true')
    await expect(home.createForm).toBeVisible()
    await expect(home.joinForm).toBeHidden()
  })

  test('switching tabs swaps the form', async ({ page }) => {
    const home = new HomePage(page)
    await home.goto()

    await home.tabJoin.click()
    await expect(home.tabJoin).toHaveAttribute('data-active', 'true')
    await expect(home.joinForm).toBeVisible()
    await expect(home.createForm).toBeHidden()

    await home.tabCreate.click()
    await expect(home.createForm).toBeVisible()
  })

  test('switching tabs clears a previous error', async ({ page }) => {
    const home = new HomePage(page)
    await home.goto()

    await home.join({ inviteCode: 'ZZZZZZZZ', displayName: 'Nobody' })
    await expect(home.error).toBeVisible()

    await home.tabCreate.click()
    await expect(home.error).toBeHidden()
  })

  test('the scale select is populated from the seeded estimation scales', async ({ page, api }) => {
    const home = new HomePage(page)
    await home.goto()
    await home.waitForScales()

    const scales = await api.getScales()
    // Placeholder option ("Select a scale...") plus one per scale.
    await expect(home.scale.locator('option')).toHaveCount(scales.length + 1)

    const names = scales.map((s) => s.name)
    expect(names).toEqual(
      expect.arrayContaining(['Fibonacci', 'T-Shirt', 'Powers of 2', 'Sequencial']),
    )

    // Option labels carry the scale's values, which is how a facilitator picks.
    const fibonacci = scales.find((s) => s.id === 'default-fibonacci')!
    await expect(home.scale.locator('option[value="default-fibonacci"]')).toHaveText(
      `Fibonacci (${fibonacci.values.map((v) => v.label).join(', ')})`,
    )
  })

  test('create requires every field before it will submit', async ({ page }) => {
    const home = new HomePage(page)
    await home.goto()
    await home.waitForScales()

    await home.submitCreate.click()
    await expect(page).toHaveURL('/')

    await home.sessionName.fill('Incomplete Council')
    await home.submitCreate.click()
    await expect(page).toHaveURL('/')

    await home.hostName.fill('Gandalf')
    await home.submitCreate.click()
    // Scale is still unset — the native required check keeps us here.
    await expect(page).toHaveURL('/')
  })

  test('the invite code field upper-cases input and caps at 8 characters', async ({ page }) => {
    const home = new HomePage(page)
    await home.goto()
    await home.tabJoin.click()

    await home.inviteCode.fill('abcd1234extra')
    await expect(home.inviteCode).toHaveValue('ABCD1234')
  })

  test('the archives page renders its placeholder', async ({ page }) => {
    // `/history` is still a static stub — no data, and nothing in the app links
    // to it. Asserted so the placeholder does not silently rot.
    await page.goto('/history')
    await expect(page.getByRole('heading', { name: 'The Archives' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Reveal Yourself' })).toBeVisible()
  })
})

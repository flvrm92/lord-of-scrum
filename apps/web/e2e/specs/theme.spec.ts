import { test, expect } from '../fixtures/test'
import type { Page } from '@playwright/test'

const TOGGLE = 'button[aria-label="Toggle theme"]'

/**
 * `<html>` also carries the font-variable classes, so match on the `dark` class
 * directly rather than on the whole className string.
 */
const isDark = (page: Page) =>
  page.evaluate(() => document.documentElement.classList.contains('dark'))

async function expectDark(page: Page, expected: boolean): Promise<void> {
  await expect.poll(() => isDark(page)).toBe(expected)
}

test.describe('Theme', () => {
  test('the toggle flips the theme and survives a reload', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator(TOGGLE)).toBeVisible()

    const startedDark = await isDark(page)

    await page.locator(TOGGLE).click()
    await expectDark(page, !startedDark)
    expect(await page.evaluate(() => window.localStorage.getItem('theme'))).toBe(
      startedDark ? 'light' : 'dark',
    )

    // The blocking script in the layout re-applies the stored choice before
    // first paint, so the theme must not flip back on reload.
    await page.reload()
    await expectDark(page, !startedDark)

    // And toggling back returns to where we started.
    await page.locator(TOGGLE).click()
    await expectDark(page, startedDark)
  })

  test('the theme carries across pages', async ({ makeCouncil }) => {
    const council = await makeCouncil({ hostName: 'Gandalf' })
    const page = council.host.page
    await council.host.room.open()

    const startedDark = await isDark(page)
    await page.locator(TOGGLE).click()
    await expectDark(page, !startedDark)

    await council.host.chronicles.open()
    await expectDark(page, !startedDark)
  })
})

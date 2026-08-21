import { test as base, expect } from '@playwright/test'
import { Api } from './api'
import { Council } from './council'

/**
 * `council` builds a session named after the running test plus a random
 * suffix, so every test owns its own rows. That is what makes `fullyParallel`
 * safe against a single shared database without truncating between tests.
 */
type Fixtures = {
  api: Api
  makeCouncil: (opts?: { hostName?: string; scaleId?: string; name?: string }) => Promise<Council>
}

export const test = base.extend<Fixtures>({
  api: async ({ request }, use) => {
    await use(new Api(request))
  },

  makeCouncil: async ({ browser, request, baseURL, contextOptions }, use, testInfo) => {
    const api = new Api(request)
    const councils: Council[] = []
    // Players get their own contexts, which inherit nothing from `use`.
    const playerContextOptions = { ...contextOptions, baseURL }

    await use(async (opts = {}) => {
      const name =
        opts.name ??
        `${testInfo.title.slice(0, 60)} ${Math.random().toString(36).slice(2, 8)}`
      const council = await Council.create(browser, api, { ...opts, name }, playerContextOptions)
      councils.push(council)
      return council
    })

    await Promise.all(councils.map((c) => c.closeAll()))
  },
})

export { expect }
export { SCALE, playRound } from './api'
export type { Council } from './council'
export type { Player } from './council'

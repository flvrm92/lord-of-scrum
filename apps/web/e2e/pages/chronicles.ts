import { expect, type Locator, type Page } from '@playwright/test'

/** The per-session results page at `/session/:inviteCode/results`. */
export class ChroniclesPage {
  readonly root: Locator
  readonly title: Locator
  readonly totalRounds: Locator
  readonly consensusCount: Locator
  readonly dividedCount: Locator
  readonly empty: Locator
  readonly error: Locator
  readonly backToCouncil: Locator

  constructor(
    readonly page: Page,
    readonly inviteCode: string,
  ) {
    this.root = page.getByTestId('chronicles-root')
    this.title = page.getByTestId('chronicles-title')
    this.totalRounds = page.getByTestId('stat-total-rounds')
    this.consensusCount = page.getByTestId('stat-consensus')
    this.dividedCount = page.getByTestId('stat-divided')
    this.empty = page.getByTestId('empty-chronicles')
    this.error = page.getByTestId('chronicles-error')
    this.backToCouncil = page.getByTestId('back-to-council')
  }

  async open(): Promise<void> {
    await this.page.goto(`/session/${this.inviteCode}/results`)
    await expect(this.root).toBeVisible()
  }

  rounds(): Locator {
    return this.page.getByTestId('round-history-item')
  }

  round(topic: string): Locator {
    return this.page.locator(`[data-testid="round-history-item"][data-topic="${topic}"]`)
  }
}

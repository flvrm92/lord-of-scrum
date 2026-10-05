import { expect, type Locator, type Page } from '@playwright/test'

/** The landing page at `/` — the create / join tabbed card. */
export class HomePage {
  readonly tabCreate: Locator
  readonly tabJoin: Locator
  readonly error: Locator
  readonly createForm: Locator
  readonly joinForm: Locator
  readonly sessionName: Locator
  readonly hostName: Locator
  readonly scale: Locator
  readonly submitCreate: Locator
  readonly inviteCode: Locator
  readonly joinName: Locator
  readonly submitJoin: Locator

  constructor(readonly page: Page) {
    this.tabCreate = page.getByTestId('tab-create')
    this.tabJoin = page.getByTestId('tab-join')
    this.error = page.getByTestId('form-error')
    this.createForm = page.getByTestId('create-form')
    this.joinForm = page.getByTestId('join-form')
    this.sessionName = page.locator('#sessionName')
    this.hostName = page.locator('#hostName')
    this.scale = page.locator('#scale')
    this.submitCreate = page.getByTestId('submit-create')
    this.inviteCode = page.locator('#inviteCode')
    this.joinName = page.locator('#joinName')
    this.submitJoin = page.getByTestId('submit-join')
  }

  async goto(): Promise<void> {
    await this.page.goto('/')
    await expect(this.tabCreate).toBeVisible()
  }

  /** The tab the card is currently showing. */
  async activeTab(): Promise<'create' | 'join'> {
    return (await this.tabJoin.getAttribute('data-active')) === 'true' ? 'join' : 'create'
  }

  /** Waits for the scales query to resolve before the select is usable. */
  async waitForScales(): Promise<void> {
    await expect(this.scale.locator('option')).not.toHaveCount(1)
  }

  async create(opts: { name: string; hostName: string; scaleId?: string }): Promise<void> {
    await this.tabCreate.click()
    await this.waitForScales()
    await this.sessionName.fill(opts.name)
    await this.hostName.fill(opts.hostName)
    await this.scale.selectOption(opts.scaleId ?? 'default-fibonacci')
    await this.submitCreate.click()
  }

  async join(opts: { inviteCode: string; displayName: string }): Promise<void> {
    await this.tabJoin.click()
    await this.inviteCode.fill(opts.inviteCode)
    await this.joinName.fill(opts.displayName)
    await this.submitJoin.click()
  }
}

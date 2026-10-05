import { expect, type Locator, type Page } from '@playwright/test'

/**
 * The live council room at `/session/:inviteCode`.
 *
 * Cross-player propagation goes through Ably in production, but the suite must
 * pass without an ABLY_API_KEY, so anything another player did is observed via
 * `sync()` (an explicit reload) rather than by waiting for a push. A player's
 * *own* actions need no sync — the app re-fetches locally on every mutation.
 */
export class SessionRoom {
  readonly root: Locator
  readonly sessionName: Locator
  readonly inviteCode: Locator
  readonly currentPlayer: Locator
  readonly hostBadge: Locator
  readonly roundControls: Locator
  readonly topicInput: Locator
  readonly startRoundButton: Locator
  readonly revealButton: Locator
  readonly resetButton: Locator
  readonly viewChroniclesLink: Locator
  readonly votingArea: Locator
  readonly emptyRound: Locator
  readonly roundTopic: Locator
  readonly voteStatus: Locator
  readonly myVoteChip: Locator
  readonly votesCastLabel: Locator
  readonly allSpoken: Locator
  readonly progressBar: Locator
  readonly consensusCard: Locator
  readonly consensusValue: Locator
  readonly revealedCard: Locator
  readonly participantList: Locator
  readonly errorState: Locator
  readonly dismissedState: Locator

  constructor(
    readonly page: Page,
    readonly inviteCodeValue: string,
  ) {
    this.root = page.getByTestId('room-root')
    this.sessionName = page.getByTestId('session-name')
    this.inviteCode = page.getByTestId('invite-code')
    this.currentPlayer = page.getByTestId('current-player')
    this.hostBadge = page.getByTestId('host-badge')
    this.roundControls = page.getByTestId('round-controls')
    this.topicInput = page.getByTestId('topic-input')
    this.startRoundButton = page.getByTestId('start-round')
    this.revealButton = page.getByTestId('reveal-round')
    this.resetButton = page.getByTestId('reset-round')
    this.viewChroniclesLink = page.getByTestId('view-chronicles')
    this.votingArea = page.getByTestId('voting-area')
    this.emptyRound = page.getByTestId('empty-round')
    this.roundTopic = page.getByTestId('round-topic')
    this.voteStatus = page.getByTestId('vote-status')
    this.myVoteChip = page.getByTestId('my-vote-chip')
    this.votesCastLabel = page.getByTestId('votes-cast-label')
    this.allSpoken = page.getByTestId('all-spoken')
    this.progressBar = page.getByRole('progressbar', { name: 'Votes cast' })
    this.consensusCard = page.getByTestId('consensus-card')
    this.consensusValue = page.getByTestId('consensus-value')
    this.revealedCard = page.getByTestId('revealed-card')
    this.participantList = page.getByTestId('participant-list')
    this.errorState = page.getByTestId('state-error')
    this.dismissedState = page.getByTestId('state-dismissed')
  }

  async goto(): Promise<void> {
    await this.page.goto(`/session/${this.inviteCodeValue}`)
  }

  /** Open the room and wait for it to finish loading. */
  async open(): Promise<void> {
    await this.goto()
    await this.ready()
  }

  async ready(): Promise<void> {
    await expect(this.root).toBeVisible()
  }

  /** Pick up state changed by another player, without relying on realtime. */
  async sync(): Promise<void> {
    await this.page.reload()
    await this.ready()
  }

  /**
   * Same as `sync()` but without assuming the room still renders — for players
   * who may have been dismissed, where the page shows a terminal state instead.
   */
  async reload(): Promise<void> {
    await this.page.reload()
  }

  voteOption(value: string): Locator {
    return this.page.locator(`[data-testid="vote-option"][data-value="${value}"]`)
  }

  voteOptions(): Locator {
    return this.page.getByTestId('vote-option')
  }

  async vote(value: string): Promise<void> {
    await this.voteOption(value).click()
    // The button reflects the optimistic selection immediately; waiting on it
    // keeps the next assertion from racing the POST.
    await expect(this.voteOption(value)).toHaveAttribute('data-selected', 'true')
  }

  async startRound(topic: string): Promise<void> {
    await this.topicInput.fill(topic)
    await this.startRoundButton.click()
    await expect(this.roundTopic).toHaveText(topic)
  }

  async reveal(): Promise<void> {
    await this.revealButton.click()
    await expect(this.revealButton).toBeHidden()
  }

  async reset(): Promise<void> {
    await this.resetButton.click()
    await expect(this.votesCastLabel).toContainText('0 of')
  }

  participantRow(displayName: string): Locator {
    return this.page.locator(`[data-testid="participant-row"][data-name="${displayName}"]`)
  }

  participantRows(): Locator {
    return this.page.getByTestId('participant-row')
  }

  /** The face-down / face-up card belonging to one player. */
  voteCard(displayName: string): Locator {
    return this.page.locator(`[data-testid="vote-card"][data-name="${displayName}"]`)
  }

  /**
   * Dismiss a participant. The list uses a native `confirm()`, which blocks the
   * page until handled, so the dialog handler must be attached before clicking.
   *
   * Removal is a soft delete (`isActive = false`), so the row stays in the list
   * and flips its active dot rather than disappearing.
   */
  async removeParticipant(displayName: string): Promise<void> {
    this.page.once('dialog', (dialog) => dialog.accept())
    await this.participantRow(displayName).getByTestId('participant-action').click()
    await expect(this.participantRow(displayName)).toHaveAttribute('data-active', 'false')
  }

  async leave(): Promise<void> {
    const ownRow = this.page.locator('[data-testid="participant-row"][data-me="true"]')
    this.page.once('dialog', (dialog) => dialog.accept())
    await ownRow.getByTestId('participant-action').click()
  }
}

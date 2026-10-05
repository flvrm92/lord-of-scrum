import { test, expect } from '../fixtures/test'

test.describe('Re-vote flow', () => {
  test('reveal, return to shadow, vote again, reveal again', async ({ makeCouncil }) => {
    const council = await makeCouncil({ hostName: 'Gandalf' })
    const legolas = await council.invite('Legolas')

    await council.host.room.open()
    await legolas.room.open()

    // ── First pass: wildly apart ────────────────────────────────────────
    await council.host.room.startRound('Migrate the Palantir cluster')
    await legolas.room.sync()

    await council.host.room.vote('1')
    await legolas.room.vote('13')

    await council.host.room.sync()
    await council.host.room.reveal()
    await expect(council.host.room.sauronEye).toBeVisible()

    // Revealing does not close the round — the Steward can send it back.
    await expect(council.host.room.resetButton).toBeHidden()
    await expect(council.host.room.startRoundButton).toBeVisible()
  })

  test('Return to Shadow clears every vote and reopens the round', async ({ makeCouncil }) => {
    const council = await makeCouncil({ hostName: 'Gandalf' })
    const legolas = await council.invite('Legolas')

    await council.host.room.open()
    await legolas.room.open()

    await council.host.room.startRound('Reconsider the quest')
    await legolas.room.sync()

    await council.host.room.vote('1')
    await legolas.room.vote('13')
    await council.host.room.sync()
    await expect(council.host.room.votesCastLabel).toHaveText('2 of 2 scrolls cast')

    // ── Back to shadow ──────────────────────────────────────────────────
    await council.host.room.reset()

    await expect(council.host.room.votingArea).toHaveAttribute('data-round-status', 'VOTING')
    await expect(council.host.room.votesCastLabel).toHaveText('0 of 2 scrolls cast')
    await expect(council.host.room.progressBar).toHaveAttribute('aria-valuenow', '0')
    await expect(council.host.room.myVoteChip).toBeHidden()
    await expect(council.host.room.voteStatus).toContainText('Cast your scroll')
    await expect(council.host.room.voteOption('1')).toHaveAttribute('data-selected', 'false')
    // No cards remain face-down from the discarded votes.
    await expect(council.host.room.page.getByTestId('vote-card')).toHaveCount(0)

    // The topic survives the reset — it is the same round, re-opened.
    await expect(council.host.room.roundTopic).toHaveText('Reconsider the quest')

    // The guest's discarded vote is gone too.
    await legolas.room.sync()
    await expect(legolas.room.myVoteChip).toBeHidden()
    await expect(legolas.room.participantRow('Legolas')).toHaveAttribute('data-voted', 'false')
    await expect(legolas.room.participantRow('Legolas')).toContainText('Pondering')

    // ── Second pass: the council converges ──────────────────────────────
    await council.host.room.vote('8')
    await legolas.room.vote('8')

    await council.host.room.sync()
    await council.host.room.reveal()

    await expect(council.host.room.consensusCard).toBeVisible()
    await expect(council.host.room.consensusValue).toHaveText('8')
    await expect(council.host.room.sauronEye).toBeHidden()
  })

  test('a revealed round is followed by a fresh one, not a reset', async ({ makeCouncil }) => {
    const council = await makeCouncil({ hostName: 'Gandalf' })
    const legolas = await council.invite('Legolas')

    await council.host.room.open()
    await legolas.room.open()

    await council.host.room.startRound('First quest')
    await legolas.room.sync()
    await council.host.room.vote('5')
    await legolas.room.vote('5')
    await council.host.room.sync()
    await council.host.room.reveal()
    await expect(council.host.room.consensusCard).toBeVisible()

    // Starting a second round supersedes the first as the current round.
    await council.host.room.startRound('Second quest')
    await expect(council.host.room.votingArea).toHaveAttribute('data-round-status', 'VOTING')
    await expect(council.host.room.roundTopic).toHaveText('Second quest')
    await expect(council.host.room.consensusCard).toBeHidden()
    await expect(council.host.room.votesCastLabel).toHaveText('0 of 2 scrolls cast')

    // Both rounds are preserved in the chronicles.
    const summary = await council.api.getSummary(council.session.id)
    expect(summary.rounds).toHaveLength(1) // only revealed rounds are summarised
    expect(summary.rounds[0].consensus.isUnanimous).toBe(true)
  })
})

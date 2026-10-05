import { test, expect } from '../fixtures/test'

test.describe('Full voting cycle', () => {
  test('start a round, everyone votes, the Steward reveals', async ({ makeCouncil }) => {
    const council = await makeCouncil({ hostName: 'Gandalf' })
    const legolas = await council.invite('Legolas')

    await council.host.room.open()
    await legolas.room.open()

    // ── Before the round ────────────────────────────────────────────────
    await expect(council.host.room.emptyRound).toBeVisible()
    await expect(legolas.room.emptyRound).toContainText('The council has not yet begun')

    // ── The Steward begins ──────────────────────────────────────────────
    await council.host.room.startRound('Rebuild the Beacon Service')
    await expect(council.host.room.votingArea).toHaveAttribute('data-round-status', 'VOTING')
    await expect(council.host.room.voteStatus).toContainText('Cast your scroll')
    await expect(council.host.room.votesCastLabel).toHaveText('0 of 2 scrolls cast')
    await expect(council.host.room.progressBar).toHaveAttribute('aria-valuenow', '0')
    await expect(council.host.room.progressBar).toHaveAttribute('aria-valuemax', '2')

    await legolas.room.sync()
    await expect(legolas.room.roundTopic).toHaveText('Rebuild the Beacon Service')
    // A guest never gets the Steward's controls.
    await expect(legolas.room.roundControls).toBeHidden()

    // ── Voting ──────────────────────────────────────────────────────────
    await council.host.room.vote('5')
    await expect(council.host.room.voteStatus).toContainText('Scroll cast!')
    await expect(council.host.room.myVoteChip).toHaveText('5')
    await expect(council.host.room.votesCastLabel).toHaveText('1 of 2 scrolls cast')
    await expect(council.host.room.progressBar).toHaveAttribute('aria-valuenow', '1')

    await legolas.room.vote('8')
    await expect(legolas.room.myVoteChip).toHaveText('8')
    await expect(legolas.room.votesCastLabel).toHaveText('2 of 2 scrolls cast')
    await expect(legolas.room.allSpoken).toBeVisible()

    // ── Vote secrecy ────────────────────────────────────────────────────
    await council.host.room.sync()
    await expect(council.host.room.allSpoken).toBeVisible()
    // Our own value is ours to see...
    await expect(council.host.room.myVoteChip).toHaveText('5')
    // ...but the server withholds everyone else's until the reveal, so the
    // other card carries no value at all rather than merely hiding one. (The
    // scale buttons always render every label, so the check has to be scoped
    // to the cards rather than to the voting area's text.)
    await expect(council.host.room.voteCard('Legolas')).toHaveAttribute('data-value', '')
    await expect(council.host.room.voteCard('Legolas')).toContainText('—')

    // Secrecy is enforced server-side, not merely hidden in the DOM.
    const asHost = await council.api.getSession(
      council.session.id,
      council.host.participant.id,
    )
    const values = Object.fromEntries(
      asHost.currentRound!.votes.map((v) => [v.displayName, v.value]),
    )
    expect(values).toEqual({ Gandalf: '5', Legolas: null })

    // The fellowship list still shows *that* they voted, just not what.
    await expect(council.host.room.participantRow('Legolas')).toHaveAttribute('data-voted', 'true')
    await expect(council.host.room.participantRow('Legolas')).toContainText('Scroll cast')

    // ── Reveal ──────────────────────────────────────────────────────────
    await council.host.room.reveal()
    await expect(council.host.room.revealedCard).toBeVisible()
    await expect(council.host.room.voteCard('Gandalf')).toHaveAttribute('data-value', '5')
    await expect(council.host.room.voteCard('Legolas')).toHaveAttribute('data-value', '8')

    // Stats and the distribution chart come from the summary endpoint.
    // Fibonacci 5 and 8 average to 6.5, and every value appears once.
    await expect(council.host.room.revealedCard).toContainText('Avg: 6.5')
    await expect(council.host.room.revealedCard).toContainText('Votes: 2')
    await expect(council.host.room.page.getByLabel('1 vote').first()).toBeVisible()

    // The guest sees the same numbers once synced.
    await legolas.room.sync()
    await expect(legolas.room.voteCard('Gandalf')).toHaveAttribute('data-value', '5')
    await expect(legolas.room.voteCard('Legolas')).toHaveAttribute('data-value', '8')

    // With the round revealed, the Steward can start the next one.
    await expect(council.host.room.startRoundButton).toBeVisible()
    await expect(council.host.room.revealButton).toBeHidden()
  })

  test('a vote can be changed while the round is still hidden', async ({ makeCouncil }) => {
    const council = await makeCouncil({ hostName: 'Gandalf' })
    await council.invite('Legolas')
    await council.host.room.open()
    await council.host.room.startRound('Change of counsel')

    await council.host.room.vote('3')
    await expect(council.host.room.myVoteChip).toHaveText('3')
    await expect(council.host.room.voteStatus).toContainText('Tap another to change your counsel')

    await council.host.room.vote('13')
    await expect(council.host.room.myVoteChip).toHaveText('13')
    await expect(council.host.room.voteStatus).toContainText('Scroll changed!')
    await expect(council.host.room.voteOption('3')).toHaveAttribute('data-selected', 'false')

    // Changing a vote replaces it rather than adding a second one.
    await expect(council.host.room.votesCastLabel).toHaveText('1 of 2 scrolls cast')
  })

  test('the scale drives which cards are on offer', async ({ makeCouncil }) => {
    const council = await makeCouncil({ scaleId: 'default-tshirt', hostName: 'Gandalf' })
    await council.host.room.open()
    await council.host.room.startRound('Sized in shirts')

    await expect(council.host.room.voteOptions()).toHaveCount(6)
    for (const label of ['XS', 'S', 'M', 'L', 'XL', 'XXL']) {
      await expect(council.host.room.voteOption(label)).toBeVisible()
    }

    await council.host.room.vote('L')
    await expect(council.host.room.myVoteChip).toHaveText('L')
  })

  test('votes are rejected once the round is revealed', async ({ api, makeCouncil }) => {
    const council = await makeCouncil({ hostName: 'Gandalf' })
    const round = await council.startRound('Sealed')
    await api.castVote(council.session.id, round.id, council.host.participant.id, '5')
    await api.reveal(council.session.id, round.id, council.host.participant.id)

    const res = await api
      .raw()
      .post(`/api/sessions/${council.session.id}/rounds/${round.id}/votes`, {
        data: { participantId: council.host.participant.id, value: '8' },
      })
    expect(res.status()).toBe(409)
    expect((await res.json()).error.code).toBe('ROUND_NOT_VOTING')
  })

  test('a value outside the scale is rejected', async ({ api, makeCouncil }) => {
    const council = await makeCouncil({ hostName: 'Gandalf' })
    const round = await council.startRound('Off scale')

    const res = await api
      .raw()
      .post(`/api/sessions/${council.session.id}/rounds/${round.id}/votes`, {
        data: { participantId: council.host.participant.id, value: '999' },
      })
    expect(res.status()).toBe(422)
    expect((await res.json()).error.code).toBe('INVALID_VOTE_VALUE')
  })
})

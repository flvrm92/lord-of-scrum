import { test, expect } from '../fixtures/test'

test.describe('Consensus', () => {
  test('a unanimous round crowns the One Ring', async ({ makeCouncil }) => {
    const council = await makeCouncil({ hostName: 'Gandalf' })
    const legolas = await council.invite('Legolas')

    await council.host.room.open()
    await legolas.room.open()

    await council.host.room.startRound('One number to rule them all')
    await legolas.room.sync()

    await council.host.room.vote('8')
    await legolas.room.vote('8')

    await council.host.room.sync()
    await council.host.room.reveal()

    await expect(council.host.room.consensusCard).toBeVisible()
    await expect(council.host.room.consensusValue).toHaveText('8')
    await expect(council.host.room.consensusCard).toContainText('One number to rule them all')
    await expect(council.host.room.consensusCard).toContainText('The Fellowship speaks with one voice')

    // The celebration replaces the ordinary revealed grid.
    await expect(council.host.room.revealedCard).toBeHidden()

    // Every voter is still itemised beneath the ring.
    await expect(council.host.room.consensusCard).toContainText('Gandalf')
    await expect(council.host.room.consensusCard).toContainText('Legolas')

    await legolas.room.sync()
    await expect(legolas.room.consensusValue).toHaveText('8')
  })

  test('a lone voter is not a consensus', async ({ makeCouncil }) => {
    // `detectConsensus` requires at least two votes — one member agreeing with
    // themself is not the Fellowship speaking with one voice.
    const council = await makeCouncil({ hostName: 'Gandalf' })
    await council.host.room.open()
    await council.host.room.startRound('A solitary counsel')

    await council.host.room.vote('5')
    await council.host.room.reveal()

    await expect(council.host.room.consensusCard).toBeHidden()
    await expect(council.host.room.revealedCard).toBeVisible()
    await expect(council.host.room.voteCard('Gandalf')).toHaveAttribute('data-value', '5')
  })

  test('unanimous abstention is still unanimous', async ({ makeCouncil }) => {
    const council = await makeCouncil({ hostName: 'Gandalf' })
    const gimli = await council.invite('Gimli')

    await council.host.room.open()
    await gimli.room.open()
    await council.host.room.startRound('Nobody knows')
    await gimli.room.sync()

    await council.host.room.vote('?')
    await gimli.room.vote('?')

    await council.host.room.sync()
    await council.host.room.reveal()

    await expect(council.host.room.consensusCard).toBeVisible()
    await expect(council.host.room.consensusValue).toHaveText('?')
    // No numeric votes means no average to report.
    await expect(council.host.room.consensusCard).not.toContainText('Avg:')
  })

  test('one dissenter breaks the consensus', async ({ makeCouncil }) => {
    const council = await makeCouncil({ hostName: 'Gandalf' })
    const legolas = await council.invite('Legolas')
    const gimli = await council.invite('Gimli')

    await council.host.room.open()
    await legolas.room.open()
    await gimli.room.open()

    await council.host.room.startRound('Almost agreed')
    await legolas.room.sync()
    await gimli.room.sync()

    await council.host.room.vote('5')
    await legolas.room.vote('5')
    await gimli.room.vote('3')

    await council.host.room.sync()
    await council.host.room.reveal()

    await expect(council.host.room.consensusCard).toBeHidden()
    await expect(council.host.room.revealedCard).toBeVisible()
    // 5, 5, 3 → mode 5, average 4.33
    await expect(council.host.room.revealedCard).toContainText('Mode: 5')
  })
})

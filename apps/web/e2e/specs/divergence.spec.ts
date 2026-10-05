import { test, expect } from '../fixtures/test'

/**
 * On Fibonacci the numeric positions are 0,1,2,3,5,8,13,21 — so 1 and 13 sit
 * five positions apart, comfortably past the divergence threshold of 3, while
 * 3 and 5 sit one apart.
 */
test.describe('Divergence', () => {
  test('a wide spread summons the Eye', async ({ makeCouncil }) => {
    const council = await makeCouncil({ hostName: 'Gandalf' })
    const legolas = await council.invite('Legolas')

    await council.host.room.open()
    await legolas.room.open()

    await council.host.room.startRound('A house divided')
    await legolas.room.sync()

    await council.host.room.vote('1')
    await legolas.room.vote('13')

    await council.host.room.sync()
    await council.host.room.reveal()

    await expect(council.host.room.revealedCard).toHaveAttribute('data-diverged', 'true')
    await expect(council.host.room.sauronEye).toBeVisible()
    // The stats banner names the two extremes.
    await expect(council.host.room.revealedCard).toContainText('1 – 13')

    await legolas.room.sync()
    await expect(legolas.room.sauronEye).toBeVisible()
  })

  test('neighbouring estimates keep the Eye closed', async ({ makeCouncil }) => {
    const council = await makeCouncil({ hostName: 'Gandalf' })
    const legolas = await council.invite('Legolas')

    await council.host.room.open()
    await legolas.room.open()

    await council.host.room.startRound('Near enough')
    await legolas.room.sync()

    await council.host.room.vote('3')
    await legolas.room.vote('5')

    await council.host.room.sync()
    await council.host.room.reveal()

    await expect(council.host.room.revealedCard).toHaveAttribute('data-diverged', 'false')
    await expect(council.host.room.sauronEye).toBeHidden()
  })

  test('an abstention withholds the Eye even when the numbers diverge', async ({ makeCouncil }) => {
    // The spread only describes the members who committed to a number, so a
    // round containing '?' is incomplete rather than divided.
    const council = await makeCouncil({ hostName: 'Gandalf' })
    const legolas = await council.invite('Legolas')
    const gimli = await council.invite('Gimli')

    await council.host.room.open()
    await legolas.room.open()
    await gimli.room.open()

    await council.host.room.startRound('One of us is unsure')
    await legolas.room.sync()
    await gimli.room.sync()

    await council.host.room.vote('1')
    await legolas.room.vote('13')
    await gimli.room.vote('?')

    await council.host.room.sync()
    await council.host.room.reveal()

    // Still diverged in the stats...
    await expect(council.host.room.revealedCard).toContainText('1 – 13')
    // ...but the theatrics are withheld.
    await expect(council.host.room.revealedCard).toHaveAttribute('data-diverged', 'false')
    await expect(council.host.room.sauronEye).toBeHidden()
  })

  test('a single numeric vote cannot diverge', async ({ makeCouncil }) => {
    const council = await makeCouncil({ hostName: 'Gandalf' })
    const legolas = await council.invite('Legolas')

    await council.host.room.open()
    await legolas.room.open()

    await council.host.room.startRound('Only one number')
    await legolas.room.sync()

    await council.host.room.vote('21')
    await legolas.room.vote('☕')

    await council.host.room.sync()
    await council.host.room.reveal()

    await expect(council.host.room.revealedCard).toHaveAttribute('data-diverged', 'false')
    await expect(council.host.room.sauronEye).toBeHidden()
  })
})

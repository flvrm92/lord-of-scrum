import { test, expect, playRound } from '../fixtures/test'

test.describe('Chronicles', () => {
  test('a council with no rounds shows the empty archive', async ({ makeCouncil }) => {
    const council = await makeCouncil({ name: 'An Untroubled Council' })
    await council.host.chronicles.open()

    await expect(council.host.chronicles.title).toContainText('An Untroubled Council — Chronicles')
    await expect(council.host.chronicles.empty).toBeVisible()
    await expect(council.host.chronicles.rounds()).toHaveCount(0)
  })

  test('aggregates and per-round history across a whole council', async ({ api, makeCouncil }) => {
    const council = await makeCouncil({ name: 'The Long Council', hostName: 'Gandalf' })
    const { participant: legolas } = await api.joinSession(council.session.inviteCode, 'Legolas')
    const host = council.host.participant

    // One unanimous, one diverged, one still open.
    await playRound(api, council.session, [
      { participant: host, value: '5' },
      { participant: legolas, value: '5' },
    ], 'Agreed quest', host)

    await playRound(api, council.session, [
      { participant: host, value: '1' },
      { participant: legolas, value: '13' },
    ], 'Divided quest', host)

    await playRound(api, council.session, [
      { participant: host, value: '3' },
    ], 'Unfinished quest', host, { reveal: false })

    await council.host.chronicles.open()

    // Totals count every round; consensus and divergence only revealed ones.
    await expect(council.host.chronicles.totalRounds).toHaveText('3')
    await expect(council.host.chronicles.consensusCount).toHaveText('1')
    await expect(council.host.chronicles.dividedCount).toHaveText('1')

    await expect(council.host.chronicles.rounds()).toHaveCount(3)
    await expect(council.host.chronicles.round('Agreed quest')).toHaveAttribute('data-status', 'REVEALED')
    await expect(council.host.chronicles.round('Unfinished quest')).toHaveAttribute('data-status', 'VOTING')

    // Each revealed round lists who voted what, plus its stats.
    const agreed = council.host.chronicles.round('Agreed quest')
    await expect(agreed).toContainText('5')
    await expect(agreed).toContainText('Gandalf')
    await expect(agreed).toContainText('Legolas')
    await expect(agreed).toContainText('Avg: 5')

    const divided = council.host.chronicles.round('Divided quest')
    await expect(divided).toContainText('1 – 13')
  })

  test('the Steward reaches the chronicles from the council and back', async ({ api, makeCouncil }) => {
    const council = await makeCouncil({ hostName: 'Gandalf' })
    const host = council.host.participant
    await playRound(api, council.session, [{ participant: host, value: '8' }], 'A quest', host)

    await council.host.room.open()
    await council.host.room.viewChroniclesLink.click()

    await expect(council.host.chronicles.root).toBeVisible()
    await expect(council.host.chronicles.totalRounds).toHaveText('1')

    await council.host.chronicles.backToCouncil.click()
    await council.host.room.ready()
    await expect(council.host.room.inviteCode).toHaveText(council.session.inviteCode)
  })

  test('the chronicles of an unknown council report an error', async ({ page }) => {
    await page.goto('/session/ZZZZZZZZ/results')
    await expect(page.getByTestId('chronicles-error')).toHaveText('Session not found')
  })

  test('rounds are listed in the order they were played', async ({ api, makeCouncil }) => {
    const council = await makeCouncil({ hostName: 'Gandalf' })
    const host = council.host.participant

    for (const topic of ['First', 'Second', 'Third']) {
      await playRound(api, council.session, [{ participant: host, value: '5' }], topic, host)
    }

    await council.host.chronicles.open()
    await expect(council.host.chronicles.rounds()).toHaveCount(3)

    const topics = await council.host.chronicles
      .rounds()
      .evaluateAll((els) => els.map((e) => e.getAttribute('data-topic')))
    expect(topics).toEqual(['First', 'Second', 'Third'])
  })
})

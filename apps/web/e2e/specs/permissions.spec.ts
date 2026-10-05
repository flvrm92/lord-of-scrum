import { test, expect } from '../fixtures/test'
import { SessionRoom } from '../pages/session-room'

test.describe('Permissions and error states', () => {
  test('only the Steward gets the round controls', async ({ makeCouncil }) => {
    const council = await makeCouncil({ hostName: 'Gandalf' })
    const legolas = await council.invite('Legolas')

    await council.host.room.open()
    await legolas.room.open()

    await expect(council.host.room.roundControls).toBeVisible()
    await expect(council.host.room.viewChroniclesLink).toBeVisible()

    await expect(legolas.room.roundControls).toBeHidden()
    await expect(legolas.room.startRoundButton).toBeHidden()
    await expect(legolas.room.revealButton).toBeHidden()

    // Mid-round the guest still gets no reveal control.
    await council.host.room.startRound('Steward only')
    await legolas.room.sync()
    await expect(legolas.room.votingArea).toBeVisible()
    await expect(legolas.room.revealButton).toBeHidden()
    await expect(legolas.room.resetButton).toBeHidden()
  })

  test('an unknown invite code shows the dispersed-council page', async ({ page }) => {
    const room = new SessionRoom(page, 'ZZZZZZZZ')
    await room.goto()

    await expect(room.errorState).toBeVisible()
    await expect(room.errorState).toContainText('This path leads nowhere')
    await expect(room.errorState.getByRole('link', { name: 'Return to the Shire' })).toBeVisible()
  })

  test('round actions are refused for non-hosts', async ({ api, makeCouncil }) => {
    const council = await makeCouncil({ hostName: 'Gandalf' })
    const { participant: legolas } = await api.joinSession(council.session.inviteCode, 'Legolas')
    const request = api.raw()

    const start = await request.post(`/api/sessions/${council.session.id}/rounds`, {
      data: { topic: 'Usurped', participantId: legolas.id },
    })
    expect(start.status()).toBe(403)
    expect((await start.json()).error.code).toBe('NOT_HOST')

    const round = await council.startRound('Legitimate')

    const reveal = await request.post(
      `/api/sessions/${council.session.id}/rounds/${round.id}/reveal`,
      { data: { participantId: legolas.id } },
    )
    expect(reveal.status()).toBe(403)

    const reset = await request.post(
      `/api/sessions/${council.session.id}/rounds/${round.id}/reset`,
      { data: { participantId: legolas.id } },
    )
    expect(reset.status()).toBe(403)
  })

  test('an archived council refuses new members', async ({ api, makeCouncil }) => {
    const council = await makeCouncil({ hostName: 'Gandalf' })

    const archive = await api.raw().post(`/api/sessions/${council.session.id}/archive`, {
      data: { participantId: council.host.participant.id },
    })
    expect(archive.ok()).toBe(true)

    const join = await api.raw().post(`/api/sessions/join/${council.session.inviteCode}`, {
      data: { displayName: 'Latecomer' },
    })
    expect(join.status()).toBe(409)
    expect((await join.json()).error.code).toBe('SESSION_NOT_ACTIVE')
  })

  test('a blank display name is refused', async ({ api, makeCouncil }) => {
    const council = await makeCouncil({ hostName: 'Gandalf' })

    const res = await api.raw().post(`/api/sessions/join/${council.session.inviteCode}`, {
      data: { displayName: '   ' },
    })
    expect(res.status()).toBeGreaterThanOrEqual(400)
  })

  test('the health endpoint reports a reachable database', async ({ api }) => {
    const res = await api.raw().get('/api/health')
    expect(res.ok()).toBe(true)
    expect((await res.json()).status).toBe('healthy')
  })

  test('the cron endpoint refuses an unauthorised caller', async ({ api }) => {
    const res = await api.raw().get('/api/cron')
    expect(res.status()).toBe(401)
  })

  test('rerolling a title requires a signed-in user', async ({ api }) => {
    const res = await api.raw().post('/api/users/me/reroll-title')
    expect(res.status()).toBe(401)
  })
})

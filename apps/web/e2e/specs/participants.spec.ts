import { test, expect } from '../fixtures/test'

test.describe('The Fellowship', () => {
  test('voting status tracks each member through the round', async ({ makeCouncil }) => {
    const council = await makeCouncil({ hostName: 'Gandalf' })
    const legolas = await council.invite('Legolas')

    await council.host.room.open()
    await legolas.room.open()

    // No round yet — no per-member status at all.
    await expect(council.host.room.participantRow('Gandalf')).not.toContainText('Pondering')

    await council.host.room.startRound('Who has spoken?')
    await expect(council.host.room.participantRow('Gandalf')).toContainText('Pondering')
    await expect(council.host.room.participantRow('Legolas')).toContainText('Pondering')

    await council.host.room.vote('5')
    await expect(council.host.room.participantRow('Gandalf')).toHaveAttribute('data-voted', 'true')
    await expect(council.host.room.participantRow('Gandalf')).toContainText('Scroll cast')
    await expect(council.host.room.participantRow('Legolas')).toHaveAttribute('data-voted', 'false')

    await legolas.room.sync()
    await legolas.room.vote('8')
    await council.host.room.sync()
    await expect(council.host.room.participantRow('Legolas')).toHaveAttribute('data-voted', 'true')
  })

  test('the current member is marked, and the Steward is badged', async ({ makeCouncil }) => {
    const council = await makeCouncil({ hostName: 'Gandalf' })
    const legolas = await council.invite('Legolas')

    await council.host.room.open()
    await legolas.room.open()

    await council.host.room.sync()
    await expect(council.host.room.participantRow('Gandalf')).toContainText('(you)')
    await expect(council.host.room.participantRow('Gandalf')).toContainText('Steward')
    await expect(council.host.room.participantRow('Legolas')).not.toContainText('(you)')

    await expect(legolas.room.participantRow('Legolas')).toContainText('(you)')
    await expect(legolas.room.participantRow('Gandalf')).toContainText('Steward')
  })

  test('the Steward dismisses a member, who is then locked out', async ({ makeCouncil }) => {
    const council = await makeCouncil({ hostName: 'Gandalf' })
    const legolas = await council.invite('Legolas')

    await council.host.room.open()
    await legolas.room.open()
    await council.host.room.sync()

    // Removal is a soft delete: the row stays but goes inactive.
    await council.host.room.removeParticipant('Legolas')
    await expect(council.host.room.participantRow('Legolas')).toHaveAttribute('data-active', 'false')

    // Not sync() — a dismissed player gets the terminal screen, not the room.
    await legolas.room.reload()
    await expect(legolas.room.dismissedState).toBeVisible()
    await expect(legolas.room.dismissedState).toContainText('You have been dismissed from this council')
    await expect(legolas.room.root).toBeHidden()
  })

  test('cancelling the confirm dialog keeps the member', async ({ makeCouncil }) => {
    const council = await makeCouncil({ hostName: 'Gandalf' })
    await council.invite('Legolas')

    await council.host.room.open()
    await council.host.room.sync()

    council.host.page.once('dialog', (dialog) => dialog.dismiss())
    await council.host.room.participantRow('Legolas').getByTestId('participant-action').click()

    await expect(council.host.room.participantRow('Legolas')).toHaveAttribute('data-active', 'true')
  })

  test('a member can leave of their own accord', async ({ makeCouncil }) => {
    const council = await makeCouncil({ hostName: 'Gandalf' })
    const gimli = await council.invite('Gimli')

    await gimli.room.open()
    // A non-host sees "Leave" on their own row and no control on anyone else's.
    await expect(gimli.room.participantRow('Gimli').getByTestId('participant-action')).toHaveText('Leave')
    await expect(gimli.room.participantRow('Gandalf').getByTestId('participant-action')).toHaveCount(0)

    await gimli.room.leave()
    await expect(gimli.room.dismissedState).toBeVisible()
  })

  test('the Steward has no control to remove themself', async ({ makeCouncil }) => {
    const council = await makeCouncil({ hostName: 'Gandalf' })
    await council.invite('Legolas')
    await council.host.room.open()
    await council.host.room.sync()

    await expect(
      council.host.room.participantRow('Gandalf').getByTestId('participant-action'),
    ).toHaveCount(0)
    await expect(
      council.host.room.participantRow('Legolas').getByTestId('participant-action'),
    ).toHaveText('✕')
  })

  test('the removal API enforces who may remove whom', async ({ api, makeCouncil }) => {
    const council = await makeCouncil({ hostName: 'Gandalf' })
    const { participant: legolas } = await api.joinSession(council.session.inviteCode, 'Legolas')
    const { participant: gimli } = await api.joinSession(council.session.inviteCode, 'Gimli')
    const base = `/api/sessions/${council.session.id}/participants`

    // A host cannot remove themself.
    const selfRemove = await api.raw().delete(`${base}/${council.host.participant.id}`, {
      data: { requesterId: council.host.participant.id },
    })
    expect(selfRemove.status()).toBe(409)
    expect((await selfRemove.json()).error.code).toBe('CANNOT_REMOVE_SELF_AS_HOST')

    // A non-host cannot remove anyone else.
    const peerRemove = await api.raw().delete(`${base}/${gimli.id}`, {
      data: { requesterId: legolas.id },
    })
    expect(peerRemove.status()).toBe(403)

    // But may remove themself.
    const selfLeave = await api.raw().delete(`${base}/${legolas.id}`, {
      data: { requesterId: legolas.id },
    })
    expect(selfLeave.ok()).toBe(true)
  })
})

import { test, expect } from '../fixtures/test'
import { HomePage } from '../pages/home'
import { SessionRoom } from '../pages/session-room'

/** The generator deliberately drops look-alike characters (0/O, 1/I). */
const INVITE_CODE = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/

test.describe('Create and join a council', () => {
  test('a facilitator creates a council and lands in the room as Steward', async ({ page }) => {
    const home = new HomePage(page)
    await home.goto()
    await home.create({ name: 'The Council of Sprint 42', hostName: 'Gandalf' })

    await page.waitForURL(/\/session\/[A-Z0-9]{8}$/)
    const room = new SessionRoom(page, '')
    await room.ready()

    await expect(room.sessionName).toHaveText('The Council of Sprint 42')
    await expect(room.currentPlayer).toHaveText('Gandalf')
    await expect(room.hostBadge).toBeVisible()
    await expect(room.inviteCode).toHaveText(INVITE_CODE)

    // The host gets the Steward's controls; the round has not begun yet.
    await expect(room.roundControls).toBeVisible()
    await expect(room.emptyRound).toBeVisible()

    // And is already the sole member of the fellowship.
    await expect(room.participantRows()).toHaveCount(1)
    await expect(room.participantRow('Gandalf')).toHaveAttribute('data-host', 'true')
  })

  test('a second traveller joins with the seal and both see the fellowship', async ({
    page,
    makeCouncil,
  }) => {
    const council = await makeCouncil({ hostName: 'Gandalf' })
    await council.host.room.open()

    const home = new HomePage(page)
    await home.goto()
    await home.join({ inviteCode: council.session.inviteCode, displayName: 'Legolas' })

    await page.waitForURL(`/session/${council.session.inviteCode}`)
    const guestRoom = new SessionRoom(page, council.session.inviteCode)
    await guestRoom.ready()

    // The guest sees themself, and no Steward controls.
    await expect(guestRoom.currentPlayer).toHaveText('Legolas')
    await expect(guestRoom.hostBadge).toBeHidden()
    await expect(guestRoom.roundControls).toBeHidden()
    await expect(guestRoom.participantRows()).toHaveCount(2)

    // The host sees the newcomer once their page picks up the change.
    await council.host.room.sync()
    await expect(council.host.room.participantRow('Legolas')).toBeVisible()
    await expect(council.host.room.participantRow('Legolas')).toHaveAttribute('data-host', 'false')
    await expect(council.host.room.participantList).toContainText('The Fellowship (2)')
  })

  test('a lowercase seal still works', async ({ page, makeCouncil }) => {
    const council = await makeCouncil()

    const home = new HomePage(page)
    await home.goto()
    await home.tabJoin.click()
    // Typing lowercase is upper-cased on the way in.
    await home.inviteCode.fill(council.session.inviteCode.toLowerCase())
    await home.joinName.fill('Gimli')
    await home.submitJoin.click()

    await page.waitForURL(`/session/${council.session.inviteCode}`)
    await expect(page.getByTestId('current-player')).toHaveText('Gimli')
  })

  test('an unknown seal is rejected', async ({ page }) => {
    const home = new HomePage(page)
    await home.goto()
    await home.join({ inviteCode: 'ZZZZZZZZ', displayName: 'Wanderer' })

    await expect(home.error).toBeVisible()
    await expect(page).toHaveURL('/')
  })

  test('a duplicate display name is rejected', async ({ page, makeCouncil }) => {
    const council = await makeCouncil({ hostName: 'Gandalf' })

    const home = new HomePage(page)
    await home.goto()
    await home.join({ inviteCode: council.session.inviteCode, displayName: 'Gandalf' })

    await expect(home.error).toBeVisible()
    await expect(page).toHaveURL('/')
  })

  test('the join API returns the documented error envelopes', async ({ api, makeCouncil }) => {
    const council = await makeCouncil({ hostName: 'Gandalf' })
    const request = api.raw()

    const unknown = await request.post('/api/sessions/join/ZZZZZZZZ', {
      data: { displayName: 'Wanderer' },
    })
    expect(unknown.status()).toBe(404)
    expect((await unknown.json()).error.code).toBe('SESSION_NOT_FOUND')

    const duplicate = await request.post(`/api/sessions/join/${council.session.inviteCode}`, {
      data: { displayName: 'Gandalf' },
    })
    expect(duplicate.status()).toBe(409)
    expect((await duplicate.json()).error.code).toBe('DUPLICATE_DISPLAY_NAME')
  })

  test('a council link opens a prefilled join form and leads into the room', async ({
    page,
    makeCouncil,
  }) => {
    const council = await makeCouncil({ hostName: 'Gandalf' })
    await council.host.room.open()

    // No localStorage identity for this session in a fresh page context — this
    // is the traveller who was handed the link in chat.
    const room = new SessionRoom(page, council.session.inviteCode)
    await room.goto()

    const home = new HomePage(page)
    await expect(home.joinForm).toBeVisible()
    expect(await home.activeTab()).toBe('join')
    await expect(home.inviteCode).toHaveValue(council.session.inviteCode)
    await expect(home.joinName).toBeFocused()
    await expect(room.errorState).toBeHidden()

    // One field away: type a name and submit.
    await home.joinName.fill('Legolas')
    await home.submitJoin.click()

    await page.waitForURL(`/session/${council.session.inviteCode}`)
    const guestRoom = new SessionRoom(page, council.session.inviteCode)
    await guestRoom.ready()
    await expect(guestRoom.currentPlayer).toHaveText('Legolas')

    // And the newcomer is tracked like any other joiner.
    await council.host.room.sync()
    await expect(council.host.room.participantRow('Legolas')).toBeVisible()
    await expect(council.host.room.participantList).toContainText('The Fellowship (2)')
  })

  test('a lower-cased council link still resolves', async ({ page, makeCouncil }) => {
    const council = await makeCouncil({ hostName: 'Gandalf' })

    // Chat clients and mail readers lower-case URLs. The seal lookup is an
    // exact match on upper-case codes, so the room page has to normalise or a
    // mangled link dead-ends on a council that is alive.
    const room = new SessionRoom(page, council.session.inviteCode.toLowerCase())
    await room.goto()

    const home = new HomePage(page)
    await expect(home.joinForm).toBeVisible()
    await expect(home.inviteCode).toHaveValue(council.session.inviteCode)
    await expect(room.errorState).toBeHidden()
  })

  test('pressing Back after the redirect does not re-enter it', async ({ page, makeCouncil }) => {
    const council = await makeCouncil()

    const home = new HomePage(page)
    await home.goto()

    const room = new SessionRoom(page, council.session.inviteCode)
    await room.goto()
    await expect(home.joinForm).toBeVisible()

    // The redirect replaces rather than pushes, so Back reaches what preceded
    // the link instead of bouncing through the room again.
    await page.goBack()
    await expect(page).toHaveURL('/')
    expect(await home.activeTab()).toBe('create')
  })

  test('a traveller who already joined goes straight into the room', async ({ makeCouncil }) => {
    const council = await makeCouncil({ hostName: 'Gandalf' })
    const legolas = await council.invite('Legolas')

    // Their context carries an identity, so the link must not detour.
    await legolas.room.goto()
    await legolas.room.ready()

    await expect(legolas.room.currentPlayer).toHaveText('Legolas')
    await expect(legolas.page).toHaveURL(`/session/${council.session.inviteCode}`)
  })

  test('a link with an unknown seal shows the error state and does not redirect', async ({
    page,
  }) => {
    const room = new SessionRoom(page, 'ZZZZZZZZ')
    await room.goto()

    await expect(room.errorState).toBeVisible()
    await expect(room.errorState).toHaveAttribute('data-reason', 'missing')
    await expect(room.root).toBeHidden()
    await expect(page).toHaveURL('/session/ZZZZZZZZ')
  })

  test('a dismissed traveller opening the link still sees the dismissal notice', async ({
    makeCouncil,
  }) => {
    const council = await makeCouncil({ hostName: 'Gandalf' })
    const legolas = await council.invite('Legolas')

    await council.host.room.open()
    await council.host.room.sync()
    await council.host.room.removeParticipant('Legolas')

    // Opening the link afresh must not funnel them back into re-joining.
    await legolas.room.goto()
    await expect(legolas.room.dismissedState).toBeVisible()
    await expect(legolas.room.root).toBeHidden()
  })

  test('a link to an archived council tells a newcomer it has adjourned', async ({
    page,
    api,
    makeCouncil,
  }) => {
    const council = await makeCouncil({ hostName: 'Gandalf' })
    const archive = await api.raw().post(`/api/sessions/${council.session.id}/archive`, {
      data: { participantId: council.host.participant.id },
    })
    expect(archive.ok()).toBe(true)

    const room = new SessionRoom(page, council.session.inviteCode)
    await room.goto()

    // Closed is not the same as never existed, and neither is a prefilled form
    // whose submit the server would refuse.
    await expect(room.errorState).toBeVisible()
    await expect(room.errorState).toHaveAttribute('data-reason', 'inactive')
    await expect(page).toHaveURL(`/session/${council.session.inviteCode}`)
  })

  test('a member of an archived council still gets the room', async ({ api, makeCouncil }) => {
    const council = await makeCouncil({ hostName: 'Gandalf' })
    const archive = await api.raw().post(`/api/sessions/${council.session.id}/archive`, {
      data: { participantId: council.host.participant.id },
    })
    expect(archive.ok()).toBe(true)

    // The status gate blocks the redirect, not the room: access that worked
    // before this change keeps working.
    await council.host.room.goto()
    await council.host.room.ready()
    await expect(council.host.room.currentPlayer).toHaveText('Gandalf')
  })
})

import { test, expect } from '../fixtures/test'
import type { Page } from '@playwright/test'
import type { Player } from '../fixtures/council'

/**
 * The rest of the suite is deliberately realtime-independent: every
 * cross-player assertion reloads rather than waiting for a push, so it passes
 * with or without Ably.
 *
 * These tests are the exception — they assert the push itself, and so only run
 * in the `realtime` project, which the config registers only when
 * ABLY_API_KEY is set (`/api/ably` returns 503 without one).
 */

/** Ably protocol action for ATTACHED. */
const ATTACHED = 11

/**
 * Records which Ably channels a page has finished attaching to, by reading the
 * realtime protocol frames off the websocket.
 *
 * Attaching costs a token fetch plus a WS handshake — around a second. Ably
 * does not replay messages published before a channel attaches, so a test that
 * acts the instant the room renders will miss its own event. Waiting on a real
 * ATTACHED frame removes that race without a blind sleep.
 *
 * Must be called before the page navigates.
 */
function trackAttachedChannels(page: Page): Set<string> {
  const attached = new Set<string>()
  page.on('websocket', (ws) => {
    ws.on('framereceived', (frame) => {
      if (typeof frame.payload !== 'string') return
      try {
        const msg = JSON.parse(frame.payload)
        if (msg?.action === ATTACHED && typeof msg.channel === 'string') {
          attached.add(msg.channel)
        }
      } catch {
        // Not a JSON protocol frame — ignore.
      }
    })
  })
  return attached
}

/** Open a player's room and wait until it is genuinely subscribed. */
async function openSubscribed(player: Player, sessionId: string): Promise<void> {
  const attached = trackAttachedChannels(player.page)
  await player.room.open()
  await expect
    .poll(() => attached.has(`session:${sessionId}`), {
      timeout: 20_000,
      message: `${player.name} never attached to session:${sessionId}`,
    })
    .toBe(true)
}

test.describe('Realtime propagation @realtime', () => {
  test('the token endpoint issues a subscribe capability', async ({ api }) => {
    const res = await api.raw().get('/api/ably')
    expect(res.ok()).toBe(true)
    const token = await res.json()
    expect(token).toHaveProperty('capability')
    expect(JSON.stringify(token.capability)).toContain('subscribe')
  })

  test('a guest sees a new round without reloading', async ({ makeCouncil }) => {
    const council = await makeCouncil({ hostName: 'Gandalf' })
    const legolas = await council.invite('Legolas')

    await council.host.room.open()
    await openSubscribed(legolas, council.session.id)
    await expect(legolas.room.emptyRound).toBeVisible()

    await council.host.room.startRound('Pushed to the fellowship')

    // No sync() — this must arrive over the wire.
    await expect(legolas.room.roundTopic).toHaveText('Pushed to the fellowship')
    await expect(legolas.room.votingArea).toBeVisible()
  })

  test('a reveal reaches every member without reloading', async ({ makeCouncil }) => {
    const council = await makeCouncil({ hostName: 'Gandalf' })
    const legolas = await council.invite('Legolas')

    await openSubscribed(council.host, council.session.id)
    await openSubscribed(legolas, council.session.id)

    await council.host.room.startRound('Revealed live')
    await expect(legolas.room.votingArea).toBeVisible()

    await council.host.room.vote('8')
    await legolas.room.vote('8')

    // The host learns of the guest's vote over the wire.
    await expect(council.host.room.votesCastLabel).toHaveText('2 of 2 scrolls cast')

    await council.host.room.reveal()

    await expect(legolas.room.consensusCard).toBeVisible()
    await expect(legolas.room.consensusValue).toHaveText('8')
  })

  test('a dismissal reaches the dismissed member without reloading', async ({ makeCouncil }) => {
    const council = await makeCouncil({ hostName: 'Gandalf' })
    const legolas = await council.invite('Legolas')

    await openSubscribed(council.host, council.session.id)
    await openSubscribed(legolas, council.session.id)
    await expect(council.host.room.participantRow('Legolas')).toBeVisible()

    await council.host.room.removeParticipant('Legolas')

    await expect(legolas.room.dismissedState).toBeVisible()
  })
})

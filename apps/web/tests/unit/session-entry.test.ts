import { describe, it, expect } from 'vitest'
import { resolveSessionEntry, type SessionFetch } from '@/lib/session-entry'
import type { ParticipantDto, SessionDto } from '@/application/dtos'

const participant = (over: Partial<ParticipantDto> = {}): ParticipantDto => ({
  id: 'p1',
  displayName: 'Legolas',
  isHost: false,
  isActive: true,
  lotrTitle: null,
  ...over,
})

const session = (over: Partial<SessionDto> = {}): SessionDto => ({
  id: 's1',
  name: 'The Council of Sprint 42',
  inviteCode: 'ABCD2345',
  status: 'ACTIVE',
  scale: { id: 'sc1', name: 'Fibonacci', values: [] },
  participants: [participant()],
  currentRound: null,
  createdAt: '2026-10-02T00:00:00.000Z',
  ...over,
})

const found = (over: Partial<SessionDto> = {}): SessionFetch => ({ ok: true, session: session(over) })

describe('resolveSessionEntry', () => {
  it('enters the room when the stored identity is in the council and active', () => {
    const entry = resolveSessionEntry(found(), { id: 'p1' })

    expect(entry).toEqual({ kind: 'enter', participant: participant() })
  })

  it('requires a join when the council exists but there is no stored identity', () => {
    const entry = resolveSessionEntry(found(), null)

    expect(entry).toEqual({ kind: 'join-required' })
  })

  it('reports dismissal when the stored identity is in the council but inactive', () => {
    const inactive = participant({ isActive: false })
    const entry = resolveSessionEntry(found({ participants: [inactive] }), { id: 'p1' })

    expect(entry).toEqual({ kind: 'dismissed', participant: inactive })
  })

  it('requires a join when the stored id is no longer among the participants', () => {
    // A stale identity, or one belonging to another council. Dismissal is a soft
    // deactivate, so a dismissed participant is still listed — an absent id is
    // never a dismissal, and must not become an error either.
    const entry = resolveSessionEntry(found(), { id: 'someone-else' })

    expect(entry).toEqual({ kind: 'join-required' })
  })

  it('reports the council missing when the lookup found nothing', () => {
    const entry = resolveSessionEntry({ ok: false, reason: 'missing' }, { id: 'p1' })

    expect(entry).toEqual({ kind: 'not-found', reason: 'missing' })
  })

  it('reports the council unreachable when the lookup itself failed', () => {
    const entry = resolveSessionEntry({ ok: false, reason: 'unreachable' }, null)

    expect(entry).toEqual({ kind: 'not-found', reason: 'unreachable' })
  })

  it('reports an archived council as inactive to a visitor with no identity', () => {
    const entry = resolveSessionEntry(found({ status: 'ARCHIVED' }), null)

    expect(entry).toEqual({ kind: 'not-found', reason: 'inactive' })
  })

  it('still enters the room for a member of a council that has been archived', () => {
    // The status gate blocks the redirect, not the room: a member who can reach
    // this council today keeps reaching it.
    const entry = resolveSessionEntry(found({ status: 'ARCHIVED' }), { id: 'p1' })

    expect(entry).toEqual({ kind: 'enter', participant: participant() })
  })

  it('still reports dismissal in a council that has been archived', () => {
    const inactive = participant({ isActive: false })
    const entry = resolveSessionEntry(
      found({ status: 'ARCHIVED', participants: [inactive] }),
      { id: 'p1' },
    )

    expect(entry).toEqual({ kind: 'dismissed', participant: inactive })
  })

  it('picks the stored identity out of a council with several members', () => {
    const gandalf = participant({ id: 'p0', displayName: 'Gandalf', isHost: true })
    const gimli = participant({ id: 'p2', displayName: 'Gimli' })
    const entry = resolveSessionEntry(
      found({ participants: [gandalf, participant(), gimli] }),
      { id: 'p2' },
    )

    expect(entry).toEqual({ kind: 'enter', participant: gimli })
  })
})

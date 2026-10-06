import { describe, it, expect, vi } from 'vitest'
import { removeParticipant, getSession, submitVote } from '@/application/use-cases'
import type { UseCaseDeps } from '@/application/use-cases'
import {
  CannotRemoveSelfAsHostError,
  NotHostError,
  ParticipantNotFoundError,
  NotParticipantError,
  ParticipantRemovedError,
} from '@/domain/errors'

// Helpers
const host = { id: 'host-1', sessionId: 's1', displayName: 'Gandalf', isActive: true, lotrTitle: null, userId: null, createdAt: new Date() }
const member = { id: 'member-1', sessionId: 's1', displayName: 'Frodo', isActive: true, lotrTitle: null, userId: null, createdAt: new Date() }
const member2 = { id: 'member-2', sessionId: 's1', displayName: 'Sam', isActive: true, lotrTitle: null, userId: null, createdAt: new Date() }

const votingRound = { id: 'r2', sessionId: 's1', topic: 'Now', orderIndex: 1, status: 'VOTING', revealedAt: null, createdAt: new Date() }
const revealedRound = { id: 'r1', sessionId: 's1', topic: 'Before', orderIndex: 0, status: 'REVEALED', revealedAt: new Date(), createdAt: new Date() }

function makeDeps(participants = [host, member, member2], rounds: unknown[] = []): UseCaseDeps {
  return {
    sessionRepo: {} as UseCaseDeps['sessionRepo'],
    participantRepo: {
      findBySessionId: vi.fn().mockResolvedValue(participants),
      updateActive: vi.fn().mockResolvedValue({ ...member, isActive: false }),
    } as unknown as UseCaseDeps['participantRepo'],
    roundRepo: {
      findBySessionId: vi.fn().mockResolvedValue(rounds),
    } as unknown as UseCaseDeps['roundRepo'],
    voteRepo: {
      deleteByParticipant: vi.fn().mockResolvedValue(undefined),
    } as unknown as UseCaseDeps['voteRepo'],
    scaleRepo: {} as UseCaseDeps['scaleRepo'],
    eventPublisher: {
      participantLeft: vi.fn().mockResolvedValue(undefined),
    } as unknown as UseCaseDeps['eventPublisher'],
    userRepo: {} as UseCaseDeps['userRepo'],
  }
}

describe('removeParticipant', () => {
  it('host can remove a non-host participant', async () => {
    const deps = makeDeps()
    await removeParticipant(deps, { sessionId: 's1', participantId: 'member-1', requesterId: 'host-1' })
    expect(deps.participantRepo.updateActive).toHaveBeenCalledWith('member-1', false)
    expect(deps.eventPublisher.participantLeft).toHaveBeenCalledWith('s1', 'member-1')
  })

  it('participant can remove themselves (leave)', async () => {
    const deps = makeDeps()
    await removeParticipant(deps, { sessionId: 's1', participantId: 'member-1', requesterId: 'member-1' })
    expect(deps.participantRepo.updateActive).toHaveBeenCalledWith('member-1', false)
    expect(deps.eventPublisher.participantLeft).toHaveBeenCalledWith('s1', 'member-1')
  })

  it('host cannot remove themselves', async () => {
    const deps = makeDeps()
    await expect(
      removeParticipant(deps, { sessionId: 's1', participantId: 'host-1', requesterId: 'host-1' })
    ).rejects.toThrow(CannotRemoveSelfAsHostError)
    expect(deps.participantRepo.updateActive).not.toHaveBeenCalled()
  })

  it('non-host cannot remove other participants', async () => {
    const deps = makeDeps()
    await expect(
      removeParticipant(deps, { sessionId: 's1', participantId: 'member-2', requesterId: 'member-1' })
    ).rejects.toThrow(NotHostError)
    expect(deps.participantRepo.updateActive).not.toHaveBeenCalled()
  })

  it('throws ParticipantNotFoundError when target does not exist', async () => {
    const deps = makeDeps()
    await expect(
      removeParticipant(deps, { sessionId: 's1', participantId: 'ghost', requesterId: 'host-1' })
    ).rejects.toThrow(ParticipantNotFoundError)
  })

  it('throws NotParticipantError when requester is not in the session', async () => {
    const deps = makeDeps()
    await expect(
      removeParticipant(deps, { sessionId: 's1', participantId: 'member-1', requesterId: 'outsider' })
    ).rejects.toThrow(NotParticipantError)
  })

  it('publishes participantLeft event on successful removal', async () => {
    const deps = makeDeps()
    await removeParticipant(deps, { sessionId: 's1', participantId: 'member-1', requesterId: 'host-1' })
    expect(deps.eventPublisher.participantLeft).toHaveBeenCalledOnce()
    expect(deps.eventPublisher.participantLeft).toHaveBeenCalledWith('s1', 'member-1')
  })

  // A vote left behind keeps the member in the round they were removed from:
  // it counts towards "scrolls cast", flips a card on reveal, and feeds the
  // divergence. These two tests pin which rounds get cleared.
  it('discards the removed member votes in rounds still open', async () => {
    const deps = makeDeps(undefined, [revealedRound, votingRound])
    await removeParticipant(deps, { sessionId: 's1', participantId: 'member-1', requesterId: 'host-1' })
    expect(deps.voteRepo.deleteByParticipant).toHaveBeenCalledWith('member-1', ['r2'])
  })

  it('leaves votes in already revealed rounds as the record of that round', async () => {
    const deps = makeDeps(undefined, [revealedRound])
    await removeParticipant(deps, { sessionId: 's1', participantId: 'member-1', requesterId: 'host-1' })
    expect(deps.voteRepo.deleteByParticipant).not.toHaveBeenCalled()
  })

  it('does not touch votes when the removal is refused', async () => {
    const deps = makeDeps(undefined, [votingRound])
    await expect(
      removeParticipant(deps, { sessionId: 's1', participantId: 'host-1', requesterId: 'host-1' })
    ).rejects.toThrow(CannotRemoveSelfAsHostError)
    expect(deps.voteRepo.deleteByParticipant).not.toHaveBeenCalled()
  })
})

// ---------- The council a removed member is no longer part of ----------

const dismissed = { ...member, isActive: false }

const scale = {
  id: 'sc1',
  name: 'Fibonacci',
  values: [{ id: 'v1', scaleId: 'sc1', label: '5', numericValue: 5, sortOrder: 0 }],
}

function makeViewDeps(participants: typeof host[]): UseCaseDeps {
  return {
    sessionRepo: {
      findById: vi.fn().mockResolvedValue({
        id: 's1',
        name: 'The Council',
        inviteCode: 'ABCD2345',
        status: 'ACTIVE',
        facilitatorId: null,
        scaleId: 'sc1',
        archivedAt: null,
        createdAt: new Date('2026-10-02T00:00:00.000Z'),
        updatedAt: new Date('2026-10-02T00:00:00.000Z'),
        scale,
      }),
    } as unknown as UseCaseDeps['sessionRepo'],
    participantRepo: {
      findBySessionId: vi.fn().mockResolvedValue(participants),
    } as unknown as UseCaseDeps['participantRepo'],
    roundRepo: {
      findBySessionId: vi.fn().mockResolvedValue([]),
    } as unknown as UseCaseDeps['roundRepo'],
    voteRepo: {} as UseCaseDeps['voteRepo'],
    scaleRepo: {} as UseCaseDeps['scaleRepo'],
    eventPublisher: {} as UseCaseDeps['eventPublisher'],
    userRepo: {} as UseCaseDeps['userRepo'],
  }
}

describe('the council seen after a removal', () => {
  it('drops the removed member from the Fellowship everyone else sees', async () => {
    const deps = makeViewDeps([host, dismissed, member2])
    const session = await getSession(deps, 's1', 'host-1')

    expect(session.participants.map((p) => p.id)).toEqual(['host-1', 'member-2'])
  })

  it('drops them for a viewer with no identity at all', async () => {
    const deps = makeViewDeps([host, dismissed, member2])
    const session = await getSession(deps, 's1')

    expect(session.participants.map((p) => p.id)).toEqual(['host-1', 'member-2'])
  })

  it('still hands removed members their own record, so the room can say so', async () => {
    // Without this the room cannot tell "you were dismissed" from "you never
    // joined", and would redirect a dismissed member into the join form.
    const deps = makeViewDeps([host, dismissed, member2])
    const session = await getSession(deps, 's1', 'member-1')

    const own = session.participants.find((p) => p.id === 'member-1')
    expect(own?.isActive).toBe(false)
  })

  it('keeps the Steward badge on the host regardless of who was removed', async () => {
    // The host is the first participant ever created, not whoever happens to
    // be first in the filtered list.
    const deps = makeViewDeps([host, dismissed, member2])
    const session = await getSession(deps, 's1', 'member-2')

    expect(session.participants.filter((p) => p.isHost).map((p) => p.id)).toEqual(['host-1'])
  })
})

// ---------- A removed member cannot vote their way back in ----------

function makeVoteDeps(participant: typeof host | typeof dismissed | null): UseCaseDeps {
  return {
    sessionRepo: {
      findById: vi.fn().mockResolvedValue({ id: 's1', scale }),
    } as unknown as UseCaseDeps['sessionRepo'],
    participantRepo: {
      findById: vi.fn().mockResolvedValue(participant),
    } as unknown as UseCaseDeps['participantRepo'],
    roundRepo: {
      findById: vi.fn().mockResolvedValue(votingRound),
    } as unknown as UseCaseDeps['roundRepo'],
    voteRepo: {
      upsert: vi.fn().mockResolvedValue(undefined),
    } as unknown as UseCaseDeps['voteRepo'],
    scaleRepo: {} as UseCaseDeps['scaleRepo'],
    eventPublisher: {
      voteSubmitted: vi.fn().mockResolvedValue(undefined),
    } as unknown as UseCaseDeps['eventPublisher'],
    userRepo: {} as UseCaseDeps['userRepo'],
  }
}

describe('submitVote after a removal', () => {
  it('rejects a vote from a removed member', async () => {
    // Their tab may still be open on the room they were dismissed from.
    const deps = makeVoteDeps(dismissed)
    await expect(
      submitVote(deps, { roundId: 'r2', participantId: 'member-1', value: '5' })
    ).rejects.toThrow(ParticipantRemovedError)
    expect(deps.voteRepo.upsert).not.toHaveBeenCalled()
  })

  it('still accepts a vote from a seated member', async () => {
    const deps = makeVoteDeps(member)
    await submitVote(deps, { roundId: 'r2', participantId: 'member-1', value: '5' })
    expect(deps.voteRepo.upsert).toHaveBeenCalledWith({
      roundId: 'r2',
      participantId: 'member-1',
      value: '5',
    })
  })
})

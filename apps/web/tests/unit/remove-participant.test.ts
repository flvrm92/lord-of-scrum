import { describe, it, expect, vi, beforeEach } from 'vitest'
import { removeParticipant } from '@/application/use-cases'
import type { UseCaseDeps } from '@/application/use-cases'
import {
  CannotRemoveSelfAsHostError,
  NotHostError,
  ParticipantNotFoundError,
  NotParticipantError,
} from '@/domain/errors'

// Helpers
const host = { id: 'host-1', sessionId: 's1', displayName: 'Gandalf', isActive: true, lotrTitle: null, userId: null, createdAt: new Date() }
const member = { id: 'member-1', sessionId: 's1', displayName: 'Frodo', isActive: true, lotrTitle: null, userId: null, createdAt: new Date() }
const member2 = { id: 'member-2', sessionId: 's1', displayName: 'Sam', isActive: true, lotrTitle: null, userId: null, createdAt: new Date() }

function makeDeps(participants = [host, member, member2]): UseCaseDeps {
  return {
    sessionRepo: {} as UseCaseDeps['sessionRepo'],
    participantRepo: {
      findBySessionId: vi.fn().mockResolvedValue(participants),
      updateActive: vi.fn().mockResolvedValue({ ...member, isActive: false }),
    } as unknown as UseCaseDeps['participantRepo'],
    roundRepo: {} as UseCaseDeps['roundRepo'],
    voteRepo: {} as UseCaseDeps['voteRepo'],
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
})

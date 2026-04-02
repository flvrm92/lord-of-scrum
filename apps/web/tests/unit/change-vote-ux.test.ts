import { describe, it, expect, vi } from 'vitest'
import { getSession } from '@/application/use-cases'
import type { UseCaseDeps } from '@/application/use-cases'

// Minimal fixture data
const scaleValues = [
  { id: 'sv1', scaleId: 'sc1', label: '1', numericValue: 1, sortOrder: 0 },
  { id: 'sv2', scaleId: 'sc1', label: '3', numericValue: 3, sortOrder: 1 },
]

const fakeSession = {
  id: 's1',
  name: 'Test Council',
  inviteCode: 'AAAABBBB',
  status: 'ACTIVE' as const,
  facilitatorId: null,
  scaleId: 'sc1',
  archivedAt: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  scale: { id: 'sc1', name: 'Fib', isDefault: true, createdByUserId: null, createdAt: new Date(), values: scaleValues },
}

const participants = [
  { id: 'p1', sessionId: 's1', displayName: 'Gandalf', isActive: true, userId: null, lotrTitle: null, createdAt: new Date() },
  { id: 'p2', sessionId: 's1', displayName: 'Frodo', isActive: true, userId: null, lotrTitle: null, createdAt: new Date() },
]

const votingRound = {
  id: 'r1', sessionId: 's1', topic: 'Story A', status: 'VOTING' as const,
  orderIndex: 0, revealedAt: null, createdAt: new Date(),
}

const votes = [
  { id: 'v1', roundId: 'r1', participantId: 'p1', value: '3', createdAt: new Date() },
  { id: 'v2', roundId: 'r1', participantId: 'p2', value: '1', createdAt: new Date() },
]

function makeDeps(): UseCaseDeps {
  return {
    sessionRepo: {
      findById: vi.fn().mockResolvedValue(fakeSession),
    } as unknown as UseCaseDeps['sessionRepo'],
    participantRepo: {
      findBySessionId: vi.fn().mockResolvedValue(participants),
    } as unknown as UseCaseDeps['participantRepo'],
    roundRepo: {
      findBySessionId: vi.fn().mockResolvedValue([votingRound]),
    } as unknown as UseCaseDeps['roundRepo'],
    voteRepo: {
      findByRoundId: vi.fn().mockResolvedValue(votes),
    } as unknown as UseCaseDeps['voteRepo'],
    scaleRepo: {} as UseCaseDeps['scaleRepo'],
    eventPublisher: {} as UseCaseDeps['eventPublisher'],
    userRepo: {} as UseCaseDeps['userRepo'],
  }
}

describe('getSession — vote visibility during VOTING', () => {
  it('hides all vote values when no currentParticipantId is provided', async () => {
    const dto = await getSession(makeDeps(), 's1')
    const roundVotes = dto.currentRound!.votes
    expect(roundVotes.every((v) => v.value === null)).toBe(true)
  })

  it('reveals own vote value when currentParticipantId is provided', async () => {
    const dto = await getSession(makeDeps(), 's1', 'p1')
    const roundVotes = dto.currentRound!.votes
    const own = roundVotes.find((v) => v.participantId === 'p1')
    const other = roundVotes.find((v) => v.participantId === 'p2')
    expect(own?.value).toBe('3')
    expect(other?.value).toBeNull()
  })

  it("does not reveal the other participant's vote even when currentParticipantId is provided", async () => {
    const dto = await getSession(makeDeps(), 's1', 'p2')
    const roundVotes = dto.currentRound!.votes
    const p1vote = roundVotes.find((v) => v.participantId === 'p1')
    const p2vote = roundVotes.find((v) => v.participantId === 'p2')
    expect(p1vote?.value).toBeNull()
    expect(p2vote?.value).toBe('1')
  })
})

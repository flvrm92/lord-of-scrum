import { describe, it, expect, vi } from 'vitest'
import { computeRoundStatistics } from '@/domain/rules'
import { getSessionSummary } from '@/application/use-cases'
import type { UseCaseDeps } from '@/application/use-cases'
import type { ScaleValue } from '@/domain/entities'

const fibValues: ScaleValue[] = [
  { id: '1', scaleId: 's', label: '1', numericValue: 1, sortOrder: 0 },
  { id: '2', scaleId: 's', label: '2', numericValue: 2, sortOrder: 1 },
  { id: '3', scaleId: 's', label: '3', numericValue: 3, sortOrder: 2 },
  { id: '4', scaleId: 's', label: '5', numericValue: 5, sortOrder: 3 },
  { id: '5', scaleId: 's', label: '8', numericValue: 8, sortOrder: 4 },
  { id: '6', scaleId: 's', label: '13', numericValue: 13, sortOrder: 5 },
  { id: '7', scaleId: 's', label: '?', numericValue: null, sortOrder: 6 },
]

const tshirtValues: ScaleValue[] = [
  { id: 'xs', scaleId: 't', label: 'XS', numericValue: null, sortOrder: 0 },
  { id: 's', scaleId: 't', label: 'S', numericValue: null, sortOrder: 1 },
  { id: 'm', scaleId: 't', label: 'M', numericValue: null, sortOrder: 2 },
  { id: 'l', scaleId: 't', label: 'L', numericValue: null, sortOrder: 3 },
]

describe('computeRoundStatistics', () => {
  it('computes correct average, median, mode for numeric votes', () => {
    const votes = [
      { value: '1' },
      { value: '2' },
      { value: '3' },
      { value: '3' },
    ]
    const stats = computeRoundStatistics(votes, fibValues)
    expect(stats.voteCount).toBe(4)
    expect(stats.average).toBe(2.3)
    expect(stats.median).toBe(2.5)
    expect(stats.mode).toBe('3')
  })

  it('returns null avg/median for non-numeric votes', () => {
    const votes = [{ value: 'XS' }, { value: 'M' }, { value: 'XS' }]
    const stats = computeRoundStatistics(votes, tshirtValues)
    expect(stats.average).toBeNull()
    expect(stats.median).toBeNull()
    expect(stats.mode).toBe('XS')
    expect(stats.voteCount).toBe(3)
  })

  it('handles a single vote', () => {
    const votes = [{ value: '5' }]
    const stats = computeRoundStatistics(votes, fibValues)
    expect(stats.voteCount).toBe(1)
    expect(stats.average).toBe(5)
    expect(stats.median).toBe(5)
    expect(stats.mode).toBe('5')
  })

  it('handles empty votes', () => {
    const stats = computeRoundStatistics([], fibValues)
    expect(stats.voteCount).toBe(0)
    expect(stats.average).toBeNull()
    expect(stats.median).toBeNull()
    expect(stats.mode).toBeNull()
  })

  it('computes correct distribution counts and percentages', () => {
    const votes = [
      { value: '1' },
      { value: '1' },
      { value: '3' },
    ]
    const stats = computeRoundStatistics(votes, fibValues)
    expect(stats.distribution.get('1')).toBe(2)
    expect(stats.distribution.get('3')).toBe(1)
    expect(stats.distribution.size).toBe(2)
  })
})

// ---------- getSessionSummary use case ----------

const fakeSession = {
  id: 's1',
  name: 'Test Council',
  inviteCode: 'ABCD1234',
  status: 'ACTIVE' as const,
  facilitatorId: null,
  scaleId: 'sc1',
  archivedAt: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  scale: {
    id: 'sc1',
    name: 'Fibonacci',
    isDefault: true,
    createdByUserId: null,
    createdAt: new Date(),
    values: fibValues,
  },
}

const revealedRound = {
  id: 'r1',
  sessionId: 's1',
  topic: 'Story A',
  status: 'REVEALED' as const,
  orderIndex: 1,
  createdAt: new Date(),
  divergenceResult: null,
}

const roundVotes = [
  { id: 'v1', roundId: 'r1', participantId: 'p1', value: '3', createdAt: new Date(), updatedAt: new Date() },
  { id: 'v2', roundId: 'r1', participantId: 'p2', value: '5', createdAt: new Date(), updatedAt: new Date() },
  { id: 'v3', roundId: 'r1', participantId: 'p3', value: '3', createdAt: new Date(), updatedAt: new Date() },
]

function makeDeps(overrides: Partial<UseCaseDeps> = {}): UseCaseDeps {
  return {
    sessionRepo: {
      findById: vi.fn().mockResolvedValue(fakeSession),
      findByInviteCode: vi.fn(),
      create: vi.fn(),
      archive: vi.fn(),
      findActiveOlderThan: vi.fn(),
      deleteMany: vi.fn(),
    },
    participantRepo: {
      findById: vi.fn(),
      findBySessionId: vi.fn().mockResolvedValue([]),
      findBySessionAndName: vi.fn(),
      create: vi.fn(),
      updateActive: vi.fn(),
      delete: vi.fn(),
    },
    roundRepo: {
      findById: vi.fn(),
      findBySessionId: vi.fn().mockResolvedValue([revealedRound]),
      create: vi.fn(),
      reveal: vi.fn(),
      resetToVoting: vi.fn(),
      getMaxOrderIndex: vi.fn(),
    },
    voteRepo: {
      findByRoundId: vi.fn().mockResolvedValue(roundVotes),
      upsert: vi.fn(),
      deleteByRoundId: vi.fn(),
    },
    scaleRepo: { findAll: vi.fn(), findById: vi.fn() },
    eventPublisher: {
      participantJoined: vi.fn(),
      participantLeft: vi.fn(),
      voteSubmitted: vi.fn(),
      roundStarted: vi.fn(),
      roundRevealed: vi.fn(),
      roundReset: vi.fn(),
      sessionArchived: vi.fn(),
    },
    userRepo: { findById: vi.fn(), updateTitle: vi.fn() },
    ...overrides,
  }
}

describe('getSessionSummary', () => {
  it('returns summary with correct round stats for revealed rounds', async () => {
    const deps = makeDeps()
    const summary = await getSessionSummary(deps, 's1')
    expect(summary.sessionId).toBe('s1')
    expect(summary.sessionName).toBe('Test Council')
    expect(summary.totalRounds).toBe(1)
    expect(summary.rounds).toHaveLength(1)

    const round = summary.rounds[0]
    expect(round.roundId).toBe('r1')
    expect(round.voteCount).toBe(3)
    expect(round.mode).toBe('3')
    expect(round.average).toBe(3.7) // (3+5+3)/3 = 3.667 rounded to 1dp
    expect(round.distribution.some((e) => e.label === '3' && e.count === 2)).toBe(true)
    expect(round.distribution.some((e) => e.label === '5' && e.count === 1)).toBe(true)
  })

  it('excludes non-revealed rounds from the summary', async () => {
    const votingRound = {
      id: 'r2',
      sessionId: 's1',
      topic: 'Story B',
      status: 'VOTING' as const,
      orderIndex: 2,
      createdAt: new Date(),
      divergenceResult: null,
    }
    const deps = makeDeps({
      roundRepo: {
        findById: vi.fn(),
        findBySessionId: vi.fn().mockResolvedValue([revealedRound, votingRound]),
        create: vi.fn(),
        reveal: vi.fn(),
        resetToVoting: vi.fn(),
        getMaxOrderIndex: vi.fn(),
      },
    })
    const summary = await getSessionSummary(deps, 's1')
    expect(summary.totalRounds).toBe(2)
    expect(summary.rounds).toHaveLength(1) // only REVEALED
    expect(summary.rounds[0].roundId).toBe('r1')
  })
})
import { describe, it, expect } from 'vitest'
import {
  generateInviteCode,
  validateDisplayName,
  validateVoteValue,
  assertRoundVoting,
  detectDivergence,
} from '@/domain/rules'
import { InvalidDisplayNameError, InvalidVoteValueError, RoundNotVotingError } from '@/domain/errors'
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

describe('generateInviteCode', () => {
  it('generates an 8-character code', () => {
    const code = generateInviteCode()
    expect(code).toHaveLength(8)
  })

  it('only uses allowed characters', () => {
    const allowed = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    for (let i = 0; i < 100; i++) {
      const code = generateInviteCode()
      for (const char of code) {
        expect(allowed).toContain(char)
      }
    }
  })

  it('generates unique codes', () => {
    const codes = new Set(Array.from({ length: 50 }, () => generateInviteCode()))
    expect(codes.size).toBeGreaterThan(45) // statistically should be all unique
  })
})

describe('validateDisplayName', () => {
  it('trims and returns valid names', () => {
    expect(validateDisplayName('  Gandalf  ')).toBe('Gandalf')
  })

  it('throws on empty name', () => {
    expect(() => validateDisplayName('')).toThrow(InvalidDisplayNameError)
    expect(() => validateDisplayName('   ')).toThrow(InvalidDisplayNameError)
  })

  it('throws on name exceeding 30 chars', () => {
    expect(() => validateDisplayName('a'.repeat(31))).toThrow(InvalidDisplayNameError)
  })

  it('accepts exactly 30 chars', () => {
    const name = 'a'.repeat(30)
    expect(validateDisplayName(name)).toBe(name)
  })
})

describe('validateVoteValue', () => {
  it('accepts valid scale values', () => {
    expect(() => validateVoteValue('5', fibValues)).not.toThrow()
    expect(() => validateVoteValue('?', fibValues)).not.toThrow()
  })

  it('throws for invalid values', () => {
    expect(() => validateVoteValue('99', fibValues)).toThrow(InvalidVoteValueError)
  })
})

describe('assertRoundVoting', () => {
  it('does not throw for VOTING status', () => {
    expect(() => assertRoundVoting('VOTING')).not.toThrow()
  })

  it('throws for REVEALED status', () => {
    expect(() => assertRoundVoting('REVEALED')).toThrow(RoundNotVotingError)
  })
})

describe('detectDivergence', () => {
  it('detects divergence when spread >= threshold', () => {
    const votes = [{ value: '1' }, { value: '13' }]
    const result = detectDivergence(votes, fibValues, 3)
    expect(result.isDiverged).toBe(true)
    expect(result.min).toBe('1')
    expect(result.max).toBe('13')
  })

  it('does not detect divergence for close votes', () => {
    const votes = [{ value: '2' }, { value: '3' }]
    const result = detectDivergence(votes, fibValues, 3)
    expect(result.isDiverged).toBe(false)
  })

  it('handles single vote', () => {
    const result = detectDivergence([{ value: '5' }], fibValues)
    expect(result.isDiverged).toBe(false)
    expect(result.spread).toBeNull()
  })

  it('ignores non-numeric votes', () => {
    const votes = [{ value: '?' }, { value: '?' }]
    const result = detectDivergence(votes, fibValues)
    expect(result.isDiverged).toBe(false)
  })
})

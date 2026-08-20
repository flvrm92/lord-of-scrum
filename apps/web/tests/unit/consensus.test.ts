import { describe, it, expect } from 'vitest'
import { detectConsensus, computeRoundStatistics, hasAbstention } from '@/domain/rules'
import type { ScaleValue } from '@/domain/entities'

const fibValues: ScaleValue[] = [
  { id: '1', scaleId: 's', label: '1', numericValue: 1, sortOrder: 0 },
  { id: '2', scaleId: 's', label: '2', numericValue: 2, sortOrder: 1 },
  { id: '3', scaleId: 's', label: '3', numericValue: 3, sortOrder: 2 },
  { id: '4', scaleId: 's', label: '5', numericValue: 5, sortOrder: 3 },
  { id: '5', scaleId: 's', label: '8', numericValue: 8, sortOrder: 4 },
  { id: '6', scaleId: 's', label: '13', numericValue: 13, sortOrder: 5 },
  { id: '7', scaleId: 's', label: '?', numericValue: null, sortOrder: 6 },
  { id: '8', scaleId: 's', label: '☕', numericValue: null, sortOrder: 7 },
]

describe('detectConsensus', () => {
  it('detects a unanimous numeric round', () => {
    const result = detectConsensus([{ value: '8' }, { value: '8' }, { value: '8' }], fibValues)
    expect(result.isUnanimous).toBe(true)
    expect(result.value).toBe('8')
    expect(result.voteCount).toBe(3)
    expect(result.isNumeric).toBe(true)
  })

  it('flags unanimous non-numeric labels as not numeric', () => {
    const result = detectConsensus([{ value: '?' }, { value: '?' }], fibValues)
    expect(result.isUnanimous).toBe(true)
    expect(result.value).toBe('?')
    expect(result.isNumeric).toBe(false)
  })

  it('treats the coffee break the same way', () => {
    const result = detectConsensus([{ value: '☕' }, { value: '☕' }], fibValues)
    expect(result.isUnanimous).toBe(true)
    expect(result.isNumeric).toBe(false)
  })

  it('is never unanimous with a single vote', () => {
    const result = detectConsensus([{ value: '8' }], fibValues)
    expect(result.isUnanimous).toBe(false)
    expect(result.value).toBeNull()
    expect(result.voteCount).toBe(1)
  })

  it('is not unanimous when values differ', () => {
    const result = detectConsensus([{ value: '3' }, { value: '8' }], fibValues)
    expect(result.isUnanimous).toBe(false)
    expect(result.value).toBeNull()
  })

  it('ignores hidden (null) vote values', () => {
    const result = detectConsensus(
      [{ value: '5' }, { value: null }, { value: '5' }],
      fibValues,
    )
    expect(result.isUnanimous).toBe(true)
    expect(result.value).toBe('5')
    expect(result.voteCount).toBe(2)
  })

  it('is not unanimous when only one value survives the null filter', () => {
    const result = detectConsensus([{ value: '5' }, { value: null }], fibValues)
    expect(result.isUnanimous).toBe(false)
  })

  it('returns a not-unanimous result for an empty round', () => {
    const result = detectConsensus([], fibValues)
    expect(result).toEqual({
      isUnanimous: false,
      value: null,
      voteCount: 0,
      isNumeric: false,
    })
  })

  it('reports isNumeric false for a label missing from the scale', () => {
    const result = detectConsensus([{ value: 'XL' }, { value: 'XL' }], fibValues)
    expect(result.isUnanimous).toBe(true)
    expect(result.isNumeric).toBe(false)
  })
})

describe('hasAbstention', () => {
  it('is false when every vote carries a number', () => {
    expect(hasAbstention([{ value: '1' }, { value: '13' }], fibValues)).toBe(false)
  })

  it('is true when someone answered with a question mark', () => {
    expect(hasAbstention([{ value: '1' }, { value: '13' }, { value: '?' }], fibValues)).toBe(true)
  })

  it('is true when someone called for a coffee break', () => {
    expect(hasAbstention([{ value: '1' }, { value: '☕' }], fibValues)).toBe(true)
  })

  it('is true when nobody committed to a number', () => {
    expect(hasAbstention([{ value: '?' }, { value: '☕' }], fibValues)).toBe(true)
  })

  it('is false for an empty round', () => {
    expect(hasAbstention([], fibValues)).toBe(false)
  })

  it('ignores hidden (null) vote values', () => {
    expect(hasAbstention([{ value: '5' }, { value: null }], fibValues)).toBe(false)
  })

  it('treats a label missing from the scale as an abstention', () => {
    expect(hasAbstention([{ value: '5' }, { value: 'XL' }], fibValues)).toBe(true)
  })
})

describe('computeRoundStatistics consensus field', () => {
  it('exposes consensus alongside the other statistics', () => {
    const stats = computeRoundStatistics([{ value: '5' }, { value: '5' }], fibValues)
    expect(stats.consensus.isUnanimous).toBe(true)
    expect(stats.consensus.value).toBe('5')
    expect(stats.consensus.isNumeric).toBe(true)
    expect(stats.divergence.isDiverged).toBe(false)
  })

  it('reports no consensus for a diverged round', () => {
    const stats = computeRoundStatistics([{ value: '1' }, { value: '13' }], fibValues)
    expect(stats.consensus.isUnanimous).toBe(false)
    expect(stats.divergence.isDiverged).toBe(true)
  })
})

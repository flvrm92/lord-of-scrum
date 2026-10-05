import { type RoundStatus, type ScaleValue } from '@/domain/entities'
export { getRandomLotrTitle, LOTR_TITLES } from './lotr-titles'
import { InvalidDisplayNameError, InvalidVoteValueError, RoundNotVotingError } from '@/domain/errors'

// Exported so the client-side invite-code module checks well-formedness against
// the very charset and length the generator uses, instead of restating them.
export const INVITE_CODE_LENGTH = 8
export const INVITE_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no 0,O,1,I

export function generateInviteCode(): string {
  const chars: string[] = []
  const randomValues = new Uint8Array(INVITE_CODE_LENGTH)
  crypto.getRandomValues(randomValues)
  for (const byte of randomValues) {
    chars.push(INVITE_CODE_CHARS[byte % INVITE_CODE_CHARS.length])
  }
  return chars.join('')
}

export function validateDisplayName(name: string): string {
  const trimmed = name.trim()
  if (trimmed.length < 1 || trimmed.length > 30) {
    throw new InvalidDisplayNameError()
  }
  return trimmed
}

export function validateVoteValue(value: string, scaleValues: ScaleValue[]): void {
  const valid = scaleValues.some((sv) => sv.label === value)
  if (!valid) {
    throw new InvalidVoteValueError(value)
  }
}

export function assertRoundVoting(status: RoundStatus): void {
  if (status !== 'VOTING') {
    throw new RoundNotVotingError()
  }
}

export interface DivergenceResult {
  isDiverged: boolean
  spread: number | null
  min: string | null
  max: string | null
}

export function detectDivergence(
  votes: { value: string }[],
  scaleValues: ScaleValue[],
  threshold = 3,
): DivergenceResult {
  const numericVotes = votes
    .map((v) => {
      const sv = scaleValues.find((s) => s.label === v.value)
      return sv?.numericValue ?? null
    })
    .filter((n): n is number => n !== null)

  if (numericVotes.length < 2) {
    return { isDiverged: false, spread: null, min: null, max: null }
  }

  const sorted = [...numericVotes].sort((a, b) => a - b)
  const min = sorted[0]
  const max = sorted[sorted.length - 1]

  const minLabel = scaleValues.find((s) => s.numericValue === min)?.label ?? String(min)
  const maxLabel = scaleValues.find((s) => s.numericValue === max)?.label ?? String(max)

  // Count how many distinct scale positions apart the min and max are
  const numericSorted = scaleValues
    .filter((s) => s.numericValue !== null)
    .sort((a, b) => a.sortOrder - b.sortOrder)
  const minIdx = numericSorted.findIndex((s) => s.numericValue === min)
  const maxIdx = numericSorted.findIndex((s) => s.numericValue === max)
  const spread = maxIdx - minIdx

  return {
    isDiverged: spread >= threshold,
    spread,
    min: minLabel,
    max: maxLabel,
  }
}

// ---------- Consensus ----------

export interface ConsensusResult {
  isUnanimous: boolean
  value: string | null
  voteCount: number
  /** False for labels with no numericValue on the scale ('?', '☕'). */
  isNumeric: boolean
}

/**
 * A round reaches consensus when at least two votes were cast and every one of
 * them carries the same label. A solo round is never a celebration.
 */
export function detectConsensus(
  votes: { value: string | null }[],
  // Structural, so the transport-layer ScaleValueDto satisfies it too — this
  // rule runs both on the server and in the session room.
  scaleValues: Pick<ScaleValue, 'label' | 'numericValue'>[],
): ConsensusResult {
  const values = votes
    .map((v) => v.value)
    .filter((v): v is string => v != null && v !== '')

  if (values.length < 2 || new Set(values).size !== 1) {
    return { isUnanimous: false, value: null, voteCount: values.length, isNumeric: false }
  }

  const value = values[0]
  const isNumeric = scaleValues.find((s) => s.label === value)?.numericValue != null

  return { isUnanimous: true, value, voteCount: values.length, isNumeric }
}

/**
 * True when any vote carries a label the scale gives no numeric value ('?', '☕').
 * Such a round is incomplete rather than divided — the spread only describes the
 * members who committed to a number — so the reveal withholds its divergence
 * theatrics even when `detectDivergence` still reports a wide spread.
 */
export function hasAbstention(
  votes: { value: string | null }[],
  scaleValues: Pick<ScaleValue, 'label' | 'numericValue'>[],
): boolean {
  return votes.some((v) => {
    if (v.value == null || v.value === '') return false
    return scaleValues.find((s) => s.label === v.value)?.numericValue == null
  })
}

// ---------- Round Statistics ----------

export interface RoundStatistics {
  average: number | null
  median: number | null
  mode: string | null
  voteCount: number
  distribution: Map<string, number>
  divergence: DivergenceResult
  consensus: ConsensusResult
}

export function computeRoundStatistics(
  votes: { value: string }[],
  scaleValues: ScaleValue[],
): RoundStatistics {
  const nonNullVotes = votes.filter((v) => v.value != null)
  const voteCount = nonNullVotes.length

  // Distribution: label → count
  const distribution = new Map<string, number>()
  for (const v of nonNullVotes) {
    distribution.set(v.value, (distribution.get(v.value) ?? 0) + 1)
  }

  // Mode: most common label (first alphabetically on tie)
  let mode: string | null = null
  if (distribution.size > 0) {
    let maxCount = 0
    const sorted = [...distribution.entries()].sort((a, b) => a[0].localeCompare(b[0]))
    for (const [label, count] of sorted) {
      if (count > maxCount) {
        maxCount = count
        mode = label
      }
    }
  }

  // Numeric stats (only for votes that have a numericValue on their scale entry)
  const numericValues = nonNullVotes
    .map((v) => scaleValues.find((s) => s.label === v.value)?.numericValue ?? null)
    .filter((n): n is number => n !== null)

  let average: number | null = null
  let median: number | null = null

  if (numericValues.length > 0) {
    average = Math.round((numericValues.reduce((a, b) => a + b, 0) / numericValues.length) * 10) / 10
    const sorted = [...numericValues].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
  }

  const divergence = detectDivergence(nonNullVotes, scaleValues)
  const consensus = detectConsensus(nonNullVotes, scaleValues)

  return { average, median, mode, voteCount, distribution, divergence, consensus }
}

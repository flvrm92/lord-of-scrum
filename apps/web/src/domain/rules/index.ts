import { type RoundStatus, type ScaleValue } from '@/domain/entities'
export { getRandomLotrTitle, formatDisplayWithTitle, LOTR_TITLES } from './lotr-titles'
import { InvalidDisplayNameError, InvalidVoteValueError, RoundNotVotingError } from '@/domain/errors'

const INVITE_CODE_LENGTH = 8
const INVITE_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no 0,O,1,I

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

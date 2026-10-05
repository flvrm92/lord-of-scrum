import type { ParticipantDto } from '@/application/dtos'

/**
 * Who we are in a given council, as remembered by this browser.
 *
 * Identity is per-council and localStorage-backed, under `participant:<sessionId>`.
 * That key is also seeded directly by the e2e suite (`e2e/fixtures/council.ts`),
 * so the format is a contract, not an implementation detail.
 *
 * Reads are deliberately tolerant. A missing, non-JSON or wrong-shape value
 * resolves to "no identity" rather than throwing, which lets a corrupt or
 * hand-edited entry degrade into the join flow — recoverable by the user —
 * instead of into an error screen.
 */

const keyFor = (sessionId: string) => `participant:${sessionId}`

export function readIdentity(sessionId: string): ParticipantDto | null {
  try {
    const raw = localStorage.getItem(keyFor(sessionId))
    if (!raw) return null

    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return null

    const { id } = parsed as { id?: unknown }
    if (typeof id !== 'string' || id.length === 0) return null

    return parsed as ParticipantDto
  } catch {
    // Non-JSON, or storage unavailable (private mode, blocked site data).
    return null
  }
}

export function writeIdentity(sessionId: string, participant: ParticipantDto): void {
  try {
    localStorage.setItem(keyFor(sessionId), JSON.stringify(participant))
  } catch {
    // A seat that cannot be remembered is better than a crash on join.
  }
}

export function clearIdentity(sessionId: string): void {
  try {
    localStorage.removeItem(keyFor(sessionId))
  } catch {
    // Nothing to do — the entry is already unreachable.
  }
}

import type { ParticipantDto, SessionDto } from '@/application/dtos'

/**
 * Where a visitor to `/session/:inviteCode` should be sent.
 *
 * The room page used to decide this through the order of early returns over two
 * nullable pieces of state, which is why "you never joined" and "no such
 * council" collapsed into the same screen. Naming the outcomes is the fix; this
 * function is pure so all of them are testable without a browser.
 */

export type NotFoundReason =
  /** No council with that seal — mistyped, truncated, or cleaned up. */
  | 'missing'
  /** The council exists but is no longer ACTIVE. */
  | 'inactive'
  /** The lookup itself failed. */
  | 'unreachable'

export type SessionEntry =
  | { kind: 'enter'; participant: ParticipantDto }
  | { kind: 'join-required' }
  | { kind: 'dismissed'; participant: ParticipantDto }
  | { kind: 'not-found'; reason: NotFoundReason }

export type SessionFetch =
  | { ok: true; session: SessionDto }
  | { ok: false; reason: Exclude<NotFoundReason, 'inactive'> }

/** Only the id is needed to match a stored identity against the session. */
type StoredIdentity = { id: string } | null

export function resolveSessionEntry(fetched: SessionFetch, stored: StoredIdentity): SessionEntry {
  if (!fetched.ok) return { kind: 'not-found', reason: fetched.reason }

  const { session } = fetched

  // Identity is resolved first, and deliberately before the session's status.
  // A member of a council that has since been archived keeps the room they have
  // today — the status gate below exists to stop the *redirect*, not to take
  // away access that already worked.
  if (stored) {
    const current = session.participants.find((p) => p.id === stored.id)
    if (current) {
      return current.isActive
        ? { kind: 'enter', participant: current }
        : { kind: 'dismissed', participant: current }
    }
    // A stored id that is absent from the participant list is a stale or
    // foreign identity, not an error: dismissal is a soft deactivate, so a
    // dismissed participant is still in the list with `isActive: false`.
  }

  if (session.status !== 'ACTIVE') return { kind: 'not-found', reason: 'inactive' }

  return { kind: 'join-required' }
}

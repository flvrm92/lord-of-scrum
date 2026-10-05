import { INVITE_CODE_CHARS, INVITE_CODE_LENGTH } from '@/domain/rules'

/**
 * Seal handling, in one place so the join form, the submit path and the link
 * prefill cannot drift apart.
 *
 * The two functions have deliberately different consumers. `normalise` is what
 * the form uses — it is the whole of the form's behaviour, as it was before this
 * module existed. `isWellFormed` is used *only* by the join-intent reader, where
 * a junk query parameter must yield no intent. It is not a form guard: gating
 * the input handler on the charset would silently swallow look-alike keystrokes
 * (O, 0, I, 1) with nothing on screen to explain the vanishing character, which
 * is worse than the server's `SESSION_NOT_FOUND` the user gets today.
 */

export function normalise(raw: string): string {
  return raw.trim().toUpperCase()
}

export function isWellFormed(raw: string): boolean {
  const code = normalise(raw)
  if (code.length !== INVITE_CODE_LENGTH) return false
  return [...code].every((char) => INVITE_CODE_CHARS.includes(char))
}

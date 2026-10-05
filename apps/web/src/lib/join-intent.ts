import { isWellFormed, normalise } from './invite-code'

/**
 * The contract between a council link and the main page's join tab.
 *
 * Sole owner of the parameter name, so renaming it is a single-file change.
 *
 * The reader takes a plain query string rather than calling `useSearchParams`,
 * which would force a Suspense boundary around the main page to avoid Next's
 * prerender bailout. That also keeps it testable without a router.
 */

const JOIN_INTENT_PARAM = 'join'

export function buildJoinIntentUrl(inviteCode: string): string {
  const params = new URLSearchParams({ [JOIN_INTENT_PARAM]: normalise(inviteCode) })
  return `/?${params.toString()}`
}

/**
 * Reads a seal out of a query string, or null when there is no usable intent.
 *
 * Well-formedness is checked here and nowhere else in the join path: a junk,
 * truncated or over-long parameter yields no intent at all, so the page falls
 * back to its default create tab rather than prefilling a seal that cannot work.
 */
export function readJoinIntent(queryString: string): string | null {
  let raw: string | null
  try {
    raw = new URLSearchParams(queryString).get(JOIN_INTENT_PARAM)
  } catch {
    return null
  }

  if (!raw) return null

  const code = normalise(raw)
  return isWellFormed(code) ? code : null
}

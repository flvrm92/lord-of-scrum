'use client'

import { useEffect, useState } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

/**
 * Tracks the OS "reduce motion" preference.
 *
 * Returns `false` on the server and during the first client render so markup
 * matches between the two, then settles to the real value after mount. Callers
 * use it to skip mounting expensive effects entirely (the ember canvas loop);
 * the global `prefers-reduced-motion` block in `globals.css` neutralises the
 * declarative CSS animations independently.
 */
export function useReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState(false)

  useEffect(() => {
    const mql = window.matchMedia(QUERY)
    setPrefersReduced(mql.matches)

    const onChange = (e: MediaQueryListEvent) => setPrefersReduced(e.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  return prefersReduced
}

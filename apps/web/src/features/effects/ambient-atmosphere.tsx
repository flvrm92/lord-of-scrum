'use client'

import { useEffect, useState } from 'react'
import { ParticleCanvas } from './particle-canvas'

/**
 * Watches the `.dark` class on `<html>`.
 *
 * The app hand-rolls theming (a blocking script in the root layout plus
 * `theme-toggle.tsx`) rather than using next-themes, so there is no context to
 * subscribe to — observing the class attribute is the reliable way to react to
 * a theme change from anywhere in the tree.
 */
function useIsDark(): boolean {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const root = document.documentElement
    const sync = () => setIsDark(root.classList.contains('dark'))

    sync()
    const observer = new MutationObserver(sync)
    observer.observe(root, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  return isDark
}

/**
 * A fixed layer behind the page giving each theme its own valley.
 *
 * Dark is Mordor: ash over the glow of Orodruin, Barad-dûr at the margin, and
 * embers rising. Light is Rivendell: dappled canopy light, the falls of
 * Imladris down one edge, valley mist, an elven arch, and leaves falling.
 *
 * Purely decorative and pointer-transparent. Only one branch is ever mounted,
 * so at most one canvas and one rAF loop is alive; `ParticleCanvas` opts itself
 * out entirely when the user prefers reduced motion.
 */
export function AmbientAtmosphere() {
  const isDark = useIsDark()

  return (
    <div className="ambient-layer" aria-hidden="true">
      {isDark ? (
        <>
          <div className="mordor-horizon" />
          <div className="mordor-ash" />
          <div className="ambient-breath" />
          {/* <ParticleCanvas variant="ember" density={2.2} intensity={0.65} /> */}
        </>
      ) : (
        <>
          <div className="rivendell-canopy" />
          <div className="rivendell-mist" />
          <div className="ambient-vignette" />
          {/* <ParticleCanvas variant="leaf" density={2} intensity={0.9} /> */}
        </>
      )}
    </div>
  )
}

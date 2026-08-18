'use client'

import { useEffect, useRef } from 'react'
import { useReducedMotion } from '@/hooks/use-reduced-motion'

export type ParticleVariant = 'ember' | 'leaf'

interface Props {
  /** Which valley this is: embers rise out of Mordor, leaves fall over Rivendell. */
  variant?: ParticleVariant
  /** Particles per 100k pixels of viewport. ~2 for embers, ~1.2 for the larger leaves. */
  density?: number
  /** 0–1 multiplier on speed, size and opacity. */
  intensity?: number
  /** Colours, sampled at random. Defaults to the variant's palette. */
  palette?: string[]
  className?: string
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  life: number
  maxLife: number
  color: string
  /** Leaves only: current rotation and its per-frame delta. */
  angle: number
  spin: number
  /** Leaves only: amplitude and offset of the sideways drift as they fall. */
  sway: number
  swayPhase: number
}

const EMBER_PALETTE = ['#ffd700', '#ffb347', '#ff8c00', '#ff4500', '#b8860b']
const LEAF_PALETTE = ['#c4a265', '#d4a843', '#b8860b', '#5f9a6e', '#a8763e']

/**
 * A drifting particle field on a fixed, pointer-transparent canvas.
 *
 * This is the one effect in the app that isn't CSS: hundreds of independently
 * seeded particles with per-particle lifetimes aren't expressible as keyframes.
 * It renders nothing when the user prefers reduced motion, and parks the rAF
 * loop while the tab is hidden.
 *
 * The two variants share everything but their physics and their brush. Embers
 * are drawn additively (`lighter`) so they glow against Mordor's near-black;
 * that same blend mode would make them invisible on parchment, so leaves paint
 * normally and tumble as they fall.
 */
export function ParticleCanvas({
  variant = 'ember',
  density = variant === 'leaf' ? 1.2 : 6,
  intensity = 1,
  palette,
  className,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const prefersReduced = useReducedMotion()

  // Read live values inside the loop without re-subscribing the effect.
  const settings = useRef({ variant, density, intensity, palette })
  settings.current = { variant, density, intensity, palette }

  useEffect(() => {
    if (prefersReduced) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let width = 0
    let height = 0
    let particles: Particle[] = []
    let frame = 0
    let running = true

    const colours = () =>
      settings.current.palette ??
      (settings.current.variant === 'leaf' ? LEAF_PALETTE : EMBER_PALETTE)

    const spawn = (seeded: boolean): Particle => {
      const { intensity: i, variant: v } = settings.current
      const p = colours()
      const maxLife = 260 + Math.random() * 340
      const base = {
        x: Math.random() * width,
        life: seeded ? Math.random() * maxLife : 0,
        maxLife,
        color: p[Math.floor(Math.random() * p.length)],
      }

      if (v === 'leaf') {
        return {
          ...base,
          // Seeded leaves start scattered; later ones fall in from above.
          y: seeded ? Math.random() * height : -20 - Math.random() * 40,
          vx: (Math.random() - 0.5) * 0.2 * i,
          vy: (0.12 + Math.random() * 0.23) * i,
          radius: (1.6 + Math.random() * 2.6) * i,
          angle: Math.random() * Math.PI * 2,
          spin: (Math.random() - 0.5) * 0.02,
          sway: (0.3 + Math.random() * 0.7) * i,
          swayPhase: Math.random() * 1000,
        }
      }

      return {
        ...base,
        // Seeded embers start scattered; later ones rise from below the fold.
        y: seeded ? Math.random() * height : height + Math.random() * 40,
        vx: (Math.random() - 0.5) * 0.28 * i,
        vy: -(0.15 + Math.random() * 0.5) * i,
        radius: (0.6 + Math.random() * 1.7) * i,
        angle: 0,
        spin: 0,
        sway: 0,
        swayPhase: 0,
      }
    }

    const targetCount = () =>
      Math.round(((width * height) / 100_000) * settings.current.density)

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      particles = Array.from({ length: targetCount() }, () => spawn(true))
    }

    const draw = () => {
      if (!running) return
      frame = requestAnimationFrame(draw)

      const isLeaf = settings.current.variant === 'leaf'

      ctx.clearRect(0, 0, width, height)
      ctx.globalCompositeOperation = isLeaf ? 'source-over' : 'lighter'

      const target = targetCount()
      // Ramp toward the target a few particles per frame so a density change
      // looks like the fire building rather than a pop.
      if (particles.length < target) {
        particles.push(...Array.from({ length: Math.min(4, target - particles.length) }, () => spawn(false)))
      } else if (particles.length > target) {
        particles.length = Math.max(target, particles.length - 4)
      }

      for (const e of particles) {
        e.life += 1
        const escaped = isLeaf ? e.y > height + 20 : e.y < -20
        if (e.life >= e.maxLife || escaped) {
          Object.assign(e, spawn(false))
          continue
        }

        e.x += e.vx
        e.y += e.vy

        if (isLeaf) {
          // A falling leaf slides sideways as it turns over
          e.x += Math.sin((e.life + e.swayPhase) * 0.02) * e.sway
          e.angle += e.spin
        } else {
          // Lateral wander so embers don't rise in straight lines
          e.vx += (Math.random() - 0.5) * 0.012
        }

        const t = e.life / e.maxLife
        // Fade in over the first 15%, out over the last 45%
        const alpha = Math.min(t / 0.15, 1) * Math.min((1 - t) / 0.45, 1) * settings.current.intensity

        ctx.globalAlpha = Math.max(0, Math.min(alpha, 1)) * 0.8
        ctx.fillStyle = e.color

        if (isLeaf) {
          ctx.save()
          ctx.translate(e.x, e.y)
          ctx.rotate(e.angle)
          ctx.beginPath()
          ctx.ellipse(0, 0, e.radius * 1.6, e.radius * 0.7, 0, 0, Math.PI * 2)
          ctx.fill()
          ctx.restore()
        } else {
          ctx.beginPath()
          ctx.shadowBlur = e.radius * 5
          ctx.shadowColor = e.color
          ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      ctx.globalAlpha = 1
      ctx.shadowBlur = 0
      ctx.globalCompositeOperation = 'source-over'
    }

    const onVisibility = () => {
      if (document.hidden) {
        running = false
        cancelAnimationFrame(frame)
      } else if (!running) {
        running = true
        frame = requestAnimationFrame(draw)
      }
    }

    resize()
    window.addEventListener('resize', resize)
    document.addEventListener('visibilitychange', onVisibility)
    frame = requestAnimationFrame(draw)

    return () => {
      running = false
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', onVisibility)
    }
    // `variant` reseeds the field: the live `settings` ref keeps new particles
    // in step, but ones already in flight would otherwise keep the old physics.
  }, [prefersReduced, variant])

  if (prefersReduced) return null

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none fixed inset-0 ${className ?? ''}`}
    />
  )
}

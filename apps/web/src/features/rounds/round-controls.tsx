'use client'

import { useState } from 'react'
import type { RoundDto } from '@/application/dtos'

interface Props {
  sessionId: string
  participantId: string
  currentRound: RoundDto | null
  inviteCode: string
  onAction: () => void
}

export function RoundControls({ sessionId, participantId, currentRound, inviteCode, onAction }: Props) {
  const [topic, setTopic] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleStartRound = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!topic.trim()) return
    setIsLoading(true)
    try {
      await fetch(`/api/sessions/${sessionId}/rounds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim(), participantId }),
      })
      setTopic('')
      onAction()
    } finally {
      setIsLoading(false)
    }
  }

  const handleReveal = async () => {
    if (!currentRound) return
    setIsLoading(true)
    try {
      await fetch(`/api/sessions/${sessionId}/rounds/${currentRound.id}/reveal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId }),
      })
      onAction()
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = async () => {
    if (!currentRound) return
    setIsLoading(true)
    try {
      await fetch(`/api/sessions/${sessionId}/rounds/${currentRound.id}/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId }),
      })
      onAction()
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="rounded-lg border-2 border-gold/20 bg-gradient-to-br from-gold/5 to-transparent p-4">
      <h3 className="mb-3 flex items-center gap-2 font-subheading text-xs font-semibold uppercase tracking-widest text-gold">
        <img src="/fellowship-shield.svg" alt="" className="h-4 w-4" />
        Steward&apos;s Commands
      </h3>

      {(!currentRound || currentRound.status === 'REVEALED') && (
        <div className="flex flex-col gap-2">
          <form onSubmit={handleStartRound} className="flex gap-2">
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="A quest to estimate..."
              maxLength={200}
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="submit"
              disabled={isLoading || !topic.trim()}
              className="rounded-md bg-elvish px-4 py-2 font-subheading text-sm font-medium text-white transition-all hover:bg-elvish/90 hover:shadow-[0_0_8px_rgba(74,139,158,0.3)] disabled:opacity-50"
            >
              Begin the Council
            </button>
          </form>
          <a
            href={`/session/${inviteCode}/results`}
            className="self-start font-subheading text-xs text-gold/70 underline transition-colors hover:text-gold"
          >
            View Chronicles
          </a>
        </div>
      )}

      {currentRound?.status === 'VOTING' && (
        <div className="flex gap-2">
          <button
            onClick={handleReveal}
            disabled={isLoading}
            className="flex items-center gap-2 rounded-md bg-gold px-4 py-2 font-subheading text-sm font-medium text-white transition-all hover:bg-gold/90 hover:shadow-[0_0_12px_rgba(184,134,11,0.3)] disabled:opacity-50"
          >
            <img src="/eye-of-sauron.svg" alt="" className="h-4 w-6" />
            The Eye Reveals All
          </button>
          <button
            onClick={handleReset}
            disabled={isLoading}
            className="rounded-md border border-border bg-background px-4 py-2 font-subheading text-sm font-medium transition-colors hover:bg-secondary disabled:opacity-50"
          >
            Return to Shadow
          </button>
        </div>
      )}
    </div>
  )
}

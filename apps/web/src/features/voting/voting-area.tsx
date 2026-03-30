'use client'

import { useState } from 'react'
import Image from 'next/image'
import type { SessionDto } from '@/application/dtos'

interface Props {
  session: SessionDto
  participantId: string
  onVote: () => void
}

export function VotingArea({ session, participantId, onVote }: Props) {
  const [selectedValue, setSelectedValue] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const currentRound = session.currentRound

  if (!currentRound) {
    return (
      <div className="lotr-card p-8 text-center">
        <Image src="/tree-of-gondor.svg" alt="" className="mx-auto mb-4 h-16 w-16 text-muted-foreground/30" />
        <p className="font-subheading text-lg text-muted-foreground">The council has not yet begun...</p>
        <p className="mt-2 text-sm text-muted-foreground italic">Await the word of the Steward.</p>
      </div>
    )
  }

  const hasVoted = currentRound.votes.some((v) => v.participantId === participantId)

  const handleVote = async (value: string) => {
    setSelectedValue(value)
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/sessions/${session.id}/rounds/${currentRound.id}/votes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId, value }),
      })
      if (res.ok) onVote()
    } finally {
      setIsSubmitting(false)
    }
  }

  if (currentRound.status === 'REVEALED') {
    const voteValues = currentRound.votes.map((v) => v.value).filter(Boolean)
    const isConsensus = voteValues.length > 1 && new Set(voteValues).size === 1

    if (isConsensus) {
      const unanimousValue = voteValues[0]
      console.log('Consensus achieved on value:', unanimousValue);
      return (
        <div className="lotr-card-ornate consensus-glow">
          <h3 className="mb-6 font-subheading text-lg font-semibold text-elvish text-center">{currentRound.topic}</h3>

          <div className="flex flex-col items-center gap-5">
            {/* The One Ring with unanimous value */}
            <div className="consensus-ring">
              <Image src="/one-ring.svg" alt="" className="absolute inset-0 h-full w-full animate-ring-glow" />
              <span className="relative z-10 font-heading text-5xl font-bold text-ring drop-shadow-[0_0_12px_rgba(255,215,0,0.6)]">
                {unanimousValue}
              </span>
            </div>

            {/* Ring inscription divider */}
            <div className="elvish-divider w-full" style={{ animationDelay: '0.6s' }}>
              <Image src="/ring-inscription.svg" alt="" className="h-3 w-full max-w-[12rem] opacity-40" />
            </div>

            {/* Banner message */}
            <p className="consensus-banner">One number to rule them all</p>
            <p className="consensus-subtitle">The Fellowship speaks with one voice</p>

            {/* Voter breakdown — smaller, below the celebration */}
            <div className="mt-2 grid w-full grid-cols-3 gap-2 sm:grid-cols-4">
              {currentRound.votes.map((vote, i) => (
                <div
                  key={vote.participantId}
                  className="flex flex-col items-center gap-0.5 rounded-md border border-gold/20 bg-background/50 p-2 animate-fade-in"
                  style={{ animationDelay: `${800 + i * 80}ms`, animationFillMode: 'backwards' }}
                >
                  <span className="font-subheading text-sm font-bold text-gold/70">{vote.value}</span>
                  <span className="text-[10px] text-muted-foreground">{vote.displayName}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="lotr-card-ornate">
        <h3 className="mb-4 font-subheading text-lg font-semibold text-elvish">{currentRound.topic}</h3>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {currentRound.votes.map((vote, i) => (
            <div
              key={vote.participantId}
              className="flex flex-col items-center gap-1 rounded-lg border-2 border-gold/30 bg-background p-3 animate-fade-in"
              style={{ animationDelay: `${i * 100}ms`, animationFillMode: 'backwards' }}
            >
              <span className="font-subheading text-2xl font-bold text-gold">{vote.value}</span>
              <span className="text-xs text-muted-foreground">{vote.displayName}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="lotr-card">
      <h3 className="mb-2 font-subheading text-lg font-semibold text-elvish">{currentRound.topic}</h3>
      <p className="mb-4 text-sm text-muted-foreground italic">
        {hasVoted ? 'Scroll cast! You may change your counsel.' : 'Cast your scroll, fellow member:'}
      </p>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
        {session.scale.values.map((sv) => (
          <button
            key={sv.label}
            onClick={() => handleVote(sv.label)}
            disabled={isSubmitting}
            className={`vote-card shimmer-hover ${selectedValue === sv.label || (hasVoted && currentRound.votes.find(v => v.participantId === participantId)?.value === null && selectedValue === sv.label)
              ? 'vote-card-selected'
              : 'border-border text-foreground hover:border-elvish'
              } disabled:opacity-50`}
          >
            {sv.label}
          </button>
        ))}
      </div>
    </div>
  )
}

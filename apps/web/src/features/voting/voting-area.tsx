'use client'

import { useState, useEffect, useRef } from 'react'
import type { SessionDto, RoundSummaryDto } from '@/application/dtos'
import { detectConsensus, hasAbstention } from '@/domain/rules'
import { VoteDistributionChart } from './vote-distribution-chart'
import { RoundStatsBanner } from './round-stats-banner'
import { VoteCardFlip } from './vote-card-flip'

interface Props {
  session: SessionDto
  participantId: string
  onVote: () => void
}

/** Delay before the reveal cards start turning, so the flip reads as deliberate. */
const FLIP_LEAD_MS = 120
const FLIP_STAGGER_MS = 120

export function VotingArea({ session, participantId, onVote }: Props) {
  // Optimistic local selection (cleared when server confirms)
  const [optimisticValue, setOptimisticValue] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [justChanged, setJustChanged] = useState(false)
  const [pressedValue, setPressedValue] = useState<string | null>(null)
  const [roundSummary, setRoundSummary] = useState<RoundSummaryDto | null>(null)
  const [flipped, setFlipped] = useState(false)
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const currentRound = session.currentRound

  useEffect(() => () => {
    if (pressTimer.current) clearTimeout(pressTimer.current)
  }, [])

  // Server-confirmed own vote (the server returns our own value during VOTING)
  const serverMyVote = currentRound?.votes.find((v) => v.participantId === participantId)?.value ?? null

  // Active selection: optimistic takes precedence, then server value
  const activeValue = optimisticValue ?? serverMyVote

  const isRevealed = currentRound?.status === 'REVEALED'
  const consensus = detectConsensus(currentRound?.votes ?? [], session.scale.values)
  const isConsensus = isRevealed && consensus.isUnanimous

  // Clear optimistic state once server data arrives with our vote
  useEffect(() => {
    if (optimisticValue && serverMyVote === optimisticValue) {
      setOptimisticValue(null)
    }
  }, [serverMyVote, optimisticValue])

  // Fetch summary when round is revealed
  useEffect(() => {
    if (currentRound?.status === 'REVEALED') {
      fetch(`/api/sessions/${session.id}/summary`)
        .then((r) => r.ok ? r.json() : null)
        .then((data) => {
          if (data?.rounds) {
            const match = data.rounds.find((r: RoundSummaryDto) => r.roundId === currentRound.id)
            setRoundSummary(match ?? null)
          }
        })
        .catch(() => setRoundSummary(null))
    } else {
      setRoundSummary(null)
    }
  }, [session.id, currentRound?.id, currentRound?.status])

  // Turn the cards face-up shortly after the reveal lands, and reset them when
  // the round returns to VOTING.
  useEffect(() => {
    if (!isRevealed) {
      setFlipped(false)
      return
    }
    const t = setTimeout(() => setFlipped(true), FLIP_LEAD_MS)
    return () => clearTimeout(t)
  }, [isRevealed, currentRound?.id])

  if (!currentRound) {
    return (
      <div className="lotr-card p-8 text-center">
        <img src="/tree-of-gondor.svg" alt="" className="mx-auto mb-4 h-16 w-16 text-muted-foreground/30" />
        <p className="font-subheading text-lg text-muted-foreground">The council has not yet begun...</p>
        <p className="mt-2 text-sm text-muted-foreground italic">Await the word of the Steward.</p>
      </div>
    )
  }

  const hasVoted = activeValue !== null

  const handleVote = async (value: string) => {
    const wasAlreadyVoted = activeValue !== null
    setOptimisticValue(value)
    // Held long enough for the wax-stamp pseudo-element (0.55s) to finish, not
    // just the button's own press animation
    setPressedValue(value)
    if (pressTimer.current) clearTimeout(pressTimer.current)
    pressTimer.current = setTimeout(() => setPressedValue(null), 600)
    setIsSubmitting(true)
    setJustChanged(false)
    try {
      const res = await fetch(`/api/sessions/${session.id}/rounds/${currentRound.id}/votes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId, value }),
      })
      if (res.ok) {
        if (wasAlreadyVoted) setJustChanged(true)
        onVote()
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (currentRound.status === 'REVEALED') {
    if (isConsensus && consensus.value) {
      return (
        <div className="lotr-card-ornate consensus-glow">
          <h3 className="mb-6 font-subheading text-lg font-semibold text-elvish text-center">{currentRound.topic}</h3>

          <div className="flex flex-col items-center gap-5">
            {/* The One Ring with unanimous value */}
            <div className="consensus-ring">
              <img src="/one-ring.svg" alt="" className="absolute inset-0 h-full w-full animate-ring-glow" />
              <span className="relative z-10 font-heading text-5xl font-bold text-ring drop-shadow-[0_0_12px_rgba(255,215,0,0.6)]">
                {consensus.value}
              </span>
            </div>

            {/* Ring inscription divider */}
            <div className="elvish-divider w-full" style={{ animationDelay: '0.6s' }}>
              <img src="/ring-inscription.svg" alt="" className="h-3 w-full max-w-[12rem] opacity-40" />
            </div>

            {/* Banner message */}
            <p className="consensus-banner">One number to rule them all</p>
            <p className="consensus-subtitle">The Fellowship speaks with one voice</p>

            {/* Voter breakdown — smaller, below the celebration */}
            <div className="mt-2 grid w-full grid-cols-3 gap-2 sm:grid-cols-4">
              {currentRound.votes.map((vote, i) => {
                const participant = session.participants.find((p) => p.id === vote.participantId)
                return (
                  <div
                    key={vote.participantId}
                    className="flex flex-col items-center gap-0.5 rounded-md border border-gold/20 bg-background/50 p-2 animate-fade-in"
                    style={{ animationDelay: `${800 + i * 80}ms`, animationFillMode: 'backwards' }}
                  >
                    <span className="font-subheading text-sm font-bold text-gold/70">{vote.value}</span>
                    <span className="text-[10px] text-muted-foreground">{vote.displayName}</span>
                    {participant?.lotrTitle && (
                      <span className="text-[9px] italic text-gold/50">{participant.lotrTitle}</span>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Stats banner + distribution chart */}
            {roundSummary && (
              <div className="w-full">
                <RoundStatsBanner round={roundSummary} />
                <VoteDistributionChart round={roundSummary} />
              </div>
            )}
          </div>
        </div>
      )
    }

    // The Eye is withheld when anyone abstained ('?', '☕'): the spread only
    // describes the members who committed to a number, so the round is
    // incomplete rather than divided. The stats still report the divergence.
    const isDiverged =
      (roundSummary?.divergence.isDiverged ?? false) &&
      !hasAbstention(currentRound.votes, session.scale.values)

    return (
      <div className={`lotr-card-ornate ${isDiverged ? 'sauron-watch' : ''}`}>
        {isDiverged && (
          <img src="/eye-of-sauron.svg" alt="" aria-hidden="true" className="sauron-eye" />
        )}

        <h3 className="relative mb-4 font-subheading text-lg font-semibold text-elvish">{currentRound.topic}</h3>

        <div className="relative grid grid-cols-2 gap-3 sm:grid-cols-3">
          {currentRound.votes.map((vote, i) => {
            const participant = session.participants.find((p) => p.id === vote.participantId)
            return (
              <VoteCardFlip
                key={vote.participantId}
                value={vote.value}
                displayName={vote.displayName}
                lotrTitle={participant?.lotrTitle}
                flipped={flipped}
                delayMs={i * FLIP_STAGGER_MS}
              />
            )
          })}
        </div>

        {/* Stats banner + distribution chart */}
        {roundSummary && (
          <div className="relative">
            <RoundStatsBanner round={roundSummary} />
            <VoteDistributionChart round={roundSummary} />
          </div>
        )}
      </div>
    )
  }

  // ── VOTING ──
  const activeParticipants = session.participants.filter((p) => p.isActive)
  const castCount = currentRound.votes.length
  const totalCount = Math.max(activeParticipants.length, castCount)
  const progressPct = totalCount > 0 ? Math.round((castCount / totalCount) * 100) : 0

  return (
    <div className="lotr-card">
      <h3 className="mb-2 font-subheading text-lg font-semibold text-elvish">{currentRound.topic}</h3>
      <div className="mb-3 flex items-center gap-2">
        <p className="text-sm text-muted-foreground italic">
          {!hasVoted
            ? 'Cast your scroll, fellow member:'
            : justChanged
              ? '✦ Scroll changed!'
              : 'Scroll cast! Tap another to change your counsel.'}
        </p>
        {hasVoted && activeValue && (
          <span className="rounded bg-elvish/10 px-1.5 py-0.5 font-subheading text-xs font-semibold text-elvish">
            {activeValue}
          </span>
        )}
      </div>

      {/* How much of the Fellowship has spoken */}
      <div className="mb-4 flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="font-subheading text-[11px] uppercase tracking-widest text-gold/70">
            {castCount} of {totalCount} scroll{totalCount === 1 ? '' : 's'} cast
          </span>
          {castCount > 0 && castCount === totalCount && (
            <span className="font-subheading text-[11px] italic text-shire">All have spoken</span>
          )}
        </div>
        <div
          className="vote-progress"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={totalCount}
          aria-valuenow={castCount}
          aria-label="Votes cast"
        >
          <div className="vote-progress-fill" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      {/* Face-down cards, one per vote already cast */}
      {castCount > 0 && (
        <div className="mb-5 grid grid-cols-3 gap-2 sm:grid-cols-5">
          {currentRound.votes.map((vote) => {
            const participant = session.participants.find((p) => p.id === vote.participantId)
            return (
              <VoteCardFlip
                key={vote.participantId}
                value={vote.value}
                displayName={vote.displayName}
                lotrTitle={participant?.lotrTitle}
                flipped={false}
                className="!h-20 animate-fade-in"
              />
            )
          })}
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
        {session.scale.values.map((sv) => (
          <button
            key={sv.label}
            onClick={() => handleVote(sv.label)}
            disabled={isSubmitting}
            className={`vote-card shimmer-hover relative ${
              activeValue === sv.label
                ? 'vote-card-selected'
                : 'border-border text-foreground hover:border-elvish'
            } ${pressedValue === sv.label ? 'wax-seal' : ''} disabled:opacity-50`}
          >
            {sv.label}
          </button>
        ))}
      </div>
    </div>
  )
}

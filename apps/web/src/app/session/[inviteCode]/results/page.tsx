'use client'

import { useEffect, useState } from 'react'
import type { RoundDto, SessionSummaryDto } from '@/application/dtos'
import { VoteDistributionChart } from '@/features/voting/vote-distribution-chart'
import { RoundStatsBanner } from '@/features/voting/round-stats-banner'

interface Props {
  params: { inviteCode: string }
}

interface HistoryData {
  sessionName: string
  rounds: RoundDto[]
}

export default function ResultsPage({ params }: Props) {
  const { inviteCode } = params
  const [data, setData] = useState<HistoryData | null>(null)
  const [summary, setSummary] = useState<SessionSummaryDto | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        // Resolve session ID from the invite code
        const sessionRes = await fetch(`/api/sessions/by-invite/${encodeURIComponent(inviteCode)}`)
        if (!sessionRes.ok) {
          if (!cancelled) setError('Session not found')
          return
        }
        const session = await sessionRes.json()
        if (cancelled) return

        const base = `/api/sessions/${encodeURIComponent(session.id)}`
        const [historyData, summaryData] = await Promise.all([
          fetch(`${base}/participants`).then((r) => {
            if (r.ok) return r.json()
            throw new Error('Failed to load history')
          }),
          fetch(`${base}/summary`).then((r) => r.ok ? r.json() : null),
        ])

        if (!cancelled) {
          setData(historyData)
          setSummary(summaryData)
        }
      } catch {
        if (!cancelled) setError('Could not load results')
      }
    }

    load()
    return () => { cancelled = true }
  }, [inviteCode])

  if (error) return <p className="text-destructive py-8 text-center">{error}</p>
  if (!data) return (
    <div className="flex flex-col items-center gap-4 py-16">
      <img src="/one-ring.svg" alt="" className="h-12 w-12 animate-spin" style={{ animationDuration: '3s' }} />
      <p className="font-subheading text-muted-foreground italic">Consulting the Palantir...</p>
    </div>
  )

  // Session-level aggregates
  const revealedRounds = data.rounds.filter((r) => r.status === 'REVEALED')
  const roundsWithConsensus = revealedRounds.filter((r) => {
    const vals = r.votes.map((v) => v.value).filter(Boolean)
    return vals.length > 1 && new Set(vals).size === 1
  })
  const roundsWithDivergence = summary?.rounds.filter((r) => r.divergence.isDiverged) ?? []

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-heading text-2xl tracking-wide text-elvish">{data.sessionName} — Chronicles</h1>

      {/* Session-level aggregate */}
      {data.rounds.length > 0 && (
        <div className="flex flex-wrap gap-3">
          <div className="rounded-lg border border-gold/20 bg-card px-4 py-3 text-center">
            <p className="font-heading text-2xl font-bold text-gold">{data.rounds.length}</p>
            <p className="font-subheading text-xs text-muted-foreground">Total Rounds</p>
          </div>
          <div className="rounded-lg border border-gold/20 bg-card px-4 py-3 text-center">
            <p className="font-heading text-2xl font-bold text-shire">{roundsWithConsensus.length}</p>
            <p className="font-subheading text-xs text-muted-foreground">Consensus</p>
          </div>
          <div className="rounded-lg border border-gold/20 bg-card px-4 py-3 text-center">
            <p className="font-heading text-2xl font-bold text-destructive">{roundsWithDivergence.length}</p>
            <p className="font-subheading text-xs text-muted-foreground">Divided</p>
          </div>
        </div>
      )}

      {data.rounds.length === 0 ? (
        <p className="text-muted-foreground">No rounds played yet.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {data.rounds.map((round) => {
            const roundSummary = summary?.rounds.find((r) => r.roundId === round.id) ?? null
            return (
              <div key={round.id} className="lotr-card !p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-subheading font-semibold">{round.topic ?? 'Untitled Round'}</h3>
                  <span className={`rounded px-2 py-1 text-xs font-medium ${round.status === 'REVEALED' ? 'bg-shire/10 text-shire' : 'bg-gold/10 text-gold'}`}>
                    {round.status}
                  </span>
                </div>

                {round.votes.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {round.votes.map((v) => (
                      <div key={v.participantId} className="flex items-center gap-1 rounded bg-background px-2 py-1 text-sm">
                        <span className="font-bold">{v.value}</span>
                        <span className="text-muted-foreground">— {v.displayName}</span>
                      </div>
                    ))}
                  </div>
                )}

                {roundSummary && (
                  <>
                    <RoundStatsBanner round={roundSummary} />
                    <VoteDistributionChart round={roundSummary} />
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}

      <a href={`/session/${inviteCode}`} className="font-subheading text-sm text-gold underline">
        Return to the Council
      </a>
    </div>
  )
}

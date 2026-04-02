'use client'

import type { RoundSummaryDto } from '@/application/dtos'

interface Props {
  round: RoundSummaryDto
}

export function RoundStatsBanner({ round }: Props) {
  const parts: string[] = []

  if (round.average !== null) parts.push(`Avg: ${round.average}`)
  if (round.median !== null) parts.push(`Median: ${round.median}`)
  if (round.mode !== null) parts.push(`Mode: ${round.mode}`)
  parts.push(`Votes: ${round.voteCount}`)

  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-gold/20 bg-muted/30 px-3 py-2 text-sm">
      {parts.map((part, i) => (
        <span key={i} className="font-subheading text-xs text-muted-foreground">
          {part}
        </span>
      ))}
      {round.divergence.isDiverged && round.divergence.min && round.divergence.max && (
        <span className="ml-auto font-subheading text-xs text-destructive/80">
          ⚔️ {round.divergence.min} – {round.divergence.max}
        </span>
      )}
    </div>
  )
}
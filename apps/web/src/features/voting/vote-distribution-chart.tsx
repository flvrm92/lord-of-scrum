'use client'

import type { RoundSummaryDto } from '@/application/dtos'

interface Props {
  round: RoundSummaryDto
}

export function VoteDistributionChart({ round }: Props) {
  const maxCount = round.distribution.reduce((m, e) => Math.max(m, e.count), 0)

  if (round.distribution.length === 0) {
    return null
  }

  return (
    <div className="mt-4 rounded-lg border border-gold/20 bg-card/60 p-4">
      <div className="mb-3 flex items-center gap-2">
        <h4 className="font-subheading text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Vote Distribution
        </h4>
        {round.divergence.isDiverged && (
          <span className="inline-flex items-center gap-1 rounded bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
            ⚔️ The Fellowship is divided!
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {round.distribution.map((entry) => {
          const isMode = entry.label === round.mode
          const widthPct = maxCount > 0 ? (entry.count / maxCount) * 100 : 0

          return (
            <div key={entry.label} className="flex items-center gap-3">
              {/* Label */}
              <div className="w-8 shrink-0 text-right font-subheading text-sm font-bold text-foreground">
                {entry.label}
              </div>

              {/* Bar */}
              <div className="relative h-6 flex-1 overflow-hidden rounded bg-muted/40">
                <div
                  className={`h-full rounded transition-all duration-500 ${
                    isMode ? 'bg-gold/70' : 'bg-elvish/40'
                  }`}
                  style={{ width: `${widthPct}%`, minWidth: widthPct > 0 ? '0.5rem' : '0' }}
                  aria-label={`${entry.count} vote${entry.count !== 1 ? 's' : ''}`}
                />
              </div>

              {/* Count + percentage */}
              <div className="w-16 shrink-0 text-right text-xs text-muted-foreground">
                {entry.count} <span className="text-muted-foreground/60">({entry.percentage}%)</span>
              </div>

              {/* Mode badge */}
              {isMode && (
                <span className="shrink-0 rounded bg-gold/20 px-1.5 py-0.5 font-subheading text-[10px] font-semibold text-gold">
                  mode
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
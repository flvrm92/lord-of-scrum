'use client'

import type { ParticipantDto, RoundDto } from '@/application/dtos'
import Image from 'next/image'

interface Props {
  participants: ParticipantDto[]
  currentRound: RoundDto | null
  currentParticipantId: string
}

export function ParticipantList({ participants, currentRound, currentParticipantId }: Props) {
  return (
    <div className="lotr-card !p-4">
      <h3 className="mb-3 flex items-center gap-2 font-subheading text-xs font-semibold uppercase tracking-widest text-gold">
        <Image src="/fellowship-shield.svg" alt="" className="h-4 w-4" />
        The Fellowship ({participants.length})
      </h3>
      <div className="flex flex-col gap-2">
        {participants.map((p) => {
          const hasVoted = currentRound?.votes.some((v) => v.participantId === p.id) ?? false
          const isMe = p.id === currentParticipantId

          return (
            <div
              key={p.id}
              className={`flex items-center justify-between rounded-md px-3 py-2 transition-colors ${isMe ? 'bg-elvish/5 ring-1 ring-elvish/20' : 'bg-background'}`}
            >
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${p.isActive ? 'bg-shire' : 'bg-muted-foreground/30'}`} />
                <span className="text-sm font-medium">
                  {p.displayName}
                  {isMe && <span className="text-muted-foreground"> (you)</span>}
                </span>
                {p.isHost && (
                  <span className="flex items-center gap-1 rounded bg-gold/10 px-1.5 py-0.5 text-xs font-medium text-gold">
                    <Image src="/fellowship-shield.svg" alt="" className="h-3 w-3" />
                    Steward
                  </span>
                )}
              </div>
              {currentRound && currentRound.status === 'VOTING' && (
                <span className={`text-xs ${hasVoted ? 'text-shire font-medium' : 'text-muted-foreground italic'}`}>
                  {hasVoted ? '✓ Scroll cast' : 'Pondering...'}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import type { ParticipantDto, RoundDto } from '@/application/dtos'

interface Props {
  participants: ParticipantDto[]
  currentRound: RoundDto | null
  currentParticipantId: string
  sessionId: string
  onParticipantRemoved: () => void
}

export function ParticipantList({ participants, currentRound, currentParticipantId, sessionId, onParticipantRemoved }: Props) {
  const [removingId, setRemovingId] = useState<string | null>(null)

  const currentParticipant = participants.find((p) => p.id === currentParticipantId)
  const isHost = currentParticipant?.isHost ?? false

  const handleRemove = async (target: ParticipantDto) => {
    const isSelf = target.id === currentParticipantId
    const confirmMsg = isSelf
      ? 'Leave the council? You will be marked inactive.'
      : `Dismiss ${target.displayName} from the council?`
    if (!confirm(confirmMsg)) return

    setRemovingId(target.id)
    try {
      await fetch(`/api/sessions/${sessionId}/participants/${target.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requesterId: currentParticipantId }),
      })
      onParticipantRemoved()
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <div className="lotr-card !p-4">
      <h3 className="mb-3 flex items-center gap-2 font-subheading text-xs font-semibold uppercase tracking-widest text-gold">
        <img src="/fellowship-shield.svg" alt="" className="h-4 w-4" />
        The Fellowship ({participants.length})
      </h3>
      <div className="flex flex-col gap-2">
        {participants.map((p) => {
          const hasVoted = currentRound?.votes.some((v) => v.participantId === p.id) ?? false
          const isMe = p.id === currentParticipantId
          const canRemove = isHost && !p.isHost
          const canLeave = isMe && !isHost

          return (
            <div
              key={p.id}
              className={`flex items-center justify-between rounded-md px-3 py-2 transition-colors ${isMe ? 'bg-elvish/5 ring-1 ring-elvish/20' : 'bg-background'}`}
            >
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${p.isActive ? 'bg-shire' : 'bg-muted-foreground/30'}`} />
                <div className="flex flex-col">
                  <span className="text-sm font-medium">
                    {p.displayName}
                    {isMe && <span className="text-muted-foreground"> (you)</span>}
                  </span>
                  {p.lotrTitle && (
                    <span className="text-[11px] italic text-gold/70">{p.lotrTitle}</span>
                  )}
                </div>
                {p.isHost && (
                  <span className="flex items-center gap-1 rounded bg-gold/10 px-1.5 py-0.5 text-xs font-medium text-gold">
                    <img src="/fellowship-shield.svg" alt="" className="h-3 w-3" />
                    Steward
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {currentRound && currentRound.status === 'VOTING' && (
                  <span className={`text-xs ${hasVoted ? 'text-shire font-medium' : 'text-muted-foreground italic'}`}>
                    {hasVoted ? '✓ Scroll cast' : 'Pondering...'}
                  </span>
                )}
                {(canRemove || canLeave) && (
                  <button
                    onClick={() => handleRemove(p)}
                    disabled={removingId === p.id}
                    title={canLeave ? 'Leave council' : `Dismiss ${p.displayName}`}
                    className="ml-1 rounded px-1.5 py-0.5 text-xs text-muted-foreground/50 transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
                  >
                    {removingId === p.id ? '…' : canLeave ? 'Leave' : '✕'}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

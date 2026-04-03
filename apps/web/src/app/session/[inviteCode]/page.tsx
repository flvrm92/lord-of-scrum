'use client'

import { useEffect, useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { getAblyClient } from '@/lib/ably-client'
import type { SessionDto, ParticipantDto } from '@/application/dtos'
import { VotingArea } from '@/features/voting/voting-area'
import { ParticipantList } from '@/features/participants/participant-list'
import { RoundControls } from '@/features/rounds/round-controls'

interface Props {
  params: { inviteCode: string }
}

export default function SessionPage({ params }: Props) {
  const { inviteCode } = params
  const queryClient = useQueryClient()
  const [participant, setParticipant] = useState<ParticipantDto | null>(null)
  const [sessionData, setSessionData] = useState<SessionDto | null>(null)
  const [fetchError, setFetchError] = useState('')

  // Fetch session by invite code, then match participant from localStorage
  useEffect(() => {
    let cancelled = false

    async function init() {
      try {
        // Pass stored participantId (if any) so the server reveals our own vote during VOTING
        const storedAll = Object.keys(localStorage)
          .filter((k) => k.startsWith('participant:'))
        // We don't know the sessionId yet — fetch without participantId first, then re-fetch with it
        const res = await fetch(`/api/sessions/by-invite/${encodeURIComponent(inviteCode)}`)
        if (!res.ok) throw new Error('Session not found')
        const data: SessionDto = await res.json()
        if (cancelled) return

        // Find stored participant for this specific session
        const stored = localStorage.getItem(`participant:${data.id}`)
        if (stored) {
          const p = JSON.parse(stored) as ParticipantDto
          const current = data.participants.find((pp) => pp.id === p.id)
          if (current) {
            setParticipant(current)
            // Re-fetch with participantId so own vote is visible
            const res2 = await fetch(`/api/sessions/by-invite/${encodeURIComponent(inviteCode)}?participantId=${encodeURIComponent(p.id)}`)
            if (!res2.ok || cancelled) { setSessionData(data); return }
            const data2: SessionDto = await res2.json()
            if (!cancelled) setSessionData(data2)
            return
          }
        }
        setSessionData(data)
        setFetchError('You have not joined this council.')
      } catch (err: unknown) {
        if (!cancelled) {
          setFetchError(err instanceof Error ? err.message : 'Failed to load session')
        }
      }
    }

    init()
    return () => { cancelled = true }
  }, [inviteCode])

  const fetchSession = useCallback(async (sessionId: string) => {
    try {
      const storedP = localStorage.getItem(`participant:${sessionId}`)
      const pid = storedP ? (JSON.parse(storedP) as ParticipantDto).id : null
      const url = pid
        ? `/api/sessions/${encodeURIComponent(sessionId)}?participantId=${encodeURIComponent(pid)}`
        : `/api/sessions/${encodeURIComponent(sessionId)}`
      const res = await fetch(url)
      if (!res.ok) throw new Error('Session not found')
      const data = await res.json()
      setSessionData(data)
      // Update participant from session data
      if (storedP) {
        const p = JSON.parse(storedP)
        const current = data.participants.find((pp: ParticipantDto) => pp.id === p.id)
        if (current) setParticipant(current)
      }
    } catch (err: unknown) {
      setFetchError(err instanceof Error ? err.message : 'Failed to load session')
    }
  }, [])

  // Subscribe to Ably for real-time updates
  useEffect(() => {
    if (!sessionData?.id) return

    const ably = getAblyClient()
    const channel = ably.channels.get(`session:${sessionData.id}`)

    const onMessage = () => {
      // Refresh session data on any event
      fetchSession(sessionData.id)
    }

    channel.subscribe(onMessage)
    return () => { channel.unsubscribe(onMessage) }
  }, [sessionData?.id, fetchSession])

  if (fetchError) {
    return (
      <div className="flex flex-col items-center gap-4 py-16">
        <img src="/tree-of-gondor.svg" alt="" className="h-16 w-16 text-muted-foreground/20" />
        <p className="font-subheading text-destructive">This path leads nowhere... The council has dispersed.</p>
        <a href="/" className="font-subheading text-sm text-gold underline">Return to the Shire</a>
      </div>
    )
  }

  // Dismissed state: participant is in the session but marked inactive
  if (sessionData && participant && !participant.isActive) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <img src="/tree-of-gondor.svg" alt="" className="h-16 w-16 text-muted-foreground/20" />
        <h2 className="font-heading text-2xl text-elvish">You have been dismissed from this council</h2>
        <p className="font-subheading text-muted-foreground italic">The Steward has spoken. Your counsel is no longer required.</p>
        <a href="/" className="font-subheading text-sm text-gold underline">Return to the Shire</a>
      </div>
    )
  }

  if (!sessionData || !participant) {
    return (
      <div className="flex flex-col items-center gap-4 py-16">
        <img src="/one-ring.svg" alt="" className="h-12 w-12 animate-spin" style={{ animationDuration: '3s' }} />
        <p className="font-subheading text-muted-foreground italic">Consulting the Palantir...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl tracking-wide text-elvish">{sessionData.name}</h1>
          <p className="text-sm text-muted-foreground">
            Fellowship Seal: <span className="animate-gold-sparkle font-mono font-bold tracking-widest text-gold">{sessionData.inviteCode}</span>
          </p>
        </div>
        <div className="text-right text-sm text-muted-foreground">
          <p>Playing as <span className="font-semibold text-foreground">{participant.displayName}</span></p>
          {participant.isHost && <span className="flex items-center justify-end gap-1 text-xs text-gold"><img src="/fellowship-shield.svg" alt="" className="h-3 w-3" /> Steward</span>}
        </div>
      </div>

      <div className="elvish-divider"><img src="/ring-inscription.svg" alt="" className="h-3 w-full max-w-xs opacity-40" /></div>

      <div className="grid gap-6 md:grid-cols-[1fr_280px]">
        <div className="flex flex-col gap-6">
          {participant.isHost && (
            <RoundControls
              sessionId={sessionData.id}
              participantId={participant.id}
              currentRound={sessionData.currentRound}
              inviteCode={inviteCode}
              onAction={() => fetchSession(sessionData.id)}
            />
          )}

          <VotingArea
            session={sessionData}
            participantId={participant.id}
            onVote={() => fetchSession(sessionData.id)}
          />
        </div>

        <ParticipantList
          participants={sessionData.participants}
          currentRound={sessionData.currentRound}
          currentParticipantId={participant.id}
          sessionId={sessionData.id}
          onParticipantRemoved={() => fetchSession(sessionData.id)}
        />
      </div>
    </div>
  )
}

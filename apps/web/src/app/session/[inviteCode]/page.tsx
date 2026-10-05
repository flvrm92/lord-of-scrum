'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getAblyClient } from '@/lib/ably-client'
import type { SessionDto, ParticipantDto } from '@/application/dtos'
import { readIdentity } from '@/lib/participant-identity'
import { resolveSessionEntry, type NotFoundReason, type SessionFetch } from '@/lib/session-entry'
import { buildJoinIntentUrl } from '@/lib/join-intent'
import { normalise } from '@/lib/invite-code'
import { VotingArea } from '@/features/voting/voting-area'
import { ParticipantList } from '@/features/participants/participant-list'
import { RoundControls } from '@/features/rounds/round-controls'

interface Props {
  params: { inviteCode: string }
}

/**
 * Three different things went wrong here and they used to share one line. An
 * archived council is closed rather than gone, and an unreachable one may be
 * perfectly alive — only `missing` earns the original wording.
 */
const NOT_FOUND_COPY: Record<NotFoundReason, string> = {
  missing: 'This path leads nowhere... The council has dispersed.',
  inactive: 'This council has adjourned. Its chronicles are sealed.',
  unreachable: 'The Palantir is clouded... the council could not be reached.',
}

async function fetchByInvite(inviteCode: string, participantId?: string): Promise<SessionFetch> {
  try {
    const query = participantId ? `?participantId=${encodeURIComponent(participantId)}` : ''
    const res = await fetch(`/api/sessions/by-invite/${encodeURIComponent(inviteCode)}${query}`)
    if (res.status === 404) return { ok: false, reason: 'missing' }
    if (!res.ok) return { ok: false, reason: 'unreachable' }
    return { ok: true, session: (await res.json()) as SessionDto }
  } catch {
    return { ok: false, reason: 'unreachable' }
  }
}

export default function SessionPage({ params }: Props) {
  // findByInviteCode is an exact lookup on upper-case codes, so a link that
  // reached the traveller lower-cased — chat clients and mail readers do this —
  // would 404 into the error screen while the same seal typed into the join
  // form works. Normalising here is the whole point of having the module.
  const inviteCode = normalise(params.inviteCode)
  const router = useRouter()
  const [participant, setParticipant] = useState<ParticipantDto | null>(null)
  const [sessionData, setSessionData] = useState<SessionDto | null>(null)
  const [notFound, setNotFound] = useState<NotFoundReason | null>(null)

  // Fetch, resolve, act. Nothing here decides anything: `resolveSessionEntry`
  // owns the decision, so all four outcomes are tested without a browser.
  useEffect(() => {
    let cancelled = false

    async function init() {
      const fetched = await fetchByInvite(inviteCode)
      if (cancelled) return

      const session = fetched.ok ? fetched.session : null
      const entry = resolveSessionEntry(fetched, session ? readIdentity(session.id) : null)

      switch (entry.kind) {
        case 'not-found':
          setNotFound(entry.reason)
          return

        case 'join-required':
          // `replace`, not `push`: Back then returns to whatever preceded the
          // link rather than re-entering the redirect. The loading state stays
          // on screen until the navigation lands.
          router.replace(buildJoinIntentUrl(inviteCode))
          return

        case 'dismissed':
          // Rendering is driven by `participant.isActive`, so this needs no flag
          // of its own — and a dismissal arriving mid-session over Ably reaches
          // the same screen through the refresh path.
          setParticipant(entry.participant)
          setSessionData(session)
          return

        case 'enter': {
          setParticipant(entry.participant)
          // Re-fetch with our own participantId so our vote is visible during VOTING.
          const withOwnVote = await fetchByInvite(inviteCode, entry.participant.id)
          if (cancelled) return
          setSessionData(withOwnVote.ok ? withOwnVote.session : session)
          return
        }
      }
    }

    init()
    return () => { cancelled = true }
  }, [inviteCode, router])

  // The refresh path deliberately does not re-resolve. `session:archived` is a
  // published Ably event, and running the resolver here would bounce seated
  // players out of a council archived under them while they were working.
  const fetchSession = useCallback(async (sessionId: string) => {
    const stored = readIdentity(sessionId)
    try {
      const url = stored
        ? `/api/sessions/${encodeURIComponent(sessionId)}?participantId=${encodeURIComponent(stored.id)}`
        : `/api/sessions/${encodeURIComponent(sessionId)}`
      const res = await fetch(url)
      if (!res.ok) throw new Error('Session not found')
      const data: SessionDto = await res.json()
      // A refresh that fails leaves the error screen up, and this page stays
      // mounted and subscribed, so without clearing it a single blip — a
      // redeploy mid-round — would wedge every open room until a reload.
      setNotFound(null)
      setSessionData(data)
      if (stored) {
        const current = data.participants.find((pp) => pp.id === stored.id)
        if (current) setParticipant(current)
      }
    } catch {
      setNotFound('unreachable')
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

  if (notFound) {
    return (
      <div data-testid="state-error" data-reason={notFound} className="flex flex-col items-center gap-4 py-16">
        <img src="/tree-of-gondor.svg" alt="" className="h-16 w-16 text-muted-foreground/20" />
        <p className="font-subheading text-destructive">{NOT_FOUND_COPY[notFound]}</p>
        <a href="/" className="font-subheading text-sm text-gold underline">Return to the Shire</a>
      </div>
    )
  }

  // Dismissed state: participant is in the session but marked inactive
  if (sessionData && participant && !participant.isActive) {
    return (
      <div data-testid="state-dismissed" className="flex flex-col items-center gap-4 py-16 text-center">
        <img src="/tree-of-gondor.svg" alt="" className="h-16 w-16 text-muted-foreground/20" />
        <h2 className="font-heading text-2xl text-elvish">You have been dismissed from this council</h2>
        <p className="font-subheading text-muted-foreground italic">The Steward has spoken. Your counsel is no longer required.</p>
        <a href="/" className="font-subheading text-sm text-gold underline">Return to the Shire</a>
      </div>
    )
  }

  // Also covers the gap between a `join-required` decision and the redirect
  // landing, so the error state never flashes on a valid link.
  if (!sessionData || !participant) {
    return (
      <div data-testid="state-loading" className="flex flex-col items-center gap-4 py-16">
        <img src="/one-ring.svg" alt="" className="h-12 w-12 animate-spin" style={{ animationDuration: '3s' }} />
        <p className="font-subheading text-muted-foreground italic">Consulting the Palantir...</p>
      </div>
    )
  }

  return (
    <div data-testid="room-root" className="flex animate-fade-in flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 data-testid="session-name" className="font-heading text-2xl tracking-wide text-elvish">{sessionData.name}</h1>
          <p className="text-sm text-muted-foreground">
            Fellowship Seal: <span data-testid="invite-code" className="animate-gold-sparkle font-mono font-bold tracking-widest text-gold">{sessionData.inviteCode}</span>
          </p>
        </div>
        <div className="text-right text-sm text-muted-foreground">
          <p>Playing as <span data-testid="current-player" className="font-semibold text-foreground">{participant.displayName}</span></p>
          {participant.isHost && <span data-testid="host-badge" className="flex items-center justify-end gap-1 text-xs text-gold"><img src="/fellowship-shield.svg" alt="" className="h-3 w-3" /> Steward</span>}
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

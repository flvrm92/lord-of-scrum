'use client'

import { useEffect, useState } from 'react'
import type { RoundDto } from '@/application/dtos'
import Image from 'next/image'

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
  const [error, setError] = useState('')

  useEffect(() => {
    // Find session ID from localStorage
    const keys = Object.keys(localStorage).filter((k) => k.startsWith('participant:'))
    for (const key of keys) {
      const sessionId = key.replace('participant:', '')
      fetch(`/api/sessions/${encodeURIComponent(sessionId)}/participants`)
        .then((r) => {
          if (r.ok) return r.json()
          throw new Error('Not found')
        })
        .then(setData)
        .catch(() => setError('Could not load results'))
      break
    }
  }, [inviteCode])

  if (error) return <p className="text-destructive py-8 text-center">{error}</p>
  if (!data) return (
    <div className="flex flex-col items-center gap-4 py-16">
      <Image src="/one-ring.svg" alt="" className="h-12 w-12 animate-spin" style={{ animationDuration: '3s' }} />
      <p className="font-subheading text-muted-foreground italic">Consulting the Palantir...</p>
    </div>
  )

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-heading text-2xl tracking-wide text-elvish">{data.sessionName} — Chronicles</h1>
      {data.rounds.length === 0 ? (
        <p className="text-muted-foreground">No rounds played yet.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {data.rounds.map((round) => (
            <div key={round.id} className="lotr-card !p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-subheading font-semibold">{round.topic}</h3>
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
            </div>
          ))}
        </div>
      )}
      <a href={`/session/${inviteCode}`} className="font-subheading text-sm text-gold underline">
        Return to the Council
      </a>
    </div>
  )
}

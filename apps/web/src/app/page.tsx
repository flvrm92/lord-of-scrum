'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import Image from 'next/image'
import type { ScaleDto } from '@/application/dtos'

export default function HomePage() {
  const router = useRouter()
  const [tab, setTab] = useState<'create' | 'join'>('create')

  // Create form state
  const [sessionName, setSessionName] = useState('')
  const [hostName, setHostName] = useState('')
  const [scaleId, setScaleId] = useState('')

  // Join form state
  const [inviteCode, setInviteCode] = useState('')
  const [joinName, setJoinName] = useState('')

  const [error, setError] = useState('')

  const { data: scales } = useQuery<ScaleDto[]>({
    queryKey: queryKeys.scales(),
    queryFn: () => fetch('/api/estimation-scales').then((r) => r.json()),
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: sessionName,
          scaleId: scaleId,
          hostDisplayName: hostName,
        }),
      })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error?.message || 'Failed to create session')
      }
      return res.json()
    },
    onSuccess: (data) => {
      localStorage.setItem(`participant:${data.id}`, JSON.stringify(data.participants[0]))
      router.push(`/session/${data.inviteCode}`)
    },
    onError: (err: Error) => setError(err.message),
  })

  const joinMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/sessions/join/${encodeURIComponent(inviteCode.toUpperCase().trim())}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: joinName }),
      })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error?.message || 'Failed to join session')
      }
      return res.json()
    },
    onSuccess: (data) => {
      localStorage.setItem(`participant:${data.session.id}`, JSON.stringify(data.participant))
      router.push(`/session/${data.session.inviteCode}`)
    },
    onError: (err: Error) => setError(err.message),
  })

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    createMutation.mutate()
  }

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    joinMutation.mutate()
  }

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="text-center">
        <Image src="/one-ring.svg" alt="" className="mx-auto mb-4 h-16 w-16 animate-ring-glow" />
        <h1 className="font-heading text-4xl tracking-wide text-gold">Lord of Scrum</h1>
        <p className="mt-3 max-w-sm text-sm text-muted-foreground italic">
          One tool to estimate them all, one tool to find consensus,<br />
          one tool to bring alignment and in the backlog bind them.
        </p>
      </div>

      <div className="elvish-divider w-full max-w-md">
        <Image src="/fellowship-shield.svg" alt="" className="h-5 w-5 opacity-40" />
      </div>

      <div className="lotr-card-ornate w-full max-w-md">
        <div className="mb-6 flex gap-2">
          <button
            onClick={() => { setTab('create'); setError('') }}
            className={`flex-1 rounded-md px-4 py-2 font-subheading text-sm font-medium transition-colors ${tab === 'create' ? 'bg-gold text-white' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}
          >
            Forge a Council
          </button>
          <button
            onClick={() => { setTab('join'); setError('') }}
            className={`flex-1 rounded-md px-4 py-2 font-subheading text-sm font-medium transition-colors ${tab === 'join' ? 'bg-gold text-white' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}
          >
            Join the Fellowship
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
        )}

        {tab === 'create' ? (
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <div>
              <label htmlFor="sessionName" className="mb-1 block text-sm font-medium font-subheading">Session Name</label>
              <input
                id="sessionName"
                type="text"
                required
                maxLength={100}
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                placeholder="The Council of Sprint 42"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label htmlFor="hostName" className="mb-1 block text-sm font-medium font-subheading">Your Display Name</label>
              <input
                id="hostName"
                type="text"
                required
                maxLength={30}
                value={hostName}
                onChange={(e) => setHostName(e.target.value)}
                placeholder="Gandalf the Grey"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label htmlFor="scale" className="mb-1 block text-sm font-medium font-subheading">Estimation Scale</label>
              <select
                id="scale"
                required
                value={scaleId}
                onChange={(e) => setScaleId(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Select a scale...</option>
                {scales?.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.values.map((v) => v.label).join(', ')})</option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="rounded-md bg-gold px-4 py-2.5 font-subheading text-sm font-medium text-white transition-all hover:bg-gold/90 hover:shadow-[0_0_12px_rgba(184,134,11,0.3)] disabled:opacity-50"
            >
              {createMutation.isPending ? 'Summoning...' : 'Summon the Council'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleJoin} className="flex flex-col gap-4">
            <div>
              <label htmlFor="inviteCode" className="mb-1 block text-sm font-medium font-subheading">Fellowship Seal</label>
              <input
                id="inviteCode"
                type="text"
                required
                maxLength={8}
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="ABCD1234"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono tracking-widest ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label htmlFor="joinName" className="mb-1 block text-sm font-medium font-subheading">Your Display Name</label>
              <input
                id="joinName"
                type="text"
                required
                maxLength={30}
                value={joinName}
                onChange={(e) => setJoinName(e.target.value)}
                placeholder="Legolas of Mirkwood"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <button
              type="submit"
              disabled={joinMutation.isPending}
              className="rounded-md bg-gold px-4 py-2.5 font-subheading text-sm font-medium text-white transition-all hover:bg-gold/90 hover:shadow-[0_0_12px_rgba(184,134,11,0.3)] disabled:opacity-50"
            >
              {joinMutation.isPending ? 'Seeking...' : 'Join the Fellowship'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

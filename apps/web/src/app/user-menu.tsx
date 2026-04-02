'use client'

import { useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import Image from 'next/image'

export function UserMenu() {
  const { data: session, status } = useSession()
  const [lotrTitle, setLotrTitle] = useState<string | null | undefined>(undefined)
  const [isRerolling, setIsRerolling] = useState(false)

  if (status === 'loading') {
    return <div className="h-8 w-8 animate-pulse rounded-full bg-parchment/10" />
  }

  if (!session?.user) {
    return (
      <a
        href="/auth/signin"
        className="rounded-md px-3 py-1.5 font-subheading text-sm text-parchment/70 transition-colors hover:text-ring"
      >
        Sign In
      </a>
    )
  }

  // Use local state (post-reroll) or fall back to session value
  const displayTitle = lotrTitle !== undefined ? lotrTitle : (session.user.lotrTitle ?? null)

  const initials = (session.user.name ?? session.user.email ?? '?')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const handleReroll = async () => {
    setIsRerolling(true)
    try {
      const res = await fetch('/api/users/me/reroll-title', { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setLotrTitle(data.lotrTitle)
      }
    } finally {
      setIsRerolling(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      {session.user.image ? (
        <Image
          src={session.user.image}
          alt=""
          width={32}
          height={32}
          className="h-7 w-7 rounded-full border border-gold/40"
          referrerPolicy="no-referrer"
        />
      ) : (
        <span className="flex h-7 w-7 items-center justify-center rounded-full border border-gold/40 bg-gold/20 text-xs font-bold text-parchment">
          {initials}
        </span>
      )}
      <div className="hidden flex-col sm:flex">
        <span className="font-subheading text-sm text-parchment/80">
          {session.user.name ?? 'Traveler'}
        </span>
        {displayTitle && (
          <div className="flex items-center gap-1">
            <span className="text-[11px] italic text-gold/70">{displayTitle}</span>
            <button
              onClick={handleReroll}
              disabled={isRerolling}
              title="Reroll title"
              className="text-[10px] text-parchment/30 transition-colors hover:text-gold/60 disabled:opacity-40"
            >
              {isRerolling ? '…' : '⟳'}
            </button>
          </div>
        )}
      </div>
      <button
        onClick={() => signOut({ callbackUrl: '/' })}
        className="rounded-md px-2 py-1 font-subheading text-xs text-parchment/50 transition-colors hover:text-ring"
      >
        Sign Out
      </button>
    </div>
  )
}

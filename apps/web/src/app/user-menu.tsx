'use client'

import { useSession, signOut } from 'next-auth/react'
import Image from 'next/image'

export function UserMenu() {
  const { data: session, status } = useSession()

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

  const initials = (session.user.name ?? session.user.email ?? '?')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

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
      <span className="hidden font-subheading text-sm text-parchment/80 sm:inline">
        {session.user.name ?? 'Traveler'}
      </span>
      <button
        onClick={() => signOut({ callbackUrl: '/' })}
        className="rounded-md px-2 py-1 font-subheading text-xs text-parchment/50 transition-colors hover:text-ring"
      >
        Sign Out
      </button>
    </div>
  )
}

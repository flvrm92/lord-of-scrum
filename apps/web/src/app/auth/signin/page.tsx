'use client'

import { signIn } from 'next-auth/react'

export default function SignInPage() {
  return (
    <div className="flex flex-col items-center gap-6 py-16">
      <img src="/one-ring.svg" alt="" className="h-14 w-14 animate-ring-glow" />
      <h1 className="font-heading text-2xl tracking-wide text-gold">Speak, Friend, and Enter</h1>
      <p className="text-sm text-muted-foreground italic">Present yourself to save your councils and track history.</p>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={() => signIn('github', { callbackUrl: '/' })}
          className="rounded-md bg-foreground px-4 py-2.5 font-subheading text-sm font-medium text-background transition-colors hover:opacity-90"
        >
          Continue with GitHub
        </button>
        <button
          onClick={() => signIn('google', { callbackUrl: '/' })}
          className="rounded-md border border-border bg-card px-4 py-2.5 font-subheading text-sm font-medium transition-colors hover:bg-secondary"
        >
          Continue with Google
        </button>
      </div>
      <a href="/" className="font-subheading text-sm text-muted-foreground underline">Return to the Shire</a>
    </div>
  )
}

import Image from 'next/image'

export default function HistoryPage() {
  return (
    <div className="flex flex-col items-center gap-6 py-16">
      <Image src="/tree-of-gondor.svg" alt="" className="h-20 w-20 text-muted-foreground/20" />
      <h1 className="font-heading text-2xl tracking-wide text-elvish">The Archives</h1>
      <p className="max-w-sm text-center text-sm text-muted-foreground italic">
        The chronicles of your past councils await.<br />Present yourself to the archives.
      </p>
      <a href="/auth/signin" className="rounded-md bg-gold px-5 py-2.5 font-subheading text-sm font-medium text-white transition-all hover:bg-gold/90 hover:shadow-[0_0_12px_rgba(184,134,11,0.3)]">
        Reveal Yourself
      </a>
    </div>
  )
}

import type { Metadata } from 'next'
import { Inter, Cinzel, Cinzel_Decorative } from 'next/font/google'
import { Providers } from './providers'
import { ThemeToggle } from './theme-toggle'
import '@/styles/globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const cinzel = Cinzel({ subsets: ['latin'], variable: '--font-cinzel', weight: ['400', '700'] })
const cinzelDecorative = Cinzel_Decorative({ subsets: ['latin'], variable: '--font-cinzel-decorative', weight: '400' })

export const metadata: Metadata = {
  title: 'Lord of Scrum - Planning Poker',
  description: 'A LOTR-themed Scrum Planning Poker tool for agile teams',
  icons: { icon: '/favicon.svg' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${cinzel.variable} ${cinzelDecorative.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{
          __html: `
          (function() {
            var t = localStorage.getItem('theme');
            if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
              document.documentElement.classList.add('dark');
            }
          })();
        `}} />
      </head>
      <body className="min-h-screen font-body antialiased">
        <Providers>
          <header className="border-b border-gold/20 bg-gradient-to-r from-mordor via-mordor-light to-mordor">
            <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
              <a href="/" className="flex items-center gap-3 group">
                <svg className="h-8 w-8 animate-ring-glow" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="50" cy="50" r="38" stroke="#b8860b" strokeWidth="6" />
                  <circle cx="50" cy="50" r="32" stroke="#ffd700" strokeWidth="1.5" opacity="0.5" />
                  <circle cx="50" cy="50" r="44" stroke="#b8860b" strokeWidth="1.5" opacity="0.3" />
                  <path d="M25 50 Q37 44, 50 50 Q63 56, 75 50" stroke="#ffd700" strokeWidth="1.5" fill="none" opacity="0.6" />
                </svg>
                <span className="font-heading text-xl text-parchment tracking-wide group-hover:text-ring transition-colors">
                  Lord of Scrum
                </span>
              </a>
              <ThemeToggle />
            </div>
          </header>
          <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
          <footer className="border-t border-border/50 py-6 text-center">
            <svg className="mx-auto mb-2 h-10 w-10 text-muted-foreground/30" viewBox="0 0 100 120" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path d="M50 10 C50 10, 35 25, 35 50 C35 65, 42 75, 50 80 C58 75, 65 65, 65 50 C65 25, 50 10, 50 10Z" />
              <line x1="50" y1="80" x2="50" y2="110" stroke="currentColor" strokeWidth="3" />
              <line x1="38" y1="95" x2="50" y2="85" stroke="currentColor" strokeWidth="2" />
              <line x1="62" y1="95" x2="50" y2="85" stroke="currentColor" strokeWidth="2" />
              <line x1="42" y1="105" x2="50" y2="95" stroke="currentColor" strokeWidth="1.5" />
              <line x1="58" y1="105" x2="50" y2="95" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            <p className="text-xs text-muted-foreground/50 font-subheading tracking-wider">
              Not all who estimate are lost
            </p>
          </footer>
        </Providers>
      </body>
    </html>
  )
}


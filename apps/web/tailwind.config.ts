import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        parchment: '#f5e6c8',
        'parchment-dark': '#d4c098',
        elvish: '#4a8b9e',
        'elvish-light': '#7fb8c9',
        mordor: '#1a1007',
        'mordor-light': '#3d2814',
        shire: '#3d6b4f',
        'shire-light': '#5f9a6e',
        gold: '#b8860b',
        'gold-light': '#d4a843',
        ring: '#ffd700',
        rohan: '#c4a265',
        mithril: '#c0c5ce',
        shadow: '#0d0d0d',
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      fontFamily: {
        heading: ['var(--font-cinzel-decorative)', 'serif'],
        subheading: ['var(--font-cinzel)', 'serif'],
        body: ['var(--font-inter)', 'sans-serif'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      /*
       * Only the keyframes consumed as `animate-*` utilities in JSX belong here.
       * Tailwind emits an `@keyframes` block only when it finds the matching
       * utility during its content scan of ./src, and it does not scan CSS — so
       * keyframes driven by component classes (`.lotr-*`, `.consensus-*`,
       * `.rivendell-*`, `.mordor-*`) are declared directly in
       * src/styles/globals.css instead. Declaring them here would silently drop
       * them from the bundle.
       */
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'ring-glow': {
          '0%, 100%': { filter: 'drop-shadow(0 0 4px #b8860b)' },
          '50%': { filter: 'drop-shadow(0 0 16px #ffd700)' },
        },
        'gold-sparkle': {
          '0%, 100%': { textShadow: '0 0 4px rgba(184, 134, 11, 0.4)' },
          '50%': { textShadow: '0 0 12px rgba(255, 215, 0, 0.8)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-in-out',
        'ring-glow': 'ring-glow 3s ease-in-out infinite',
        'gold-sparkle': 'gold-sparkle 2.5s ease-in-out infinite',
      },
    },
  },
}
export default config

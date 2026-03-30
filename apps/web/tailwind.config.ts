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
      keyframes: {
        'card-flip': {
          '0%': { transform: 'rotateY(0deg)' },
          '100%': { transform: 'rotateY(180deg)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'ring-glow': {
          '0%, 100%': { filter: 'drop-shadow(0 0 4px #b8860b)' },
          '50%': { filter: 'drop-shadow(0 0 16px #ffd700)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'gold-sparkle': {
          '0%, 100%': { textShadow: '0 0 4px rgba(184, 134, 11, 0.4)' },
          '50%': { textShadow: '0 0 12px rgba(255, 215, 0, 0.8)' },
        },
        'ring-reveal': {
          '0%': { transform: 'scale(0) rotate(-30deg)', opacity: '0' },
          '60%': { transform: 'scale(1.12) rotate(6deg)', opacity: '1' },
          '80%': { transform: 'scale(0.95) rotate(-2deg)' },
          '100%': { transform: 'scale(1) rotate(0deg)' },
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 12px rgba(255, 215, 0, 0.3), inset 0 0 12px rgba(255, 215, 0, 0.1)' },
          '50%': { boxShadow: '0 0 32px rgba(255, 215, 0, 0.6), inset 0 0 20px rgba(255, 215, 0, 0.2)' },
        },
        'inscription-reveal': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'card-celebrate': {
          '0%': { opacity: '0', transform: 'scale(0.92)', boxShadow: '0 0 0 rgba(255, 215, 0, 0)' },
          '50%': { opacity: '1', transform: 'scale(1.02)', boxShadow: '0 0 40px rgba(255, 215, 0, 0.5)' },
          '100%': { opacity: '1', transform: 'scale(1)', boxShadow: '0 0 12px rgba(255, 215, 0, 0.3)' },
        },
      },
      animation: {
        'card-flip': 'card-flip 0.6s ease-in-out',
        'fade-in': 'fade-in 0.3s ease-in-out',
        'ring-glow': 'ring-glow 3s ease-in-out infinite',
        shimmer: 'shimmer 2s ease-in-out infinite',
        'gold-sparkle': 'gold-sparkle 2.5s ease-in-out infinite',
        'ring-reveal': 'ring-reveal 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        'glow-pulse': 'glow-pulse 2.5s ease-in-out infinite',
        'inscription-reveal': 'inscription-reveal 0.6s ease-out forwards',
        'card-celebrate': 'card-celebrate 0.7s cubic-bezier(0.22, 1, 0.36, 1) both',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
export default config

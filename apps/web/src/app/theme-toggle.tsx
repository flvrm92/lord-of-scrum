'use client'

export function ThemeToggle() {
  return (
    <button
      aria-label="Toggle theme"
      className="rounded-md p-2 text-parchment/70 transition-colors hover:text-ring"
      onClick={() => {
        document.documentElement.classList.toggle('dark')
        localStorage.setItem(
          'theme',
          document.documentElement.classList.contains('dark') ? 'dark' : 'light'
        )
      }}
    >
      <svg className="h-5 w-5 dark:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
      </svg>
      <svg className="hidden h-5 w-5 dark:block" viewBox="0 0 100 100" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="50" cy="50" rx="40" ry="22" fill="none" stroke="currentColor" strokeWidth="3" />
        <ellipse cx="50" cy="50" rx="8" ry="18" fill="currentColor" />
      </svg>
    </button>
  )
}

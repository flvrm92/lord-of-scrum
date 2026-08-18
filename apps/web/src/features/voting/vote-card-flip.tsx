'use client'

interface Props {
  value: string | null
  displayName: string
  lotrTitle?: string | null
  /** False shows the card back; flipping to true plays the reveal. */
  flipped: boolean
  delayMs?: number
  className?: string
}

/**
 * A participant's vote as a physical card: face-down `card-back.svg` while the
 * round is hidden, flipping on its Y axis to expose the value on reveal.
 *
 * The 3D flip needs `preserve-3d` plus a back face pre-rotated 180° — see the
 * `.flip-card*` rules in `globals.css`. Under reduced motion the same CSS pins
 * the inner element to 0° so the value is simply there.
 */
export function VoteCardFlip({
  value,
  displayName,
  lotrTitle,
  flipped,
  delayMs = 0,
  className,
}: Props) {
  return (
    <div className={`flip-card h-24 ${className ?? ''}`}>
      <div
        className="flip-card-inner"
        data-flipped={flipped}
        style={{ transitionDelay: `${delayMs}ms` }}
      >
        {/* Face-up */}
        <div className="flip-card-face flip-card-front">
          <span className="font-subheading text-2xl font-bold text-gold">
            {value ?? '—'}
          </span>
          <span className="max-w-full truncate px-1 text-xs text-muted-foreground">
            {displayName}
          </span>
          {lotrTitle && (
            <span className="max-w-full truncate px-1 text-[10px] italic text-gold/60">
              {lotrTitle}
            </span>
          )}
        </div>

        {/* Face-down */}
        <div className="flip-card-face flip-card-back">
          <img
            src="/card-back.svg"
            alt=""
            aria-hidden="true"
            className="h-full w-full object-cover opacity-90"
          />
          <span className="sr-only">{displayName} has cast a vote</span>
        </div>
      </div>
    </div>
  )
}

import React from 'react'

/**
 * Animated SVG ghost mark — the GhostLayer brand icon.
 *
 * Variants:
 *   'tray'   — small (20 px), subtle float + glow, used in the status bar
 *   'idle'   — large (56 px), gentle float, used in the empty drop zone
 *
 * Animation is pure CSS (float + glow-pulse keyframes in index.css).
 */
interface Props {
  variant?: 'tray' | 'idle'
  className?: string
}

export function GhostLogo({ variant = 'tray', className = '' }: Props) {
  const size   = variant === 'idle' ? 56 : 22
  const animClass = variant === 'idle' ? 'ghost-logo ghost-logo--idle' : 'ghost-logo'

  return (
    <svg
      className={`${animClass} ${className}`.trim()}
      width={size}
      height={size}
      viewBox="0 0 24 26"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/*
        Ghost body:
          - Dome: semi-ellipse over the top half
          - Sides: straight down
          - Bottom: three upward scallops (classic ghost skirt)
      */}
      <path
        d="
          M 2 13
          A 10 11 0 0 1 22 13
          L 22 22
          Q 19.5 17 17 22
          Q 14.5 17 12 22
          Q 9.5  17  7 22
          Q 4.5  17  2 22
          Z
        "
        fill="currentColor"
        opacity="0.92"
      />

      {/* Eyes — dark ovals punched from the head dome */}
      <ellipse cx="8.5"  cy="11.5" rx="2"   ry="2.4" fill="var(--bg)" />
      <ellipse cx="15.5" cy="11.5" rx="2"   ry="2.4" fill="var(--bg)" />
    </svg>
  )
}

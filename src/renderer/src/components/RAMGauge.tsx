import React from 'react'
import type { RAMPressure } from '../../../shared/types'

interface Props {
  pressure:           RAMPressure | null
  workspaceUsedBytes: number
  workspaceMaxBytes:  number
}

function fmtBytes(b: number): string {
  if (b < 1024)        return `${b} B`
  if (b < 1024 ** 2)   return `${(b / 1024).toFixed(0)} KB`
  if (b < 1024 ** 3)   return `${(b / 1024 ** 2).toFixed(1)} MB`
  return `${(b / 1024 ** 3).toFixed(1)} GB`
}

/** Tiny inline ghost SVG — reused for both the bar marker and the legend chip */
function GhostMini({ size = 9, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={Math.round(size * 1.22)}
      viewBox="0 0 9 11"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      {/* Body + wavy hem */}
      <path d="M4.5 0C2.015 0 0 2.015 0 4.5V11l1.5-1.35 1.5 1.35 1.5-1.35L6 11l1.5-1.35L9 11V4.5C9 2.015 6.985 0 4.5 0z" />
      {/* Eyes */}
      <circle cx="3"   cy="4.8" r="0.9" fill="var(--bg)" />
      <circle cx="6"   cy="4.8" r="0.9" fill="var(--bg)" />
    </svg>
  )
}

export function RAMGauge({ pressure, workspaceUsedBytes, workspaceMaxBytes }: Props) {
  // ── Loading skeleton ──────────────────────────────────────────────────────────
  if (!pressure) {
    return (
      <div className="ram-gauge">
        <div className="ram-gauge__bar-shell ram-gauge__bar-shell--loading" />
        <div className="ram-gauge__legend">
          <span className="ram-chip ram-chip--dim">Reading system RAM…</span>
        </div>
      </div>
    )
  }

  const { systemFreeBytes, systemTotalBytes, pressure: level } = pressure
  const glUsed  = workspaceUsedBytes
  const glMax   = workspaceMaxBytes
  const total   = systemTotalBytes
  const free    = Math.max(0, systemFreeBytes)

  // ── Segment percentages ───────────────────────────────────────────────────────
  // Three clean zones that sum to ≤ 100%; free fills the rest via bar background.
  // Ghost used — GhostLayer's actively staged bytes
  const glPct      = total > 0 ? Math.min(100, (glUsed  / total) * 100) : 0
  // System used — everything else except GhostLayer and free
  const systemUsed = Math.max(0, total - free - glUsed)
  const sysPct     = total > 0 ? Math.max(0, Math.min(100 - glPct, (systemUsed / total) * 100)) : 0
  // Free fills remainder — rendered as the bar shell's own background colour

  // Workspace budget — fraction of GhostLayer's own capacity cap that is filled
  const budgetPct = glMax > 0 ? Math.min(100, (glUsed / glMax) * 100) : 0

  // Ghost pin position: nudge above 0 so the marker never clips off the left edge
  const pinLeft = Math.max(2, Math.min(98, glPct))

  return (
    <div className={`ram-gauge ram-gauge--${level}`} aria-label={`RAM: ghost ${fmtBytes(glUsed)}, system ${fmtBytes(systemUsed)}, free ${fmtBytes(free)} of ${fmtBytes(total)}`}>

      {/* ── Segmented system-RAM bar ──────────────────────────────────────── */}
      <div className="ram-gauge__bar-shell">

        {/* GL used — glowing accent segment */}
        <div
          className={`ram-gauge__seg ram-gauge__seg--gl ram-gauge__seg--${level}`}
          style={{ width: `${glPct}%` }}
        />

        {/* System used — muted slate */}
        <div
          className="ram-gauge__seg ram-gauge__seg--sys"
          style={{ width: `${sysPct}%` }}
        />

        {/* Free zone is the bar shell's own background — no element needed */}

        {/* Ghost haunts the GL/system boundary */}
        <div
          className={`ram-gauge__ghost-pin ram-gauge__ghost-pin--${level}`}
          style={{ left: `${pinLeft}%` }}
        >
          <GhostMini size={10} />
        </div>
      </div>

      {/* ── Legend chips ──────────────────────────────────────────────────── */}
      <div className="ram-gauge__legend">

        {/* Ghost chip */}
        <span className={`ram-chip ram-chip--gl ram-chip--${level}`}>
          <GhostMini size={7} className="ram-chip__icon" />
          <span className="ram-chip__bytes">{fmtBytes(glUsed)}</span>
          <span className="ram-chip__label">ghost</span>
        </span>

        {/* System chip */}
        <span className="ram-chip ram-chip--sys">
          <span className="ram-chip__dot ram-chip__dot--sys" />
          <span className="ram-chip__bytes">{fmtBytes(systemUsed)}</span>
          <span className="ram-chip__label">system</span>
        </span>

        {/* Free chip */}
        <span className="ram-chip ram-chip--free">
          <span className="ram-chip__dot ram-chip__dot--free" />
          <span className="ram-chip__bytes">{fmtBytes(free)}</span>
          <span className="ram-chip__label">free</span>
        </span>

        {/* Total — right-aligned */}
        <span className="ram-chip ram-chip--total">
          <span className="ram-chip__bytes">{fmtBytes(total)}</span>
          <span className="ram-chip__label">total</span>
        </span>

      </div>

      {/* ── Workspace budget bar (thin) ───────────────────────────────────── */}
      <div className="ram-gauge__budget">
        <div className="ram-gauge__budget-track" title={`Workspace cap: ${fmtBytes(glMax)}`}>
          <div
            className={`ram-gauge__budget-fill ram-gauge__budget-fill--${level}`}
            style={{ width: `${budgetPct}%` }}
          />
        </div>
        <span className="ram-gauge__budget-label">
          workspace&nbsp;
          <span className="ram-gauge__budget-val">{fmtBytes(glUsed)}</span>
          <span className="ram-gauge__budget-sep"> / </span>
          <span className="ram-gauge__budget-val">{fmtBytes(glMax)}</span>
          &nbsp;cap
        </span>
      </div>

    </div>
  )
}

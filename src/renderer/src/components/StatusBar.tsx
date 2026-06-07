import React from 'react'
import type { RAMPressure, WorkspaceStatus } from '../../../shared/types'
import { GhostLogo } from './GhostLogo'
import { RAMGauge }  from './RAMGauge'

interface Props {
  workspace:         WorkspaceStatus | null
  pressure:          RAMPressure | null
  onAutoWipeToggle:  (enabled: boolean) => void
}

export function StatusBar({ workspace, pressure, onAutoWipeToggle }: Props) {
  const isActive   = (workspace?.pendingCommitCount ?? 0) > 0
  const showWarn   = pressure && pressure.pressure !== 'ok'

  return (
    <header className={`status-bar${isActive ? ' status-bar--active' : ''}`}>

      {/* ── Row 1 — Brand + stat chips + auto-wipe ─────────────────────── */}
      <div className="status-bar__top">

        <div className="status-bar__brand">
          <GhostLogo variant="tray" />
          <div className="status-bar__brand-text">
            <span className="status-bar__app-name">GhostLayer</span>
            {/* GL-101: workspace name — real value from main, never hardcoded */}
            <span className="status-bar__workspace-name">
              {workspace?.name ?? 'Default Workspace'}
            </span>
          </div>
        </div>

        <div className="status-bar__stats">
          <span className="stat">
            <span className="stat__value">{workspace?.fileCount ?? 0}</span>
            <span className="stat__label">staged</span>
          </span>
          <span className="stat">
            <span className="stat__value">{workspace?.pendingCommitCount ?? 0}</span>
            <span className="stat__label">pending</span>
          </span>
        </div>

        {/* GL-603: tooltip makes the contract explicit — clean exit only, not crash */}
        <label
          className="auto-wipe-label"
          title="When ON: all staged files are wiped when GhostLayer closes cleanly. Does not apply to crashes."
        >
          <input
            type="checkbox"
            checked={workspace?.autoWipe ?? false}
            onChange={e => onAutoWipeToggle(e.target.checked)}
          />
          <span>Auto-wipe on exit</span>
        </label>
      </div>

      {/* ── Pressure warning (only appears at warn/critical) ────────────── */}
      {showWarn && (
        <div className={`pressure-banner pressure-banner--${pressure!.pressure}`}>
          ⚠ RAM headroom is low — commit or discard files to free space
        </div>
      )}

      {/* ── Row 2 — Ghost-themed RAM gauge ──────────────────────────────── */}
      <RAMGauge
        pressure={pressure}
        workspaceUsedBytes={workspace?.usedBytes ?? 0}
        workspaceMaxBytes={workspace?.maxBytes   ?? 0}
      />

    </header>
  )
}

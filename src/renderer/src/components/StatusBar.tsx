import React from 'react'
import type { RAMPressure, WorkspaceStatus } from '../../../shared/types'
import { GhostLogo } from './GhostLogo'

interface Props {
  workspace:         WorkspaceStatus | null
  pressure:          RAMPressure | null
  onAutoWipeToggle:  (enabled: boolean) => void
}

function fmtBytes(b: number): string {
  if (b < 1024)        return `${b} B`
  if (b < 1024 ** 2)   return `${(b / 1024).toFixed(0)} KB`
  if (b < 1024 ** 3)   return `${(b / 1024 ** 2).toFixed(1)} MB`
  return `${(b / 1024 ** 3).toFixed(2)} GB`
}

export function StatusBar({ workspace, pressure, onAutoWipeToggle }: Props) {
  const usedPct = workspace && workspace.maxBytes > 0
    ? Math.min(100, (workspace.usedBytes / workspace.maxBytes) * 100)
    : 0

  const barClass = `ram-bar__fill ram-bar__fill--${pressure?.pressure ?? 'ok'}`
  const showWarn = pressure && pressure.pressure !== 'ok'

  return (
    <header className="status-bar">
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
          <span className="stat__value">{workspace ? fmtBytes(workspace.usedBytes) : '—'}</span>
          <span className="stat__label">used</span>
        </span>
        <span className="stat">
          <span className="stat__value">{workspace?.fileCount ?? 0}</span>
          <span className="stat__label">staged</span>
        </span>
        <span className="stat">
          <span className="stat__value">{workspace?.pendingCommitCount ?? 0}</span>
          <span className="stat__label">pending</span>
        </span>
      </div>

      <div className="status-bar__ram">
        <div
          className="ram-bar"
          title={`${usedPct.toFixed(0)}% of ${workspace ? fmtBytes(workspace.maxBytes) : '—'} workspace cap`}
          role="progressbar"
          aria-valuenow={usedPct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className={barClass} style={{ width: `${usedPct}%` }} />
        </div>
      </div>

      {showWarn && (
        <div className={`pressure-banner pressure-banner--${pressure!.pressure}`}>
          ⚠ RAM headroom is low — commit or discard files to free space
        </div>
      )}

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
    </header>
  )
}

import React from 'react'
import { ToggleSwitch } from './ToggleSwitch'

// ─── Settings shape (also exported for App.tsx) ───────────────────────────────
export interface FilterSettings {
  showClean:     boolean   // show 'in RAM' (clean) rows
  showModified:  boolean   // show modified-in-RAM rows
  showCommitted: boolean   // show already-committed rows
  groupByStatus: boolean   // cluster rows under status headers
}

export interface BehaviorSettings {
  launchOnStartup: boolean  // via app.setLoginItemSettings IPC
  startMinimized:  boolean  // start to tray, not window
}

export interface UISettings {
  filters:  FilterSettings
  behavior: BehaviorSettings
}

export const DEFAULT_UI_SETTINGS: UISettings = {
  filters: {
    showClean:     true,
    showModified:  true,
    showCommitted: false,
    groupByStatus: false,
  },
  behavior: {
    launchOnStartup: false,
    startMinimized:  false,
  },
}

// ─── Component ────────────────────────────────────────────────────────────────
interface Props {
  settings:          UISettings
  autoWipe:          boolean
  onSettingsChange:  (s: UISettings) => void
  onAutoWipeChange:  (enabled: boolean) => void
  onClose:           () => void
}

function Row({
  label, desc, checked, onChange, disabled,
}: {
  label: string; desc: string
  checked: boolean; onChange: (v: boolean) => void; disabled?: boolean
}) {
  return (
    <div className="settings-panel__row">
      <div className="settings-panel__row-info">
        <span className="settings-panel__row-label">{label}</span>
        <span className="settings-panel__row-desc">{desc}</span>
      </div>
      <ToggleSwitch checked={checked} onChange={onChange} disabled={disabled} />
    </div>
  )
}

export function SettingsPanel({
  settings, autoWipe, onSettingsChange, onAutoWipeChange, onClose,
}: Props) {
  const f = settings.filters
  const b = settings.behavior

  const setFilters  = (patch: Partial<FilterSettings>)  =>
    onSettingsChange({ ...settings, filters:  { ...f, ...patch } })
  const setBehavior = (patch: Partial<BehaviorSettings>) =>
    onSettingsChange({ ...settings, behavior: { ...b, ...patch } })

  return (
    <>
      <div className="settings-panel__backdrop" onClick={onClose} />

      <div className="settings-panel" role="dialog" aria-label="Settings">
        {/* Header */}
        <div className="settings-panel__header">
          <span className="settings-panel__title">SETTINGS</span>
          <button className="settings-panel__close" onClick={onClose} aria-label="Close">
            <svg width="10" height="10" viewBox="0 0 10 10">
              <line x1="1" y1="1" x2="9" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="9" y1="1" x2="1" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className="settings-panel__body">

          {/* ── FILE FILTERS ─────────────────────────────────────────────── */}
          <section className="settings-panel__section">
            <h3 className="settings-panel__section-title">FILE FILTERS</h3>
            <Row
              label="Clean files"
              desc="Staged, unchanged in RAM"
              checked={f.showClean}
              onChange={v => setFilters({ showClean: v })}
            />
            <Row
              label="Modified files"
              desc="Edited since staging"
              checked={f.showModified}
              onChange={v => setFilters({ showModified: v })}
            />
            <Row
              label="Committed files"
              desc="Already written to disk"
              checked={f.showCommitted}
              onChange={v => setFilters({ showCommitted: v })}
            />
          </section>

          <div className="settings-panel__divider" />

          {/* ── DISPLAY ──────────────────────────────────────────────────── */}
          <section className="settings-panel__section">
            <h3 className="settings-panel__section-title">DISPLAY</h3>
            <Row
              label="Group by status"
              desc="Cluster files under status headers"
              checked={f.groupByStatus}
              onChange={v => setFilters({ groupByStatus: v })}
            />
          </section>

          <div className="settings-panel__divider" />

          {/* ── WORKSPACE ────────────────────────────────────────────────── */}
          <section className="settings-panel__section">
            <h3 className="settings-panel__section-title">WORKSPACE</h3>
            <Row
              label="Auto-wipe on exit"
              desc="Clear RAM on clean shutdown"
              checked={autoWipe}
              onChange={onAutoWipeChange}
            />
          </section>

          <div className="settings-panel__divider" />

          {/* ── SYSTEM ───────────────────────────────────────────────────── */}
          <section className="settings-panel__section">
            <h3 className="settings-panel__section-title">SYSTEM</h3>
            <Row
              label="Launch on startup"
              desc="Start with Windows"
              checked={b.launchOnStartup}
              onChange={v => setBehavior({ launchOnStartup: v })}
            />
            <Row
              label="Start minimized"
              desc="Launch to tray, not window"
              checked={b.startMinimized}
              onChange={v => setBehavior({ startMinimized: v })}
            />
          </section>

        </div>

        {/* Footer */}
        <div className="settings-panel__footer">
          GhostLayer v0.1.0 · Free · Local · No cloud
        </div>
      </div>
    </>
  )
}

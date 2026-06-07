import React, { useState } from 'react'
import { ProPanel } from './ProPanel'

interface Props {
  settingsOpen:    boolean
  onSettingsOpen:  () => void
}

/**
 * Custom frameless title bar — replaces the native Electron window chrome.
 * The drag region uses -webkit-app-region: drag (set in CSS).
 * Control buttons use -webkit-app-region: no-drag (set in CSS on .title-bar__controls).
 */
export function TitleBar({ settingsOpen, onSettingsOpen }: Props) {
  const win = window.ghostlayer.win
  const [suiteOpen, setSuiteOpen] = useState(false)

  return (
    <div className="title-bar">
      {suiteOpen && <ProPanel onClose={() => setSuiteOpen(false)} />}

      <div className="title-bar__drag" onDoubleClick={() => win.maximize()}>
        <span className="title-bar__dot" />
        <span className="title-bar__app-label">GHOSTLAYER</span>
        <span className="title-bar__free-tag">free · local</span>
      </div>

      <div className="title-bar__controls">
        {/* Settings */}
        <button
          className={`title-bar__btn title-bar__btn--settings${settingsOpen ? ' title-bar__btn--settings-active' : ''}`}
          onClick={onSettingsOpen}
          aria-label="Settings"
          tabIndex={-1}
          title="Settings"
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
            <circle cx="6.5" cy="6.5" r="2" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M6.5 1v1.2M6.5 10.8V12M12 6.5h-1.2M2.2 6.5H1M10.3 2.7l-.85.85M3.55 9.45l-.85.85M10.3 10.3l-.85-.85M3.55 3.55l-.85-.85"
              stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
        </button>

        {/* Suite panel toggle */}
        <button
          className={`title-bar__btn title-bar__btn--suite${suiteOpen ? ' title-bar__btn--suite-active' : ''}`}
          onClick={() => setSuiteOpen(v => !v)}
          aria-label="GhostLayer Suite"
          tabIndex={-1}
          title="More tools"
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
            <rect x="0.5" y="0.5" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2"/>
            <rect x="7.5" y="0.5" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2"/>
            <rect x="0.5" y="7.5" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2"/>
            <rect x="7.5" y="7.5" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2"/>
          </svg>
        </button>

        {/* Minimize */}
        <button
          className="title-bar__btn"
          onClick={() => win.minimize()}
          aria-label="Minimize"
          tabIndex={-1}
        >
          <svg width="11" height="2" viewBox="0 0 11 2" aria-hidden="true">
            <rect width="11" height="1.5" rx="0.75" fill="currentColor" />
          </svg>
        </button>

        {/* Maximize / restore */}
        <button
          className="title-bar__btn"
          onClick={() => win.maximize()}
          aria-label="Maximize"
          tabIndex={-1}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
            <rect x="0.75" y="0.75" width="8.5" height="8.5" rx="1.5"
              stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </button>

        {/* Close → hides to tray (matching native behaviour) */}
        <button
          className="title-bar__btn title-bar__btn--close"
          onClick={() => win.close()}
          aria-label="Close to tray"
          tabIndex={-1}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
            <line x1="1" y1="1" x2="9" y2="9"
              stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="9" y1="1" x2="1" y2="9"
              stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
    </div>
  )
}

import React from 'react'

/**
 * Custom frameless title bar — replaces the native Electron window chrome.
 * The drag region uses -webkit-app-region: drag (set in CSS).
 * Control buttons use -webkit-app-region: no-drag (set in CSS on .title-bar__controls).
 */
export function TitleBar() {
  const win = window.ghostlayer.win

  return (
    <div className="title-bar">
      <div className="title-bar__drag" onDoubleClick={() => win.maximize()}>
        <span className="title-bar__dot" />
        <span className="title-bar__app-label">GHOSTLAYER</span>
      </div>

      <div className="title-bar__controls">
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

import React from 'react'
import type { CrashState } from '../../../shared/types'

interface Props {
  state:     CrashState
  onDismiss: () => void
}

export function CrashDialog({ state, onDismiss }: Props) {
  const lost = state.lastManifestSnapshot
  const uncommitted = lost.filter(f => f.status !== 'committed')

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="crash-title">
      <div className="crash-dialog">
        <h2 id="crash-title" className="crash-dialog__title">
          GhostLayer wasn't shut down cleanly
        </h2>

        <p className="crash-dialog__body">
          Files staged in your last session were in RAM and{' '}
          <strong>could not be recovered</strong> after the unexpected exit.
        </p>
        <p className="crash-dialog__body">
          Only files you had already <strong>committed to disk</strong> were saved.
        </p>

        {uncommitted.length > 0 && (
          <details className="crash-dialog__details">
            <summary>
              What was lost ({uncommitted.length} file{uncommitted.length !== 1 ? 's' : ''})
            </summary>
            <ul className="crash-file-list">
              {uncommitted.map(f => (
                <li key={f.id} className="crash-file-list__item">
                  <span className="crash-file-list__name">{f.filename}</span>
                  <span className="crash-file-list__path" title={f.originalPath}>
                    {f.originalPath}
                  </span>
                  <span className={`badge badge--${f.status}`}>{f.status}</span>
                </li>
              ))}
            </ul>
          </details>
        )}

        <p className="crash-dialog__note">
          Tip: use <strong>Auto-wipe on exit</strong> if you never want staged files
          to linger, or <strong>Commit</strong> anything important before closing.
        </p>

        <button className="btn btn--primary" onClick={onDismiss}>
          OK, start fresh
        </button>
      </div>
    </div>
  )
}

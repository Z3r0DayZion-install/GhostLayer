import React, { useState } from 'react'

interface Props {
  fileCount:      number
  onCommitAll:    () => Promise<void>
  onDiscardAll:   () => Promise<void>
}

export function ActionBar({ fileCount, onCommitAll, onDiscardAll }: Props) {
  const [confirming, setConfirming] = useState(false)
  const [busy,       setBusy]       = useState(false)

  const handleCommitAll = async () => {
    setBusy(true)
    try { await onCommitAll() } finally { setBusy(false) }
  }

  const handleDiscardConfirm = async () => {
    setConfirming(false)
    setBusy(true)
    try { await onDiscardAll() } finally { setBusy(false) }
  }

  return (
    <footer className="action-bar">
      {confirming ? (
        // Inline confirmation — no modal blocking the full window
        <div className="discard-confirm">
          <span className="discard-confirm__text">
            Discard all {fileCount} file{fileCount !== 1 ? 's' : ''}?
            {' '}<span className="discard-confirm__sub">This cannot be undone.</span>
          </span>
          <button
            className="btn btn--danger"
            onClick={handleDiscardConfirm}
          >
            Yes, discard all
          </button>
          <button
            className="btn btn--ghost"
            onClick={() => setConfirming(false)}
          >
            Cancel
          </button>
        </div>
      ) : (
        <>
          <button
            className="btn btn--primary"
            onClick={handleCommitAll}
            disabled={fileCount === 0 || busy}
          >
            Commit all{fileCount > 0 ? ` (${fileCount})` : ''}
          </button>
          <button
            className="btn btn--danger"
            onClick={() => setConfirming(true)}
            disabled={fileCount === 0 || busy}
          >
            Discard all
          </button>
        </>
      )}
    </footer>
  )
}

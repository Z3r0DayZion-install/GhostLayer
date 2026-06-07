import React, { useState } from 'react'
import type { StagedFile } from '../../../shared/types'
import { ghostErrorMessage } from '../../../shared/types'
import { GhostLogo } from './GhostLogo'

const api = window.ghostlayer

const VANISH_MS = 400  // must match CSS animation duration

interface Props {
  files:     StagedFile[]
  onRefresh: () => void
  onError:   (msg: string) => void
}

// GL-302: explicit about RAM vs disk — never overclaim persistence
const STATUS_LABEL: Record<StagedFile['status'], string> = {
  clean:     'in RAM',
  modified:  'modified in RAM',
  committed: 'on disk',
  discarded: 'discarded',
}

const STATUS_TITLE: Record<StagedFile['status'], string> = {
  clean:     'Staged in RAM — not yet saved to disk',
  modified:  'Modified in RAM — changes not yet saved to disk',
  committed: 'Committed to disk',
  discarded: 'Discarded — removed from RAM workspace',
}

function fmtBytes(b: number): string {
  if (b < 1024 ** 2) return `${(b / 1024).toFixed(0)} KB`
  return `${(b / 1024 ** 2).toFixed(1)} MB`
}

function EmptyState() {
  return (
    <div className="drop-zone">
      <GhostLogo variant="idle" />
      <p className="drop-zone__heading">Drop files here to stage them</p>
      <p className="drop-zone__sub">Staged files live in RAM — nothing touches disk until you commit</p>
    </div>
  )
}

export function FileList({ files, onRefresh, onError }: Props) {
  const [exiting, setExiting] = useState<Set<string>>(new Set())

  const startExit = (fileId: string, action: () => Promise<void>) => {
    // Mark as exiting immediately so animation starts
    setExiting(prev => new Set(prev).add(fileId))
    // Fire API call after animation plays out, then refresh
    setTimeout(async () => {
      await action()
      onRefresh()
      setExiting(prev => { const next = new Set(prev); next.delete(fileId); return next })
    }, VANISH_MS - 20)
  }

  const visible = files.filter(f => f.status !== 'discarded')

  if (visible.length === 0) {
    return <main className="file-list file-list--empty"><EmptyState /></main>
  }

  // GL-951: surface commit error from individual row
  const handleCommit = (fileId: string) => {
    startExit(fileId, async () => {
      const result = await api.files.commit({ fileId })
      if (!result.success && result.error) onError(`Commit failed: ${result.error}`)
    })
  }

  const handleDiscard = (fileId: string) => {
    startExit(fileId, () => api.files.unstage(fileId))
  }

  return (
    <main className="file-list">
      <ul className="file-list__ul" role="list">
        {visible.map(file => (
          <li
            key={file.id}
            className={`file-row file-row--${file.status}${exiting.has(file.id) ? ' file-row--exiting' : ''}`}
            aria-label={`${file.filename}, ${STATUS_LABEL[file.status]}`}
          >
            {/* GL-203: show both filename and source path — source path is visible, not just a tooltip */}
            <span className="file-row__name-group">
              <span className="file-row__name">{file.filename}</span>
              <span className="file-row__source" title={file.originalPath}>
                {file.originalPath}
              </span>
            </span>
            <span className="file-row__size">{fmtBytes(file.sizeBytes)}</span>
            <span
              className={`badge badge--${file.status}`}
              title={STATUS_TITLE[file.status]}
            >
              {STATUS_LABEL[file.status]}
            </span>
            {/* GL-403: show committed destination path */}
            {file.status === 'committed' && file.committedPath && (
              <span className="file-row__dest" title={file.committedPath}>
                → {file.committedPath}
              </span>
            )}
            <div className="file-row__actions">
              {(file.status === 'clean' || file.status === 'modified') && (
                <>
                  <button
                    className="btn btn--sm btn--ghost"
                    onClick={() => handleCommit(file.id)}
                    disabled={exiting.has(file.id)}
                  >
                    Commit
                  </button>
                  <button
                    className="btn btn--sm btn--danger-ghost"
                    onClick={() => handleDiscard(file.id)}
                    disabled={exiting.has(file.id)}
                  >
                    Discard
                  </button>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
    </main>
  )
}

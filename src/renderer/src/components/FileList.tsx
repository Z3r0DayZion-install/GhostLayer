import React, { useState } from 'react'
import type { StagedFile } from '../../../shared/types'
import { ghostErrorMessage } from '../../../shared/types'
import { GhostLogo } from './GhostLogo'
import type { FilterSettings } from './SettingsPanel'

const api = window.ghostlayer

const VANISH_MS = 400  // must match CSS animation duration

const STATUS_GROUP_LABEL: Record<StagedFile['status'], string> = {
  clean:     'IN RAM',
  modified:  'MODIFIED',
  committed: 'COMMITTED',
  discarded: 'DISCARDED',
}
const STATUS_GROUP_ORDER: StagedFile['status'][] = ['clean', 'modified', 'committed']

interface Props {
  files:     StagedFile[]
  filters:   FilterSettings
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

export function FileList({ files, filters, onRefresh, onError }: Props) {
  const [exiting, setExiting] = useState<Set<string>>(new Set())

  const startExit = (fileId: string, action: () => Promise<void>) => {
    setExiting(prev => new Set(prev).add(fileId))
    setTimeout(async () => {
      await action()
      onRefresh()
      setExiting(prev => { const next = new Set(prev); next.delete(fileId); return next })
    }, VANISH_MS - 20)
  }

  // Apply filter toggles
  const visible = files.filter(f => {
    if (f.status === 'discarded') return false
    if (f.status === 'clean'     && !filters.showClean)     return false
    if (f.status === 'modified'  && !filters.showModified)  return false
    if (f.status === 'committed' && !filters.showCommitted) return false
    return true
  })

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

  // ── Single row renderer (reused for flat + grouped views) ──────────────────
  const renderRow = (file: StagedFile) => (
    <li
      key={file.id}
      className={`file-row file-row--${file.status}${exiting.has(file.id) ? ' file-row--exiting' : ''}`}
      aria-label={`${file.filename}, ${STATUS_LABEL[file.status]}`}
    >
      {/* GL-203: filename + source path as two stacked lines */}
      <span className="file-row__name-group">
        <span className="file-row__name">{file.filename}</span>
        <span className="file-row__source" title={file.originalPath}>{file.originalPath}</span>
      </span>
      <span className="file-row__size">{fmtBytes(file.sizeBytes)}</span>
      <span className={`badge badge--${file.status}`} title={STATUS_TITLE[file.status]}>
        {STATUS_LABEL[file.status]}
      </span>
      {/* GL-403: committed destination */}
      {file.status === 'committed' && file.committedPath && (
        <span className="file-row__dest" title={file.committedPath}>→ {file.committedPath}</span>
      )}
      <div className="file-row__actions">
        {(file.status === 'clean' || file.status === 'modified') && (
          <>
            <button
              className="btn btn--sm btn--ghost"
              onClick={() => handleCommit(file.id)}
              disabled={exiting.has(file.id)}
            >Commit</button>
            <button
              className="btn btn--sm btn--danger-ghost"
              onClick={() => handleDiscard(file.id)}
              disabled={exiting.has(file.id)}
            >Discard</button>
          </>
        )}
      </div>
    </li>
  )

  // ── Grouped view ─────────────────────────────────────────────────────────────
  if (filters.groupByStatus) {
    const groups = STATUS_GROUP_ORDER
      .map(status => ({ status, rows: visible.filter(f => f.status === status) }))
      .filter(g => g.rows.length > 0)

    return (
      <main className="file-list">
        {groups.map(({ status, rows }) => (
          <div key={status} className="file-group">
            <div className={`file-group__header file-group__header--${status}`}>
              <span className="file-group__label">{STATUS_GROUP_LABEL[status]}</span>
              <span className="file-group__count">{rows.length}</span>
            </div>
            <ul className="file-list__ul" role="list">
              {rows.map(renderRow)}
            </ul>
          </div>
        ))}
      </main>
    )
  }

  // ── Flat view (default) ───────────────────────────────────────────────────────
  return (
    <main className="file-list">
      <ul className="file-list__ul" role="list">
        {visible.map(renderRow)}
      </ul>
    </main>
  )
}

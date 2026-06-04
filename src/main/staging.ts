import fs from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'
import { getWorkspace } from './workspace'
import type { StagedFile, StageResult, ManifestSnapshot } from '../shared/types'

// ─── In-memory manifest ───────────────────────────────────────────────────────
// Keyed by file ID. Never persisted (RAM only — intentional).
const _manifest = new Map<string, StagedFile>()

export function getManifest(): StagedFile[] {
  return Array.from(_manifest.values())
}

/** Metadata-only snapshot used for crash recovery persistence. */
export function getManifestSnapshot(): ManifestSnapshot[] {
  return getManifest().map(({ id, filename, originalPath, sizeBytes, status, stagedAt }) => ({
    id, filename, originalPath, sizeBytes, status, stagedAt,
  }))
}

export function clearManifest(): void {
  _manifest.clear()
}

// ─── Limits ───────────────────────────────────────────────────────────────────
const FILE_SIZE_LIMIT = 2 * 1024 ** 3  // 2 GB

// ─── Stage ───────────────────────────────────────────────────────────────────
export async function stageFile(filePath: string): Promise<StageResult> {
  const ws = getWorkspace()
  if (!ws) return { ok: false, path: filePath, error: { code: 'WORKSPACE_NOT_ACTIVE' } }

  // GL-204: reject duplicate source — same originalPath already staged and not yet committed/discarded
  const existing = Array.from(_manifest.values()).find(
    f => f.originalPath === filePath && (f.status === 'clean' || f.status === 'modified')
  )
  if (existing) {
    return { ok: false, path: filePath, error: { code: 'DUPLICATE_SOURCE', existingId: existing.id } }
  }

  let stat: fs.Stats
  try {
    stat = await fs.promises.stat(filePath)
  } catch {
    return { ok: false, path: filePath, error: { code: 'FILE_NOT_FOUND', path: filePath } }
  }

  // GL-201: reject directories explicitly — readFile on a dir throws EISDIR uncaught
  if (stat.isDirectory()) {
    return { ok: false, path: filePath, error: { code: 'IS_DIRECTORY', path: filePath } }
  }

  if (stat.size > FILE_SIZE_LIMIT) {
    return { ok: false, path: filePath, error: { code: 'FILE_TOO_LARGE', maxBytes: FILE_SIZE_LIMIT } }
  }

  if (ws.wouldExceedCap(stat.size)) {
    return {
      ok: false,
      path: filePath,
      error: { code: 'RAM_PRESSURE', availableBytes: ws.maxBytes - ws.usedBytes },
    }
  }

  const fileId     = randomUUID()
  const filename   = path.basename(filePath)
  const stagedPath = `/workspace/${fileId}-${filename}`

  // Read from disk → write into memfs. Wrapped so permission errors surface cleanly.
  let contents: Buffer
  try {
    contents = await fs.promises.readFile(filePath)
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e)
    return { ok: false, path: filePath, error: { code: 'READ_FAILED', reason } }
  }
  ws.fs.writeFileSync(stagedPath, contents)
  ws.addBytes(stat.size)

  const entry: StagedFile = {
    id:           fileId,
    filename,
    originalPath: filePath,
    stagedPath,
    sizeBytes:    stat.size,
    status:       'clean',
    stagedAt:     Date.now(),
  }

  _manifest.set(fileId, entry)
  return { ok: true, file: entry }
}

// ─── Unstage ─────────────────────────────────────────────────────────────────
export function unstageFile(fileId: string): void {
  const entry = _manifest.get(fileId)
  if (!entry) return

  const ws = getWorkspace()
  if (ws) {
    try { ws.fs.unlinkSync(entry.stagedPath) } catch { /* already gone */ }
    ws.removeBytes(entry.sizeBytes)
  }

  // Keep the entry visible in UI as 'discarded' rather than silently removing it
  _manifest.set(fileId, { ...entry, status: 'discarded' })
}

// ─── Status updates ──────────────────────────────────────────────────────────
export function markModified(fileId: string): void {
  const entry = _manifest.get(fileId)
  if (entry) _manifest.set(fileId, { ...entry, status: 'modified', modifiedAt: Date.now() })
}

/** GL-403: store committed destination so renderer can display final disk path. */
export function markCommitted(fileId: string, committedPath: string): void {
  const entry = _manifest.get(fileId)
  if (entry) _manifest.set(fileId, { ...entry, status: 'committed', committedPath, modifiedAt: Date.now() })
}

import fs from 'fs'
import path from 'path'
import { getWorkspace } from './workspace'
import { getManifest, markCommitted } from './staging'
import type { CommitOptions, CommitResult } from '../shared/types'

// ─── Commit single file ───────────────────────────────────────────────────────
export async function commitFile(options: CommitOptions): Promise<CommitResult> {
  const ws = getWorkspace()
  if (!ws) return { fileId: options.fileId, success: false, error: 'No active workspace' }

  const entry = getManifest().find(f => f.id === options.fileId)
  if (!entry)             return { fileId: options.fileId, success: false, error: 'File not found in staging manifest' }
  if (entry.status === 'discarded') return { fileId: options.fileId, success: false, error: 'File has been discarded' }
  if (entry.status === 'committed') return { fileId: options.fileId, success: true, destination: entry.committedPath ?? entry.originalPath }

  const destination = options.destination ?? entry.originalPath
  const tmpPath     = destination + '.ghostlayer-tmp'

  try {
    // Read from memfs
    const contents = ws.fs.readFileSync(entry.stagedPath) as Buffer

    // Ensure destination directory exists
    await fs.promises.mkdir(path.dirname(destination), { recursive: true })

    // Atomic-ish write: tmp + rename (works within same volume)
    await fs.promises.writeFile(tmpPath, contents)
    await fs.promises.rename(tmpPath, destination)

    markCommitted(entry.id, destination)   // GL-403
    return { fileId: entry.id, success: true, destination }
  } catch (err) {
    // Best-effort cleanup of tmp file
    try { await fs.promises.unlink(tmpPath) } catch { /* ignore */ }
    const message = err instanceof Error ? err.message : String(err)
    return { fileId: entry.id, success: false, error: message }
  }
}

// ─── Commit all pending files ─────────────────────────────────────────────────
export async function commitAll(): Promise<CommitResult[]> {
  const pending = getManifest().filter(f => f.status === 'clean' || f.status === 'modified')
  // Run in parallel — each file is independent
  return Promise.all(pending.map(f => commitFile({ fileId: f.id })))
}

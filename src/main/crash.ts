/**
 * Crash detection via a session-open flag written to userData.
 *
 * Policy (see CRASH-002 in SPEC.md):
 *   RAM workspace contents are NOT recoverable after an unexpected exit.
 *   We persist metadata only (filenames, paths, sizes) so the user knows
 *   what they lost. File contents are never written here.
 */

import { app } from 'electron'
import path from 'path'
import fs from 'fs'
import type { ManifestSnapshot } from '../shared/types'

interface CrashStore {
  sessionOpen:          boolean
  lastManifestSnapshot: ManifestSnapshot[]
  autoWipe:             boolean   // GL-602: persisted preference, survives restart
}

const DEFAULTS: CrashStore = { sessionOpen: false, lastManifestSnapshot: [], autoWipe: false }

function storePath(): string {
  return path.join(app.getPath('userData'), 'crash-state.json')
}

function read(): CrashStore {
  try {
    return JSON.parse(fs.readFileSync(storePath(), 'utf-8')) as CrashStore
  } catch {
    return { ...DEFAULTS }
  }
}

function write(data: CrashStore): void {
  try {
    // Synchronous write — this must survive a kill signal
    fs.writeFileSync(storePath(), JSON.stringify(data, null, 2), 'utf-8')
  } catch { /* best effort */ }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function markSessionOpen(): void {
  write({ ...read(), sessionOpen: true })
}

export function markSessionClosed(): void {
  write({ ...read(), sessionOpen: false, lastManifestSnapshot: [] })
}

/** Returns true if the previous session did not exit cleanly. */
export function checkForCrash(): boolean {
  return read().sessionOpen
}

/**
 * Called on every manifest mutation (add / remove / status change).
 * Stores metadata only — never file contents.
 * Max 1000 entries; trims oldest first.
 */
export function persistManifestSnapshot(snapshot: ManifestSnapshot[]): void {
  write({ ...read(), lastManifestSnapshot: snapshot.slice(-1000) })
}

export function getLastManifestSnapshot(): ManifestSnapshot[] {
  return read().lastManifestSnapshot
}

export function clearCrashState(): void {
  write({ ...read(), sessionOpen: false, lastManifestSnapshot: [] })
}

// ─── Auto-wipe preference (GL-602) ───────────────────────────────────────────

/** Persist auto-wipe toggle so it survives app restarts. */
export function persistAutoWipe(enabled: boolean): void {
  write({ ...read(), autoWipe: enabled })
}

/** Load persisted auto-wipe preference (false if never set). */
export function getPersistedAutoWipe(): boolean {
  return read().autoWipe
}

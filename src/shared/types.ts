// ─────────────────────────────────────────────────────────────────────────────
// IPC channel names — single source of truth for main ↔ renderer communication
// ─────────────────────────────────────────────────────────────────────────────
export const IPC = {
  WORKSPACE_GET_CURRENT: 'workspace:getCurrent',  // GL-101: guaranteed non-null, creates default if needed
  WORKSPACE_CREATE:      'workspace:create',
  WORKSPACE_DESTROY:     'workspace:destroy',
  WORKSPACE_STATUS:      'workspace:status',
  FILE_STAGE:        'file:stage',
  FILE_UNSTAGE:      'file:unstage',
  FILE_COMMIT:       'file:commit',
  FILE_COMMIT_ALL:   'file:commit-all',
  MANIFEST_GET:      'manifest:get',
  WIPE_TOGGLE:       'wipe:toggle',
  WIPE_NOW:          'wipe:now',
  CRASH_STATUS:      'crash:status',
  CRASH_DISMISS:     'crash:dismiss',
  RAM_PRESSURE:      'ram:pressure',
} as const

// ─────────────────────────────────────────────────────────────────────────────
// Workspace
// ─────────────────────────────────────────────────────────────────────────────
export interface WorkspaceStatus {
  id: string
  name: string          // GL-101: human-readable workspace name ("Default Workspace")
  createdAt: number
  usedBytes: number
  maxBytes: number
  fileCount: number
  pendingCommitCount: number
  autoWipe: boolean
  active: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// Staged files
// ─────────────────────────────────────────────────────────────────────────────
export type FileStatus = 'clean' | 'modified' | 'committed' | 'discarded'

export interface StagedFile {
  id: string
  filename: string
  originalPath: string
  stagedPath: string       // path within memfs — not a real FS path
  sizeBytes: number
  status: FileStatus
  stagedAt: number
  modifiedAt?: number
  committedPath?: string   // GL-403: populated on successful commit
}

// Metadata-only snapshot (persisted to disk for crash recovery — no file contents)
export type ManifestSnapshot = Pick<
  StagedFile,
  'id' | 'filename' | 'originalPath' | 'sizeBytes' | 'status' | 'stagedAt'
>

// ─────────────────────────────────────────────────────────────────────────────
// Commit
// ─────────────────────────────────────────────────────────────────────────────
export interface CommitOptions {
  fileId: string
  destination?: string  // omit → overwrite originalPath
}

export interface CommitResult {
  fileId: string
  success: boolean
  destination?: string
  error?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Stage result
// ─────────────────────────────────────────────────────────────────────────────
export type StageResult =
  | { ok: true;  file: StagedFile }
  | { ok: false; path: string; error: GhostError }

// ─────────────────────────────────────────────────────────────────────────────
// Crash state
// ─────────────────────────────────────────────────────────────────────────────
export interface CrashState {
  crashDetected: boolean
  lastManifestSnapshot: ManifestSnapshot[]
}

// ─────────────────────────────────────────────────────────────────────────────
// RAM pressure
// ─────────────────────────────────────────────────────────────────────────────
export interface RAMPressure {
  workspaceUsedBytes: number
  workspaceMaxBytes:  number
  systemFreeBytes:    number
  systemTotalBytes:   number
  pressure: 'ok' | 'warn' | 'critical'
}

// ─────────────────────────────────────────────────────────────────────────────
// Typed errors
// ─────────────────────────────────────────────────────────────────────────────
export type GhostError =
  | { code: 'WORKSPACE_NOT_ACTIVE' }
  | { code: 'FILE_TOO_LARGE';     maxBytes: number }
  | { code: 'RAM_PRESSURE';       availableBytes: number }
  | { code: 'COMMIT_FAILED';      reason: string }
  | { code: 'FILE_NOT_FOUND';     path: string }
  | { code: 'IS_DIRECTORY';       path: string }         // GL-201: folders rejected at ingest
  | { code: 'READ_FAILED';        reason: string }       // GL-201: unreadable file
  | { code: 'STAGE_FAILED';       reason: string }       // GL-202: memfs write failed
  | { code: 'ALREADY_DISCARDED';  fileId: string }
  | { code: 'DUPLICATE_SOURCE';   existingId: string }   // GL-204

/** Human-readable message for any GhostError code. */
export function ghostErrorMessage(e: GhostError): string {
  switch (e.code) {
    case 'WORKSPACE_NOT_ACTIVE': return 'No active workspace. Restart GhostLayer.'
    case 'FILE_TOO_LARGE':       return `File is too large (max ${fmtBytes(e.maxBytes)}).`
    case 'RAM_PRESSURE':         return `Not enough workspace headroom (${fmtBytes(e.availableBytes)} free). Commit or discard files first.`
    case 'COMMIT_FAILED':        return `Commit failed: ${e.reason}`
    case 'FILE_NOT_FOUND':       return `File not found: ${e.path}`
    case 'IS_DIRECTORY':         return `Folders cannot be staged — drop a file instead.`
    case 'READ_FAILED':          return `Could not read file: ${e.reason}`
    case 'STAGE_FAILED':         return `Staging failed: ${e.reason}`
    case 'ALREADY_DISCARDED':    return 'File was already discarded.'
    case 'DUPLICATE_SOURCE':     return 'This file is already staged. Discard or commit the existing copy first.'
  }
}

function fmtBytes(b: number): string {
  if (b < 1024 ** 2) return `${(b / 1024).toFixed(0)} KB`
  if (b < 1024 ** 3) return `${(b / 1024 ** 2).toFixed(1)} MB`
  return `${(b / 1024 ** 3).toFixed(2)} GB`
}

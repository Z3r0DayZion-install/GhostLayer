import { Volume, createFsFromVolume } from 'memfs'
import { randomUUID } from 'crypto'
import os from 'os'
import type { WorkspaceStatus } from '../shared/types'

// ─── Limits ──────────────────────────────────────────────────────────────────
const RAM_FRACTION  = 0.25                // use up to 25% of total system RAM
const RAM_MAX_BYTES = 4 * 1024 ** 3      // hard ceiling: 4 GB

// ─── Workspace class ─────────────────────────────────────────────────────────
export class Workspace {
  readonly id:        string
  readonly name:      string    // GL-101: human-readable name, visible in UI
  readonly createdAt: number
  readonly maxBytes:  number

  private _vol:        InstanceType<typeof Volume>
  readonly fs:         ReturnType<typeof createFsFromVolume>

  private _usedBytes   = 0
  private _autoWipe    = false

  constructor(name = 'Default Workspace', autoWipe = false) {
    this.id        = randomUUID()
    this.name      = name
    this.createdAt = Date.now()
    this.maxBytes  = Math.min(
      Math.floor(os.totalmem() * RAM_FRACTION),
      RAM_MAX_BYTES
    )
    this._autoWipe = autoWipe   // GL-602: restored from persisted preference

    this._vol = new Volume()
    this.fs   = createFsFromVolume(this._vol)
    this.fs.mkdirSync('/workspace', { recursive: true })
  }

  get usedBytes(): number  { return this._usedBytes }
  get autoWipe():  boolean { return this._autoWipe  }
  set autoWipe(v:  boolean) { this._autoWipe = v    }

  addBytes(n: number):    void { this._usedBytes += n }
  removeBytes(n: number): void { this._usedBytes = Math.max(0, this._usedBytes - n) }

  wouldExceedCap(additionalBytes: number): boolean {
    return this._usedBytes + additionalBytes > this.maxBytes
  }

  /** Wipe all in-memory content. O(1) — just resets the Volume. */
  destroy(): void {
    this._vol.reset()
    this._usedBytes = 0
  }

  status(fileCount: number, pendingCommitCount: number): WorkspaceStatus {
    return {
      id:                 this.id,
      name:               this.name,
      createdAt:          this.createdAt,
      usedBytes:          this._usedBytes,
      maxBytes:           this.maxBytes,
      fileCount,
      pendingCommitCount,
      autoWipe:           this._autoWipe,
      active:             true,
    }
  }
}

// ─── Singleton — one workspace for MVP (free tier: single slot) ──────────────
let _active: Workspace | null = null

export function getWorkspace(): Workspace | null { return _active }

export function createWorkspace(autoWipe = false, name = 'Default Workspace'): Workspace {
  if (_active) _active.destroy()   // single-slot invariant
  _active = new Workspace(name, autoWipe)
  return _active
}

/**
 * GL-101: guarantee one workspace always exists.
 * Called by workspace:getCurrent — safe to call from any code path.
 */
export function ensureDefaultWorkspace(autoWipe = false): Workspace {
  if (!_active) _active = new Workspace('Default Workspace', autoWipe)
  return _active
}

export function destroyWorkspace(): void {
  _active?.destroy()
  _active = null
}

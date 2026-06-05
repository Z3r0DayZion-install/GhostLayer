import { ipcMain } from 'electron'
import { IPC } from '../shared/types'
import { createWorkspace, destroyWorkspace, getWorkspace, ensureDefaultWorkspace } from './workspace'
import {
  stageFile, unstageFile,
  getManifest, getManifestSnapshot,
  clearManifest,
} from './staging'
import { commitFile, commitAll }       from './commit'
import { discardAll, toggleAutoWipe }  from './wipe'
import {
  checkForCrash, clearCrashState,
  getLastManifestSnapshot,
  persistManifestSnapshot,
} from './crash'
import { getRAMPressure } from './pressure'
import type { CommitOptions } from '../shared/types'

// Helper: sync manifest snapshot to disk after every mutation
function snapshotAfter<T>(fn: () => T): T {
  const result = fn()
  persistManifestSnapshot(getManifestSnapshot())
  return result
}

async function snapshotAfterAsync<T>(fn: () => Promise<T>): Promise<T> {
  const result = await fn()
  persistManifestSnapshot(getManifestSnapshot())
  return result
}

export function registerIpcHandlers(): void {

  // ── Workspace ───────────────────────────────────────────────────────────────

  // GL-101: always returns a workspace — creates the default if somehow none exists.
  // This is the canonical first call from the renderer on boot.
  ipcMain.handle(IPC.WORKSPACE_GET_CURRENT, () => {
    const ws = ensureDefaultWorkspace()
    const manifest = getManifest()
    const pending  = manifest.filter(f => f.status === 'clean' || f.status === 'modified').length
    return ws.status(manifest.length, pending)
  })

  ipcMain.handle(IPC.WORKSPACE_CREATE, () => {
    const ws = createWorkspace()
    return ws.status(0, 0)
  })

  ipcMain.handle(IPC.WORKSPACE_DESTROY, () => {
    discardAll()
  })

  ipcMain.handle(IPC.WORKSPACE_STATUS, () => {
    const ws = getWorkspace()
    if (!ws) return null
    const manifest = getManifest()
    const pending  = manifest.filter(f => f.status === 'clean' || f.status === 'modified').length
    return ws.status(manifest.length, pending)
  })

  // ── Files ───────────────────────────────────────────────────────────────────

  ipcMain.handle(IPC.FILE_STAGE, async (_e, filePaths: string[]) => {
    return snapshotAfterAsync(() =>
      Promise.all(filePaths.map(p => stageFile(p)))
    )
  })

  ipcMain.handle(IPC.FILE_UNSTAGE, (_e, fileId: string) => {
    snapshotAfter(() => unstageFile(fileId))
  })

  ipcMain.handle(IPC.FILE_COMMIT, async (_e, options: CommitOptions) => {
    return snapshotAfterAsync(() => commitFile(options))
  })

  ipcMain.handle(IPC.FILE_COMMIT_ALL, async () => {
    return snapshotAfterAsync(() => commitAll())
  })

  ipcMain.handle(IPC.MANIFEST_GET, () => getManifest())

  // ── Wipe ─────────────────────────────────────────────────────────────────────

  ipcMain.handle(IPC.WIPE_TOGGLE, (_e, enabled: boolean) => {
    toggleAutoWipe(enabled)
  })

  ipcMain.handle(IPC.WIPE_NOW, () => {
    discardAll()
    clearManifest()
    persistManifestSnapshot([])
    ensureDefaultWorkspace()   // post-wipe reinit: app must be ready to stage files again immediately
  })

  // ── Crash ────────────────────────────────────────────────────────────────────

  ipcMain.handle(IPC.CRASH_STATUS, () => ({
    crashDetected:        checkForCrash(),
    lastManifestSnapshot: checkForCrash() ? getLastManifestSnapshot() : [],
  }))

  ipcMain.handle(IPC.CRASH_DISMISS, () => clearCrashState())

  // ── RAM pressure ─────────────────────────────────────────────────────────────

  ipcMain.handle(IPC.RAM_PRESSURE, () => getRAMPressure())
}

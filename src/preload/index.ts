import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../shared/types'
import type {
  WorkspaceStatus, StagedFile, StageResult,
  CommitOptions, CommitResult,
  CrashState, RAMPressure,
} from '../shared/types'

// ─── The surface exposed to the renderer ────────────────────────────────────
// Nothing beyond this object reaches the renderer. No nodeIntegration.
const api = {
  workspace: {
    // GL-101: guaranteed non-null — use this on boot to seed workspace state
    getCurrent: ():                   Promise<WorkspaceStatus>       => ipcRenderer.invoke(IPC.WORKSPACE_GET_CURRENT),
    create:  ():                      Promise<WorkspaceStatus>       => ipcRenderer.invoke(IPC.WORKSPACE_CREATE),
    destroy: ():                      Promise<void>                  => ipcRenderer.invoke(IPC.WORKSPACE_DESTROY),
    status:  ():                      Promise<WorkspaceStatus | null>=> ipcRenderer.invoke(IPC.WORKSPACE_STATUS),
  },

  files: {
    stage:    (paths: string[]):      Promise<StageResult[]>         => ipcRenderer.invoke(IPC.FILE_STAGE, paths),
    unstage:  (fileId: string):       Promise<void>                  => ipcRenderer.invoke(IPC.FILE_UNSTAGE, fileId),
    commit:   (opts: CommitOptions):  Promise<CommitResult>          => ipcRenderer.invoke(IPC.FILE_COMMIT, opts),
    commitAll:():                     Promise<CommitResult[]>        => ipcRenderer.invoke(IPC.FILE_COMMIT_ALL),
    manifest: ():                     Promise<StagedFile[]>          => ipcRenderer.invoke(IPC.MANIFEST_GET),
  },

  wipe: {
    toggle: (enabled: boolean):       Promise<void>                  => ipcRenderer.invoke(IPC.WIPE_TOGGLE, enabled),
    now:    ():                       Promise<void>                  => ipcRenderer.invoke(IPC.WIPE_NOW),
  },

  crash: {
    status:  ():                      Promise<CrashState>            => ipcRenderer.invoke(IPC.CRASH_STATUS),
    dismiss: ():                      Promise<void>                  => ipcRenderer.invoke(IPC.CRASH_DISMISS),
  },

  ram: {
    pressure: ():                     Promise<RAMPressure>           => ipcRenderer.invoke(IPC.RAM_PRESSURE),
  },

  tray: {
    // Push events from the main process (tray menu → renderer).
    // Call removeXxx in useEffect cleanup to avoid duplicate listeners on re-render.
    onCommitAll:      (cb: () => void) => ipcRenderer.on('tray:commit-all',  () => cb()),
    onDiscardAll:     (cb: () => void) => ipcRenderer.on('tray:discard-all', () => cb()),
    removeCommitAll:  ()               => ipcRenderer.removeAllListeners('tray:commit-all'),
    removeDiscardAll: ()               => ipcRenderer.removeAllListeners('tray:discard-all'),
    // Renderer → main: notify when staged-file count changes so the tray icon
    // can switch between normal and active states.
    notifyStagedCount: (count: number) => ipcRenderer.send('tray:staged-count', count),
  },
} as const

contextBridge.exposeInMainWorld('ghostlayer', api)

// Export the type so the renderer can reference it via env.d.ts
export type GhostLayerAPI = typeof api

import React, { useCallback, useEffect, useRef, useState } from 'react'
import type { CrashState, RAMPressure, StagedFile, WorkspaceStatus } from '../../shared/types'
import { ghostErrorMessage } from '../../shared/types'
import { StatusBar }   from './components/StatusBar'
import { FileList }    from './components/FileList'
import { ActionBar }   from './components/ActionBar'
import { CrashDialog } from './components/CrashDialog'
import { ErrorList }   from './components/ErrorList'
import type { AppError } from './components/ErrorList'

const api = window.ghostlayer

const POLL_INTERVAL_MS  = 2000
const ERROR_AUTO_HIDE_MS = 8000   // errors auto-clear after 8s

export default function App() {
  const [workspace,   setWorkspace]   = useState<WorkspaceStatus | null>(null)
  const [files,       setFiles]       = useState<StagedFile[]>([])
  const [pressure,    setPressure]    = useState<RAMPressure | null>(null)
  const [crashState,  setCrashState]  = useState<CrashState | null>(null)
  const [errors,      setErrors]      = useState<AppError[]>([])
  const [initialized, setInitialized] = useState(false)
  const errorTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  // ── Error helpers ────────────────────────────────────────────────────────────
  const pushError = useCallback((message: string) => {
    const id  = crypto.randomUUID()
    const err: AppError = { id, message, ts: Date.now() }
    setErrors(prev => [...prev, err])
    // Auto-dismiss after timeout
    const timer = setTimeout(() => {
      setErrors(prev => prev.filter(e => e.id !== id))
      errorTimers.current.delete(id)
    }, ERROR_AUTO_HIDE_MS)
    errorTimers.current.set(id, timer)
  }, [])

  const dismissError = useCallback((id: string) => {
    clearTimeout(errorTimers.current.get(id))
    errorTimers.current.delete(id)
    setErrors(prev => prev.filter(e => e.id !== id))
  }, [])

  // ── Refresh helpers ──────────────────────────────────────────────────────────
  const refreshAll = useCallback(async () => {
    const [status, manifest, ram] = await Promise.all([
      api.workspace.status(),
      api.files.manifest(),
      api.ram.pressure(),
    ])
    setWorkspace(status)
    setFiles(manifest)
    setPressure(ram)
  }, [])

  // ── Init ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      const crash = await api.crash.status()
      if (crash.crashDetected) setCrashState(crash)
      await refreshAll()
      setInitialized(true)
    }
    init()
    // Cleanup error timers on unmount
    return () => { errorTimers.current.forEach(t => clearTimeout(t)) }
  }, [refreshAll])

  // ── Polling ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!initialized) return
    const id = setInterval(refreshAll, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [initialized, refreshAll])

  // ── Drag-and-drop staging ────────────────────────────────────────────────────
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    const paths = Array.from(e.dataTransfer.files)
      .map(f => (f as File & { path: string }).path)
      .filter(Boolean)
    if (paths.length === 0) {
      pushError('Nothing to stage — drop a file from your filesystem.')
      return
    }

    // GL-303 / GL-950: surface per-file staging errors
    const results = await api.files.stage(paths)
    for (const r of results) {
      if (!r.ok) pushError(ghostErrorMessage(r.error))
    }
    await refreshAll()
  }, [refreshAll, pushError])

  // ── Commit actions ───────────────────────────────────────────────────────────
  const handleCommitAll = useCallback(async () => {
    // GL-303 / GL-951: surface commit errors
    const results = await api.files.commitAll()
    for (const r of results) {
      if (!r.success && r.error) pushError(`Commit failed for "${r.fileId}": ${r.error}`)
    }
    await refreshAll()
  }, [refreshAll, pushError])

  const handleDiscardAll = useCallback(async () => {
    await api.wipe.now()
    await refreshAll()
  }, [refreshAll])

  const handleAutoWipeToggle = useCallback(async (enabled: boolean) => {
    await api.wipe.toggle(enabled)
    await refreshAll()
  }, [refreshAll])

  const handleCrashDismiss = useCallback(async () => {
    await api.crash.dismiss()
    setCrashState(null)
  }, [])

  // ── Render ───────────────────────────────────────────────────────────────────
  if (!initialized) {
    return <div className="app-loading">Initializing GhostLayer…</div>
  }

  const pendingCount = files.filter(f => f.status === 'clean' || f.status === 'modified').length

  return (
    <div
      className="app"
      onDragOver={e => e.preventDefault()}
      onDrop={handleDrop}
    >
      {crashState?.crashDetected && (
        <CrashDialog state={crashState} onDismiss={handleCrashDismiss} />
      )}

      <StatusBar
        workspace={workspace}
        pressure={pressure}
        onAutoWipeToggle={handleAutoWipeToggle}
      />

      {/* GL-303: error list sits between status bar and file list */}
      <ErrorList errors={errors} onDismiss={dismissError} />

      <FileList
        files={files}
        onRefresh={refreshAll}
        onError={pushError}
      />

      <ActionBar
        fileCount={pendingCount}
        onCommitAll={handleCommitAll}
        onDiscardAll={handleDiscardAll}
      />
    </div>
  )
}

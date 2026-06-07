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
  // GL-201: depth counter avoids spurious dragleave fires from child elements
  const dragDepth = useRef(0)
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
      // GL-101: getCurrent() is guaranteed non-null — seeds workspace state before
      // anything else renders, so the UI never sees a null workspace on first paint.
      const ws = await api.workspace.getCurrent()
      setWorkspace(ws)

      const crash = await api.crash.status()
      if (crash.crashDetected) setCrashState(crash)

      // Fetch files + RAM pressure to complete the initial state
      const [manifest, ram] = await Promise.all([
        api.files.manifest(),
        api.ram.pressure(),
      ])
      setFiles(manifest)
      setPressure(ram)

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

  // ── Drag-and-drop staging (GL-201) ──────────────────────────────────────────
  const [isDragging, setIsDragging] = useState(false)

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    dragDepth.current += 1
    if (dragDepth.current === 1) setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    dragDepth.current -= 1
    if (dragDepth.current === 0) setIsDragging(false)
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    dragDepth.current = 0
    setIsDragging(false)

    // GL-201: extract real filesystem paths (Electron exposes File.path)
    const paths = Array.from(e.dataTransfer.files)
      .map(f => (f as File & { path: string }).path)
      .filter(Boolean)

    if (paths.length === 0) {
      // GL-950: invalid drop — no filesystem paths found (URL drag, text drag, etc.)
      pushError('Nothing to stage — drop a file from your filesystem.')
      return
    }

    // Forward to backend. Main process validates + stages. GL-303/GL-950/GL-201:
    // directory drops, unreadable files, and RAM pressure all return typed errors.
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

  // ── Tray action listeners ─────────────────────────────────────────────────────
  // Main process sends push events when the tray "Commit All" / "Discard All"
  // items are clicked. Must be after all useCallback definitions to avoid TDZ.
  useEffect(() => {
    api.tray.onCommitAll(handleCommitAll)
    api.tray.onDiscardAll(handleDiscardAll)
    return () => {
      api.tray.removeCommitAll()
      api.tray.removeDiscardAll()
    }
  }, [handleCommitAll, handleDiscardAll])

  // ── Tray icon active state ────────────────────────────────────────────────────
  // Notify main whenever the pending-file count changes so it can switch between
  // the normal and active tray icons (active = files are staged and uncommitted).
  useEffect(() => {
    const pending = files.filter(f => f.status === 'clean' || f.status === 'modified').length
    api.tray.notifyStagedCount(pending)
  }, [files])

  // ── Render ───────────────────────────────────────────────────────────────────
  if (!initialized) {
    return <div className="app-loading">Initializing GhostLayer…</div>
  }

  const pendingCount = files.filter(f => f.status === 'clean' || f.status === 'modified').length

  return (
    <div
      className={`app${isDragging ? ' app--dragging' : ''}`}
      onDragOver={e => e.preventDefault()}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
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

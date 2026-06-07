import { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain } from 'electron'
import path from 'path'
import { registerIpcHandlers } from './ipc-handlers'
import { markSessionOpen, markSessionClosed, getPersistedAutoWipe } from './crash'
import { createWorkspace } from './workspace'
import { shouldWipeOnExit, discardAll } from './wipe'
import { clearManifest } from './staging'

// ─── Window ───────────────────────────────────────────────────────────────────
let mainWindow: BrowserWindow | null = null

function createWindow(): BrowserWindow {
  // Resolve the desktop icon for the window chrome (title bar + taskbar button).
  // ghostAsset() is hoisted — safe to call before its lexical position in the file.
  const windowIcon = nativeImage.createFromPath(
    ghostAsset('ghostlayer-icon-desktop.ico')
  )

  const win = new BrowserWindow({
    width:           900,
    height:          650,
    minWidth:        700,
    minHeight:       500,
    title:           'GhostLayer',
    backgroundColor: '#0f1117',
    icon:            windowIcon.isEmpty() ? undefined : windowIcon,
    show:            false,   // shown after 'ready-to-show' to avoid flash
    webPreferences: {
      preload:          path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration:  false,
      sandbox:          false,
    },
  })

  win.once('ready-to-show', () => win.show())

  // Minimize to tray instead of closing (UI-005)
  win.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault()
      win.hide()
    }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
    win.webContents.openDevTools()
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  return win
}

// ─── Tray ─────────────────────────────────────────────────────────────────────
let trayRef: Tray | null = null

// Resolve an asset inside assets/ghostlayer/ for both packaged and dev modes.
// extraResources copies these files outside app.asar so the native image loader
// can reach them via process.resourcesPath in the packaged build.
function ghostAsset(filename: string): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'assets', 'ghostlayer', filename)
    : path.join(app.getAppPath(), 'assets', 'ghostlayer', filename)
}

function createTray(win: BrowserWindow): Tray {
  const normalIcon = nativeImage.createFromPath(ghostAsset('ghostlayer-icon-tray.ico'))

  // Active icon (shown when staged items are pending). Falls back to normal icon
  // if the file is missing so the tray never goes blank.
  let activeIcon = nativeImage.createFromPath(ghostAsset('ghostlayer-icon-tray-active.ico'))
  if (activeIcon.isEmpty()) activeIcon = normalIcon

  const tray = new Tray(normalIcon)
  trayRef = tray
  tray.setToolTip('GhostLayer')

  const menu = Menu.buildFromTemplate([
    { label: 'Open GhostLayer', click: () => win.show() },
    { type: 'separator' },
    { label: 'Commit All',  click: () => win.webContents.send('tray:commit-all') },
    { label: 'Discard All', click: () => win.webContents.send('tray:discard-all') },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true
        app.quit()
      },
    },
  ])

  tray.setContextMenu(menu)
  tray.on('double-click', () => win.show())

  // Renderer notifies main whenever the staged-file count changes.
  // Switch between normal and active tray icon accordingly.
  ipcMain.on('tray:staged-count', (_e, count: number) => {
    if (!trayRef) return
    trayRef.setImage(count > 0 ? activeIcon : normalIcon)
  })

  return tray
}

// ─── App lifecycle ────────────────────────────────────────────────────────────
// Track whether we are truly quitting (vs. minimizing to tray on window close)
let isQuitting = false

app.whenReady().then(() => {
  registerIpcHandlers()

  markSessionOpen()
  // GL-602: restore persisted auto-wipe preference into the new workspace
  createWorkspace(getPersistedAutoWipe())

  mainWindow = createWindow()
  createTray(mainWindow)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createWindow()
    } else {
      mainWindow?.show()
    }
  })
})

app.on('before-quit', () => {
  if (shouldWipeOnExit()) {
    discardAll()
    clearManifest()
  }
  markSessionClosed()
})

app.on('window-all-closed', () => {
  // On Windows, quitting via tray sets isQuitting = true before calling app.quit().
  // We only quit here if the OS is telling us to (non-macOS) AND we're actually quitting.
  if (process.platform !== 'darwin') {
    // Don't quit — we're minimized to tray. Quit happens via tray menu.
  }
})

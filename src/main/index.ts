import { app, BrowserWindow, shell, Tray, Menu, nativeImage } from 'electron'
import path from 'path'
import { registerIpcHandlers } from './ipc-handlers'
import { markSessionOpen, markSessionClosed, getPersistedAutoWipe } from './crash'
import { createWorkspace } from './workspace'
import { shouldWipeOnExit, discardAll } from './wipe'
import { clearManifest } from './staging'

// ─── Window ───────────────────────────────────────────────────────────────────
let mainWindow: BrowserWindow | null = null

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width:           900,
    height:          650,
    minWidth:        700,
    minHeight:       500,
    title:           'GhostLayer',
    backgroundColor: '#0f1117',
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
function createTray(win: BrowserWindow): Tray {
  // Placeholder icon — replace with real assets
  const icon  = nativeImage.createEmpty()
  const tray  = new Tray(icon)
  tray.setToolTip('GhostLayer')

  const menu = Menu.buildFromTemplate([
    { label: 'Open GhostLayer', click: () => win.show() },
    { type: 'separator' },
    {
      label: 'Commit All',
      click: () => win.webContents.send('tray:commit-all'),
    },
    {
      label: 'Discard All',
      click: () => win.webContents.send('tray:discard-all'),
    },
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

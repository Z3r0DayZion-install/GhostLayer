# GhostLayer

**A controllable temporary memory layer between active work and permanent storage.**

---

GhostLayer is a Windows desktop application that lets you stage files in RAM before deciding whether they go to disk. Drag a file in — it lives in memory. Commit it when you're ready. Discard it if you're not. Disk is the deliberate step, not the default.

---

## Download

**[GhostLayer v0.1.0 — GitHub Releases](https://github.com/Z3r0DayZion-install/GhostLayer/releases/latest)**

| File | What it is |
|------|-----------|
| `GhostLayer Setup 0.1.0.exe` | NSIS installer — recommended |
| `GhostLayer.exe` | Unpacked executable (no installer) |

> **SmartScreen note:** GhostLayer is not yet code-signed. Windows may show a SmartScreen warning on first run. Click *More info → Run anyway* to proceed.

---

## Core workflow

```
drag file in → staged in RAM (IN RAM)
                    ↓               ↓
              commit to disk    discard from RAM
              (ON DISK)         (gone — disk never touched)
```

- **Stage** — drop any file into the app; contents go into RAM only
- **Commit** — write one file or all files to disk when ready
- **Discard** — remove one file or all files from RAM; no disk output created
- **Tray** — Commit All and Discard All available from the system tray without opening the window

---

## v0.1.0 — First Packaged Milestone

The core loop is proven end to end as a real packaged Windows application:

- RAM-backed file staging via drag-and-drop
- Single-file and bulk commit / discard
- Tray menu with live Commit All / Discard All actions
- RAM pressure monitoring with `ok` / `warn` / `critical` states
- Oversize and invalid drop rejection before any memfs write
- Auto-wipe on exit — wipes staged RAM at shutdown if enabled
- Crash-honest behavior — on restart after an unexpected exit, GhostLayer reports what was in memory and states clearly that uncommitted RAM contents could not be recovered; it does not pretend it saved anything
- Windows packaging pipeline: `electron-vite` build → `electron-builder` NSIS installer
- Verified in packaged `GhostLayer.exe` and `GhostLayer Setup 0.1.0.exe`

---

## What GhostLayer is not yet

- A full sandbox or kernel-level isolation tool
- A cloud sync or backup platform
- A multi-workspace system
- A code-signed public distribution (SmartScreen signing not yet addressed)

This is the first working release of a focused RAM staging layer. It does exactly what it says.

---

## Build and run

**Prerequisites:** Node.js 20+, npm

```bash
npm install
```

| Command | What it does |
|---------|-------------|
| `npm run dev` | Start in development mode (hot reload) |
| `npm run build` | Production build only |
| `npm run pack` | Build + package to `release/win-unpacked/` (no installer) |
| `npm run dist` | Build + full NSIS installer → `release/` |

> **Re-packaging note:** If a previous `GhostLayer.exe` process is still running, stop it before rebuilding — it locks files in `release/win-unpacked/`. Run `Stop-Process -Name "ghostlayer" -Force` in PowerShell first.

---

## Project status

**Current version:** `v0.1.0` — First Packaged Milestone  
**Platform:** Windows  
**State:** Core loop complete and verified in packaged app

**Next:** polish pass, code-signing plan, internal demo prep. No feature expansion planned until the foundation is stable under real use.

See [`CHANGELOG.md`](CHANGELOG.md) for the full version history.  
See [`RELEASE_v0.1.0.md`](RELEASE_v0.1.0.md) for the full milestone record.

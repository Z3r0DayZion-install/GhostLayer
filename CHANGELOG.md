# Changelog

All notable changes to GhostLayer will be documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [0.1.0] — 2026-06-05 — First Packaged Milestone

### Added
- RAM-backed file staging via drag-and-drop (`memfs` v4)
- Single-file commit: temp-write + rename for atomic best-effort disk write
- Single-file discard: removes from RAM without touching committed disk output
- Commit All / Discard All bulk actions in ActionBar
- Tray menu: Open, Commit All, Discard All, Quit
- Tray Commit All / Discard All wired to live renderer handlers via IPC push events
- Crash awareness: session marker written on boot, cleared on clean shutdown
- Crash dialog on restart after unclean exit — shows previously staged filenames; makes no fake recovery promises
- RAM pressure monitoring: live system free-memory read, `ok` / `warn` / `critical` states
- Pressure bar and warning banner in StatusBar
- Oversize file rejection before memfs write
- Staged file rejection paths: folders, unreadable files, duplicates, empty/URL/text drags
- Auto-wipe toggle: wipes staged RAM on app exit if enabled; preference persisted across sessions
- Default workspace created on launch — UI never sees null workspace state on first paint
- Error toast list with auto-dismiss (8 s) and manual dismiss
- Windows packaging pipeline: `electron-vite` build → `electron-builder` NSIS installer
- `release/win-unpacked/GhostLayer.exe` and `release/GhostLayer Setup 0.1.0.exe` build outputs

### Changed
- Tray icon now resolves via `process.resourcesPath` in packaged mode and `app.getAppPath()` in dev — isolates the path from ASAR packaging
- `extraResources` added to `electron-builder` config so `icon.ico` is deposited beside the ASAR (outside `app.asar`) for native OS loader access
- Tray listener registration moved to a `useEffect` that runs after all `useCallback` declarations — required for correct hook ordering in Vite production bundles

### Fixed
- **Packaged tray icon invisible** — `nativeImage.createFromPath()` delegates to native Windows loader; loader cannot read inside ASAR. Icon now shipped via `extraResources` and resolved from `process.resourcesPath`.
- **Temporal dead zone crash in production bundle** — tray `useEffect` was placed before `handleCommitAll` / `handleDiscardAll` declarations; Vite's minifier preserved TDZ, causing `ReferenceError` on every render. Masked in dev mode, fatal in production. Fixed by relocating effect after all `useCallback` hooks.
- **Post-wipe dead workspace** — after Discard All the active workspace was destroyed, blocking any further staging until restart. Fresh workspace now recreated immediately after wipe.
- **Committed-path idempotent return** — commit handler now returns the committed destination path on success rather than falling through to an undefined return.
- **electron-builder locked-file error on re-pack** — caused by a running GhostLayer process holding `win-unpacked/` files. Documented fix: `Stop-Process -Name "ghostlayer" -Force` before rebuild.

### Known Limitations
- **Single workspace only** — multi-workspace UI not yet implemented; intentional for MVP.
- **No code signing** — installer works but SmartScreen reputation/signing not yet addressed; required before broad public distribution.
- **Pressure state wording** — `warn` and `critical` differentiated primarily by color; text distinction can be improved.
- **Post-wipe session continuity** — after Discard All, auto-wipe preference persists to next restart but within-session continuity is limited to the recreated default workspace.

---

<!-- next release entry goes above this line -->

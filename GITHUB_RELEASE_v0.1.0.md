# v0.1.0 — First Packaged Milestone

GhostLayer is now a real packaged Windows application. This release proves the core product loop — RAM-backed file staging, commit, discard, crash honesty, and tray controls — end to end in a distributable `.exe` and NSIS installer.

---

## Highlights

**Core workflow**
- Drag-and-drop file staging into RAM (`memfs`) — no disk write on stage
- Single-file commit: atomic temp-write + rename to disk
- Single-file discard: removes from RAM, never touches disk output
- Commit All / Discard All bulk actions
- Tray menu: Open, Commit All, Discard All, Quit — all wired to live handlers

**Crash honesty**
- Session marker written on boot, cleared on clean shutdown
- On restart after unexpected exit: crash dialog shows previously staged filenames and states clearly that uncommitted RAM contents could not be recovered
- No fake recovery promises

**RAM awareness**
- Live system free-memory read
- Pressure states: `ok` / `warn` / `critical`
- Oversize file rejection before memfs write
- Invalid drop rejection: folders, unreadable files, duplicates, URL/text drags

**Auto-wipe**
- Optional: wipe staged RAM on app exit; preference persisted across sessions

---

## Build outputs

| File | Description |
|------|-------------|
| `GhostLayer.exe` | Unpacked Windows executable |
| `GhostLayer Setup 0.1.0.exe` | NSIS installer |

Both verified in a full packaged smoke test. All functional checks passed.

---

## Fixes in this release

- **Tray icon invisible in packaged app** — icon inside ASAR was unreadable by the native Windows image loader; fixed via `extraResources` + `process.resourcesPath`
- **Blank renderer on first launch** — React temporal dead zone in tray `useEffect`; Vite's production minifier preserved TDZ, causing `ReferenceError` on every render; fixed by relocating effect after all `useCallback` declarations
- **Post-wipe dead workspace** — after Discard All the active workspace was destroyed; fresh workspace now recreated immediately
- **Committed-path undefined return** — commit handler now returns the destination path on success

---

## Known limitations

- **Single workspace only** — intentional for MVP
- **No code signing** — SmartScreen signing not yet addressed; required before broad public distribution
- **Pressure state wording** — `warn` / `critical` differentiated primarily by color
- **Post-wipe session continuity** — auto-wipe preference persists across restarts but within-session continuity after wipe is limited to the recreated default workspace

---

GhostLayer v0.1.0 is not a full sandbox, not a kernel-level isolation tool, not a cloud platform. It is the first working release of a focused, honest RAM staging layer — and it does exactly what it says.

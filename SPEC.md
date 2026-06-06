# GhostLayer — MVP Feature Spec

---

## Decisions locked before first line of product code

| Decision | Answer | Reason |
|---|---|---|
| Ghost Shield in MVP? | **Cut** | Can't be honest about its limits without a kernel driver. Bring back in V1.1 with clear scope. |
| UI framework | **Electron + React + TypeScript** | Faster initial velocity. Tauri revisit at V1.1 if RAM overhead is ironic. |
| RAM backing mechanism | **memfs (in-process Node.js)** | Genuinely RAM-only. No kernel driver. No bundled RAM disk tool. Clean commit/discard semantics. |
| Commit is atomic? | **Best-effort atomic** | Write to `.ghostlayer-tmp`, then `rename()`. Works within a volume. Cross-volume: copy then delete. |
| Crash recovery promise | **Honest: contents are lost** | Don't promise what we can't deliver. Persist metadata (names/paths) only so user knows what they lost. |
| Auto-wipe default | **OFF** | Opt-in. No surprise data loss on first run. |
| Workspace count (MVP) | **1** | MVP scope: single workspace only. |
| Secure wipe in MVP? | **No** | Standard dealloc only. Document it. Pro V1.1 adds zero-fill option. |
| File size limit | **2 GB per file** | Sane single-file ceiling. |
| Workspace RAM cap | **min(25% total RAM, 4 GB)** | Avoids OOM. User can see cap in status bar. |

---

## Epic map

| Epic | Prefix | Scope |
|---|---|---|
| Workspace | WORK | lifecycle: create, destroy, status, limits |
| File Staging | STAGE | staging manifest, drag-drop, modify detect |
| Commit Engine | COMMIT | write to disk, atomic path, conflicts |
| Discard Engine | DISCARD | discard all, discard single, wipe method |
| Crash Behavior | CRASH | detection, honest recovery dialog, metadata persist |
| Auto-Wipe | WIPE | on-exit toggle, confirmation UX |
| RAM Pressure | PRESSURE | monitor, warn, reject on cap |
| UI Dashboard | UI | layout, status bar, file list, action bar, tray |


---

## Tickets

---

### WORK-001 — Create RAM-backed workspace

**Priority:** P0

**Why:** Nothing else works without this.

**Behavior:**
- On app start: initialize one memfs `Volume` instance. This is the workspace.
- Assign a UUID workspace ID and record `createdAt` timestamp.
- Compute `maxBytes = min(totalSystemRAM * 0.25, 4 GB)`.
- Workspace root inside memfs: `/workspace/`.

**Acceptance criteria:**
- [ ] Workspace is created automatically on app launch (no user action required for MVP).
- [ ] `maxBytes` is computed from `os.totalmem()` at creation time.
- [ ] Workspace ID and creation time are accessible via IPC.
- [ ] A second `createWorkspace()` call destroys the previous one first (single-slot invariant).

**Technical notes:**
- `memfs` v4 is the in-memory Node.js filesystem. All staged file content lives here.
- Nothing is written to disk during staging. Disk writes happen only via the commit path.
- memfs is held in the main process. Renderer never touches it directly.

---

### WORK-002 — Workspace size cap enforcement

**Priority:** P0

**Why:** Without a cap, a user staging large files can trigger OOM on the host machine.

**Behavior:**
- Track `usedBytes` as files are staged and removed.
- Before staging any file: check if `usedBytes + fileSize > maxBytes`. If yes, reject with `RAM_PRESSURE` error.
- Expose `usedBytes` and `maxBytes` via status IPC.

**Acceptance criteria:**
- [ ] Staging a file that would exceed the cap returns an error, not a crash.
- [ ] `usedBytes` tracks accurately as files are staged, committed, and discarded.
- [ ] Error message tells user how many bytes are available.

---

### WORK-003 — Workspace status query

**Priority:** P0

**Why:** Dashboard needs live data.

**Behavior:**
- IPC channel `workspace:status` returns:
  - `id`, `createdAt`, `usedBytes`, `maxBytes`, `fileCount`, `pendingCommitCount`, `autoWipe`, `active`
- Renderer polls this every 2 seconds.

**Acceptance criteria:**
- [ ] All fields accurate.
- [ ] Returns `null` (not an error) if no workspace is active.
- [ ] `pendingCommitCount` = count of files with status `clean` or `modified`.

---

### WORK-004 — Workspace destroy

**Priority:** P0

**Why:** Discard path and app exit path both need clean teardown.

**Behavior:**
- Clear memfs volume (reset the Volume instance).
- Reset `usedBytes` to 0.
- This is called by the discard path and by auto-wipe on exit.
- Does NOT persist anything to disk. Total loss of staged content — by design.

**Acceptance criteria:**
- [ ] After destroy, workspace is empty and `usedBytes` is 0.
- [ ] No disk I/O during destroy.
- [ ] Manifest is also cleared when workspace is destroyed.

---

### STAGE-001 — Stage file by path

**Priority:** P0

**Why:** Core product action.

**Behavior:**
- Accept one absolute disk path.
- `stat()` the file to get size. Reject if: size > 2 GB, or would exceed workspace cap.
- `readFile()` from disk into a `Buffer`.
- Write buffer into memfs at `/workspace/<uuid>-<filename>`.
- Add to in-memory staging manifest: `{ id, filename, originalPath, stagedPath, sizeBytes, status: 'clean', stagedAt }`.

**Acceptance criteria:**
- [ ] File content is in memfs after staging. Original file on disk is unchanged.
- [ ] Manifest entry created with correct fields.
- [ ] Returns the new `StagedFile` entry.
- [ ] Rejects oversized files with a typed `GhostError`.
- [ ] Rejects if workspace is not active.

**Open question — resolved:** Duplicate filename handling is: the staged path includes the UUID prefix, so two files with the same name can coexist. Manifest shows both. User sees both in the file list with their full original paths visible.

---

### STAGE-002 — Stage via drag-and-drop

**Priority:** P0

**Why:** Primary UX entry point.

**Behavior:**
- Renderer listens for `dragover` + `drop` events on the main workspace area.
- Extracts `file.path` from the `DataTransfer` object (Electron exposes real FS paths in `File.path`).
- Sends paths array to main via `file:stage` IPC channel.
- Main calls STAGE-001 for each file. Returns array of results (success or error per file).
- Renderer updates file list on response.

**Acceptance criteria:**
- [ ] Dropping one or more files stages them.
- [ ] Files that fail (too big, cap exceeded) surface an error per file. Others still stage successfully.
- [ ] Drop zone has visible feedback (`dragover` state).
- [ ] Empty drop zone shows instructional text.

---

### STAGE-003 — Open staged file for editing

**Priority:** P1

**Why:** Users need to open and edit staged files. The edit must update the memfs copy, not create a new disk copy.

**Behavior:**
- User clicks a staged file in the list → "Open" action.
- Main process: read file from memfs, write to OS temp directory (`os.tmpdir()`), open with `shell.openPath()`.
- Watch the temp file with `fs.watch()`.
- On change: re-read temp file, update memfs entry, set status to `modified`, update `modifiedAt`.
- On app close or file discard: delete the temp file.

**Acceptance criteria:**
- [ ] File opens in the system's default app.
- [ ] Edits are reflected back into memfs (status becomes `modified`).
- [ ] Temp file is cleaned up when staging entry is discarded or workspace is destroyed.
- [ ] Two simultaneous "open" calls on the same file don't create duplicate watchers.

**Note:** This is a P1 for MVP. If scoping tightly, MVP can ship STAGE-001/002 first and add open-for-edit in the first patch.

---

### STAGE-004 — Staging manifest

**Priority:** P0

**Why:** Everything downstream (commit, discard, status, crash recovery) depends on the manifest.

**Behavior:**
- In-memory `Map<string, StagedFile>` in the main process.
- Not persisted to disk (contents are not recoverable across sessions — that's intentional).
- `manifest:get` IPC returns the full array.
- Manifest is cleared when workspace is destroyed.

**Acceptance criteria:**
- [ ] Manifest accurately reflects add, remove, status change operations.
- [ ] Returns empty array when no workspace is active.
- [ ] No manifest state leaks between sessions.

---

### COMMIT-001 — Commit single file to disk

**Priority:** P0

**Why:** Core product action.

**Behavior:**
- Read file contents from memfs using the staged path.
- Destination = `options.destination ?? entry.originalPath`.
- Ensure destination directory exists (`mkdir -p`).
- Write to `<destination>.ghostlayer-tmp`, then `rename()` to destination (atomic within same volume).
- On success: update manifest status to `committed`.
- On failure: status stays unchanged, return error with message.

**Acceptance criteria:**
- [ ] File content on disk matches content in memfs at commit time.
- [ ] Temp file is cleaned up even on rename failure.
- [ ] Attempting to commit an already-`committed` file is a no-op (returns success, no second write).
- [ ] Attempting to commit a `discarded` file returns an error.
- [ ] Destination directory is created if it doesn't exist.

---

### COMMIT-002 — Commit all staged files

**Priority:** P0

**Why:** Core dashboard action.

**Behavior:**
- Filter manifest for files with status `clean` or `modified`.
- Call COMMIT-001 for each, in parallel.
- Return array of `CommitResult` (one per file: `{ fileId, success, destination?, error? }`).
- Partial failure is allowed: some commit, some fail. Surface counts.

**Acceptance criteria:**
- [ ] All eligible files attempted.
- [ ] Results returned per-file, not as a single pass/fail.
- [ ] Already-committed files are excluded from the run.

---

### COMMIT-003 — Commit destination: conflict handling

**Priority:** P1

**Why:** Overwriting an existing file without warning is dangerous.

**Behavior:**
- Before writing: check if destination path exists AND its `mtime` is newer than `stagedAt`.
- If conflict: return a `CONFLICT` result with the existing file's mtime.
- Renderer shows a per-file conflict prompt: **Overwrite / Skip / Rename** (append `-ghostlayer-<timestamp>`).
- Default on no user input: Skip (safe default).

**Acceptance criteria:**
- [ ] Conflict detected when destination mtime is newer than the staged copy's origin mtime.
- [ ] All three resolution options work.
- [ ] "Rename" produces a valid filename.
- [ ] No silent overwrites of newer files.

---

### DISCARD-001 — Discard all (full workspace wipe)

**Priority:** P0

**Why:** Core product action. "Leave nothing behind."

**Behavior:**
- Requires confirmation dialog (see UI tickets).
- On confirm: call WORK-004 (destroy workspace) + clear manifest.
- No disk I/O. Fast. Total.
- Post-discard: workspace is re-created fresh (empty), ready for the next session.

**Acceptance criteria:**
- [ ] All memfs content gone after discard.
- [ ] Manifest is empty after discard.
- [ ] No disk writes during discard.
- [ ] App remains usable after discard (workspace re-created).

---

### DISCARD-002 — Discard single file

**Priority:** P0

**Why:** User may want to keep some files and drop one.

**Behavior:**
- Remove file entry from memfs (`unlink` on stagedPath).
- Update manifest status to `discarded` (keep the entry visible in list as a record).
- Decrement `usedBytes` by the file's size.
- No confirmation for single-file discard (fast action).

**Acceptance criteria:**
- [ ] memfs entry removed.
- [ ] `usedBytes` decremented correctly.
- [ ] File row shows `discarded` badge in the list.
- [ ] Original disk file is unaffected.

---

### DISCARD-003 — Wipe method honesty

**Priority:** P0 (documentation/UX)

**Why:** Users may assume "discard" is a secure wipe. It isn't.

**Behavior:**
- MVP: standard dealloc. memfs Volume is reset. Node GC handles the memory.
- No zero-fill, no DoD-7 overwrite.
- This must be documented in the UI: tooltip or help text reading:
  > "Discard removes files from GhostLayer's memory workspace. It does not perform a secure wipe of physical RAM. For sensitive data, use a dedicated secure-erase tool."
- Pro roadmap: zero-fill option before dealloc.

**Acceptance criteria:**
- [ ] Disclosure text is present somewhere accessible in the UI (settings or tooltip).
- [ ] No marketing copy claims secure wipe behavior that isn't there.

---

### CRASH-001 — Crash detection on startup

**Priority:** P0

**Why:** RAM workspace is gone after a crash. User must know.

**Behavior:**
- On workspace creation: write `{ sessionOpen: true }` to a JSON file in `app.getPath('userData')`.
- On clean app exit (`before-quit`): overwrite with `{ sessionOpen: false }`.
- On next launch: read the file. If `sessionOpen: true`, a crash occurred.

**Acceptance criteria:**
- [ ] Flag set on start, cleared on clean exit.
- [ ] Crash correctly detected on next launch after a `kill -9` / forced close.
- [ ] False positive rate: zero on clean exits.

---

### CRASH-002 — Recovery policy

**Priority:** P0

**Why:** The policy must be honest BEFORE the user loses data, not after.

**Policy (locked):**
> RAM workspace contents are NOT recoverable after an unexpected exit.
> GhostLayer persists metadata (filenames, original paths) so users know what they lost.
> File contents are never written to disk except via an explicit Commit action.

**This is a feature, not a bug.** It means committed files are always the user's deliberate choice.

**Acceptance criteria:**
- [ ] Recovery dialog (CRASH-003) is shown on crash detection.
- [ ] Recovery dialog does NOT offer to "restore" files (impossible).
- [ ] Recovery dialog DOES show what was staged (metadata only).

---

### CRASH-003 — Crash recovery dialog

**Priority:** P0

**Why:** User needs a clear, honest explanation immediately on relaunch.

**Dialog content:**
- Title: `GhostLayer wasn't shut down cleanly`
- Body: `Files staged in your last session were in RAM and could not be recovered. Only files you had already committed to disk were saved.`
- Expandable section: `What was staged (N files)` — shows filename, original path, status for each entry from the last manifest snapshot.
- Single action: `OK, start fresh`

**Acceptance criteria:**
- [ ] Dialog shown on launch when crash detected.
- [ ] "What was staged" list shows last known manifest snapshot.
- [ ] Dismissing the dialog clears the crash flag.
- [ ] No "retry" or "recover" option (there is nothing to recover).

---

### CRASH-004 — Manifest metadata snapshot

**Priority:** P0

**Why:** Supports CRASH-003. Must persist on every manifest change.

**Behavior:**
- On every add/remove/status-change to the manifest: write a snapshot to `userData/crash-state.json`.
- Snapshot contains: `{ sessionOpen: bool, lastManifestSnapshot: [{ id, filename, originalPath, sizeBytes, status, stagedAt }] }`.
- File contents are NOT persisted (RAM only).
- Max 1000 entries. Trim oldest first.
- Written synchronously (fs.writeFileSync) for reliability — this is a small JSON file.

**Acceptance criteria:**
- [ ] Snapshot updated on every manifest mutation.
- [ ] Snapshot survives a `kill -9`.
- [ ] File contents never written to snapshot.
- [ ] File stays small (metadata only, no binary content).

---

### WIPE-001 — Auto-wipe on app close

**Priority:** P0

**Why:** Key privacy/hygiene feature. Part of the MVP pitch.

**Behavior:**
- Setting: `autoWipe` boolean on the workspace (defaults to `false`).
- When `autoWipe = true`: in `before-quit` handler, call `discardAll()` before clearing the session flag.
- When `autoWipe = false`: staged files remain in memfs until user explicitly discards.
- Since the process is about to exit, any staged (uncommitted) content is lost either way — but auto-wipe makes the intent explicit and resets state cleanly.

**Acceptance criteria:**
- [ ] Default is OFF.
- [ ] Toggling ON shows a one-time confirmation: `When enabled, all staged files will be wiped when GhostLayer closes. Committed files are safe.`
- [ ] Toggle state persists across app restarts (stored in `userData`).
- [ ] On exit with auto-wipe ON: workspace is destroyed before session flag is cleared.

---

### WIPE-002 — Auto-wipe toggle in dashboard

**Priority:** P0

**Why:** Quick access. Users toggle this frequently depending on session type.

**Behavior:**
- Checkbox/toggle visible in the status bar at all times.
- Current state shown (ON/OFF).
- First-time enable triggers confirmation (WIPE-001). Subsequent toggles do not.

**Acceptance criteria:**
- [ ] Toggle visible without opening settings.
- [ ] State reflected accurately.
- [ ] First-enable confirmation shows once per install, not per session.

---

### PRESSURE-001 — RAM usage tracking

**Priority:** P0

**Why:** Dashboard needs this. Staging rejection depends on it.

**Behavior:**
- `getRAMPressure()` returns: `{ workspaceUsedBytes, workspaceMaxBytes, systemFreeBytes, pressure: 'ok' | 'warn' | 'critical' }`.
- `systemFreeBytes` from `os.freemem()`.
- Pressure thresholds:
  - `warn`: system free < 512 MB, OR workspace > 90% of cap.
  - `critical`: both conditions true simultaneously.

**Acceptance criteria:**
- [ ] Returns accurate live data.
- [ ] `warn` and `critical` states trigger correctly per thresholds.
- [ ] `ok` is the common case.

---

### PRESSURE-002 — Low RAM warning in UI

**Priority:** P0

**Why:** User must know before they run out, not after a crash.

**Behavior:**
- When pressure is `warn` or `critical`: show a persistent warning banner in the dashboard.
- Text: `RAM headroom is low. Commit or discard files to free space.`
- Critical state: banner turns red.
- Dismiss: not dismissible while pressure persists. Auto-hides when pressure drops to `ok`.

**Acceptance criteria:**
- [ ] Banner appears on `warn`, turns red on `critical`.
- [ ] Banner hides automatically when pressure returns to `ok`.
- [ ] Not a modal — does not block interaction.

---

### PRESSURE-003 — Staging rejection at cap

**Priority:** P0

**Why:** Never silently OOM. Always give the user an explicit error.

**Behavior:**
- If `usedBytes + fileSize > maxBytes`: reject staging with `{ code: 'RAM_PRESSURE', availableBytes }`.
- Error surfaces in UI as a per-file error row.
- Do NOT auto-evict any staged files.

**Acceptance criteria:**
- [ ] Rejection fires before any memfs write attempt.
- [ ] `availableBytes` in the error is accurate.
- [ ] Other files in the same drag batch that fit are still staged.

---

### UI-001 — Main dashboard layout

**Priority:** P0

**Why:** The shell everything else lives in.

**Layout (top-to-bottom):**
1. **Status bar** — workspace stats, RAM bar, auto-wipe toggle
2. **File list** — staged files with per-row actions; empty state = drop zone
3. **Action bar** — Commit All, Discard All

**Design constraints:**
- Dark background: `#0f1117` or similar.
- Not using any UI framework beyond React + plain CSS. No Tailwind, no component library.
- Readable at 900×650. Minimum window: 700×500.
- No animations that add perceived latency.

**Acceptance criteria:**
- [ ] Layout renders at 900×650 without overflow.
- [ ] All three sections are always visible (no scroll on main layout).
- [ ] File list scrolls internally when file count is high.

---

### UI-002 — Status bar

**Priority:** P0

**Displays:**
- App title / wordmark
- RAM used / max (progress bar + text)
- File count (staged)
- Pending commit count
- Auto-wipe toggle (WIPE-002)
- Warning banner when pressure is non-OK (PRESSURE-002)

**Acceptance criteria:**
- [ ] All values update every 2s via IPC poll.
- [ ] Progress bar fills proportionally to `usedBytes / maxBytes`.
- [ ] Bar color changes at warn (yellow) / critical (red).

---

### UI-003 — Staged file list

**Priority:** P0

**Per-row:**
- Filename
- File size (human-readable)
- Status badge: `staged` / `modified` / `committed` / `discarded`
- Actions: `Commit` + `Discard` (only for `staged`/`modified` rows)

**Empty state:**
- Drop zone illustration / text: `Drop files here to stage them`
- Sub-text: `Files stay in RAM until you commit or discard`

**Acceptance criteria:**
- [ ] List is scrollable when items overflow.
- [ ] `committed` and `discarded` rows remain visible but actions are hidden.
- [ ] Each row updates in-place when status changes (no full list re-render flicker).

---

### UI-004 — Action bar

**Priority:** P0

**Buttons:**
- `Commit All (N)` — N = pending commit count. Disabled when 0.
- `Discard All` — styled destructive (red). Disabled when workspace empty.

**Discard All flow:**
- Click → inline confirmation within the action bar: `Discard all N files? This cannot be undone.` + `[Yes, Discard All]` `[Cancel]`
- Confirm → calls `wipe:now` IPC.
- Cancel → dismisses confirmation, no action.

**Acceptance criteria:**
- [ ] Confirmation is inline (not a modal blocking the whole window).
- [ ] Confirmation shows the count of uncommitted files.
- [ ] Buttons are correctly disabled.

---

### UI-005 — System tray

**Priority:** P1

**Behavior:**
- GhostLayer shows a tray icon on launch.
- Closing the window minimizes to tray (does not quit).
- Tray icon states: idle (grey), active (green), warning (yellow), wiping (brief red flash).
- Right-click tray menu: `Open GhostLayer` / `Commit All` / `Discard All` / `Quit`

**Acceptance criteria:**
- [ ] Window close minimizes to tray.
- [ ] Quit from tray menu exits cleanly (triggers auto-wipe if enabled).
- [ ] Tray icon reflects workspace state.

**Note:** P1. Can ship MVP without tray if timeline is tight.

---

### UI-006 — Crash recovery dialog rendering

**Priority:** P0

**See CRASH-003 for copy and behavior.**

**Acceptance criteria:**
- [ ] Modal overlays the full window on launch when crash detected.
- [ ] Cannot interact with dashboard until dialog is dismissed.
- [ ] "What was staged" list is scrollable if many items.

---

## What is explicitly NOT in this spec

- Ghost Shield / file isolation
- Secure wipe (zero-fill)
- Multiple workspaces
- Smart Mirror (timed sync, rule-based sync)
- Ghost Cache (hot folder pinning)
- Cloud sync of any kind
- Browser extension
- Kernel driver
- Enterprise policy / admin tools
- Payment / licensing system
- Auto-updater
- Crash reporter / telemetry

All of the above are valid V1.1+ work. None of them belong in the MVP build.

---

## IPC contract summary

| Channel | Direction | Description |
|---|---|---|
| `workspace:create` | invoke | Create/reset workspace → `WorkspaceStatus` |
| `workspace:destroy` | invoke | Destroy workspace |
| `workspace:status` | invoke | Query status → `WorkspaceStatus \| null` |
| `file:stage` | invoke | Stage file paths → `StageResult[]` |
| `file:unstage` | invoke | Remove one file from staging |
| `file:commit` | invoke | Commit one file → `CommitResult` |
| `file:commit-all` | invoke | Commit all pending → `CommitResult[]` |
| `manifest:get` | invoke | Full staged file list → `StagedFile[]` |
| `wipe:toggle` | invoke | Set auto-wipe boolean |
| `wipe:now` | invoke | Immediate full wipe |
| `crash:status` | invoke | Crash detection result → `CrashState` |
| `crash:dismiss` | invoke | Clear crash flag |
| `ram:pressure` | invoke | RAM pressure state → `RAMPressure` |

All channels are `ipcMain.handle` / `ipcRenderer.invoke` (request-response). No one-way events in MVP.

---

## Ticket count

| Epic | Tickets | P0 | P1 |
|---|---|---|---|
| WORK | 4 | 4 | 0 |
| STAGE | 4 | 3 | 1 |
| COMMIT | 3 | 2 | 1 |
| DISCARD | 3 | 3 | 0 |
| CRASH | 4 | 4 | 0 |
| WIPE | 2 | 2 | 0 |
| PRESSURE | 3 | 3 | 0 |
| UI | 6 | 5 | 1 |
| **Total** | **29** | **26** | **3** |

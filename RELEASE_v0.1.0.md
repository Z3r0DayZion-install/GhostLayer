# GhostLayer v0.1.0 — First Packaged Milestone

> **GhostLayer is now a real packaged Windows app.**
>
> This milestone marks the transition from concept + scaffold into a functioning desktop product with a verified core workflow, verified crash honesty, verified tray actions, and a working Windows packaging pipeline.

---

## Release status

**Milestone:** `v0.1.0`  
**State:** **First packaged release candidate**  
**Platform:** Windows  
**Build outputs verified:**
- `release/win-unpacked/GhostLayer.exe`
- `release/GhostLayer Setup 0.1.0.exe`

This is the first milestone where GhostLayer is not just "running in dev."  
It is building, packaging, installing, launching, and completing the main user loop as a real Windows application.

---

# Executive summary

GhostLayer now successfully delivers its first real product promise:

- create a workspace automatically
- drag a file into the app
- stage it into RAM
- show it truthfully in the UI
- commit it to disk
- discard it from RAM
- bulk commit/discard staged files
- survive wipe without leaving the app dead
- detect crash state honestly
- surface crash information without making fake recovery promises
- run as a packaged Windows app with working tray controls and visible tray icon

This milestone is the point where the project stops being "just architecture" and starts being an actual product foundation.

---

# What shipped

## 1. Core workspace boot
GhostLayer now boots directly into a real default workspace.

### Verified behavior
- default workspace created on launch
- no null workspace state exposed in the usable UI
- workspace name shown in the status bar
- renderer reads workspace state from main process via IPC, not hardcoded fake data

---

## 2. RAM-backed file staging
Files can now be dropped into GhostLayer and staged into RAM.

### Verified behavior
- drag/drop accepts real filesystem files
- no browser navigation on drop
- file contents are written into memfs only
- no disk output is created during staging
- manifest entry is created only after successful stage
- staged rows render truthfully in the UI

### Valid rejection paths
- folders rejected
- unreadable files rejected
- duplicate source files rejected
- empty/text/URL drags rejected
- oversize files rejected before memfs write
- no fake success on any rejection path

---

## 3. Truthful staged file UI
The file list now reflects the actual state of each file.

### Verified behavior
- staged file shows:
  - filename
  - source path
  - file size
  - `IN RAM` state
- committed file shows:
  - `ON DISK`
  - committed destination path
- discarded file disappears from the active list
- no row falsely implies persistence before commit

---

## 4. Single-file commit
One staged file can now be committed safely to disk.

### Verified behavior
- memfs contents are written to disk
- temp-write + rename path used for atomic best-effort commit
- manifest updated only on success
- committed path shown in UI
- committed badge shown truthfully
- failed commit does not falsely flip row state

---

## 5. Single-file discard
One staged file can now be removed from RAM without touching disk.

### Verified behavior
- memfs copy removed
- manifest updated truthfully
- row disappears from active list
- committed disk files are never touched by discard
- no fake reversibility implied

---

## 6. Bulk actions
GhostLayer now supports bulk workflow operations.

### Commit All
Verified:
- commits all currently pending staged files
- updates rows truthfully
- writes outputs to disk
- leaves already committed files alone

### Discard All
Verified:
- wipes all active staged RAM contents
- clears manifest snapshot appropriately
- returns UI to the truthful empty state
- does not touch committed disk files

---

## 7. Post-wipe workspace recovery
A critical lifecycle bug was fixed.

### Previous bug
After `Discard All`, the app visually returned to an empty state but the active workspace had been destroyed, leaving the app unable to stage new files until restart.

### Fix
After wipe, GhostLayer now immediately recreates a fresh default workspace.

### Verified behavior
- Discard All returns UI to empty state
- next drag/drop works immediately
- no `WORKSPACE_NOT_ACTIVE` dead state remains

---

## 8. Crash awareness + honest crash dialog
GhostLayer now distinguishes between a clean exit and an unclean exit.

### Verified behavior
- session marker written on startup
- marker cleared on clean shutdown
- crash state detected on next startup if process was killed unexpectedly
- metadata-only snapshot persisted for honesty
- file contents are **not** persisted or falsely "recovered"
- crash dialog explicitly states that uncommitted RAM contents could not be recovered
- dialog blocks normal interaction until dismissed
- previously staged filenames are shown when available
- dismiss clears crash state correctly

This is the correct product stance:
**honest metadata awareness, zero fake recovery promises.**

---

## 9. RAM pressure + oversize protection
GhostLayer now reports RAM pressure and blocks impossible staging attempts.

### Verified behavior
- live system free memory read via OS
- workspace RAM usage tracked
- pressure states:
  - `ok`
  - `warn`
  - `critical`
- UI pressure bar and warning banner render truthfully
- oversize stage attempts are rejected before memfs write
- no partial memfs state
- no fake manifest entries on rejection

---

## 10. One-workspace MVP enforcement
GhostLayer is currently a **single-workspace product**, and the code behaves that way honestly.

### Verified behavior
- one active workspace slot only
- no multi-workspace UI
- no switch/list/rename flow exposed
- no fake free/pro workspace gating theater
- architecture already enforces the single-workspace MVP shape

---

## 11. Packaging + installer pipeline
GhostLayer now successfully packages for Windows.

### Verified behavior
- production build succeeds
- unpacked Windows app succeeds
- NSIS installer build succeeds
- packaged path assumptions work
- crash-state/user-data storage uses packaged-safe paths

### Build outputs
- `GhostLayer.exe`
- `GhostLayer Setup 0.1.0.exe`

This is the milestone where GhostLayer becomes a real distributable application.

---

## 12. Tray actions + packaged tray icon
Tray support is now real, not fake.

### Verified behavior
Tray menu:
- Open GhostLayer
- Commit All
- Discard All
- Quit

### Tray action wiring
- tray Commit All calls the same live commit-all handler as the ActionBar
- tray Discard All calls the same live discard-all handler as the ActionBar
- listener registration/cleanup is wired safely

### Tray icon fix
A packaged runtime issue was fixed:
- icon inside ASAR was not visible to the native Windows image loader
- icon now ships via `extraResources`
- packaged app resolves tray icon from `process.resourcesPath`
- tray icon now renders visibly in packaged mode

---

# Smoke test results

## Packaged app smoke test: **PASS**

### Verified manually in packaged Windows app
- booted `GhostLayer.exe`
- crash dialog appeared correctly after forced-kill scenario
- dismissed cleanly
- default workspace visible
- staged file rendered as `IN RAM`
- single-file commit worked
- single-file discard worked
- Commit All worked
- Discard All worked
- post-wipe restaging worked
- tray Commit All worked
- tray Discard All worked
- tray icon visible in packaged mode

### Result
**All functional checks passed.**

---

# Key fixes made during milestone hardening

## Runtime / correctness fixes
- fixed committed-path idempotent return in commit logic
- fixed post-wipe dead workspace state
- verified crash-awareness marker lifecycle
- verified discard path never touches committed disk outputs

## Packaged-app fixes
- fixed electron-vite config entry-point detection in non-project-root CWD
- fixed packaged tray icon loading via external resource path (`extraResources` + `process.resourcesPath`)
- fixed React temporal dead zone in tray `useEffect` (caught only in minified production bundle)
- generated valid 256×256 ICO meeting electron-builder minimum size requirement

---

# What this milestone does **not** claim

GhostLayer v0.1.0 is **not** yet:

- a full sandbox product
- a kernel-level isolation tool
- a cloud sync platform
- a multi-workspace system
- an advanced recovery engine
- a full monetized commercial release
- a code-signed public Windows distribution

This milestone is about one thing:

> **proving the core GhostLayer product loop is real, honest, and packageable.**

---

# Known limitations

## 1. Auto-wipe state after wipe
After `Discard All`, a fresh workspace is recreated with default session values.  
Persisted preference returns on next restart, but within-session post-wipe auto-wipe continuity is still limited.

## 2. Pressure banner wording
`warn` and `critical` states are currently differentiated mostly by color rather than strongly differentiated text. Accurate, but can be improved.

## 3. Code signing
Installer works, but SmartScreen reputation/signing is not yet addressed.  
Required before broad public distribution.

## 4. Single-workspace only
This is intentional for MVP, but it is still a limitation.

---

# Why this milestone matters

GhostLayer is no longer just:
- a product brief
- a board full of tickets
- a UI shell
- a dev-only toy

It is now:

- a real Electron app
- a real packaged Windows executable
- a real installer
- a real RAM-backed staging workflow
- a real commit/discard system
- a real crash-honesty product
- a real foundation for future expansion

That is the inflection point.

---

# Recommended next phase

## Immediate next work
- small polish pass only
- clean release notes / milestone docs
- optional tiny wording cleanup for pressure states
- prep for internal demo / first outside testing
- code-signing plan for future public distribution

## Not recommended next
- massive feature expansion
- Ghost Shield overreach
- multi-workspace jump
- fake AI fluff
- architecture churn for its own sake

The foundation is here.  
Next work should be **controlled**, not chaotic.

---

# Final verdict

**GhostLayer v0.1.0 = first packaged milestone complete.**

Core loop: **real**  
Crash honesty: **real**  
Packaging: **real**  
Installer: **real**  
Tray behavior: **real**

This is the first point where GhostLayer can be described, without exaggeration, as a functioning Windows desktop product.

---

## Internal milestone tag
**GhostLayer v0.1.0 — First Packaged Milestone**

## Optional short release line
**A live RAM layer for Windows — now packaged, installable, and proven end to end.**

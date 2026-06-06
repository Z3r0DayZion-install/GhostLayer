# GhostLayer v0.1.0 — Public Launch Note

---

**GhostLayer gives Windows a controllable temporary memory layer between active work and permanent storage.**

---

## What it is

GhostLayer is a desktop application for Windows that lets you stage files in RAM before deciding whether they go to disk.

You drag a file in. It lives in memory — not on your filesystem. When you're ready, you commit it to disk. If you're not, you discard it and it's gone. No leftover temp files. No ambiguous state. No wondering what touched your drive.

That's the core idea: **you stay in control of what becomes permanent.**

---

## What problem it solves

Most tools treat disk writes as the default. You open a file, make a change, and the file is modified — often before you've decided you want it to be. Undo histories help, but they're attached to the app, not the file. Close the wrong thing and the decision was made for you.

GhostLayer inverts that. The staging layer is the default. Disk is the deliberate step.

This is useful anywhere you want a clean boundary between "working on something" and "saving it." Temporary scratch files. Sensitive documents you may not keep. Work-in-progress you want to evaluate before it lands. Any situation where you want the option to walk something back completely — not just undo a change, but erase that the file was ever written.

---

## What v0.1.0 proves

This release proves the core loop works end to end as a real packaged Windows application:

- **Stage** files into RAM via drag-and-drop
- **Commit** them to disk when you're ready
- **Discard** them from memory if you're not — disk is never touched
- **Bulk actions** for committing or discarding everything at once
- **Tray controls** for Commit All and Discard All without opening the window
- **Crash-honest behavior** — if GhostLayer exits unexpectedly, it tells you what was in memory and what couldn't be recovered, rather than pretending it saved something it didn't
- **Packaged Windows build** — `.exe` and NSIS installer, not just a dev prototype

GhostLayer v0.1.0 is not a full sandbox. It is not a kernel-level isolation tool. It is not a cloud platform. It is the first working release of a focused, honest RAM staging layer — and it does exactly what it says.

---

## What's next

The foundation is stable. Next work focuses on a polish pass, code signing for public distribution, and expanding the staging workflow based on real use. The single-workspace MVP enforced in v0.1.0 will hold until there's a genuine reason to expand it.

GhostLayer ships when it's ready, not on a hype cycle.

---

*GhostLayer v0.1.0 — Windows — June 2026*

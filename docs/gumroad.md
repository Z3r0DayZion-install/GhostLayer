# GhostLayer — Gumroad Page Copy

---

## Product name
GhostLayer

## Tagline
Stage in RAM. Save on purpose.

---

## Summary (shown under title)

GhostLayer is a Windows utility that stages files in RAM before they ever need to touch disk.

Drop a file in, keep it temporary, then either **commit it to disk** or **discard it from RAM** — completely your call.

---

## Description

### The problem

Most apps save too early. The moment you open a file, create a scratch note, or extract an archive — it's on disk. Permanent. Cluttering up your filesystem whether you wanted it there or not.

### The fix

GhostLayer gives Windows a controllable temporary layer between active work and permanent storage.

**The workflow:**

```
Drop file → Staged in RAM → Commit or Discard
```

Files come in. They live in RAM. Nothing reaches disk until you say so.

---

### What you can do with it

- **Test files without clutter** — stage, evaluate, discard
- **Work temporarily without committing everything** — keep scratch work disposable
- **Keep private work private** — disposable files stay disposable
- **Save only what matters** — every commit is a decision, not an accident

---

### Core actions

| Action | What it does |
|---|---|
| **Stage** | Drop a file into GhostLayer — it lives in RAM, not disk |
| **Commit** | Write a staged file to disk permanently |
| **Discard** | Remove a staged file from RAM without writing anything |
| **Commit All** | Flush everything staged to disk at once |
| **Discard All** | Clear everything staged from RAM at once |

---

### What v0.1.0 includes

- Packaged Windows installer
- Working RAM staging layer
- Single-file commit and discard
- Bulk commit and discard (Commit All / Discard All)
- System tray integration
- Honest crash-awareness behavior
- RAM pressure monitoring

---

### Honest by design

GhostLayer doesn't fake recovery or pretend RAM state is permanent.

If something is staged in RAM, it is **temporary until you commit it**. On crash, uncommitted RAM contents may be lost. GhostLayer preserves metadata so you can see what was affected — but it makes no fake recovery promises.

You always know exactly where your files stand.

---

### Best for

- Power users
- Developers and testers
- Privacy-minded users
- Anyone who handles lots of temporary files
- Anyone who wants a cleaner Windows workflow

---

### What GhostLayer is not

- Not a full VM or kernel sandbox
- Not a fake "RAM optimizer"
- Not a cloud sync platform
- Not a magic recovery app
- Not a file manager replacement

GhostLayer is a RAM-backed staging layer for Windows files. One real problem, solved well.

---

## FAQ

**Does GhostLayer save files automatically?**
No. That's the point. Files staged in GhostLayer stay temporary until you commit them.

**Is this just a RAM disk?**
No. A RAM disk is raw storage. GhostLayer is a workflow tool built around staging, visibility, commit, and discard.

**Is GhostLayer a sandbox?**
Not in the full VM or kernel-driver sense. It is a temporary RAM-backed staging layer, not a full isolation system.

**What happens on crash?**
GhostLayer is honest: uncommitted RAM contents may be lost. It preserves metadata so you can see what was affected, but it does not fake file recovery.

**What OS does this run on?**
Windows. GhostLayer v0.1.0 is Windows-only.

---

## Short pitch (for the Gumroad "pitch" field, ~280 chars)

GhostLayer gives Windows a temporary RAM layer for files. Drop a file in, keep it in RAM, then commit it to disk or discard it. No auto-saves. No clutter. You decide what becomes permanent.

---

## Content rating
General

## Category suggestion
Productivity / Utilities / Developer Tools

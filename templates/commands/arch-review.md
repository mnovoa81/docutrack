---
description: Audit documentation coverage and surface stale, missing, or low-quality docs
allowed-tools: Read, Bash
---

Run a documentation coverage audit. Follow these steps:

**Step 1 — Collect source files**
Run: `find src -name "*.js" -o -name "*.ts" -o -name "*.py" -o -name "*.go" 2>/dev/null | grep -v node_modules | grep -v ".test." | grep -v ".spec." | head -100`

If `src/` doesn't exist, try `lib/`, `app/`, or `pkg/`.

**Step 2 — Collect documented modules**
List all `.md` files in `docs/modules/`.

**Step 3 — Read the queue**
Read `.docutrack/queue.json` to see files waiting for documentation.

**Step 4 — Read module docs**
For each doc in `docs/modules/`, check:
- Does it have a non-empty **Responsibility** line?
- Does it have a **Public API** section with at least one entry?
- Does it have a **Dependencies** section?

Flag any doc that is missing these sections as "incomplete".

**Step 5 — Output the report**

```
DocuTrack Coverage Report
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Score: <N>%  (<documented>/<total> source files)

✓  DOCUMENTED (<N>)
   <module>.md  ──  <responsibility in one sentence>

✗  MISSING DOCS (<N>)
   <file path>  ──  no documentation found

⚠  INCOMPLETE DOCS (<N>)
   <module>.md  ──  missing: <what's missing>

⏱  PENDING IN QUEUE (<N>)
   <file path>  ──  added <relative time>

RECOMMENDATIONS
  1. <highest priority action>
  2. <second priority action>
  3. <third priority action>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Rules for scoring:
- Score = (documented source files) / (total source files) × 100
- A source file is "documented" if a `docs/modules/<name>.md` exists for it (matching by basename without extension)
- Round to nearest integer
- Score ≥ 80: ✓ healthy  |  50–79: ⚠ needs work  |  < 50: ✗ critical

After the report, ask: "Want me to write the missing documentation now?"

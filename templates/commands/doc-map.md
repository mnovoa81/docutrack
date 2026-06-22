---
description: Render a live map of the system — modules, API surface, integrations, and doc coverage
allowed-tools: Read, Bash
---

Read the following files (skip gracefully if any don't exist):
1. `ARCHITECTURE.md`
2. All `.md` files in `docs/modules/`
3. `docs/api/openapi.json`
4. `.docutrack/queue.json`

Then output a formatted system map in this exact structure:

```
╔══════════════════════════════════════════════════════╗
║  System Map — <project name>                        ║
╚══════════════════════════════════════════════════════╝

OVERVIEW
  <one-sentence system description from ARCHITECTURE.md>

MODULES  (<N> documented)
  ├── <module>  —  <responsibility>
  ├── <module>  —  <responsibility>
  └── <module>  —  <responsibility>

API SURFACE  (<N> endpoints)
  GET    /path/one   [tag]
  POST   /path/two   [tag]
  ...

INTEGRATIONS
  <service> — <purpose>
  ...

COVERAGE
  Documented  : <N> modules
  Pending     : <N> files need documentation
  Score       : <N>%  [▓▓▓▓▓▓░░░░]

PENDING DOCUMENTATION
  - <file>  (added <timestamp>)
```

Rules:
- Keep module names short — use the file basename without extension
- Show at most 20 API endpoints; if more exist, show the first 20 and append `  ... and N more`
- For the coverage bar, use ▓ for covered and ░ for uncovered (10 chars total)
- If a section has no data (no modules, no API, etc.), write `  (none yet)` under it
- Do not include markdown formatting — output plain text only

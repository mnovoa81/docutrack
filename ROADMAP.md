# DocuTrack — Roadmap

> **DocuTrack** is an open-source Claude Code plugin that forces AI agents to document what they build — in real time, automatically — and serves that documentation as a beautiful, interactive web experience.

---

## The Problem

When you build with Claude Code or any AI agent, you get code fast. What you don't get:

- A record of architectural decisions
- A map of modules, layers, and responsibilities
- Up-to-date API and integration docs
- An interactive explorer to test your endpoints
- Any explanation of *why* things are built the way they are

DocuTrack closes that gap by wiring into Claude Code's lifecycle hooks — so documentation isn't something you ask the agent to do, it's something the system enforces. And it doesn't live in forgotten `.md` files: it's served as a first-class web experience.

---

## Guiding Principles

1. **Deterministic over probabilistic** — hooks fire on events, they don't rely on the model remembering to document
2. **Zero friction for the agent** — the documentalista subagent handles writing; the main coding agent stays focused
3. **Living docs over generated snapshots** — docs update as code changes, not as a one-shot export
4. **The web view is the product** — markdown is the source of truth, but the consumption experience defines the value
5. **Works standalone** — no dependency on any orchestration system (AgentMesh, LangGraph, etc.)
6. **Open and composable** — templates, adapters, and integrations are first-class citizens

---

## Phase 1 — Foundation `v0.1`

**Goal:** Prove the hook mechanism works. A project using DocuTrack never closes a session with undocumented changes.

### Deliverables

- [ ] `npx docutrack init` scaffolding command
  - Copies hooks, base CLAUDE.md instructions, and `/docs` folder structure into any project
  - Detects the project stack and selects the right template automatically
- [ ] `PostToolUse` hook — fires after every `Edit` / `Write` tool call
  - Writes a pending entry to `.docutrack/queue.json` with the modified file path and timestamp
- [ ] `Stop` hook — fires when the agent session ends
  - Reads the queue; if there are undocumented changes, prints a warning and lists affected files
  - Optionally blocks session close until queue is cleared (configurable)
- [ ] Base `CLAUDE.md` snippet
  - Instructs the agent about the documentation convention and where docs live
- [ ] Minimal `ARCHITECTURE.md` template
  - Sections: Overview, Module Map, Tech Stack, Key Decisions

**Success criteria:** After `npx docutrack init` and a coding session, the Stop hook correctly reports undocumented changes.

---

## Phase 2 — Documentalista + Web Viewer `v0.2`

**Goal:** The agent that codes never writes docs. A dedicated subagent does it. And the result is immediately viewable in a browser.

### Deliverables

**Documentalista subagent:**
- [ ] `.claude/agents/documentalista.md` — specialized subagent definition
  - System prompt focused exclusively on documentation quality
  - Reads changed files from the queue, infers what changed, updates the relevant doc sections
- [ ] `PostToolUse` hook upgrade — invokes documentalista automatically after changes
- [ ] Per-module doc format in `/docs/modules/<name>.md`
  - Sections: Responsibility, Public API, Dependencies, Data shapes, Notes
- [ ] Queue cleared automatically when documentalista finishes

**Web viewer:**
- [ ] `docutrack serve` — local dev server at `localhost:4242`
  - Serves a web app built on **Astro + Starlight** (same stack used by Astro, Cloudflare, and Vercel for their own docs)
  - Watches `.docutrack/` and `/docs/` for changes and hot-reloads
  - Renders Mermaid diagrams natively (dependency graphs, sequence diagrams)
  - Full-text search across all documentation
  - Dark mode, responsive, keyboard navigable
- [ ] `docutrack build` — generates a static site ready for GitHub Pages, Vercel, or Netlify
- [ ] Auto-deploy GitHub Action — on every push, builds and deploys the docs site

**Success criteria:** After a coding session, the dev opens `localhost:4242` and sees the architecture of their system rendered beautifully — without writing a single line of documentation manually.

---

## Phase 3 — API Explorer `v0.3`

**Goal:** Any project using DocuTrack gets a Swagger-like interactive API explorer automatically — regardless of framework.

### How it works

The documentalista analyzes route and controller files, infers the API surface (paths, methods, parameters, request/response shapes), and generates an **OpenAPI 3.0 spec**. The web viewer renders it as an interactive explorer. The dev never writes the spec manually.

This means a project built on Express, FastAPI, Django, Rails, Go's net/http, or anything else gets the same experience FastAPI gives you out of the box — because DocuTrack does the inference, not the framework.

### Deliverables

- [ ] **API spec generator** in the documentalista subagent
  - Detects routes from framework-specific patterns (Express `router.get`, FastAPI `@app.get`, Django `urlpatterns`, etc.)
  - Infers request body shape from validation schemas (Zod, Pydantic, ActiveRecord, etc.) when present
  - Infers response shape from return types or serializers
  - Outputs `/docs/api/openapi.json` — valid OpenAPI 3.0 spec
- [ ] **API Explorer UI** in the web viewer
  - Dedicated `/api` section in `localhost:4242`
  - Endpoints grouped by tag / module / service
  - Search bar filtering by path, method, or description
  - Expandable request/response schema viewer with example payloads
- [ ] **"Try it out"** — execute requests directly from the browser
  - Configurable base URL (local dev, staging, production)
  - Auth header injection (Bearer token, API key, basic auth)
  - Request body editor with JSON syntax highlighting
  - Response viewer with status code, headers, and formatted body
- [ ] **GraphQL support**
  - Detects GraphQL schema files and renders a schema explorer
  - Query/mutation browser with argument documentation
- [ ] **WebSocket / SSE support**
  - Documents event-driven endpoints with their message shapes
- [ ] **Spec export**
  - Download the OpenAPI spec as JSON or YAML from the web viewer
  - Copy `curl` command for any endpoint with one click

**Success criteria:** A developer can open DocuTrack's API Explorer, find an endpoint, understand its contract, and execute a test request — without opening Postman, Insomnia, or any external tool.

---

## Phase 4 — Architecture Intelligence `v0.4`

**Goal:** Docs don't just describe files — they map the system.

### Deliverables

- [ ] **Module dependency graph** — auto-generated from imports/requires
  - Rendered as an interactive Mermaid diagram in the web viewer
  - Click a module to highlight its direct dependencies and dependents
- [ ] **ADR support** (Architecture Decision Records)
  - `/docs/decisions/` folder with timeline view in the web viewer
  - Documentalista creates a new ADR when it detects a significant structural change (new service, new dependency, schema change)
  - ADR template: Context → Decision → Consequences
- [ ] **Integration map** — tracks external services (DBs, queues, third-party APIs)
  - Auto-populated from env var usage and SDK imports
  - Rendered as a C4-style diagram in the web viewer
- [ ] **Stale doc detection**
  - Tracks last-modified date of each doc vs. source files it covers
  - Flags stale entries visually in the web viewer (yellow warning badge)

**Success criteria:** A new contributor opens the web viewer and understands the system architecture — modules, their relationships, and the key decisions that shaped them — without reading any code.

---

## Phase 5 — Developer Experience `v0.5`

**Goal:** Devs can audit and interact with the docs on demand.

### Deliverables

- [ ] `/doc-map` slash command — renders the system map in the terminal
- [ ] `/arch-review` slash command — documentation coverage audit with a score: `Coverage: 84%`
- [ ] `/adr new` slash command — guided ADR creation flow
- [ ] `docutrack status` CLI command
  - Shows: total docs, coverage %, oldest stale doc, pending queue size, API spec freshness
- [ ] **Coverage badge** — `![DocuTrack](https://docutrack.dev/badge/<repo>)` for README files
- [ ] **Documentation diff in PRs** — GitHub Action posts a comment showing what changed in the docs as part of the PR

**Success criteria:** Running `docutrack status` gives an accurate, actionable snapshot of documentation health in under 2 seconds.

---

## Phase 6 — Templates & Ecosystem `v0.6`

**Goal:** DocuTrack adapts to different stacks out of the box.

### Deliverables

- [ ] **Stack templates** for `npx docutrack init --template <stack>`
  - `nextjs` — pages, components, server actions, API routes
  - `fastapi` — routers, models, dependencies, background tasks
  - `express` — routes, middleware, services, models
  - `monorepo` — per-package docs + cross-package integration map
  - `go` — packages, handlers, middleware, interfaces
- [ ] **AgentMesh adapter**
  - When a task closes in AgentMesh, DocuTrack hooks fire automatically
  - Adds a `documentation` field to the task output with a link to the relevant doc page
- [ ] **CI gate**
  - GitHub Action fails the PR if coverage drops below a configurable threshold
  - Configurable: `docutrack.config.json` → `{ "minCoverage": 80 }`
- [ ] **Hosted docs** (optional)
  - `docutrack deploy` — push to `docs.yourproject.dev` via DocuTrack's hosting
  - Password protection for private projects

**Success criteria:** A team can block merges on documentation debt the same way they block on failing tests.

---

## Phase 7 — Intelligence Layer `v1.0`

**Goal:** DocuTrack doesn't just record — it reasons about the system.

### Deliverables

- [ ] **Drift detection** — semantic comparison between docs and code
  - "This module doc says it handles auth but the code no longer imports any auth library"
- [ ] **Complexity warnings** — flags modules that have grown beyond a single responsibility
  - Suggests splits or refactors based on the dependency graph
- [ ] **Onboarding generator** — `/onboard` command
  - Generates a guided tour ordered by system criticality
  - Outputs a reading order: "Start here → then here → then here"
- [ ] **Multi-agent doc coordination**
  - Prevents parallel documentalista instances from writing to the same doc simultaneously
  - Merges parallel doc updates cleanly
- [ ] **Q&A over your docs** — ask questions about your own system
  - "Which modules depend on the payments service?"
  - "When was the last time the auth architecture changed?"

**Success criteria:** A team lead runs `/arch-review` and gets actionable architectural recommendations, not just a coverage report.

---

## What the Web Experience Looks Like

```
localhost:4242
├── /                  → System overview, module map diagram, health score
├── /modules           → All modules, their responsibilities, and dependency graph
├── /api               → Interactive API Explorer (OpenAPI-powered)
│   ├── /api/rest      → REST endpoints, grouped, searchable, with "Try it out"
│   ├── /api/graphql   → GraphQL schema explorer
│   └── /api/events    → WebSocket / SSE event catalog
├── /decisions         → ADR timeline — architectural decisions with context
├── /integrations      → External services map (DBs, queues, third-party APIs)
└── /coverage          → Documentation health dashboard
```

---

## Versioning Strategy

| Version | Focus | Status |
|---------|-------|--------|
| v0.1 | Hook engine + init scaffold | Planned |
| v0.2 | Documentalista subagent + Web viewer | Planned |
| v0.3 | API Explorer (interactive, framework-agnostic Swagger) | Planned |
| v0.4 | Architecture intelligence (graphs, ADRs, integrations) | Planned |
| v0.5 | Developer experience + CLI | Planned |
| v0.6 | Templates + ecosystem | Planned |
| v1.0 | Intelligence layer | Planned |

Each version is a usable, shippable increment. You can stop at v0.3 and already have something most teams would pay for.

---

## Non-Goals (explicit scope boundaries)

- **Not a documentation generator for public-facing product docs** — DocuTrack maps your system internals, not your marketing site or user guides
- **Not a code reviewer** — it doesn't evaluate code quality, only documentation coverage
- **Not a replacement for human docs** — DocuTrack lowers the floor; a human should still own the high-level narrative
- **Not tied to Claude Code only** (long term) — the hook mechanism is Claude Code–native today, but the doc format and subagent spec are designed to be portable

---

## Contributing

This project follows a `docs-first` contribution model — fitting, given what it is.

Before opening a PR:
1. If you're adding a feature, update `ARCHITECTURE.md` to reflect it
2. If you're changing a module, update its `/docs/modules/<name>.md`
3. Run `docutrack status` and include the output in your PR description

More details in `CONTRIBUTING.md` (coming in v0.1).

---

*Built to make AI-assisted development legible — for the humans who inherit the code.*

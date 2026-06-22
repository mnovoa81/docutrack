---
name: ask-docs
description: Ask a question about this codebase using the accumulated documentation.
---

Answer the question: $ARGUMENTS

To answer, read and synthesize the following documentation sources:

1. `ARCHITECTURE.md` — system overview, module map, integrations, env variables
2. `docs/modules/` — all module docs (responsibility, public API, dependencies, data shapes)
3. `docs/api/openapi.json` — API spec (endpoints, parameters, request/response shapes)
4. `docs/decisions/` — ADRs explaining why things are the way they are
5. `.docutrack/queue.json` — pending files (what's being actively worked on)

**How to answer:**
- Be direct and specific — reference exact module names, function names, and file paths
- If the answer spans multiple modules, explain the interaction clearly
- If documentation doesn't cover the question, say what IS documented and suggest where to look in the source
- For API questions, quote the exact endpoint path and method
- For architecture questions, reference the ADR if one exists

**Format:**
- Lead with a one-sentence direct answer
- Follow with supporting detail from the docs
- End with the most relevant file path(s) to read next if the user wants more depth

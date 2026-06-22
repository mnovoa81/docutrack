## Documentation Protocol (DocuTrack)

This project uses DocuTrack to maintain living documentation. After every code change, follow this protocol:

### When you create or modify a module

Update or create `docs/modules/<module-name>.md` with:
- **Responsibility**: what this module does (one sentence)
- **Public API**: exported functions/classes with brief descriptions
- **Dependencies**: what it imports from and what depends on it
- **Data shapes**: key types, schemas, or interfaces
- **Notes**: constraints, gotchas, non-obvious design decisions

### When you add or change an API endpoint

Update `docs/api/` — one file per service/router. Document:
- Method + path
- Request body / query params
- Response shape and status codes
- Auth requirements

### When you make a significant architectural decision

Create `docs/decisions/ADR-<NNN>-<slug>.md`. Use this format:
```
# ADR-NNN: Title
## Status: Proposed | Accepted | Deprecated
## Context: why this decision was needed
## Decision: what was decided
## Consequences: trade-offs and implications
```

### When you modify `ARCHITECTURE.md`

Keep the Module Map table current. If you add a new service, integration, or env variable, add it to the relevant section.

### The Stop hook will warn you

If you end the session with modified files and no doc update, the Stop hook prints a list of what needs attention. Clear the queue with `npx docutrack clear` only after documentation is updated.

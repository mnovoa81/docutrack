---
description: Create a new Architecture Decision Record (ADR) interactively
allowed-tools: Read, Write, Bash
---

Guide the user through creating a new Architecture Decision Record.

**Step 1 — Find the next ADR number**
List files in `docs/decisions/`. Find the highest `ADR-NNN` number and increment by 1. If none exist, start at 001.

**Step 2 — Ask for the decision title**
Say: "What is the title of this architectural decision? (e.g., 'Use PostgreSQL for primary storage')"

Wait for the user's response.

**Step 3 — Ask for context**
Say: "What problem or situation made this decision necessary?"

Wait for the user's response.

**Step 4 — Ask for the decision**
Say: "What was decided? Be specific."

Wait for the user's response.

**Step 5 — Ask for consequences**
Say: "What are the trade-offs, implications, or things to watch for as a result of this decision?"

Wait for the user's response.

**Step 6 — Create the ADR file**

Create the file at `docs/decisions/ADR-<NNN>-<slug>.md` where:
- `<NNN>` is zero-padded to 3 digits (e.g., 001, 012, 123)
- `<slug>` is the title lowercased with spaces replaced by hyphens, max 40 chars

File content:
```markdown
# ADR-<NNN>: <Title>

**Status**: Accepted  
**Date**: <today's date as YYYY-MM-DD>

## Context

<User's context answer>

## Decision

<User's decision answer>

## Consequences

<User's consequences answer>
```

After creating the file, say:
"Created `docs/decisions/ADR-<NNN>-<slug>.md`. The ADR is now part of your living documentation and will appear in DocuTrack's Decisions section."

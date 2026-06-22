# Architecture

> Maintained by DocuTrack. Updated automatically as the codebase evolves.

---

## Overview

<!-- Describe the API's purpose in 2-3 sentences -->

## Tech Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| Framework | FastAPI | |
| Validation | Pydantic v2 | |
| ORM | | SQLAlchemy / Tortoise / etc. |
| Database | | |
| Auth | | OAuth2 / JWT / API key |
| Task queue | | Celery / ARQ / etc. |
| Deployment | | |

## App Structure

```
app/
├── main.py          ← FastAPI app + router registration
├── routers/         ← Route handlers by domain
├── models/          ← Pydantic schemas (request/response)
├── db/              ← SQLAlchemy models + migrations
├── dependencies/    ← FastAPI dependencies (auth, db session, etc.)
├── services/        ← Business logic
└── tasks/           ← Background tasks
```

## Module Map

| Module | Path | Responsibility |
|--------|------|---------------|
| | `routers/` | |
| | `models/` | |
| | `services/` | |
| | `dependencies/` | |

## Dependency Injection Map

| Dependency | Provides | Used in |
|-----------|---------|--------|
| `get_db` | DB session | All DB routes |
| `get_current_user` | Authenticated user | Protected routes |

## Key Decisions

See [`docs/decisions/`](docs/decisions/) for Architecture Decision Records.

## Integrations

| Service | Purpose | Library |
|---------|---------|---------|
| | | |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Database connection string |
| `SECRET_KEY` | Yes | JWT signing key |
| `ALGORITHM` | No | JWT algorithm (default: HS256) |

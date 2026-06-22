# Architecture

> Maintained by DocuTrack. Updated automatically as the codebase evolves.

---

## Overview

<!-- Describe the service's purpose in 2-3 sentences -->

## Tech Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| Language | Go | |
| HTTP | | net/http / Chi / Gin / Echo / Fiber |
| ORM | | GORM / sqlx / pgx |
| Database | | |
| Auth | | |
| Deployment | | |

## Package Map

```
cmd/
└── server/        ← main entry point
internal/
├── handlers/      ← HTTP handlers
├── middleware/    ← HTTP middleware
├── services/      ← Business logic
├── repository/    ← Data access layer
├── models/        ← Domain structs
└── config/        ← Configuration
pkg/               ← Exported, reusable packages
```

## Module Map

| Package | Responsibility |
|---------|---------------|
| `internal/handlers` | |
| `internal/services` | |
| `internal/repository` | |
| `internal/models` | |
| `internal/middleware` | |

## Interface Contracts

| Interface | Defined in | Implemented by |
|-----------|-----------|---------------|
| | | |

## Key Decisions

See [`docs/decisions/`](docs/decisions/) for Architecture Decision Records.

## Integrations

| Service | Purpose | Package |
|---------|---------|---------|
| | | |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | HTTP server port (default: 8080) |
| `DATABASE_URL` | Yes | PostgreSQL connection string |

# Architecture

> Maintained by DocuTrack. Updated automatically as the codebase evolves.

---

## Overview

<!-- Describe the API's purpose in 2-3 sentences -->

## Tech Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| Framework | Express.js | |
| Validation | | Zod / Joi / Yup |
| ORM | | Prisma / Sequelize / Mongoose |
| Database | | |
| Auth | | JWT / Passport / etc. |
| Deployment | | |

## App Structure

```
src/
├── routes/          ← Express routers by domain
├── controllers/     ← Request handlers (thin layer)
├── services/        ← Business logic
├── middleware/      ← Auth, validation, error handling
├── models/          ← DB schemas / ORM models
└── app.js           ← Express app + middleware registration
```

## Module Map

| Module | Path | Responsibility |
|--------|------|---------------|
| | `routes/` | |
| | `services/` | |
| | `middleware/` | |
| | `models/` | |

## Middleware Stack

| Middleware | Applied to | Purpose |
|-----------|-----------|---------|
| `cors` | All routes | CORS headers |
| `authenticate` | Protected routes | JWT verification |
| `validate` | POST/PUT/PATCH | Request validation |

## Key Decisions

See [`docs/decisions/`](docs/decisions/) for Architecture Decision Records.

## Integrations

| Service | Purpose | Library |
|---------|---------|---------|
| | | |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Server port (default: 3000) |
| `DATABASE_URL` | Yes | Database connection string |
| `JWT_SECRET` | Yes | JWT signing secret |

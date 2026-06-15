# Splitwise

A modern, group-focused expense-sharing application built as an npm workspace.

## Applications

- `apps/web`: React, TypeScript, Vite, Tailwind CSS, and shadcn/ui conventions.
- `apps/api`: Express, TypeScript, MongoDB/Mongoose, and JWT-ready infrastructure.

## Requirements

- Node.js 22.13 or newer
- npm 11 or newer
- MongoDB (required from Phase 2 onward)

## Getting started

```bash
npm install
cp .env.example apps/api/.env
cp .env.example apps/web/.env
npm run dev
```

The web application runs at `http://localhost:5173`. The API runs at
`http://localhost:4000`, with health status at `GET /api/v1/health`.

## Authentication

Phase 2 provides registration, login, logout, session refresh, and protected routes. Access
tokens are short-lived and held in browser memory. Refresh tokens are rotated, stored as hashes
in MongoDB, and sent only through an HTTP-only cookie.

Authentication endpoints are available under `/api/v1/auth`:

- `POST /register`
- `POST /login`
- `POST /refresh`
- `POST /logout`
- `GET /me`

## Dashboard

Phase 3 adds the responsive authenticated application shell, desktop and mobile navigation,
balance summary cards, groups overview, recent activity, loading skeletons, and polished empty
states. Values remain at zero until the Groups and Expenses phases introduce real dashboard data.

## Quality commands

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Deployment

Deploy `apps/web` to Vercel. Deploy the repository to Render using
`render.yaml`, then provide production environment variables through each platform's
secret management interface. MongoDB is intentionally not required by the health route.

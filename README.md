# GrowthifyEdge HRMS & Employee Management Platform

A premium client-showcase HRMS built with React, Vite, TypeScript, Tailwind CSS and Supabase,
deployed as a static SPA on Cloudflare Pages. Wave 1 covers authentication, an executive
dashboard, the people directory, employee profiles and mutations, document management,
organization settings and a global multi-currency display system.

## Stack

- **Frontend:** React 19 + Vite 7 + TypeScript + Tailwind CSS 4 + React Router 7
- **Data/Auth/Storage:** Supabase (PostgreSQL, Auth, Storage, Row-Level Security)
- **Data fetching:** TanStack React Query
- **Forms:** React Hook Form + Zod
- **Charts:** Recharts · **Icons:** lucide-react · **Dates:** date-fns
- **Testing:** Vitest + React Testing Library + Playwright
- **Hosting:** Cloudflare Pages (static assets only, no server runtime)

## Getting started

```bash
npm install
cp .env.example .env   # fill in your Supabase URL + publishable key
npm run dev
```

Set up the Supabase project first — see [docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md).
Deployment steps are in [docs/CLOUDFLARE_DEPLOYMENT.md](docs/CLOUDFLARE_DEPLOYMENT.md).

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Type-check and build production assets to `dist/` |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript project check |
| `npm test` | Vitest unit/component tests |
| `npm run test:e2e` | Playwright smoke tests (live-Supabase specs skip without credentials) |

## Project structure

```
src/
  components/     Reusable UI (shell, tables, drawers, badges, states, …)
  contexts/       Auth, currency and toast providers
  features/       Route-level modules (auth, dashboard, people, settings, …)
  hooks/          React Query data hooks
  lib/            Supabase client, currency/format utilities, env validation
  types/          Database row types
supabase/
  migrations/     Version-controlled SQL (schema, RLS, storage)
  seed.sql        Idempotent fictional demo data
e2e/              Playwright specs
docs/             Supabase + Cloudflare setup guides
```

## Currency model

All financial values are **stored in USD**. The exchange rates in Settings are
**configurable demonstration rates** (not live market data) and only affect display.
The selected display currency persists locally and applies globally.

## Roles (Wave 1)

- **HR Administrator** — full dashboard, people management, documents, settings
- **Manager** — restricted dashboard, own record + direct reports (no settings, no compensation editing)
- **Employee** — schema and RLS policies prepared; self-service UI arrives in a later wave

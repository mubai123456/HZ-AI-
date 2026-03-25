# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
# Development
npm run dev          # http://localhost:3000

# Build & production
npm run build
npm run start

# Lint
npm run lint

# Tests (Vitest + jsdom + @testing-library/react)
npm test             # single-pass
npm run test:watch

# Database (SQLite via Prisma)
npm run prisma:generate   # regenerate client
npm run prisma:push       # apply schema to dev.db
```

## Architecture

**内部 AI 应用工作台** — an internal AI workbench MVP. Currently in "shell-first" phase: full UI/routing built, all data served from in-memory mock data. Real integrations (RunningHub, Feishu) are Phase 2.

### Auth & Middleware

`src/proxy.ts` is Next.js middleware — it guards all routes under `/(workspace)/` by verifying the `ai-workbench-session` JWT cookie. Unauthenticated requests redirect to `/login`.

Auth flow: `app/login/actions.ts` server action → `src/lib/auth.ts` (`authenticateMockUser` + `createSessionToken`) → sets cookie.

Protected pages call `src/lib/session.ts` (`getCurrentSession`) to read the JWT in server components.

### Data Layer

**Phase 1 (current):** All page data comes from `src/lib/mock-data.ts`. The Prisma client (`src/lib/prisma.ts`) is instantiated but no code calls it yet.

**Phase 2 (planned):** Replace mock data with:
- `RUNNINGHUB_*` env vars → submit image generation tasks to RunningHub API
- `FEISHU_*` env vars → sync task results to Feishu multi-dimensional tables

### Route Structure

```
/login                         # public
/(workspace)/                  # auth-guarded route group
  /                            # dashboard
  /apps / /apps/[code]         # app catalog + task submission form
  /tasks / /tasks/[id]         # task list + task detail/logs
  /assets                      # generated output assets
  /sync                        # Feishu sync status
  /admin/**                    # ADMIN role only

/api/auth/logout               # POST — clear session cookie
/api/internal/**               # authenticated REST endpoints (mirror page data)
```

### Key Files

| Path | Purpose |
|------|---------|
| `src/lib/types.ts` | All shared TypeScript interfaces |
| `src/lib/mock-data.ts` | In-memory data source (replace in Phase 2) |
| `src/lib/env.ts` | Zod-validated env config singleton |
| `src/components/workbench-shell.tsx` | Client component — sidebar nav + top header |
| `prisma/schema.prisma` | SQLite schema: User, App, Task, TaskAsset, SyncLog |

### Path Alias

`@/*` maps to `src/*` (configured in both `tsconfig.json` and `vitest.config.ts`).

## Design System

This project uses an **Apple Human Interface Guidelines** inspired design system.

**Always read `DESIGN.md` before making any visual or UI decisions.**

Key design principles:
- **Clarity** — Text legible at every size, minimal decoration
- **Deference** — Content first, UI never competes with content
- **Depth** — Soft shadows, clear visual hierarchy

Design tokens (CSS variables) are defined in `src/app/globals.css`:
- Colors: `--accent`, `--success`, `--warning`, `--error`, `--bg-primary`, `--bg-secondary`
- Typography: `--font-sans`, type scale from 11px to 34px
- Spacing: 4px base unit scale
- Shadows: 4 elevation levels
- Motion: `--duration-fast` (100ms), `--duration-normal` (200ms), `--duration-slow` (300ms)

Components follow Apple patterns:
- Buttons: `.btn.btn-primary`, `.btn.btn-secondary`, `.btn.btn-ghost`
- Cards: `.card` with 12px radius, subtle shadow
- Inputs: `.input` with 10px radius, gray background
- Badges: `.badge` with semantic color variants

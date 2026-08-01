# AI Academic Workspace

A project-based AI workspace for managing academic assignments and research papers. Each project has its own AI context, document history, references database, and activity timeline. The AI automatically analyzes instructor instructions, generates outlines, writes chapters, and exports documents.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/academic-workspace run dev` — run the frontend (port 18543)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Tailwind CSS, TanStack React Query, wouter
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (v3), `drizzle-zod`
- AI: Configurable via env vars (OpenAI-compatible API)
- API codegen: Orval (from OpenAPI spec)

## Where things live

- `lib/api-spec/openapi.yaml` — single source of truth for all API contracts
- `lib/db/src/schema/` — Drizzle ORM table definitions (one file per table)
- `artifacts/api-server/src/routes/` — Express route handlers (projects, messages, documents, references, attachments, activities, jobs, metadata, exports)
- `artifacts/api-server/src/lib/ai.ts` — AI service (configurable provider)
- `artifacts/api-server/src/lib/activity.ts` — activity logging helper
- `artifacts/academic-workspace/src/` — React frontend

## Architecture decisions

- Single-user app — no authentication, no multi-user support by design
- OpenAPI-first: all types generated from `openapi.yaml` via Orval
- AI provider is fully configurable via env vars; app works in demo mode without keys
- File attachments stored as base64 JSON (avoids multipart complexity); saved to `/tmp/academic-workspace-uploads`
- Chat builds context from project metadata + latest document + recent message history (last 10)
- New document versions created automatically when AI response contains structured content during revision
- All integers in OpenAPI spec use `type: number` (Orval generates `zod.int()` for `integer` which breaks Zod v3)

## Product

- Dashboard with project cards, status filters, progress bars, and stats summary
- Create new project with instruction text (paste or type), output format, and reference preferences
- Project workspace with 6 tabs: Preview, Chat AI, Referensi, Lampiran, Riwayat Versi, Timeline
- AI analysis pipeline: analyze → outline → write → export (each tracked as jobs)
- References database with validation status and bibliography regeneration
- Document version history — every revision creates a new version, never overwrites

## AI Configuration

Set these environment variables to enable AI:

```
AI_PROVIDER=openai
AI_BASE_URL=https://api.openai.com/v1
AI_API_KEY=your-key-here
AI_MODEL=gpt-4o-mini
```

The app works without these set — it returns a placeholder message explaining the configuration is needed.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Run `pnpm run typecheck:libs` after editing any `lib/*` schema; the API server sees stale declarations otherwise
- `type: integer` in openapi.yaml generates `zod.int()` which breaks Zod v3 — always use `type: number`
- After schema changes, run `pnpm --filter @workspace/db run push` then `pnpm run typecheck:libs`
- The `/projects/stats` route must be registered BEFORE `/projects/:projectId` to avoid Express matching "stats" as an ID

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details

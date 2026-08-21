# Conventions

## Naming Conventions

### React Components
- PascalCase
- Co-located with feature (e.g., `src/pages/dashboard.tsx`, `src/components/layout/Header.tsx`)
- One component per file

### Non-Component Files
- kebab-case (e.g., `custom-fetch.ts`, `use-auth.tsx`)

### Database Tables
- snake_case, plural (e.g., `project_documents`, `chat_messages`, `project_activities`)
- Primary key: `id` (UUID)
- Foreign keys: `<table>_id` pattern

### API Endpoints
- kebab-case, plural resources
- Examples: `/projects`, `/projects/:id/references`, `/documents/:id/attachments`

## Coding Conventions

### TypeScript
- `strict: true` in `tsconfig.json`
- No `implicit any` -- always annotate or infer types
- Prefer `const` over `let`, avoid `var`
- Use interface for object shapes, type for unions/intersections

### React
- React Server Components **NOT used** -- this is a SPA
- Functional components with hooks only
- TanStack Query for all server state (caching, invalidation, loading states)
- `react-hook-form` + `zod` for all form handling
- Props interfaces defined in the same file, above the component

### Runtime Validation
- **Always use Zod** for runtime validation -- never plain type assertions (`as`, `any`)
- Validate all external input (request body, params, query strings)
- Backend: Zod schemas from `@workspace/api-zod`
- Frontend: Zod schemas co-located with forms

### Error Handling
- Express: use error middleware to catch all errors
- Never `console.log` errors -- use pino logger
- Never leak stack traces in production
- Return structured error responses: `{ error: { code: string, message: string } }`

## API Conventions

### RESTful Design
- Follow REST conventions: GET (read), POST (create), PATCH (update), DELETE (remove)
- OpenAPI spec in `lib/api-spec/openapi.yaml` is the source of truth

### Request/Response Format
```json
// Success
{ "data": { ... } }
// Error
{ "error": { "code": "VALIDATION_ERROR", "message": "..." } }
```

### Authentication
- JWT required for all `/api/*` routes except `/api/auth` and `/api/webhooks`
- Pass as `Authorization: Bearer <token>` header
- Backend validates via `jose` + Supabase JWKS

### Validation
- All inputs validated with Zod schemas from `@workspace/api-zod`
- 400 Bad Request for validation failures
- 401 Unauthorized for missing/invalid JWT
- 403 Forbidden for valid JWT but insufficient permissions

## Database Conventions

### ORM
- **Always use Drizzle ORM** -- never write raw SQL
- Schema defined in `lib/db/src/schema/`
- Import schema types from `@workspace/db`

### Timestamps
- Every table has `created_at` and `updated_at` columns
- Use Drizzle's `timestamp()` with defaults

### Soft Deletes
- Use `deleted_at` column where soft delete is needed
- Never hard-delete user data unless explicitly required

### Migrations
- Development: `pnpm --filter @workspace/db run push` (drizzle-kit push, direct schema apply)
- Production: proper migration files via `drizzle-kit generate` + `drizzle-kit migrate`
- **Warning:** `drizzle-kit push` is dev-only; production needs migration files

## Git Conventions

### Commit Format
```
<type>(<scope>): <subject>

<body>
```

### Types
- `feat:` -- new feature
- `fix:` -- bug fix
- `chore:` -- maintenance, dependencies
- `docs:` -- documentation
- `refactor:` -- code restructuring (no behavior change)
- `test:` -- tests
- `style:` -- formatting (no logic change)
- `perf:` -- performance improvement

### Rules
- Imperative mood: "add feature", not "added feature" or "adds feature"
- Max 72 characters on subject line
- Body is optional, wraps at 72 characters
- Per-feature/per-task commits -- avoid mega-commits
- Reference issues/PRs in body when applicable

## Project Structure Conventions

```
artifacts/
  academic-workspace/src/
    pages/         # Route-level components
    components/    # Shared/reusable components
    hooks/         # Custom React hooks
    lib/           # Utilities, client-side libs
    mocks/         # MSW handlers and setup
  api-server/src/
    routes/        # Express route handlers
    lib/           # Utilities (ai.ts, logger, etc.)
    middleware/    # Express middleware
lib/
  api-spec/        # openapi.yaml + orval config
  api-zod/         # Generated Zod schemas
  api-client-react/ # Generated TanStack Query hooks
  db/              # Drizzle schema
```

## Knowledge Base First Principle

> Setiap tugas baru WAJIB baca knowledge base yang sudah ada sebelum tanya Owner atau bikin file baru.

### Before Any Task

1. **Cek knowledge base dulu** —搜索 relevant files di `docs/ai-team/`
2. **Kalau sudah ada jawabannya** — pakai, jangan tanya ulang
3. **Kalau jawabannya belum ada** — riset dulu (web search, code analysis, cross-check)
4. **Baru kalau belum nemu juga** — escalate ke Owner

### What to Check

| Jenis tugas | Cek dulu |
|------------|---------|
| Fitur baru | `product/`, `business-growth/` |
| Tech decision | `ai-engineering/` |
| Pricing/business | `finance/`, `finops/`, `business-growth/` |
| Security/auth | `ai-engineering/` |
| Deployment/monitoring | `production-operations/` |
| Design | `design/` |
| Cross-divisi | `shared/` |

### Anti-Patterns (Jangan Dilakukan)

- ❌ Bikin file baru padahal sudah ada jawabannya di KB
- ❌ Tanya Owner pertanyaan yang sudah dijawab di KB
- ❌ Bikin meeting kalau KB sudah bisa menjawab
- ❌ "Cek dulu" tapi nggak benar-benar baca

### Catatan Penting

Knowledge base adalah living document. Kalau ada informasi yang salah atau outdated, **perbaiki**, jangan diam. Owner bisa nggak sadari ada kontradiksi atau info yang perlu diupdate.

---

## Division Management Principle

> Manajemen divisi adalah tanggung jawab Management Division. Tapi setiap divisi harus paham prinsip ini agar knowledge base tetap rapi.

### 1. Bikin Divisi Baru — Cuma Kalau Lolos 4 Pertanyaan

Sebelum bikin divisi baru, jawab:

1. **Autonomous action?** — Apakah punya tanggung jawab yang tidak bisa dilakukan divisi lain?
2. **Distinct expertise?** — Apakah butuh keahlian berbeda yang tidak ada di divisi lain?
3. **Continuous operational attention?** — Apakah butuh kerja berkelanjutan (bukan cuma review periodik)?
4. **Own escalation path?** — Apakah punya escalation path sendiri ke Management/Owner?

Semua "ya" → bisa jadi divisi. Satu "tidak" → sub-function.

### 2. Setiap Divisi Punya Status

| Status | Arti | Kriteria |
|--------|------|---------|
| **ACTIVE** | Ada kerja nyata sekarang | 3+ file substantif, atau hasil kerja ongoing |
| **PREPARED** | Strategi sudah, tunggu kondisi tertentu | README dengan activation conditions eksplisit |
| **STANDBY** | Nggak relevan sekarang | Placeholder README; merge ke divisi terdekat |

### 3. Divisi 1 File + STANDBY = Noise

Divisi STANDBY > 30 hari tanpa rencana → **merge**, jangan dipertahankan.

### 4. Handoff Antar Divisi Harus Jelas

Kalau dua divisi berbagi pekerjaan yang sama tanpa batas jelas → **merge**.

### 5. Desain untuk Sekarang, Bukan Spekulasi

"We might need a Sales division" bukan alasan bikin Sales division sekarang. Tulis README STANDBY yang bagus, aktifkan nanti.

### Catatan Struktur 2026-08-21

```
23 divisi → 10 divisi

DIKURANGI:
- 7 engineering divisi → 1 AI Engineering
- Business + Marketing + Sales + Partnership → 1 Business & Growth
- DevOps + Production Admin → 1 Production Operations
- Data Analytics + Operations → FinOps
- Academic Content → Product
- HR → Management

Tetap terpisah (well-justified):
- Finance vs FinOps: Design vs Execution (different data, different mindset)
- Customer Success vs Production Operations: User-facing vs System-facing
- Legal: Specialized discipline
```

---

## Code Style

- 2-space indentation
- Single quotes for strings
- No semicolons (standard in this project)
- Trailing commas in multiline
- Prefer named exports over default exports
- Sort imports: external -> internal -> relative

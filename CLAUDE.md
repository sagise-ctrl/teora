# CLAUDE.md — Teora AI Engineering Team

Teora is an AI Academic Workspace — React SPA + Express API + Drizzle ORM + PostgreSQL (Supabase). Auth via Supabase JWT.

---

## Owner

Product owner. Non-programmer. Understands business goals, not technical details.
AI Engineering Team handles all technical decisions autonomously.

---

## Autonomy Policy

### Decision Framework

```
DECIDE → EXECUTE → VERIFY → REPORT
```

**NOT** `DECIDE → ASK → EXECUTE`.

I evaluate technical options using: security → reliability → maintainability → scalability → performance → cost → simplicity → fit. Then I choose and act.

### What I Do Without Asking

Every normal technical action. Including:

| Category | Actions |
|----------|---------|
| **Read & Research** | Read source code, search codebase, analyze logs, fetch docs |
| **File Operations** | Create/edit/delete files, directories, structure, refactor |
| **Development** | Install/update/remove dependencies, run dev servers, build, typecheck, lint, format |
| **Testing** | Run tests, write tests, add test coverage, regression test |
| **Debugging** | Diagnose errors, reproduce bugs, fix bugs, optimize performance |
| **Database** | Run migrations, modify schema, seed data, query dev DB |
| **Git** | Create branches, commit, checkout, stash, diff, log |
| **Configuration** | Change configs, env vars, feature flags, middleware |
| **Deployment** | Deploy to preview/staging, rollback, monitor |
| **Security** | Hardening, fix auth issues, fix vulnerabilities |
| **Architecture** | Refactor, improve patterns, optimize structure |
| **Documentation** | Update docs, write ADRs, update knowledge base |
| **Monitoring** | Read logs, check health, analyze errors, alert analysis |

### When I Ask (Owner Boundaries)

Only for actions with **real-world consequences**:

1. **Financial** — money transfer, payment, purchase, subscription, large/unexpected cost
2. **External Access** — give repo access, share credentials, share secrets, change ownership
3. **Irreversible Destruction** — delete important data without backup, destroy infrastructure
4. **Legal / Business** — contracts, commitments, official statements

**I do not ask for technical approvals.** If a technical action is safe, reversible, or scoped to the project, I execute it.

---

## Production Autonomy

The owner explicitly authorizes autonomous production management:

- Read production logs and error monitoring
- Diagnose and fix production bugs
- Run tests and regression tests
- Deploy fixes and rollbacks
- Optimize performance and security
- Respond to incidents autonomously

**Incident workflow (when safe to fix):**
```
Detect → Diagnose → Reproduce → Fix → Test → Review → Deploy → Monitor → Rollback if needed → Report
```

If rollback is safe and available, I execute it autonomously and file an incident report.

---

## Definition of Done

A task is **done** only when ALL are complete:

1. Requirement fulfilled
2. Implementation complete and compiles
3. Relevant tests written and passing
4. Typecheck passes
5. Lint passes
6. Build succeeds
7. Security review done
8. Regression check passed
9. Documentation updated
10. Checkpoint updated (`.ai/current-task.md`)
11. Incident logged if applicable (`.ai/incidents/`)
12. Final report written

---

## Quick Commands

```bash
# Development
pnpm --filter @workspace/academic-workspace run dev:bypass   # Frontend (port 18543, MSW mock)
pnpm --filter @workspace/api-server run dev                  # API server (port 8080, requires .env)
pnpm run typecheck                                          # Full typecheck
pnpm run build                                              # Production build

# Code generation
pnpm --filter @workspace/api-spec run codegen               # Regenerate API client from OpenAPI

# Database
pnpm --filter @workspace/db run push                        # Push schema (dev only)

# Testing
pnpm vitest                                                # Run tests (after Vitest setup)

# Git
git checkout -b feat/name && git commit -m "feat: description" && git push -u origin HEAD
```

---

## Monorepo Structure

```
artifacts/
  academic-workspace/   # React SPA (Vite, port 18543)
  api-server/          # Express API (port 8080)
lib/
  api-spec/            # OpenAPI YAML spec + Orval config
  api-zod/             # Zod schemas (generated)
  api-client-react/    # TanStack Query hooks (generated)
  db/                  # Drizzle ORM schema + PostgreSQL
docs/ai-team/          # AI Engineering Team knowledge base
.ai/                   # Operational state, checkpoints, incidents
```

---

## Architecture Decisions

**OpenAPI as single source of truth**: `lib/api-spec/openapi.yaml` defines all API types. Run `codegen` after schema changes.

**API client flow**: React → TanStack Query hooks → customFetch() → Express server.

**Backend layering**: Routes → Drizzle ORM → PostgreSQL.

**Routing**: `/projects/stats` must be registered **before** `/projects/:projectId`.

**Type**: `type: number` in OpenAPI YAML, NOT `type: integer` (Zod produces broken schemas with integer).

---

## Security Rules

- **NEVER** commit secrets, API keys, tokens, or credentials
- All API routes must check authentication AND authorization
- Use Zod for all input validation
- Never use raw SQL — always Drizzle ORM
- Error responses must not leak stack traces in production
- Rate limiting on auth endpoints

---

## Git Rules

- Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`
- Commit message: imperative mood, max 72 chars
- **NEVER** force push to main
- **NEVER** push to remote without owner instruction
  - **Exceptions (owner-approved 2026-08-28):**
    1. Push `feat/google-oauth-frontend` → `main` (OAuth frontend merge)
    2. Push commit `0e880a7` (CLAUDE.md Session Start Protocol update)
- Always create a branch for feature work

---

## Self-Correction Loop

```
ERROR → Diagnose → Fix → Retry → Verify
```

Max 3 iterations. After 3 failed attempts on the same problem, escalate with full context.

If one approach fails, try a different strategy. Do not repeat the same command without changes.

---

## Project Isolation

**This workspace is the only scope.**

- I do not touch other projects, repositories, or personal files
- I do not use credentials or data outside this project
- All file operations are scoped to `E:\teora\*`
- If a tool needs broader access, I evaluate necessity

---

## Operational State

### Checkpoints (`.ai/`)

| File | Purpose |
|------|---------|
| `.ai/current-task.md` | Active task status and progress |
| `.ai/progress.md` | Completed work log |
| `.ai/blockers.md` | Blocked items needing owner decision |
| `.ai/decisions.md` | Architectural decisions + rationale (Deployment Decisions Log) |

AI updates checkpoints at every milestone. New sessions read them to resume.

### Session Start Protocol (cross-model, since Decision 004)

Setiap sesi baru Claude Code (model apapun: opus-4-8, opus-4-6, dst) WAJIB baca file `.ai/` dalam urutan ini sebelum kerja apapun:

1. `.ai/current-task.md` — apa yang sedang dikerjakan + status real-time
2. `.ai/progress.md` — apa yang sudah selesai (newest first)
3. `.ai/blockers.md` — apa yang diblok + butuh keputusan owner
4. `.ai/decisions.md` — keputusan arsitektur yang sudah diambil (rationale)
5. `git log --oneline -20` — perubahan kode terakhir

Lalu balas ke owner: `Konteks loaded ✅ Model: claude-opus-4-X Task aktif: [...] Status: [...] Siap lanjut.`

Saat tutup sesi (atau limit harian hampir habis): edit `.ai/current-task.md` → append section `## Handoff YYYY-MM-DD HH:MM — model opus-4-X → opus-4-Y` (isi: task aktif, last 3 actions, next 3 actions, open questions). Commit + push (push allowed — owner-approved exceptions documented in Git Rules).

Lihat `.ai/current-task.md` top section + `.ai/decisions.md` Decision 004 untuk full procedure.

### Incidents (`.ai/incidents/`)

| File | Purpose |
|------|---------|
| `YYYYMMDD-NNN.md` | Individual incident report |
| `incident-registry.md` | All incidents index |

Every incident gets a report regardless of severity.

---

## AI Engineering Team

Full knowledge base at `docs/ai-team/`. Read relevant docs before implementing features.

### AI Team Knowledge Base — Mandatory Consultation Rule

**Sebelum implementasi fitur baru atau keputusan teknis, WAJIB:**

1. **Baca** folder `docs/ai-team/` yang relevan dengan topik:
   - Fitur baru → `product/`
   - Arsitektur / API / database → `architecture/`
   - Coding patterns / standards → `development/`
   - Security → `security/`
   - Deployment / CI/CD / infra → `devops/`
   - Library evaluation → `research/`
   - Design / UI → `design/`
   - Finance / pricing → `finance/`
   - Monitoring / incidents → `production-admin/`
   - Semua keputusan teknis → `shared/decisions.md` (registry keputusan arsitektur)

2. **Update** `.ai/decisions.md` untuk setiap keputusan arsitektur atau teknis yang baru (beserta rationale + trade-off yang dipertimbangkan)

3. **Tulis ringkasan** ke folder division yang sesuai — minimal judul + deskripsi singkat + rationale

4. **Update progres** di `.ai/progress.md` untuk setiap milestone signifikan

**Mengapa:** Knowledge base ini adalah "institutional memory" — memastikan setiap keputusan punya audit trail, rationale, dan context yang bisa dibaca ulang oleh model AI mana pun tanpa perlu conversation history.

```
docs/ai-team/
├── shared/            # ALL agents read these
│   ├── project-context.md
│   ├── architecture.md
│   ├── conventions.md
│   ├── decisions.md
│   ├── glossary.md
│   └── lessons-learned.md
├── product/           # Requirements, roadmap, business rules
├── architecture/      # System design, API, database
├── development/       # Coding standards, patterns, problems
├── qa/                # Testing strategy, known issues
├── security/          # Threat model, checklists
├── code-review/       # Review checklist, recurring issues
├── devops/            # Environments, deployment
├── research/          # Library evaluation, tech decisions
├── finance/           # Token economy, pricing, Stripe
├── design/            # Design system, UI improvements
└── production-admin/  # Monitoring, incidents, automation
```

## Workflow Commands (ECC-inspired)

Standard workflows for consistent execution:

| Command | When to use |
|---------|-------------|
| `.claude/commands/feature-development.md` | Implementing any new feature |
| `.claude/commands/database-migration.md` | Database schema changes |
| `.claude/commands/security-review.md` | Security audit before deploy |

## Skills Library (ECC-inspired)

Reusable workflow patterns:

| Skill | Purpose |
|-------|---------|
| `.claude/skills/tdd-workflow.md` | Test-driven development pattern |
| `.claude/skills/research-playbook.md` | Library/tech evaluation methodology |
| `.claude/skills/incident-response.md` | Post-launch incident response |

## Governance

- `.claude/enterprise/controls.md` — Team governance rules, approval expectations, audit policy
- `.claude/team/teora-team-config.json` — Team structure manifest
- `.claude/rules/teora-guardrails.md` — Security, quality, and code standards baseline

---

## Tooling Gaps

- ✅ Vitest (done)
- ✅ GitHub Actions CI/CD (done — `.github/workflows/ci.yml` + `deploy-backend.yml`)
- ✅ API server `.env.example` (done — `artifacts/api-server/.env.example`)
- No ESLint project-wide
- No Framer Motion integration
- UI uses shadcn defaults

---

## currentDate

2026-08-14

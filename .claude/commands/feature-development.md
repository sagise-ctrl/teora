# Feature Development Workflow

> Standard workflow for implementing features in Teora. Adapt per feature scope.

## Pre-Development

1. **Understand requirement** — Read from `docs/ai-team/product/requirements.md` and `docs/ai-team/product/business-rules.md`
2. **Check architecture** — Reference `docs/ai-team/architecture/` for existing patterns
3. **Check existing code** — Search codebase for similar implementations before adding new code

## Development Steps

### 1. Understand
- Read requirement doc
- Check existing code patterns (`docs/ai-team/development/project-patterns.md`)
- Identify affected files: frontend (`artifacts/academic-workspace/`), backend (`artifacts/api-server/`), shared types (`lib/`)
- Check `lib/api-spec/openapi.yaml` if API changes needed

### 2. Design (if needed)
- For new features: design in `docs/ai-team/architecture/`
- For small changes: inline in code with comments
- Schema changes: update Drizzle schema in `lib/db/src/schema/`

### 3. Implement
Apply in this order when all are needed:
1. **Schema** — Update `lib/db/src/schema/` first (source of truth)
2. **API Spec** — Update `lib/api-spec/openapi.yaml`
3. **API Server** — Update `artifacts/api-server/src/routes/`
4. **API Client** — Run `pnpm --filter @workspace/api-spec run codegen`
5. **Frontend** — Update `artifacts/academic-workspace/src/`

### 4. Verify
```
pnpm run typecheck
pnpm run build
```
All must pass. If tests exist: `pnpm vitest`

### 5. Review
- Self-review: check `docs/ai-team/code-review/review-checklist.md`
- Security: check `docs/ai-team/security/security-checklist.md`
- Patterns: compare with `docs/ai-team/development/project-patterns.md`

### 6. Document
- Update affected docs in `docs/ai-team/`
- Update `docs/ai-team/shared/decisions.md` if architectural decision
- Update checkpoint: `.ai/current-task.md`

## Commit

```
feat: description
fix: description
refactor: description
test: description
docs: description
chore: description
```

## Common Targets

| Layer | Path |
|-------|------|
| Frontend | `artifacts/academic-workspace/src/` |
| API Routes | `artifacts/api-server/src/routes/` |
| Database | `lib/db/src/schema/` |
| API Spec | `lib/api-spec/openapi.yaml` |
| Types | `lib/api-client-react/src/generated/` |
| Zod Schemas | `lib/api-zod/src/generated/` |

# Database Migration Workflow

> Standard workflow for schema changes in Teora. Drizzle ORM + PostgreSQL (Supabase).

## Pre-Migration

1. **Backup consideration** — Check `docs/ai-team/devops/environments.md` for backup procedures
2. **Downtime window** — API server needs restart after migration
3. **Rollback plan** — Know how to revert if migration fails
4. **Notify team** — If production migration, notify in checkpoint

## Development Steps

### 1. Schema Change
Edit the Drizzle schema file: `lib/db/src/schema/`

Common patterns:
```typescript
// Add table
export const newTable = pgTable('new_table', {
  id: uuid('id').primaryKey().defaultRandom(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Add column to existing table
newColumn: text('new_column'),

// Add foreign key
projectId: uuid('project_id').references(() => projects.id),
```

### 2. Generate Migration (optional — for tracked migrations)
```bash
pnpm --filter @workspace/db run generate
```
This creates a migration file in `lib/db/src/migrations/`.

### 3. Push to Dev Database
```bash
pnpm --filter @workspace/db run push
```
⚠️ Only for development. Production uses tracked migrations.

### 4. Verify
- Check dev database schema
- Run typecheck: `pnpm run typecheck`
- Run build: `pnpm run build`

### 5. API Routes Update (if needed)
- Update `artifacts/api-server/src/routes/` if new entities need CRUD
- Register route **before** `/projects/:projectId` pattern

### 6. OpenAPI Spec Update
- Update `lib/api-spec/openapi.yaml` for new endpoints
- Run `pnpm --filter @workspace/api-spec run codegen`

## Production Migration

1. Review migration SQL manually before applying
2. Test on dev first
3. Apply during low-traffic window
4. Monitor error rates post-migration
5. Have rollback ready

## Rollback

```bash
# Revert schema in code
# Then push again
pnpm --filter @workspace/db run push
```

For tracked migrations: use `drizzle-kit pull` to regenerate from prod.

## Key Files

| File | Purpose |
|------|---------|
| `lib/db/src/schema/index.ts` | Main schema entry |
| `lib/db/src/schema/projects.ts` | Project-related tables |
| `lib/db/src/migrations/` | Tracked migrations |

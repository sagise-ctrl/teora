# Migration: Multi-Dokumen Workspace (Tier 2.1)

## Schema Changes

### 1. New table: `documents`
```sql
CREATE TABLE documents (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL,
  title TEXT NOT NULL DEFAULT 'Document 1',
  order_index INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 2. Modified table: `document_versions`
Add nullable `document_id` column:
```sql
ALTER TABLE document_versions ADD COLUMN document_id INTEGER;
```

## Run Schema Push

```bash
# Development
cd lib/db && pnpm push

# Production — run after merging, then redeploy API server
cd lib/db && pnpm push-force
```

## Data Migration (for existing projects with documents)

For each project that has `document_versions` rows without `document_id`, create a default document:

```sql
-- Step 1: Create default document for each project with orphaned versions
INSERT INTO documents (project_id, title, order_index, is_active)
SELECT DISTINCT p.id, 'Document 1', 0, true
FROM projects p
JOIN document_versions dv ON dv.project_id = p.id
WHERE dv.document_id IS NULL
AND NOT EXISTS (
  SELECT 1 FROM documents d WHERE d.project_id = p.id
);

-- Step 2: Backfill document_id for existing versions (uses first/last document per project)
UPDATE document_versions dv
SET document_id = (
  SELECT d.id FROM documents d
  WHERE d.project_id = dv.project_id
  ORDER BY d.order_index ASC, d.created_at ASC
  LIMIT 1
)
WHERE dv.document_id IS NULL;
```

## Summary of Changes

| Change | Type | Risk |
|--------|------|------|
| Add `documents` table | New | Low |
| Add `document_versions.document_id` (nullable) | Alter | Low |
| Data migration script | Migration | Medium — test on dev first |

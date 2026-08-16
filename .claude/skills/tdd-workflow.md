# TDD Workflow

> Test-Driven Development workflow for Teora. Write tests first, then implementation.

## When to Use TDD

- New API routes (CRUD operations)
- Business logic (token balance, permissions, validation)
- Authentication flows
- Data transformations
- Utility functions

## Workflow

### 1. Write Failing Test First
```
Test file location: same directory as source, named *.test.ts

// Example: lib/db/src/schema/projects.test.ts
// or: artifacts/api-server/src/routes/projects.test.ts
```

### 2. Run Test (should fail)
```
pnpm vitest run <test-file>
```

### 3. Write Minimal Implementation
- Make the test pass with simplest code possible
- Don't optimize yet

### 4. Refactor
- Clean up implementation
- Ensure all tests still pass

### 5. Verify
```
pnpm vitest run
pnpm run typecheck
pnpm run build
```

## Test File Patterns

### API Routes (mock database)
```typescript
import { describe, it, expect } from 'vitest';
import { createTestRequest, createTestResponse } from '@/test/helpers';

describe('GET /projects', () => {
  it('returns 401 without auth', async () => {
    const req = createTestRequest({ method: 'GET', path: '/projects' });
    const res = createTestResponse();
    // ... execute route
    expect(res.status).toBe(401);
  });
});
```

### Schema Validation (Zod)
```typescript
import { describe, it, expect } from 'vitest';
import { z } from 'zod';

const projectSchema = z.object({ id: z.string().uuid() });

describe('projectSchema', () => {
  it('accepts valid UUID', () => {
    expect(projectSchema.parse({ id: crypto.randomUUID() })).toBeDefined();
  });
  it('rejects invalid UUID', () => {
    expect(() => projectSchema.parse({ id: 'not-a-uuid' })).toThrow();
  });
});
```

## Test Coverage Targets

| Layer | Target |
|-------|--------|
| API routes | Auth + happy path + validation errors |
| Business logic | Token balance, permissions |
| Schema validation | Valid + invalid inputs |
| Security | Auth bypass attempts |

## Key Files

| File | Purpose |
|------|---------|
| `vitest.config.ts` | Test configuration |
| `docs/ai-team/qa/` | QA testing strategy |
| `docs/ai-team/development/coding-standards.md` | Code standards |

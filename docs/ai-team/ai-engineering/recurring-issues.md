# Recurring Issues

## 1. Missing try-catch in Express Route Handlers

Express 5 doesn't auto-catch async errors. Every async route handler needs try-catch or express-async-handler.

## 2. Type Coercion Issues

Zod string transforms can coerce types unexpectedly. Always check parse vs safeParse.

## 3. Query Key Management in TanStack Query

- Missing query invalidation after mutations
- Stale data from cache after updates

## 4. Authorization Check Placement

Auth check at route level, ownership check at handler level. Easy to miss the ownership check.

## 5. OpenAPI Schema Drift

Generated types can drift from spec. Always run codegen after schema changes.

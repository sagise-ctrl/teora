# Deploy Log — Teora Production

Single source of truth for all production deploys. Every deploy appends one row. Format defined in `.claude/skills/deploy-safe/SKILL.md`.

Previous logs (before SOP-003): see git history + `.ai/current-task.md` Handoff sections.

---

## Format

| ts (WIB) | path | project | sha | prev_id | new_id | result | notes |
|---|---|---|---|---|---|---|---|

- `ts` — ISO 8601 timestamp in WIB (+07:00)
- `path` — A (GH integration) / B (CLI manual) / C (PAT API merge)
- `project` — `teora-backend` / `academic-workspace`
- `sha` — commit SHA (short, 7 chars)
- `prev_id` — previous stable deployment ID (or `auto` for first)
- `new_id` — new deployment ID (or merge commit SHA for path C)
- `result` — SUCCESS / FAILED / ROLLED_BACK
- `notes` — 1-line context

---

## 2026

| ts | path | project | sha | prev_id | new_id | result | notes |
|---|---|---|---|---|---|---|---|
| 2026-09-12 01:01 | A | teora-backend | d80a7ca | n/a (first) | dpl_HsMepdHAbi1LUGVw3pujeEdsjyMy | SUCCESS | PR #17 merge (feat/simulasi) — GH integration auto-deploy |
| 2026-09-13 13:53 | B | teora-backend | (unknown) | dpl_HsMepdHAbi1LUGVw3pujeEdsjyMy | dpl_7Nouvo5zAzXkYGqGkRbedw4hAEEM | SUCCESS | CLI deploy — but alias NOT updated, this is the trap |
| 2026-09-16 04:52 | B | teora-backend | 8e2841b | dpl_HsMepdHAbi1LUGVw3pujeEdsjyMy | dpl_J8RKYi1NJxiWCV8pFsz5hGNc1Zwd | SUCCESS | CLI deploy for Olagon Phase 2 — alias NOT updated (ERR-022) |
| 2026-09-16 05:06 | B | teora-backend | 4e499d7 | dpl_HsMepdHAbi1LUGVw3pujeEdsjyMy | dpl_KtjqH7gRMbRjzFGT3Yom2RAwk885 | SUCCESS | Bundle rebuild + vercel promote — fixed ERR-022 |
| 2026-09-16 11:40 | C | teora | 248e880 | n/a | merge_commit | SUCCESS | PR #20 Olagon Phase 1+2 — auto-merge broken (ERR-021), PAT bypass with owner authorization |
| 2026-09-16 11:45 | A | academic-workspace | 248e880 | auto | dpl_AYTEMz7gXp8HWGYEBUCBw23RGM4g | SUCCESS | Olagon Phase 2 frontend deploy via GH integration |
| 2026-09-17 09:55 | B | academic-workspace | 4fd434e | dpl_AYTEMz7gXp8HWGYEBUCBw23RGM4g | dpl_J1kYb9KzPweefjqFaec4T7LvsooW | SUCCESS | SidebarFooter useTheme fix (ReferenceError) — Vercel CLI (auto-aliased); PR #21 backed (merge 84fde56 on main at 10:00) |
| 2026-09-17 10:02 | A | academic-workspace | 84fde56 | dpl_J1kYb9KzPweefjqFaec4T7LvsooW | dpl_CrnVrNddr2G7G97QY2K93utUJa3P | SUCCESS | PR #21 merge triggered GH integration auto-deploy; clean re-build of same fix, alias auto-updated |
| 2026-09-18 (today) | B | academic-workspace | 73e6b11 | dpl_CrnVrNddr2G7G97QY2K93utUJa3P | dpl_7rt5HZG9Hn7N5hhXjwHNUmMhxxCT | SUCCESS | DECISION 022 — AI tier selector universal standard (Dashboard Teora Assistant + /akun Default AI Tier card); Vercel CLI from monorepo root with --build-env ROOT_DIRECTORY override; auto-aliased to academic-workspace-eta.vercel.app |
| 2026-09-18 (today) | B | academic-workspace | 96f1889 | dpl_7rt5HZG9Hn7N5hhXjwHNUmMhxxCT | dpl_HMFKcnV9aDMJVaiBd4xhqiZn1Haj | SUCCESS | DECISION 023 — Dashboard Teora Assistant chat (scratchpad project pattern, Sheet UI, TierSelector, clear history); auto-aliased to academic-workspace-eta.vercel.app; bundle index-DnvxNyBG.js contains all expected strings (Dashboard Chat, dashboard_chat, Mulai percakapan, Tanya Teora, Hapus riwayat chat, Teora bisa keliru, dashboardChat.projectId) |
| 2026-09-18 12:55 | B | academic-workspace | a20e764 | dpl_HMFKcnV9aDMJVaiBd4xhqiZn1Haj | dpl_8vLtwvuJQBEf8Q8vXRAYmtKVt6kj | SUCCESS | Web live sweep promotion. Branch feat/ai-tier-selector-universal contains: docs DECISION 024+ERR-026, full-sweep harness (tests/e2e/full-sweep.mjs), MSW handlers fix (dev:bypass only), and the Zod v4 resolver shim (3d0f536) needed by /register. `vercel promote dpl_7iMQf6SfeeSAnQZ85RwTYwbKeVtN` swapped alias to commit a20e764. Pre-promote sweep revealed ERR-027 (ZodError on /register); post-promote sweep is clean (0 JS errors, 0 network failures, 6/6 public PASS, 15/15 protected correctly redirect to /login). |
| 2026-09-18 13:24 | B | teora-backend | local | dpl_J8RKYi1NJxiWCV8pFsz5hGNc1Zwd (last known) | dpl_HamBBEqL1JKvuJTa1rkKfKbuHmyy | SUCCESS | DECISION 025 — Fix for INC-008 Layer 1: OpenAPI enum extended with `dashboard_chat` (line 3753, 3801, 4425, 4980). ListProjectsQueryParams filter (line 212) intentionally NOT extended. Built via `pnpm --filter @workspace/api-server run build` → api/index.mjs (8 dashboard_chat references). Deployed via `cd artifacts/api-server && vercel deploy --prod --yes` from working tree. Auto-aliased to teora-backend.vercel.app. Frontend bundle unchanged. |
| 2026-09-18 14:05 | — | Supabase DB | — | CHECK constraint without dashboard_chat | CHECK constraint WITH dashboard_chat | SUCCESS | INC-008 Layer 2 fix: owner retested after Layer 1 fix → got 500 instead of 400. `vercel logs` revealed `DrizzleQueryError: violates check constraint projects_task_type_check`. Fixed via Supabase MCP `apply_migration`: `ALTER TABLE projects DROP CONSTRAINT projects_task_type_check; ADD CONSTRAINT ... ARRAY['general', 'academic', 'dashboard_chat']`. DB constraint verified via `pg_get_constraintdef`. **Critical: constraint is raw SQL outside Drizzle ORM — future `pnpm db push` will NOT see it. Must convert to Drizzle-native check() constraint.** |

</invoke>| 2026-09-18 15:42 | B | teora-backend | 735e4a9 | dpl_HamBBEqL1JKvuJTa1rkKfKbuHmyy | dpl_CFwb9iCpXho8TaSZoJ6WsMc6nm9N | SUCCESS | INC-008 follow-up: Owner selects Olagon tier in dashboard chat → 402 Haiku 4.5. Root cause: getAllowedTierIdsForUser() doesn't include Olagon tiers for olagon provider. Fix: when aiProvider=olagon, include active Olagon tiers in allowed list regardless of subscription. Auto-aliased to teora-backend.vercel.app. |

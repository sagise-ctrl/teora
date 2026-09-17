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
</content>
</invoke>
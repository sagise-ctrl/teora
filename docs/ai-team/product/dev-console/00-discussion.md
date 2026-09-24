# Dev Console — AI Engineering Team via Dashboard

> Initiative: Build chat-driven development mode di admin dashboard Teora, supaya owner bisa kasih instruksi ke AI Engineering Team (Hermes) dari HP/browser, gak perlu terminal.

---

## Status (2026-09-25)

✅ **FOUNDATION COMPLETE** — Hermes AI agent successfully recruited locally, integrated via Olagon gateway, Teora context loaded.

🔜 **PHASE 2** — Build Dev Console UI di `/admin/dev` (mobile-first, ~2-3 minggu)

---

## Decisions Made

### 1. Hermes as AI Engineering Team (CONFIRMED 2026-09-25)

**Why Hermes:**
- Closed learning loop (skill system + persistent memory)
- Bot Mode native (supports Telegram gateway Phase 3)
- 60+ tools built-in (file ops, web search, code execution)
- Olagon-compatible (Anthropic SDK format)
- Skills = per-task workflow yang bisa di-compose (teora-deploy, fix-INC-NNN, dll)

**Alternatives considered:**
- ❌ LangChain Agents — too generic, no skill abstraction
- ❌ AutoGPT — unstable, no production track record
- ❌ Custom Express endpoint + Claude API — too much glue code

### 2. Local Install (NOT VPS)

**Why local install:**
- Owner laptop Windows udah ada (no extra cost)
- Olagon handles LLM (no need GPU/VPS)
- Hermes lightweight (~50MB Python)
- Owner sudah testing di VSCode workflow

**VPS only needed if:**
- Want 24/7 availability (server running terus)
- Want mobile-only access (Telegram/remote)
- Owner away from laptop

**Future:** If Phase 3 (Telegram) butuh 24/7, baru deploy Hermes ke VPS/Oracle Cloud free tier.

### 3. Olagon as Primary AI Provider (DECISION 014, 019, 020)

- Olagon = owner-only gateway
- `ANTHROPIC_AUTH_TOKEN` + `ANTHROPIC_BASE_URL=https://gateway.olagon.site/anthropic`
- Default model: `claude-opus-4-8` (kualitas tinggi, owner priority)
- Fallback ke `claude-haiku-4-5` untuk cost-sensitive tasks (sudah verified pakai bare alias)

---

## Architecture (Target)

```
┌─────────────────────────────────────────┐
│  Owner (mobile/desktop browser)         │
│  ↓                                       │
│  /admin/dev page (Dev Console UI)        │
│  - Chat panel (mobile-first)             │
│  - Tier selector (Olagon)                │
│  - Job status watcher                    │
│  ↓ POST /api/admin/dev/instructions      │
│  Vercel serverless (waitUntil pattern)   │
│  ↓                                       │
│  Queue: instruction_jobs table           │
│  ↓                                       │
│  Hermes (running locally)                │
│  - Picks up instructions                 │
│  - Uses Teora skills                     │
│  - Writes results back to queue          │
│  ↓                                       │
│  Owner sees response streaming in UI     │
└─────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Local Validation ✅ COMPLETE (2026-09-25)
- [x] Install Hermes locally
- [x] Configure Olagon gateway
- [x] Load Teora context (`onboarding.md` + 5 skills)
- [x] Verify connectivity (Test 1: greeting)
- [x] Verify context awareness (Test 2: read + summarize)
- [x] Owner can now `hermes` from PowerShell

### Phase 2: Dashboard Integration 🔜 NEXT (2-3 minggu)

**Files to create/modify:**

1. **`artifacts/api-server/src/routes/admin-dev.ts`** (NEW)
   - POST `/api/admin/dev/instructions` — queue instruction (owner-only middleware)
   - GET `/api/admin/dev/instructions/:id` — poll status
   - Webhook: `/api/admin/dev/webhook` — Hermes callback

2. **`artifacts/api-server/src/lib/instruction-queue.ts`** (NEW)
   - Use existing jobs table (per INC-011 lesson)
   - errorMessage slice ≥4000 chars

3. **`artifacts/academic-workspace/src/pages/admin-dev.tsx`** (NEW)
   - Mobile-first chat panel
   - TierSelector component (reuse from dashboard-chat.tsx)
   - Job status watcher: `useEffect` + `useRef<Set<string>>` pattern (INC-011 lesson)
   - Clear history button (localStorage pattern per DECISION 023)
   - Empty state: "Mulai chat dengan AI Engineering Team"

4. **`artifacts/academic-workspace/src/components/admin/dev-console.tsx`** (NEW)
   - Reusable chat UI component
   - Markdown rendering (already have `ReactMarkdown` per `56b8a12`)

5. **`lib/db/src/schema/instruction_jobs.ts`** (NEW — optional, can reuse jobs table)
   - ownerId, prompt, status (pending/processing/done/failed), response, error

6. **OpenAPI spec updates**
   - Add InstructionJob schema
   - Add 3 endpoints
   - Run codegen

**Workflow:**
```
Owner types instruction → POST /admin/dev/instructions
  → Create job (status: pending) → return 202 with jobId
  → useEffect watcher polls every 2s → UI shows "Hermes sedang kerja..."
  → Hermes picks up via webhook OR polling
  → Hermes uses skill: teora-deploy | fix-INC-NNN | teora-migrate
  → Hermes writes response to job table
  → UI updates with markdown response
```

### Phase 3: Telegram Gateway (1-2 minggu)

- BotFather: register @TeoraDevBot
- Hermes Bot Mode: `hermes bot --platform telegram`
- Polling/webhook to Telegram Bot API
- Owner can chat dari HP dengan command (`/deploy`, `/fix`, `/status`)

### Phase 4: Specialist Bots (1-2 minggu)

- `incident-bot` — monitors Vercel logs, alerts on errors
- `security-bot` — periodic code audit (read .ai/error-index.md, scan for patterns)
- `cost-bot` — FinOps tracking (token usage, topup burn rate)

---

## Open Questions / Trade-offs

1. **Sync vs async instruction execution?**
   - Async (queue + webhook) = better UX (non-blocking), but more complex
   - Sync (long-polling) = simpler but Vercel timeout risk (>10s for complex tasks)
   - **Recommendation:** async with waitUntil pattern (per INC-009 + INC-011)

2. **Context sharing between dashboard chat (DECISION 023) and dev console?**
   - Dashboard chat = general Q&A (scratchpad project)
   - Dev console = structured tasks (deploy/fix/migrate)
   - **Recommendation:** separate contexts (different scratchpad OR different system prompt)

3. **Authentication for dev console?**
   - Owner-only (per Olagon model)
   - But what if owner wants to invite collaborator later?
   - **Recommendation:** start with `isOwnerEmail` middleware, add `dev_console_users` table later

4. **Local Hermes or deployed Hermes for Phase 2?**
   - Local: simple, no infra, but laptop must be on
   - Deployed (Vercel/Railway/Fly.io): always-on, but extra cost
   - **Recommendation:** start local (Phase 1 done), deploy if Phase 3 (Telegram) needs 24/7

---

## Related Documentation

| File | Purpose |
|------|---------|
| `.ai/hermes/onboarding.md` | Consolidated Teora context for Hermes |
| `.ai/hermes/USAGE-GUIDE.md` | Owner Hermes usage guide |
| `.ai/hermes/CONFIGURATION.md` | Provider config reference |
| `.ai/hermes/skills/*.md` | Per-task workflow definitions |
| `docs/ai-team/product/olagon.md` | Olagon gateway setup |
| `.ai/decisions.md` | DECISION 014, 019, 020 (Olagon) |
| `.ai/checkpoints/hermes-install-FINAL-20260924.md` | Install report |

---

## Progress

- **2026-09-25:** ✅ Phase 1 complete (local install, Olagon integration, context loaded, 2/2 tests passed)
- **Next:** Phase 2 planning (UI mockup + endpoint design)

Owner instruction: "saya ingin yg gratis" → satisfied (no VPS, no extra subscription beyond existing Olagon)
Owner constraint: "non-programmer, mobile-friendly" → satisfied (Hermes handles all code, UI designed mobile-first)

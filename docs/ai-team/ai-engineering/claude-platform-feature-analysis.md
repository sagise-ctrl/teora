# Claude Platform Feature Analysis — Teora Integration Roadmap

> **Date:** 2026-09-10
> **Author:** AI Engineering Team
> **Purpose:** Map Claude Platform capabilities to Teora's existing features, prioritize implementation, recommend model per use case
> **Research source:** 14 dokumentasi platform.claude.com + Anthropic skills repository

---

## 1. Executive Summary

Teora uses bare Messages API via `lib/ai.ts` — missing three high-impact optimizations:

| Feature | Impact | Effort | Priority |
|---------|--------|--------|----------|
| Prompt Caching | ~90% cost reduction on system prompt | ~1 line | NOW |
| Structured Outputs | Reliable quiz JSON, rubric parsing | Medium | Next |
| Streaming SSE | Real-time token UX | Medium | Next |
| Tool Use | Autonomous quiz evaluation, Task Mentor | Medium | Phase 2 |
| Web Search | Literature search in Pustaka Saya | Medium | Phase 2 |
| Managed Agents | Autonomous production maintenance | High | Phase 3+ |
| Token Counting API | Prevent context window exceeded | Low | Next |

**Managed Agents: NOT for Phase 1.** Overkill at current scale. Revisit when usage > 10k MAU or for dedicated production maintenance agent.

---

## 2. Current State Analysis

### 2.1 Existing Architecture

**`artifacts/api-server/src/lib/ai.ts`** — single integration point:

```
callAI() → callAnthropic() / callOpenAICompatible()
         → getTierForUser() → getTierConfig() → DB (ai_tiers table)
         → buildSystemPrompt() → ~450 tokens system prompt (candidate for caching)
```

**Current Anthropic call** (no tool use, no streaming, no caching):
```typescript
body: JSON.stringify({
  model: tier.model,
  system: systemMsg?.content,
  messages: conversationMessages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  })),
  temperature: 0.7,
  max_tokens: 4096,
})
```

**`ChatMode` enum** already defined but underutilized:
```typescript
type ChatMode = "generate" | "revise" | "reflect" | "socratic" | "quiz" | "summary";
```

### 2.2 What's Missing

| Capability | Current | Needed For |
|-----------|---------|-----------|
| Tool Use | ❌ | Quiz evaluation, autonomous Task Mentor |
| Streaming | ❌ | Real-time token UX |
| Prompt Caching | ❌ | ~90% cost reduction |
| Structured Outputs | ❌ | Quiz JSON, rubric generation |
| Web Search | ❌ | Literature search in Pustaka Saya |
| Token Counting | ❌ | Pre-validation, cost estimation |

---

## 3. Feature-by-Feature Analysis

### 3.1 Prompt Caching — HIGHEST IMPACT + EASY WIN

**What it does:** `cache_control: { type: "ephemeral" }` on messages. If a cached block is referenced by a new message, Claude auto-reads from cache. Cache read costs **0.1x base input** (standard models), **0.025x** for Claude Fable 5.1.

**Per-model pricing ($/M tokens):**

| Model | Base Input | Cache Read (90%+ off!) | Cache Write (1h TTL) |
|-------|-----------|------------------------|-----------------------|
| Claude Haiku 4.5 | $1.00 | **$0.10** | $2.00 |
| Claude Sonnet 5 | $2.00 | **$0.50** | $4.00 |
| Claude Sonnet 4.5-4.6 | $3.00 | **$0.30** | $6.00 |
| Claude Opus 5 | $5.00 | **$0.50** | $10.00 |
| Claude Fable 5.1 | $10.00 | **$0.25** | $20.00 |

**Minimum cacheable lengths:**
- 512 tokens: Fable 5.1, Opus 5, Fable 5
- 1,024 tokens: Sonnet 5, Sonnet 4.5-4.6
- 4,096 tokens: Opus 4.5-4.6, Haiku 4.5

**Minimal implementation — 1-line change in `callAnthropic()`:**
```typescript
// Add to system prompt (already ~450 tokens):
{ role: "system", content: systemPrompt, cache_control: { type: "ephemeral", ttl: "1h" } }

// Add to last user message:
{ role: "user", content: userMessage, cache_control: { type: "ephemeral", ttl: "1h" } }
```

**When to cache:**
| Block | Token Est. | Cache Benefit |
|-------|-----------|---------------|
| System prompt | ~450 | High — same for every call |
| Project context | ~500-2000 | High — same project |
| Reference docs | ~1000-5000 | Very high — same references |
| Conversation history | varies | Medium — grows over time |

**Pre-warming pattern (for high-traffic scenarios):**
```typescript
// Warm cache before user traffic arrives
client.messages.create({
  model: "claude-sonnet-5",
  max_tokens: 0,  // no output, just writes cache
  system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral", ttl: "1h" } }],
  messages: [{ role: "user", content: "warmup" }]
})
```

**Verification:** Check `response.usage.cache_read_input_tokens` vs `input_tokens` for hit rate.

### 3.2 Structured Outputs — HIGH IMPACT

**What it does:** `output_config.format: { type: "json_schema" }` guarantees parseable JSON output. With `strict: true` matches `input_schema` exactly.

**Why it matters for Teora:**

| Use Case | Current | With Structured Outputs |
|----------|---------|------------------------|
| Quiz answers | Custom regex parsing | Guaranteed JSON |
| Rubric generation | Custom parsing (brittle) | Guaranteed rubric JSON |
| Citation markers | `citation-rendering.ts` custom parser | Replace with JSON schema |
| Writing feedback | Free text | Structured score + detail |

**Minimal implementation:**
```typescript
body: JSON.stringify({
  model: "claude-sonnet-5",
  system: "Generate a quiz evaluation...",
  messages,
  max_tokens: 4096,
  output_config: {
    format: {
      type: "json_schema",
      name: "quiz_evaluation",
      json_schema: {
        type: "object",
        properties: {
          score: { type: "integer" },
          feedback: { type: "string" },
          dimension_scores: {
            type: "array",
            items: { type: "object", properties: { dimension: { type: "string" }, score: { type: "number" } } }
          }
        },
        required: ["score", "feedback", "dimension_scores"]
      }
    },
    strict: true
  }
})
```

**Combine with Tool Use:** Tool Use for multi-step evaluation, Structured Outputs for single-step responses.

### 3.3 Tool Use (Function Calling) — HIGH IMPACT

**What it does:** Define custom tools in `input_schema`. Claude returns `tool_use` blocks. Client executes and returns `tool_result`. Repeat until Claude returns text.

**Minimal implementation for quiz evaluation:**
```typescript
tools: [
  {
    name: "evaluate_quiz",
    description: "Evaluate student answers to quiz questions",
    input_schema: {
      type: "object",
      properties: {
        score: { type: "integer" },
        feedback: { type: "string" },
        correct_answers: { type: "array" }
      },
      required: ["score", "feedback", "correct_answers"]
    }
  }
],
tool_choice: { type: "tool", name: "evaluate_quiz" },
strict: true,  // guarantees schema compliance
```

**Risk:** Tool Use is all-or-nothing — if ANY tool's schema is wrong, the call fails. Test schemas with small inputs first.

**Token savings via tool config:**
- Disable unused tools (`web_search`, `web_fetch` if not needed)
- Set `max_content_tokens` on web_fetch to cap fetched content
- Domain allowlists prevent wasted fetches
- Custom tools: return only high-signal data

### 3.4 Streaming SSE — HIGH IMPACT UX

**What it does:** Stream tokens as generated via SSE (`text/event-stream`). User sees response appear in real-time.

**Teora current:** Full response delivered after all tokens generated (~5-15s). No streaming.

**Implementation approach:**
```
Backend: Express → SSE stream → frontend EventSource / fetchReadableStream
Frontend: React → stream tokens → setContent(prev + chunk)
```

**Note:** Vercel Functions (Fluid Compute) supports streaming natively — no edge runtime needed.

### 3.5 Web Search — MEDIUM IMPACT

**What it does:** Server-side search tool. No client-side handler needed.

```typescript
tools: [{
  type: "web_search_preview",
  name: "web_search"
}]
// No client-side handler needed — Anthropic handles search server-side
```

**Use cases for Teora:**
- Pustaka Saya: AI searches CrossRef, Semantic Scholar for paper metadata
- Fact verification: grounded in real sources
- Bibliography: auto-find DOI → paper metadata

**Limitation:** $10 per 1,000 searches. Use sparingly.

### 3.6 Token Counting API — LOW EFFORT, HIGH VALUE

**Endpoint:** `POST /v1/messages/count_tokens` — **FREE to use**

**Use cases:**
- Pre-send validation: prevent "context window exceeded" (ERR-017 already fixed, but prevent recurrence)
- Cost estimation before API calls
- Model routing decisions (Haiku for simple, Sonnet for complex)

```typescript
const count = await client.messages.count_tokens({
  model: "claude-haiku-4-5",
  system: systemPrompt,
  messages: conversationMessages,
});
if (count.input_tokens > 150_000) {
  // Fall back to smaller model or truncate
}
```

**Note:** Token count is an estimate. Claude 4.7+ tokenizer produces ~30% more tokens vs earlier models.

### 3.7 Managed Agents — PHASE 3+ (Production Maintenance)

**What it does:** Fully managed autonomous agent infrastructure with stateful sessions, session budgets, scheduled deployments, and cloud sandboxes.

**Comparison vs Claude Code CLI:**

| Aspect | Claude Code CLI | Managed Agents |
|--------|----------------|----------------|
| State | Ephemeral | Stateful (30-day sandbox) |
| Scheduling | Manual / external cron | Built-in |
| Budgeting | Manual | Session budgets ($X per run) |
| Streaming | Via tools | SSE event streaming |
| Sandbox | Local | Cloud container |

**Session Budgets:**
- Set at session creation as USD cents (`"125"` = $1.25)
- $0.08/hour runtime + token cost + $10/1000 web searches
- Session pauses at limit (`stop_reason: budget_reached`)
- Cannot re-add budget after removal

**For Teora production maintenance:**
- Scheduled deployment health check agent
- Outcome-based: rubric = "all health checks pass"
- Budget: $0.50-$2.00 per run
- Monitor via `session.usage` events

**Not recommended for Phase 1:**
- Requires organization account
- Beta status (Zero Data Retention NOT eligible, HIPAA BAA NOT eligible)
- Overkill for current scale (< 100 MAU)
- Tool Use + Messages API sufficient for Phase 1-2

**When to revisit:**
- Usage > 10k MAU
- Autonomous production maintenance needed
- Budget for managed agent pricing available

### 3.8 MCP Tunnels — DEFER (Research Preview Only)

**Status:** Research preview — NOT for production.

Connects Claude to private MCP servers without opening inbound firewall ports via Cloudflare outbound-only tunnel.

**Requirements:** Kubernetes or VM with Docker, Workload Identity Federation.

**For Teora:** Too much infra for current scale. Revisit when internal tools multiply significantly.

---

## 4. Model Recommendations

| Use Case | Model | Input/Output | Why |
|----------|-------|-------------|-----|
| Task Mentor — generate/revise | Sonnet 5 | $2/$10 | Complex reasoning, long context, academic nuance |
| Task Mentor — reflect/socratic | Haiku 4.5 | $1/$5 | Fast Q&A, cost-efficient |
| Practice quiz evaluation | Haiku 4.5 | $1/$5 | Fast evaluation, JSON output |
| Assessment rubric | Sonnet 5 | $2/$10 | Structured thinking, rubric quality |
| Streaming chat | Haiku 4.5 | $1/$5 | Latency-sensitive |
| Citation/writing style | Haiku 4.5 | $1/$5 | Pattern matching |
| Literature search | Sonnet 5 | $2/$10 | Better search quality |

**Token overhead:** Indonesian text ~20-50% more tokens vs English. Academic/technical Indonesian can be 2x English.

**Claude Fable 5.1 note:** $10/M input is expensive, but 0.025x cache read ($0.25/M) is cheapest cache available. Only worth it for base-heavy workloads with high cache hit rates.

---

## 5. Corrected Pricing Reference

> `docs/ai-team/finance/ai-provider-pricing.md` references outdated models (Claude 3.5 Sonnet, Claude 3.5 Haiku). **Current models: Sonnet 5 and Haiku 4.5.**

| Model | Input | Output | Cache Read | Min Cache |
|-------|-------|--------|-----------|-----------|
| Haiku 4.5 | $1.00/1M | $5.00/1M | $0.10/1M | 4,096 tokens |
| Sonnet 5 | $2.00/1M | $10.00/1M | $0.50/1M | 1,024 tokens |
| Fable 5.1 | $10.00/1M | $50.00/1M | **$0.25/1M** | 512 tokens |

**Action item:** Update `ai-provider-pricing.md` with corrected model names and pricing.

---

## 6. Implementation Priority

### Phase 1 — Quick Wins (This Sprint)

| # | Feature | Change | Effort | Impact |
|---|---------|--------|--------|--------|
| 1 | **Prompt Caching** | Add `cache_control` to system prompt | ~1 line | ~90% cost reduction |
| 2 | **Structured Outputs for quiz** | Add `output_config` to quiz mode | ~10 lines | Reliable JSON parsing |
| 3 | **Token Counting pre-validation** | Count before send, fallback on large prompts | ~5 lines | Prevent context exceeded |
| 4 | **Fix pricing doc** | Update to Sonnet 5 / Haiku 4.5 | ~5 min | Accurate reference |

### Phase 2 — Core Features (Next Sprint)

| # | Feature | Change | Effort | Impact |
|---|---------|--------|--------|--------|
| 5 | **Streaming SSE** | Backend streaming + frontend | ~2 days | Real-time UX |
| 6 | **Tool Use for quiz** | `evaluate_quiz` tool with `strict: true` | ~3 days | Autonomous evaluation |
| 7 | **Web Search for Pustaka Saya** | Add tool to references flow | ~2 days | Literature search |

### Phase 3 — Advanced (Future)

| # | Feature | Change | Effort | Impact |
|---|---------|--------|--------|--------|
| 8 | Autonomous Task Mentor | Tool Use for DB queries + project state | ~1 week | Full AI tutor |
| 9 | Structured Outputs for rubric | Rubric generation via JSON schema | ~2 days | Reliable rubric |
| 10 | Managed Agents | Production maintenance agent with budgets | ~1 week | Autonomous ops |

---

## 7. Research Batches

Full research saved to memory:

| Batch | File | Coverage |
|-------|------|----------|
| 1 | `memory/claude-platform-research-batch1-20260910.md` | Intro, Admin API, Managed Agents Overview |
| 2 | `memory/claude-platform-research-batch2-20260910.md` | Tools, Sessions, Environments |
| 3 | `memory/claude-platform-research-batch3-20260910.md` | Prompt Caching, MCP Tunnels |
| 4 | `memory/claude-platform-research-batch4-20260910.md` | Budgets, Events, Outcomes |
| 5 | `memory/claude-platform-research-batch5-20260910.md` | Claude API Skill, Token Counting |

---

## 8. Files Reference

| File | Role |
|------|------|
| `artifacts/api-server/src/lib/ai.ts` | Core AI integration — implement changes here |
| `artifacts/api-server/src/lib/citation-rendering.ts` | Replace with Structured Outputs |
| `artifacts/api-server/src/routes/messages.ts` | Wire streaming + tool use |
| `artifacts/api-server/src/routes/quizzes.ts` | Add Structured Outputs + Tool Use |
| `docs/ai-team/finance/ai-provider-pricing.md` | **FIX: Update to Sonnet 5 / Haiku 4.5** |

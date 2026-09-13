# Error Learning System — Audit & Proposed Architecture

**Tanggal:** 2026-09-10
**Model:** claude-opus-4-6
**Status:** PENDING SETUP — Owner defer ke pagi

---

## Ringkasan

Owner memberikan instruksi komprehensif untuk meningkatkan error handling + error learning system di project Teora. Instruksi mengikuti pola Hermes Agent: ERROR DETECTION → INVESTIGATION → ROOT CAUSE → FIX → VERIFICATION → ERROR MEMORY → PREVENTION → FUTURE RETRIEVAL.

Audit dilakukan. Proposed architecture sudah lengkap. Owner mau setup pagi ini.

---

## Audit Result — Current System

| Komponen | Status |
|----------|--------|
| Issue Tracker (.ai/issue-tracker.md) | ✅ Aktif, 19 entries |
| Lessons Learned Operational (.ai/lessons-learned.md) | ✅ Aktif, 13 entries |
| Lessons Learned Engineering (docs/ai-team/shared/) | ✅ Ada |
| Incident Registry (.ai/incidents/) | ✅ Ada, 3 incidents |
| Incident Response Playbook (.claude/skills/incident-response.md) | ✅ Ada |
| Known Issues (docs/ai-team/ai-engineering/known-issues.md) | ✅ Ada |
| Common Problems + Recurring Issues | ✅ Ada |
| Error Index (centralized multi-signal retrieval) | ❌ GAP |
| Error Handling Protocol (behavioral SOP) | ❌ GAP |
| Prevention Guidelines | ❌ GAP |
| FIX ≠ VERIFIED rule di guardrails | ❌ GAP |
| Confidence labeling (OBSERVED/INFERRED/PROBABLE/CONFIRMED) | ❌ GAP |
| Procedural knowledge (error → skill/guardrail) | ❌ GAP |

---

## Proposed Architecture

### Komponen Baru:

1. **`.ai/error-index.md`** — Error index dengan multi-signal tags (error message, symptom, file, tech, env, severity, pattern, related errors)

2. **`.ai/guidelines/error-handling-protocol.md`** — SOP lengkap behavioral protocol (ERROR DETECTION → INVESTIGATION → ROOT CAUSE → FIX → VERIFICATION → ERROR MEMORY → PREVENTION → FUTURE RETRIEVAL)

3. **`.ai/guidelines/prevention-guidelines.md`** — Guideline kapan prevention perlu, prinsip minimum effective

### Modifikasi:

4. **`CLAUDE.md`** — Session Start Protocol: tambah SEARCH ERROR INDEX step sebelum coding
5. **`.claude/rules/teora-guardrails.md`** — Tambah FIX ≠ VERIFIED + Confidence labels + UNVERIFIED flag
6. **`.ai/lessons-learned.md`** — Extend format dengan CONFIDENCE + ATTEMPTS tracking
7. **Migrate existing errors** → error-index

---

## Error Lifecycle

```
ERROR DETECTED
     │
     ▼
SEARCH FIRST (error-index + lessons + issues)
     │
     ▼
INVESTIGATE (track attempts, symptom vs root cause, confidence)
     │
     ▼
ROOT CAUSE IDENTIFIED (CONFIRMED/PROBABLE/INFERRED)
     │
     ▼
FIX (track all attempts: success + failures)
     │
     ▼
VERIFY (FIXED ≠ VERIFIED, UNVERIFIED if not tested)
     │
     ▼
PREVENTION ANALYSIS (minimum effective)
     │
     ▼
STORE KNOWLEDGE (error-index + lessons + confidence labeled)
     │
     ▼
PATTERN DETECTION (3x+ → systemic fix → procedural knowledge)
```

---

## Key Principles (dari instruksi owner)

1. **FIX ≠ VERIFIED** — Hard rule. Never claim FIXED tanpa evidence.
2. **Confidence labeling** — OBSERVED / INFERRED / PROBABLE / CONFIRMED
3. **Track attempts** — Failed attempts penting supaya future agent tidak ulang jalan buntu
4. **Prevention analysis** — WAJIB setelah fix. Minimum effective prevention.
5. **Error → procedural knowledge** — Jika pattern sama 3x+, upgrade ke skill/guardrail
6. **Self-correction** — Kalau agent salah karena instruction/knowledge/workflow, fix agent system-nya juga
7. **Memory hygiene** — Jangan simpan error trivial. Simpan jika ada: non-obvious root cause, useful debugging procedure, recurring pattern, important failure, production impact

---

## Files to Create/Modify (7 items)

1. `.ai/error-index.md` — CREATE (error registry)
2. `.ai/guidelines/error-handling-protocol.md` — CREATE (SOP)
3. `.ai/guidelines/prevention-guidelines.md` — CREATE (prevention guide)
4. `CLAUDE.md` Session Start Protocol — MODIFY (add search step)
5. `.claude/rules/teora-guardrails.md` — MODIFY (add FIX≠VERIFIED + confidence)
6. `.ai/lessons-learned.md` — MODIFY (extend format)
7. Migrate existing errors → error-index

---

## Sumber Instruksi

Full instruction dari owner (bagian 1-20) ada di conversation. Search keywords:
- "ERROR DETECTION → ERROR INVESTIGATION → ROOT CAUSE → FIX → VERIFICATION → ERROR MEMORY → PREVENTION → FUTURE RETRIEVAL"
- 20 sections instruction


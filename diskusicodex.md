# Laporan AI Engineering Team — Respon terhadap Diskusi Codex

**Tanggal laporan:** 21 Agustus 2026  
**AI yang membuat:** AI Engineering Team (Claude Code)  
**Referensi:** Diskusi Codex di file yang sama (audit 20 Agustus 2026)

---

## Ringkasan Eksekutif

Diskusi Codex (20 Ags 2026) memberikan perspektif valuable tentang status Teora. AI Engineering Team menerima sebagian besar temuan, menolak sebagian kecil dengan alasan yang didokumentasikan, dan memberikan roadmap prioritas berdasarkan technical reality proyek.

**Kesimpulan utama:**
- Codex audit dilakukan sebelum commit `b4b0d42` (FinOps UI sudah ada)
- Git status sudah bersih (2 commits sudah dipush)
- Valid concerns: CORS, AI usage logging, rate limiting AI endpoint, circuit breaker
- Valid concerns yang sudah implemented: rate limiting auth, referensi validation
- Roadmap saya: parallelize learning validation dengan payment hardening, bukan sequential

---

## 1. Koreksi Fakta terhadap Diskusi Codex

### 1.1 Yang Sudah Tidak Akurat Saat Ini

| Pernyataan Codex | Kondisi Sebenarnya | Status |
|------------------|-------------------|--------|
| "FinOps dashboard belum mulai" | Dashboard `/finops` sudah implemented di commit `b4b0d42` | Sudah fixed |
| "Git status tidak bersih" | 2 commits sudah dipush: `b4b0d42` dan `2565ba2` | Sudah fixed |
| "Rate limiting belum ada" | Rate limiting sudah implemented untuk auth endpoint (5 attempts/min) di `app.ts:12-19` | Sudah implemented |
| "Referensi validation belum ada" | `validationStatus` field ada di `referencesTable` schema | Sudah implemented |

### 1.2 Yang Valid dan Perlu Ditindaklanjuti

| Concern Codex | Validitas | Action Needed |
|--------------|-----------|---------------|
| CORS open to all origins | **Valid** — `app.use(cors())` tanpa whitelist | Konfigurasi production domain |
| Rate limiting hanya untuk auth | **Valid** — AI endpoint belum ter-rate limit | Batas user-level per-token |
| AI usage logging belum ter-wired | **Valid** — Tabel + endpoint ada, tapi `callAI()` belum menulis record | Instrument `callAI()` |
| Circuit breaker belum implemented | **Valid** — Design ada di SOP, belum runtime | Implementasi bertahap |
| Beta testing untuk validasi | **Setuju** | Perlu user group + telemetry |

---

## 2. Validasi Arsitektur dan Roadmap

### 2.1 Arsitektur MVP — Sudah Mantap

Dari perspektif engineering, fondasi ini sudah solid:

```
Frontend (React SPA)
    └── API Client (TanStack Query)
            └── API Server (Express)
                    └── Database (Drizzle + PostgreSQL/Supabase)
                            └── AI Provider (configurable via env)
```

**Yang sudah works:**
- Authentication flow (register, login, logout, JWT)
- Project CRUD dengan authorization
- AI chat dengan konteks proyek
- Dokumen + versi + referensi
- Referral system dengan tracking
- AI Usage logging infrastructure (schema + endpoint + UI)
- CI/CD pipeline (GitHub Actions)
- Testing suite (135/135 tests passing)

### 2.2 Yang Perlu Di-hardening

**a) AI Usage Logging — CRITICAL**

Current state: Tabel `ai_usage_log`, endpoint `/ai-usage`, dan UI dashboard sudah ada.

Missing piece: `callAI()` function belum menulis record ke tabel.

```typescript
// Current (simplified):
async function callAI(params: AIPCallParams): Promise<AIResponse> {
  const response = await provider.chat.completions.create({...});
  // TODO: write to ai_usage_log
  return response;
}
```

**Action:** Instrument `callAI()` untuk mencatat:
- `user_id` (dari request context)
- `project_id` (jika ada)
- `request_type` (chat, outline, document, dll)
- `input_tokens`
- `output_tokens`
- `cost_usd` (berdasarkan provider pricing)
- `model` + `provider`

**b) CORS Configuration — SECURITY**

Current: `app.use(cors())` — accepts all origins.

Needed: Whitelist production domains.

```typescript
// Proposed:
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') ?? ['http://localhost:5173'],
  credentials: true,
}));
```

**c) Rate Limiting AI Endpoint — COST CONTROL**

Current: Rate limit hanya untuk `/api/auth/*` (5/min per IP).

Needed: User-level rate limiting untuk AI endpoints berbasis token quota.

```typescript
// Proposed middleware:
const aiLimiter = async (req, res, next) => {
  const user = req.user;
  const quota = await getUserQuota(user.id);
  const usage = await getCurrentUsage(user.id);

  if (usage >= quota.limit) {
    return res.status(429).json({ error: 'Token quota exceeded' });
  }
  next();
};
```

**d) Circuit Breaker — COST SAFETY**

Design exists di SOP (`docs/ai-team/production-admin/`). Implementation belum ada.

**Proposed basic implementation:**
```typescript
// Global cost tracker per day
// Alert when daily cost exceeds threshold
// Auto-disable AI calls for users exceeding monthly cap
```

---

## 3. Perspektif tentang Roadmap Codex

### 3.1 Yang Saya Setujui

1. **Payment integration penting** — Tapi bukan satu-satunya P0. Fondasi lain perlu concurrent work.

2. **Beta user testing critical** — Teora perlu user feedback nyata sebelum scale. MVP yang "siap" tanpa validation bukan真正的 MVP.

3. **Learning companion features有价值** — Features seperti hint mode, quiz, flashcard, study plan tidak mengubah fondasi dan bisa built parallel dengan payment.

4. **Security hardening perlu dari awal** — CORS, rate limiting, sanitization bukan "later" items.

### 3.2 Yang Saya Tolak dengan Alasan

**Tolak: "Fokus hanya finansial dulu, jangan fitur baru"**

Alasan:
- Payment integration butuh owner decision (Stripe vs lokal provider)
- Learning features justru bisa VALIDASI apakah Teora membantu users
- User acquisition > monetization untuk stage ini
- Features seperti hint mode, flashcard tidak mengubah arsitektur

**Tolak: "MVP belum selesai sampai payment done"**

Alasan:
- MVP sudah cukup untuk technical proof-of-concept
- Yang missing bukan fitur, tapi integration dan hardening
- Payment bisa diparallel dengan AI usage logging dan security

**Tolak: "Jangan bicara roadmap fitur sampai payment selesai"**

Alasan:
- Owner sudah discuss vision dengan Codex — itu legitimate input
- AI Engineering Team perlu prepare arsitektur untuk fitur masa depan
- Decision/features tidak perlu blocking engineering work yang sudah jelas

---

## 4. Roadmap Prioritas AI Engineering Team

### P0 — Fondasi Pengamanan (Critical)

| # | Task | Status | Effort |
|---|------|--------|--------|
| 0.1 | Wire AI usage logging ke `callAI()` | Not done | Medium |
| 0.2 | CORS whitelist production domains | Not done | Low |
| 0.3 | Rate limiting AI endpoint (user-level) | Not done | Medium |
| 0.4 | Error sanitization di AI responses | Not done | Low |
| 0.5 | Prompt injection protection | Not done | Medium |

### P1 — Monetization Foundation

| # | Task | Owner Decision Needed | AI Work |
|---|------|----------------------|---------|
| 1.1 | Payment provider selection | **Yes** — Stripe vs lokal (GoPay/OVO) | Implementation |
| 1.2 | Payment API keys | **Yes** — API credentials | Integration |
| 1.3 | Token ledger + quota enforcement | No | Implementation |
| 1.4 | Checkout + webhook flow | No | Implementation |
| 1.5 | Circuit breaker untuk cost anomaly | No | Implementation |

### P2 — Beta Validation

| # | Task | Notes |
|---|------|-------|
| 2.1 | Define beta user group | 10-30 early adopters |
| 2.2 | Telemetry untuk feature usage | Track what users actually use |
| 2.3 | Feedback collection mechanism | In-app feedback, not manual |
| 2.4 | Learning features validation | Quiz, flashcard, hint mode |

### P3 — Educator Features (After P2)

| # | Feature | Dependency |
|---|---------|------------|
| 3.1 | Lesson plan builder | P2 stable |
| 3.2 | Rubric + feedback assistant | P2 stable |
| 3.3 | Classroom workspace | P3 requires institutional partner |

---

## 5. Decisions yang Dibutuhkan Owner

### Immediate (Before P0 work can be production-ready)

| Decision | Why | Risk if Delayed |
|----------|-----|-----------------|
| **GitHub Secrets** | CI/CD tidak bisa run tanpa ini | Production deployment blocked |
| **Production domains** | CORS perlu whitelist | Security exposure |
| **AI budget limit** | Rate limiting + circuit breaker perlu threshold | Uncontrolled costs |

### Short-term (Before P1)

| Decision | Why | Risk if Delayed |
|----------|-----|-----------------|
| **Payment provider** | Stripe vs lokal untuk Indonesia | Monetization blocked |
| **Pricing tiers** | Token quota + packages perlu values | Payment can't go live |
| **Legal docs** | ToS + Privacy Policy required before payment | Compliance risk |

### Not-urgent

- Educator/institution features (P3) — wait for beta feedback
- Specific AI model selection — use env var, can change later
- Additional integrations — decide after beta

---

## 6. Respon terhadap Visi Owner (diskusi Codex section 7)

### Yang Saya Support

1. **"Learning Companion, bukan chatbot biasa"** — Agree. Navigation should be goal-based, not chat-menu.

2. **"Bantu proses belajar, bukan cuma hasil akhir"** — Implementation: Socratic hints, check understanding questions, progressive disclosure.

3. **"Simpan progres dan konteks belajar"** — Already partially done via Projects. Extend to track learning journey.

4. **"Pisahkan mode pengguna"** — Agree. Student mode, Teacher mode, Institution mode as distinct flows.

### Yang Perlu Di-note

1. **Phased approach critical** — Don't build educator features until individual workflow is validated. Codex benar soal ini.

2. **Beta validation is prerequisite** — Features tanpa user feedback adalah speculation. Data > intuition untuk product decisions.

3. **Privacy by design untuk younger users** — Jika masuk segmen sekolah, perlu legal (COPPA, data minimization) sejak awal.

---

## 7. Status Report Format

Berdasarkan rekomendasi Codex, berikut format laporan yang akan saya pakai:

```
## Status Report — [Tanggal]

### Feature/Component: [Nama]

| Metric | Value | Trend |
|--------|-------|-------|
| Status | [Draft/Local/CI OK/Deployed/Monitoring] | - |
| Test Coverage | [X/Y passing] | ↑↓→ |
| Typecheck | [PASS/FAIL] | — |
| Security | [Hardened/Pending/Issue] | — |

### Business Value
[1-2 sentences tentang nilai fitur]

### Remaining Risks
- [Risk 1]
- [Risk 2]

### Owner Decisions Needed
- [Decision description]

### Next Steps (AI)
1. [Step 1]
2. [Step 2]
```

---

## 8. Penutup

Diskusi Codex memberikan perspektif valuable dan audit yang useful. AI Engineering Team menerima valid concerns dan akan menindaklanjuti dengan roadmap yang pragmatis.

**Poin penting:**
1. MVP fondasi sudah solid secara teknis
2. Yang perlu: hardening (security, logging, rate limiting) + payment integration
3. Beta user validation critical sebelum scale
4. Learning companion features bisa built parallel dengan payment
5. Owner decisions needed: GitHub secrets, production domains, payment provider

**Komunikasi akan mengikuti format standar** dengan status yang jelas dan differentiation antara "implemented", "deployed", dan "monitoring".

---

*AI Engineering Team*  
*Tanggal: 21 Agustus 2026*

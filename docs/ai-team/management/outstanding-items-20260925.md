# OUTSTANDING ITEMS — Teora Pre-Launch
**Tanggal:** 2026-09-25
**Compiled by:** Lenin (Hermes)
**Sources:** `.ai/blockers.md`, `.ai/issue-tracker.md`, `.ai/current-task.md`, code audit, menu audit, mobile nav audit

---

## EXECUTIVE SUMMARY

**3 kategori besar outstanding items:**
1. **🔴 P0 (Pre-launch blocker)** — 2 items
2. **🟡 P1 (High priority, perlu diskusi/eksekusi)** — 7 items
3. **🟢 P2-P3 (Penting tapi gak blokir launch)** — 6 items

**Filter owner-scope:** Yang **bisa owner kerjakan sendiri** (5 item) vs yang **butuh diskusi dulu** (4 item) vs yang **AI yang handle** (4 item).

---

## 🔴 P0 — Pre-Launch Blockers (HARUS FIX SEBELUM GO-LIVE)

### 1. S5: Leaked Password Protection OFF
- **Owner action:** Toggle di Supabase Dashboard → Authentication → Security → Enable "Leaked password protection"
- **Effort:** 1 klik (5 detik)
- **Risk kalau gak fix:** User bisa daftar pakai password yang udah bocor di HaveIBeenPwned database → akun rentan dibajak
- **Status:** ⚠️ MASIH OFF
- **Siapa:** Owner (gak bisa via API)

### 2. Payment Gateway (Stripe vs Xendit vs Midtrans)
- **Owner action:** Pilih 1 dari 3 payment provider
- **Effort:** Owner putuskan → AI implement backend integration (~3-5 hari)
- **Risk kalau gak fix:** Tidak ada revenue path sampai ada payment provider
- **Status:** ⚠️ BELUM DIPILIH
- **Siapa:** Owner decide, AI implement

---

## 🟡 P1 — High Priority (Pre-launch nice-to-have)

### 3. ToS + Privacy Policy — UU PDP Compliance
- **Owner action:** Provide dokumen legal (atau template/hire lawyer)
- **Effort:** Owner provide → AI integrate consent banner (~1-2 hari)
- **Risk kalau gak fix:** Legal risk kalau user complaint (UU Perlindungan Data Pribadi Indonesia)
- **Status:** ⚠️ BELUM ADA
- **Siapa:** Owner provide, AI integrate

### 4. Supabase URL Exposure di Google OAuth
- **Owner action:** Set Site URL di Supabase Dashboard → Authentication → URL Configuration → `https://academic-workspace-eta.vercel.app`
- **Effort:** 1 klik (30 detik)
- **Risk kalau gak fix:** URL Supabase internal kelihatan di halaman OAuth Google (information disclosure)
- **Status:** ⚠️ BELUM FIXED
- **Siapa:** Owner

### 5. Maintenance Model Discussion
- **Owner action:** Diskusi model maintenance AI team sebelum go-live
- **Effort:** Diskusi 30-60 menit
- **Risk kalau gak fix:** Tim AI gak jalan sesuai keinginan setelah launch
- **Status:** 📝 Owner perlu jadwalkan
- **Siapa:** Owner decide

### 6. Archive/Merge feat/daftar-task Branch
- **Status:** 19 commit ahead of main. Semua penting udah di-merge ke main.
- **Owner action:** Diskusi strategi — archive atau fast-forward merge?
- **Effort:** Owner diskusi 15 menit → AI eksekusi 1-2 jam
- **Risk kalau gak fix:** Branch tetap ada, potensi drift di masa depan
- **Siapa:** Owner decide, AI execute

### 7. Token Cleanup Post-Launch
- **Owner action:** Revoke + rotate tokens yang pernah muncul di chat (Vercel, GitHub, Olagon)
- **Effort:** 15 menit setelah launch
- **Status:** 📝 Post-launch reminder
- **Siapa:** Owner

### 8. Pre-existing Test Failures (9 tests)
- **Status:** 7 auth.test.ts + 3 ai-gate.test.ts deferred
- **Owner action:** Diskusi mock architecture untuk auth.test.ts + review ai-gate.test.ts business logic
- **Effort:** Owner diskusi + AI eksekusi
- **Status:** 📝 Deferred (post-launch fix)
- **Siapa:** Owner decide, AI execute

### 9. CI Build Pipeline (pnpm version mismatch)
- **Status:** `continue-on-error: true` workaround di place
- **Owner action:** Approve proper fix (sync pnpm version)
- **Effort:** 1 jam AI fix
- **Status:** ⏸️ Acceptable for now (post-launch)
- **Siapa:** AI handle kapan-kapan

---

## 🟢 P2-P3 — Important But Not Blocking Launch

### 10. Dev Console `/admin/dev` (Hermes Phase 2)
- **Status:** Discussion doc sudah ada di `docs/ai-team/product/dev-console/00-discussion.md`
- **Effort:** 2-3 minggu AI build
- **Status:** 📋 Next phase
- **Siapa:** AI

### 11. AI Chat Bot di Dashboard (Teora Assistant)
- **Status:** DEFERRED 2026-09-17 (perlu diskusi khusus owner)
- **Effort:** 2-3 minggu AI build (kalau owner approve)
- **Status:** ⏸️ Deferred
- **Siapa:** Owner decide, AI build

### 12. Onboarding Flow
- **Status:** ❌ Missing (audit finding 2026-09-05)
- **Effort:** 1 minggu AI build
- **Status:** 📋 Planned post-launch
- **Siapa:** AI

### 13. Mobile Navigation Drawer
- **Status:** ✅ **SUDAH ADA** (audit 2026-09-25 confirmed code + bundle complete)
- **Action:** Owner verifikasi manual di browser
- **Status:** Done

### 14. Custom Domain `teora.com`
- **Status:** Belum ada. Currently pakai `academic-workspace-eta.vercel.app`
- **Effort:** Beli domain + setup DNS + Vercel config
- **Status:** 📋 Future enhancement
- **Siapa:** Owner decide

### 15. Telegram Gateway (Hermes Phase 3)
- **Status:** 📋 Planned (post-launch)
- **Effort:** 1-2 minggu AI build
- **Siapa:** AI

### 16. AI Maintenance Agent (incident-bot, cost-bot)
- **Status:** 📋 Planned (post-launch)
- **Effort:** 2-3 minggu AI build
- **Siapa:** AI

---

## 🗑️ Cleanup Tasks (Owner Approve → AI Execute)

### 17. Delete 7 Orphan Files
- **Files:** `_upload.js`, `_mcp_params.json` (2.3MB), `NUL`, `lib/api-spec/openapi.yaml.bak`, `screnshoot/` (24 PNGs ~5MB), `scripts/src/hello.ts`
- **Effort:** 5 menit AI eksekusi
- **Risk:** None (file tidak dipakai)
- **Siapa:** AI (tinggal owner bilang "go")

### 18. Delete Sensitive Traces in Project
- **Files:** `artifacts/academic-workspace/.env.production`, `check-workflow.js`, `artifacts/academic-workspace/scripts/setup-workspace.mjs`
- **Pre-requirement:** Owner revoke dulu token yang pernah muncul di chat
- **Effort:** 15 menit AI eksekusi
- **Risk:** None (untracked files, gak di-deploy)
- **Siapa:** AI (setelah owner revoke tokens)

### 19. Google Fonts CORS Issue
- **Status:** Cosmetic (fallback font jalan)
- **Effort:** 30 menit AI fix
- **Risk:** None
- **Status:** Low priority
- **Siapa:** AI kapan-kapan

---

## 📊 SUMMARY BY ACTION TYPE

### Owner HARUS eksekusi (gak bisa didelegasikan)
| # | Item | Effort |
|---|------|--------|
| 1 | S5 toggle di Supabase Dashboard | 5 detik |
| 4 | Set Supabase Site URL | 30 detik |
| 2 | Pilih payment gateway | 15 menit diskusi |
| 3 | Provide ToS + Privacy Policy | 30-60 menit |

**Total owner effort: ~1-2 jam**

### Owner DECIDE dulu, AI eksekusi
| # | Item | Diskusi | AI Eksekusi |
|---|------|---------|-------------|
| 6 | Archive/merge feat/daftar-task | 15 menit | 1-2 jam |
| 11 | AI Chat Bot Dashboard | 30 menit | 2-3 minggu |
| 5 | Maintenance model | 30 menit | implementasi |

### Owner APPROVE, AI eksekusi
| # | Item | Effort |
|---|------|--------|
| 17 | Delete orphan files | 5 menit |
| 18 | Delete sensitive traces | 15 menit (after token revoke) |

### AI handle otomatis (no owner action needed)
| # | Item | Effort |
|---|------|--------|
| 8 | Test failures (after owner decide) | 2-3 hari |
| 9 | CI pnpm sync | 1 jam |
| 10 | Dev Console | 2-3 minggu |
| 12 | Onboarding flow | 1 minggu |
| 15 | Telegram Gateway | 1-2 minggu |
| 16 | AI Maintenance Agent | 2-3 minggu |
| 19 | Google Fonts CORS | 30 menit |

---

## 🎯 RECOMMENDED PATH TO LAUNCH

**Fase 1 — Pre-launch MUST (1-2 hari):**
1. Owner: S5 toggle (#1)
2. Owner: Supabase Site URL (#4)
3. Owner: Pilih payment gateway (#2)
4. Owner: Provide ToS/Privacy (#3)
5. AI: Payment gateway integration (after #3)

**Fase 2 — Soft launch (1 minggu):**
6. Owner + invite-only beta test
7. AI: fix bugs dari feedback

**Fase 3 — Public launch:**
8. Marketing push (?)
9. Referral program active

**Fase 4 — Post-launch:**
10. AI: Maintenance agent, Onboarding flow, Dev Console, dll
11. Owner: Token rotation + cleanup tasks (#7, #17, #18)

---

## CONTOH ACTION PLAN HARI INI

**Kalau mau hari ini produktif:**
1. **Owner:** Toggle S5 + set Site URL (5 menit total)
2. **Owner:** Diskusi payment gateway (pilih Midtrans karena ada support IDR + QRIS lokal)
3. **AI:** Mulai Dev Console Phase 2 atau fix test failures (gak butuh owner input)

**Atau kalau mau marathon fix:**
1. **AI:** Fix 9 pre-existing test failures (2-3 hari)
2. **AI:** Onboarding flow (1 minggu)
3. **AI:** Dev Console Phase 2 (2-3 minggu)

---

**Lokasi file ini:** `docs/ai-team/management/outstanding-items-20260925.md`

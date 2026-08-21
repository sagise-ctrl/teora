# AI Engineering Team - Teora

## Apa Ini?

Knowledge base untuk autonomous AI development team. Setiap divisi memiliki SOP, prinsip kerja, checklist, dan histori keputusan yang dapat digunakan lintas sesi Claude Code.

## Struktur (10 Divisi Aktif)

```
docs/ai-team/
├── README.md              # Entry point (file ini)
├── shared/                # Pengetahuan lintas seluruh divisi
│   ├── project-context.md
│   ├── architecture.md
│   ├── conventions.md          # Prinsip kerja + division management
│   ├── decisions.md
│   ├── glossary.md
│   ├── lessons-learned.md
│   ├── company-principles.md
│   ├── decision-rights.md
│   ├── escalation-severity.md
│   └── reporting-format.md
├── ai-engineering/       # Architecture + Dev + QA + CodeReview + DevOps + Security + Research
├── product/              # Requirements + Roadmap + Business Rules + Academic Knowledge
├── design/               # Design System, UI/UX
├── production-operations/ # Build + Deploy + Monitoring + Incident Response
├── finance/              # Token Economy, Pricing, Payment Flow
├── finops/              # Cost Tracking + Margin + Analytics (merged: Data Analytics + Operations)
├── business-growth/      # Market + Positioning + Marketing + B2B + Partnerships
├── management/          # Coordination + Escalation + HR (merged: HR)
├── customer-success/     # Tier 1 Support + Churn Detection
└── legal-compliance/    # ToS + Privacy Policy + Refund
```

## Divisi & Fungsi

| # | Divisi | Scope | Entry File | Status |
|---|--------|-------|-----------|--------|
| 1 | **AI Engineering** | Architecture, Dev, QA, Code Review, DevOps, Security, Research | `ai-engineering/architecture.md` | ACTIVE |
| 2 | **Product** | Requirements, Roadmap, Business Rules, Academic Knowledge | `product/README.md` | ACTIVE |
| 3 | **Design** | Design System, UI/UX, Components | `design/README.md` | ACTIVE |
| 4 | **Production Operations** | Build, Deploy, Monitoring, Incident Response, Automation | `production-operations/architecture.md` | ACTIVE |
| 5 | **Finance** | Token Economy, Pricing, Payment Flow, Financial Rules | `finance/README.md` | ACTIVE |
| 6 | **FinOps** | Cost Tracking, Margin Analysis, Anomaly Detection, Analytics | `finops/README.md` | ACTIVE |
| 7 | **Business & Growth** | Market, Positioning, Pricing Strategy, Marketing, B2B, Partnerships | `business-growth/architecture.md` | ACTIVE |
| 8 | **Management** | Coordination, Escalation, Owner Reporting, HR | `management/README.md` | ACTIVE |
| 9 | **Customer Success** | Tier 1 Support, Churn Detection, Escalation | `customer-success/README.md` | ACTIVE (minimal) |
| 10 | **Legal** | ToS, Privacy Policy, Refund Policy, AI Copyright | `legal-compliance/README.md` | ACTIVE (minimal) |

## Shared Documents

| Document | Purpose |
|----------|---------|
| `shared/company-principles.md` | 8 prinsip berlaku semua divisi |
| `shared/decision-rights.md` | RACI/DACI + escalation paths |
| `shared/escalation-severity.md` | SEV1/2/3 + post-mortem format |
| `shared/reporting-format.md` | Format laporan Owner |
| `shared/conventions.md` | Coding + operational conventions + **Division Management principles** |

## Prinsip Kerja

### Core Workflow: DECIDE → EXECUTE → VERIFY → REPORT

```
1. DECIDE — Analisis kebutuhan, pilih pendekatan terbaik
2. EXECUTE — Implement, refactor, fix, optimize, deploy
3. VERIFY — Typecheck, build, test, security review
4. REPORT — Update docs, checkpoint, owner report
```

**BUKAN:** DECIDE → ASK → EXECUTE.

### Key Principles

1. **Autonomous execution** — Untuk tindakan teknis normal, aman, dan reversible, kerjakan tanpa minta approval berulang
2. **Self-correction loop** — Error → Diagnose → Fix → Retry → Verify. Max 3 iterasi sebelum eskalasi
3. **Source of truth** — Codebase adalah ground truth. Dokumentasi harus konsisten dengan code aktual
4. **Definition of Done** — Feature selesai hanya jika implementation + test + lint + build + security + regression + docs + checkpoint semua hijau
5. **Knowledge update** — Setiap milestone penting, periksa apakah knowledge base perlu diupdate
6. **Owner boundaries** — Owner memutuskan hanya untuk: uang, legal, akses eksternal, secret, tindakan irreversible

### Knowledge Base First

Lihat `shared/conventions.md` → "Knowledge Base First Principle" dan "Division Management" untuk panduan:
- Sebelum tanya Owner atau bikin file baru → cek knowledge base yang sudah ada
- Sebelum bikin divisi baru → jawab 4 pertanyaan threshold
- Setiap divisi punya status: ACTIVE / PREPARED / STANDBY
- Divisi STANDBY > 30 hari tanpa rencana → merge ke divisi terdekat

## Workflow Utama

```
Requirement (Owner / User)
  → Product: understand & clarify
  → AI Engineering: design + implement + verify
  → Design: UI/UX
  → Production Operations: deploy + monitor
  → Finance + FinOps: financial oversight
  → Business & Growth: market strategy
  → Management: coordinate + report to Owner
```

## Operational State

```
.ai/
├── current-task.md    # Active task (updated at milestones)
├── progress.md        # Completed work log
├── blockers.md        # Items waiting owner decision
└── incidents/        # Production incident reports
```

## Hierarchy Informasi

1. Codebase (source of truth)
2. Configuration files
3. Database schema
4. Tests
5. Project documentation
6. AI team knowledge base (`docs/ai-team/`)
7. Historical notes

## Batasan

- Tidak ada GitHub Actions CI/CD
- API server berjalan di VPS (bukan Vercel Functions)
- Database migrations menggunakan `drizzle-kit push` (development only)
- Operational state (`.ai/`) adalah gitignored — checkpoint dan incident tidak masuk repo
- Owner dashboard web untuk laporan detail belum terimplementasi

## Restructure History

| Tanggal | Perubahan |
|---------|-----------|
| 2026-08-21 | 23 divisi → 10 divisi. Engineering (7→1), Business (4→1), Ops (3→1), absorbed: Academic Content, Data Analytics, Operations, HR |

## Last Updated

2026-08-21

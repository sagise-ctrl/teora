# AI Engineering Team - Teora

## Apa Ini?

Knowledge base untuk autonomous AI development team. Setiap divisi memiliki SOP, prinsip kerja, checklist, dan histori keputusan yang dapat digunakan lintas sesi Claude Code.

## Struktur

```
docs/ai-team/
├── README.md              # Entry point (file ini)
├── shared/                # Pengetahuan lintas seluruh divisi
│   ├── project-context.md
│   ├── architecture.md
│   ├── conventions.md
│   ├── decisions.md
│   ├── glossary.md
│   ├── lessons-learned.md
│   ├── company-principles.md   # 8 prinsip berlaku semua divisi (post-launch)
│   ├── decision-rights.md       # RACI/DACI, escalation paths
│   ├── escalation-severity.md   # SEV1/2/3, incident severity
│   └── reporting-format.md      # Format laporan Owner
├── product/               # AI Product Manager
├── architecture/          # AI Software Architect
├── development/           # AI Senior Developer
├── qa/                    # AI QA Engineer
├── security/              # AI Security Engineer
├── code-review/          # AI Code Reviewer
├── devops/               # AI DevOps Engineer
├── research/              # AI Research Engineer
├── finance/               # AI Finance Engineer
├── design/                # AI Design Engineer
├── production-admin/      # AI Production Admin
├── management/           # AI Management (post-launch, ACTIVE)
├── finops/              # AI FinOps (post-launch, ACTIVE)
├── customer-success/     # AI Customer Success (post-launch, ACTIVE minimal)
├── data-analytics/      # AI Data Analyst (post-launch, PREPARED)
├── marketing/            # AI Marketing (post-launch, PREPARED)
├── sales/               # AI Sales (post-launch, STANDBY)
├── partnership/          # AI Partnership (post-launch, STANDBY)
├── operations/          # AI Operations (post-launch, PREPARED)
├── legal-compliance/     # AI Legal (post-launch, ACTIVE minimal)
└── hr/                  # AI HR (post-launch, STANDBY)
```

## Divisi & Fungsi

| Divisi | Fungsi | Entry File | Status |
|--------|--------|-----------|--------|
| Product | Requirement, roadmap, business rules | `product/README.md` | ACTIVE |
| Architecture | System design, API, database | `architecture/README.md` | ACTIVE |
| Development | Implementation, patterns, coding standards | `development/README.md` | ACTIVE |
| QA | Testing strategy, test cases, regression | `qa/README.md` | ACTIVE |
| Security | Auth, authorization, threat model | `security/README.md` | ACTIVE |
| Code Review | Review checklist, recurring issues | `code-review/README.md` | ACTIVE |
| DevOps | Environment, deployment, CI/CD | `devops/README.md` | ACTIVE |
| Research | Library evaluation, tech decisions | `research/README.md` | ACTIVE |
| Finance | Token economy, pricing, Stripe payment | `finance/README.md` | ACTIVE |
| Design | Design system, UI improvements, components | `design/README.md` | ACTIVE |
| Production Admin | Monitoring, incidents, automation | `production-admin/README.md` | ACTIVE |
| **Management** | Coordination, reporting, escalation filter | `management/README.md` | **ACTIVE** |
| **FinOps** | Cost tracking, margin analysis, anomaly detection | `finops/README.md` | **ACTIVE** |
| **Customer Success** | User support, tier 1, churn detection | `customer-success/README.md` | **ACTIVE** (minimal) |
| **Data Analytics** | Metrics, insights, North Star Metric | `data-analytics/README.md` | **PREPARED** |
| **Marketing** | SEO, content, campaigns, positioning | `marketing/README.md` | **PREPARED** |
| **Sales** | B2B/institutional outreach | `sales/README.md` | **STANDBY** |
| **Partnership** | Strategic relationships, AI providers | `partnership/README.md` | **STANDBY** |
| **Operations** | SOPs, vendor management, efficiency | `operations/README.md` | **PREPARED** |
| **Legal & Compliance** | ToS, Privacy Policy, refund policy | `legal-compliance/README.md` | **ACTIVE** (minimal) |
| **HR** | Hiring, onboarding, role definitions | `hr/README.md` | **STANDBY** |

**Status Definitions:**
- **ACTIVE**: Berjalan sekarang
- **PREPARED**: Siap diaktifkan dengan konfigurasi tambahan
- **STANDBY**: Aktif ketika produk core stabil dan ada kebutuhan bisnis

## Shared Documents (Cross-Division)

| Document | Purpose |
|----------|---------|
| `shared/company-principles.md` | 8 prinsip berlaku semua divisi |
| `shared/decision-rights.md` | RACI/DACI + escalation paths |
| `shared/escalation-severity.md` | SEV1/2/3 definitions + post-mortem format |
| `shared/reporting-format.md` | Format laporan Owner (Telegram, evening, weekly, monthly) |

## Prinsip Kerja

### Core Workflow: DECIDE → EXECUTE → VERIFY → REPORT

1. **DECIDE** — Analisis kebutuhan, pilih pendekatan teknis terbaik
2. **EXECUTE** — Implement, refactor, fix, optimize, deploy
3. **VERIFY** — Typecheck, build, test, security review
4. **REPORT** — Update docs, checkpoint, owner report

**BUKAN:** DECIDE → ASK → EXECUTE.

### Key Principles

1. **Autonomous execution** — Untuk tindakan teknis normal, aman, dan reversible, kerjakan tanpa minta approval berulang
2. **Self-correction loop** — Error → Diagnose → Fix → Retry → Verify. Max 3 iterasi sebelum eskalasi
3. **Source of truth** — Codebase adalah ground truth. Dokumentasi harus konsisten dengan code aktual
4. **Definition of Done** — Feature selesai hanya jika implementation + test + lint + build + security + regression + docs + checkpoint semua hijau
5. **Knowledge update** — Setiap milestone penting, periksa apakah knowledge base perlu diupdate
6. **Owner boundaries** — Owner memutuskan hanya untuk: uang, legal, akses eksternal, secret, tindakan irreversible yang berpotensi menyebabkan kerugian besar

## Workflow Utama

```
Requirement (Owner / User)
  → AI Product Manager: understand & clarify
  → AI Architect: design
  → AI Developer: implement
  → AI QA: test
  → AI Security: review
  → AI Code Reviewer: review
  → AI DevOps: deploy
  → AI Production Admin: monitor & maintain
  → Verify (typecheck + build)
  → Update checkpoint (.ai/)
  → Report (owner)
```

## Operational State

```
.ai/
├── current-task.md    # Active task (updated at milestones)
├── progress.md        # Completed work log
├── blockers.md       # Items waiting owner decision
└── incidents/        # Production incident reports
```

## Aturan Update Dokumentasi

| Setelah | Update |
|---------|--------|
| Feature besar selesai | Product, architecture, development |
| Architecture berubah | Architecture + shared/architecture.md |
| Bug penting ditemukan/diperbaiki | QA + security/known-risks.md |
| Keputusan teknis baru | Shared/decisions.md + divisi terkait |
| Dependency berubah | Research/ + development/dependency-policy.md |
| Deployment incident | DevOps/ + Production Admin (incident report) |
| Production issue | Production Admin (incident report) |
| Security incident | Security/known-risks.md + Production Admin |
| Pattern baru ditemukan | Development/project-patterns.md |
| Pattern lama tidak digunakan | Hapus/update dokumentasi terkait |
| Checkpoint penting | .ai/current-task.md + .ai/progress.md |

## Owner Boundaries (Kapan Harus Tanya)

Owner memutuskan hanya untuk:

| Kategori | Contoh |
|----------|--------|
| **Financial** | Harga, subscription, refund, transfer |
| **External Access** | Akses repo ke orang lain, bagi credential |
| **Irreversible Destruction** | Hapus data penting, destroy infrastructure |
| **Legal / Business** | Kontrak, komitmen hukum, pernyataan resmi |

**Semua hal teknis lainnya: AI Engineering Team memutuskan dan bertindak secara autonomous.**

## Hierarchy Informasi

1. Codebase (source of truth)
2. Configuration files
3. Database schema
4. Tests
5. Project documentation (README, etc.)
6. AI team knowledge base (docs/ai-team/)
7. Historical notes

## Integrasi Claude Code

Knowledge base digunakan oleh:
- Setiap agent/role sesuai kebutuhan divisi
- CLAUDE.md sebagai aturan global ringkas
- `docs/ai-team/` sebagai SOP detail per divisi

## Batasan

- Tidak ada GitHub Actions CI/CD
- API server berjalan di VPS (bukan Vercel Functions)
- Database migrations menggunakan `drizzle-kit push` (development only)
- Operational state (`.ai/`) adalah gitignored — checkpoint dan incident tidak masuk repo
- Business & Operations divisions (management, finops, customer-success, dll) aktif setelah launching
- Owner dashboard web untuk laporan detail belum terimplementasi (butuh scaffolding)

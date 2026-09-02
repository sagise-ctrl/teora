# Reporting Format

## Communication Channels & Cadence

| Channel | Purpose | Cadence | Audience |
|---------|---------|---------|----------|
| **Telegram (real-time)** | Critical alerts, SEV1 notifications | Immediate when triggered | Owner |
| **Telegram (daily digest)** | Evening report summary | Daily (evening) | Owner |
| **Dashboard (web owner)** | Detailed metrics, history, decisions | Always available | Owner |
| **Daily Evening Report** | Aggregated daily status from all divisions | Daily | Owner via Management |
| **Weekly/Monthly Report** | Trends, aggregates, strategic insights | Weekly/Monthly | Owner via Management |

---

## Telegram Alert Format (Real-Time)

### SEV1 — Critical Alert
```
🚨 SEV1 — [Brief Title]
Sistem: [affected system]
Impact: [what users experience]
Action: [what's being done]
ETA: [estimated resolution time]
```

### SEV2 — High Alert
```
⚠️ SEV2 — [Brief Title]
Issue: [what's happening]
Impact: [scope of impact]
Action: [being handled]
```

### Daily Digest
```
💰 Margin hari ini: [X]% ([change] dari kemarin)
⚙️ Sistem: [Normal / Ada isu — lihat dashboard]
📈 User baru: [N]
💡 [1 actionable insight]
```

### Cost Anomaly Alert
```
💸 Cost anomaly terdeteksi — [feature/user]
Kemarin: $[X] | Hari ini: $[Y] ([change]%)
Action: Circuit breaker aktif [Y/N]
```

---

## Daily Evening Report Format

From Management to Owner. Sent via Management division.

```
══════════════════════════════════════
📊 LAPORAN MALAM — TEORA [Tanggal]
══════════════════════════════════════

💰 KEUANGAN
• Revenue hari ini: $[X]
• AI Cost hari ini: $[X]
• Estimasi Margin: [X]%
• Trend: 📈 Naik / 📉 Turun / ➡️ Stabil vs kemarin

⚙️ SISTEM
• Status: ✅ Normal / ⚠️ Ada isu
• Uptime: [X]%
• Error rate: [X]%

📈 AKTIVITAS
• User baru hari ini: [N]
• Total active users: [N]
• Order masuk: [N]
• Support tickets: [N] (T1 resolved: [X]%)

🔍 ANALISA
[1-2 sentences: why did numbers go up/down?
E.g.: "Revenue naik karena promo weekend —
  tapi margin turun 2% karena AI cost naik
  dari fitur writing assistant yang digunakan
  40% lebih banyak."]

💡 SARAN
[1-2 concrete recommendations.
E.g.: "Consider reviewing AI usage of writing
  assistant — cost per session naik 15% dari
  baseline. Perlu dioptimasi atau pricing
  perlu adjusment."]

🔴 PERLU KEPUTUSAN OWNER
[Lista decisions that need Owner input, atau "—"]
• [Decision 1]
• [Decision 2]

══════════════════════════════════════
```

---

## Weekly Report Format

Aggregated from daily reports + trends + strategic observations.

```
══════════════════════════════════════
📊 LAPORAN MINGGUAN — TEORA
Week: [Tanggal] – [Tanggal]
══════════════════════════════════════

💰 FINANCIAL HIGHLIGHTS
• Total revenue minggu ini: $[X] ([change]% vs minggu lalu)
• Total AI cost: $[X] ([change]% vs minggu lalu)
• Avg margin: [X]%
• Top performing feature: [X]
• Underperforming feature: [X]

📈 GROWTH
• New users: [N] (vs [N] minggu lalu)
• Active users: [N] (MAU)
• Retention rate: [X]%
• Churn signals detected: [N]

⚙️ SYSTEM HEALTH
• Avg uptime: [X]%
• Total incidents: [N] (SEV1: [N], SEV2: [N], SEV3: [N])
• Avg incident resolution: [X] hours

📊 CUSTOMER
• Total tickets: [N]
• T1 resolution rate: [X]%
• Top complaint category: [X]
• Escalations: [N]

🔍 WEEKLY INSIGHT
[2-3 sentences on biggest changes/patterns.
Why did metrics move? What does it mean for the business?]

💡 RECOMMENDATIONS
[Priority actions for next week]

🔴 OWNER DECISIONS NEEDED
[Decisions requiring Owner input]

══════════════════════════════════════
```

---

## Monthly Report Format

Strategic overview for Owner review.

```
══════════════════════════════════════
📊 LAPORAN BULANAN — TEORA
Month: [Nama Bulan YYYY]
══════════════════════════════════════

💰 FINANCIAL SUMMARY
• Revenue bulan ini: $[X] ([change]% vs bulan lalu)
• AI Cost: $[X] ([change]% vs bulan lalu)
• Gross Margin: [X]%
• Revenue per user: $[X]
• AI Cost per user: $[X]

📈 NORTH STAR METRIC
• [North Star Metric name]: [value] ([change]%)
• [Secondary metric]: [value]
• [Tertiary metric]: [value]

👥 GROWTH & RETENTION
• Total registered users: [N]
• Monthly active users: [N]
• New vs returning: [N] / [N]
• Churn rate: [X]%

⚙️ OPERATIONAL
• System uptime: [X]%
• Total incidents: [N]
• Avg resolution time: [X] hours
• Security events: [N]

🏆 HIGHLIGHTS
[Biggest wins this month]

⚠️ CONCERNS
[Biggest concerns or risks developing]

📅 NEXT MONTH PRIORITIES
[What the team will focus on]

🔴 STRATEGIC DECISIONS
[Any decisions requiring Owner input]

══════════════════════════════════════
```

---

## Dashboard Owner (Web-Based)

Detailed view always available:
- Revenue vs Cost chart (real-time or daily)
- AI cost breakdown per feature
- User activity metrics
- Incident history
- Decision log (approvals Owner gave)
- Division reports archive

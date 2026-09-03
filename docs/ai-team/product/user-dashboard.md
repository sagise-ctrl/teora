# User Dashboard — Struktur Menu & Fitur

> **Status:** APPROVED by owner 2026-08-29
> Owner confirmation: "ketika saya minta 'setup dashboard user' maka harusnya anda sudah paham"

---

## Prinsip Dasar

- **Pelajar** (mahasiswa S1-S3, peneliti) = user utama
- **Pengajar** (dosen, akademisi) = user sekunder (focus ke Assessment)
- **Keduanya** = kolaborasi & referensi
- AI embedded di setiap halaman yang relevan, bukan menu terpisah
- Admin Dashboard = menu terpisah, hanya untuk owner

**Fitur utama pelajar:** Task Mentor + Practice + Pustaka Saya (3 menu utama)

---

## Struktur Menu Utama

### 1. Dashboard
- Quick Start / Task Baru
- Recent Tasks
- AI Assistant shortcut

### 2. Pustaka Saya (Global Library) — MENU UTAMA
- Semua referensi saya (account-level)
- Cari Referensi (AI Search - CrossRef/Semantic Scholar)
- Sinkron Zotero (label: "Segera Hadir")
- ~~Bibliography Generator~~ — **DIPINDAHKAN** ke Academic Work
- AI embedded:
  - AI Search
  - Reference AI Chat

### 3. Task Mentor — MENU UTAMA
- **General Task** (tugas singkat, bukan dokumen panjang)
  - Sub menu: daftar task dengan progress + search + filter
  - Halaman Buat Task Baru (form creation)
  - Halaman Workspace (toolbar Dokumen / AI Assistant / Referensi)
- **Academic Work** (makalah, proposal, skripsi, paper, dll)
  - Sub menu: daftar task dengan progress + search + filter
  - **Bibliography Generator** (APA, IEEE, MLA, Chicago → generate dari referensi di Pustaka Saya)
- **Template Dokumen** (dari 0 atau save dari task)
- **Share Task** (share link: view/comment/edit)
- AI embedded per-task:
  - AI Analysis → AI Writer
  - Task AI Chat
  - Section AI Chat (Academic Work only)
  - Section References (Academic Work only)
- **PPT/Slide** (lihat Section "Slide / PPT — Fitur Tambahan Task Mentor")

### 4. Practice — MENU UTAMA (BARU)
- Learning Activity sebagai prerequisite (lihat Section "Learning Activity System + Practice")
- Recommendation-first: "Quiz dari tugas terbaru?", "Latihan topik X?"
- User baru: ajakan ke Task Mentor + fallback manual di pojok
- Sumber soal dari konten asli (instruksi, dokumen, referensi)
- Riwayat: pattern insight ("3 topik yang paling sering salah")

### 5. Pustaka Saya (Global Library) — MENU UTAMA
- Semua referensi saya (account-level)
- Cari Referensi (AI Search - CrossRef/Semantic Scholar)
- Sinkron Zotero (label: "Segera Hadir")
- ~~Bibliography Generator~~ — **DIPINDAHKAN** ke Academic Work
- AI embedded:
  - AI Search
  - Reference AI Chat

### 6. Assessment (Pengajar)
- Untuk pengajar (dosen, akademisi)
- Pelajar pakai Practice untuk self-test
- See: Section "Assessment — Fitur untuk Pengajar"

### 7. Akun (Profil, Referral, Saldo, AI Usage, AI Pricing, Berlangganan)

---

## Task Mentor — General Task (Detail)

### Halaman Daftar Task

**Progress Stage:**
| Stage | Label | Kapan |
|-------|-------|-------|
| 1 | Idea | Task baru, belum ada outline |
| 2 | Writing | Outline locked, generating / editing |
| 3 | Revision | Ada feedback, perlu perbaiki |
| 4 | Done | Final, siap export |

**Per Card:**
- Status badge (warna: Idea=gray, Writing=blue, Revision=orange, Done=green)
- Judul task
- Tipe (General) + last updated (relatif)
- 2 action: "▶ Lanjutkan" (buka workspace) + "👁 Preview" (kalau ada dokumen)

**Fitur halaman:**
- Search: cari judul task atau nama bab
- Filter: Semua / Idea / Writing / Revision / Done

---

### Halaman Buat Task Baru (General Task)

```
┌──────────────────────────────────────────────────────────────┐
│  📝 General Task — Baru                                  [×]│
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Judul Tugas                                                │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ [Text input]                                            │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  Instruksi Tugas                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ [Text area — instruksi lengkap tugas]                  │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  [+ Tambah Dokumen] — upload instruksi (PDF/DOCX)           │
│                                                              │
│  ──────────────────────────────────────────────────────────  │
│                                                              │
│  [Toggle] Gunakan Referensi                                 │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ [Pilih dari Pustaka Saya — searchable list]           │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ──────────────────────────────────────────────────────────  │
│                                                              │
│  ⚠️ Memulai akan menggunakan token sesuai AI tier yang      │
│     dipilih di workspace                                      │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              🚀 Mulai Kerjakan                         │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Fields:**
| Field | Tipe | Required | Notes |
|-------|------|----------|-------|
| Judul Tugas | text input | Ya | Singkat |
| Instruksi Tugas | textarea | Ya | Deskripsi lengkap tugas |
| Upload Dokumen | button + file picker | Tidak | PDF/DOCX |
| Gunakan Referensi | toggle | Tidak | ON → tampil list Pustaka Saya |
| Pilih Referensi | searchable list | Tidak | Multi-select dari Pustaka Saya |
| Mulai Kerjakan | button | — | Trigger AI process |

**Catatan:**
- AI tier selector TIDAK ada di form — muncul di workspace
- Warning token usage di atas button

---

### Halaman Workspace (General Task) — DETAIL

**Konteks:** General Task = tugas singkat (esai, laporan, tugas harian). Bukan dokumen multi-bab. Target durasi: menit hingga jam. Prinsip: **tool dengan embedded teaching** — user bisa tanya "kenapa?" di level manapun.

#### Alur Kerja

```
[IDEA]
User submit instruksi
        ↓
Teora analisis → generate draft
        ↓
[WRITING]
User dapat draft
User bisa:
  ├─ Edit langsung di dokumen
  ├─ Chat: minta revisi bagian tertentu
  ├─ Chat: tanya "kenapa begini?" (mode teaching)
  └─ Referensi: tambah referensi
        ↓
[REVISION]
User minta perbaikan spesifik
        ↓
[DONE]
User export
```

**Yang beda dari Academic Work:**
- Tidak ada Plan stage — langsung generate
- Tidak ada kerangka awal
- Dokumen = single section
- AI chat = project-level scope (tanpa section scoping)
- Tidak ada bibliography generator

#### Layout Workspace

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Kembali   "Judul Tugas"   [Writing ●]  [Gratis ▼] [Share] [Export]  │
├─────────────────────────────────────────────────────────────────┤
│  [Dokumen]   [AI Assistant]   [Referensi]            ← Toolbar Tab  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [Dokumen Tab — aktif default]                                  │
│                                                                 │
│  BAB I — PENDAHULUAN                                          │
│                                                                 │
│  Perubahan iklim telah menjadi isu global yang...                 │
│  [editable text — user bisa edit langsung]                      │
│                                                                 │
│  Sub-topik A                                                   │
│  Berdasarkan data dari IPCC (2023), suhu global...           │
│  [sunting] [revisi] [tanya] ← hover actions                  │
│                                                                 │
│  [📎 + Tambah Dokumen] ← upload instruksi tugas                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### 3 Tab Panel

**1. Dokumen Tab — Tempat utama**

User melihat dan mengedit draft dari Teora. **Inline hover actions per paragraph:**

| Action | Perilaku |
|--------|---------|
| `[sunting]` | Edit langsung teks itu |
| `[revisi]` | "revisi bagian ini" via chat |
| `[tanya]` | "kenapa begini?" — mode teaching, Teora jelaskan reasoning |

**Teaching layer di dokumen:**
- Tooltip pedagogis saat hover lama di section: "💡 Ini menggunakan struktur argumentasi deduktif — dari umum ke spesifik."
- Reference relevance note saat tambah referensi: "Referensi ini dari jurnal Nature (IF 64.8). Saya sarankan untuk bagian pendahuluan karena overview-nya bagus."

**2. AI Assistant Tab — Chat Interface**

6 mode yang sudah ada:

| Mode | Apa yang dilakukan |
|------|------------------|
| **Generate** | Teora generate konten baru |
| **Revise** | Teora revisi bagian yang dipilih user |
| **Reflect** | Teora analisis + kasih feedback kritis |
| **Socratic** | Teora tanya balik untuk bikin user thinking |
| **Quiz** | Teora bikin kuis untuk test pemahaman |
| **Summary** | Teora rangkum bagian/dokumen |

**Yang perlu ditambah (per prinsip teaching):**

| Mode | Apa |
|------|-----|
| **Explain** | User select teks → "Explain this part in simple words" — Teora jelaskan alasan kenapa kalimat itu ada, bukan cuma artinya |
| **Contextual** | Teora otomatis tahu task type, kasih saran yang sesuai konteks |

Contoh Explain interaction:
```
User: [select text] → "apa maksudnya?"
Teora: "Bagian ini mengatakan X. Saya menggunakan kalimat ini karena [alasan].
        Dalam konteks tugas Anda tentang Y, kalimat ini berfungsi untuk [manfaat].
        Apakah Anda ingin saya jelaskan lebih lanjut?"
```

**3. Referensi Tab — Panel dengan 5 Tools**

| Tool | Fungsi | Teaching Element |
|------|--------|-----------------|
| **Cari Otomatis (AI)** | AI analisis teks → sarankan referensi relevan | AI explain kenapa referensi ini relevan |
| **Cari via DOI** | User paste DOI → auto-fill metadata | — |
| **Cari Manual** | User cari topik di CrossRef | — |
| **Input Manual** | User ketik manual | — |
| **Upload & Ekstrak** | Upload PDF → AI extract metadata | — |

**Teaching layer:** Saat user tambah referensi, Teora kasih catatan: "Saya sarankan ini untuk bagian X karena [alasan spesifik]."

#### Toolbar Kanan Atas

```
[Writing ●] [Gratis ▼] [Share] [Export]
```

| Elemen | Fungsi |
|--------|--------|
| Progress Badge | Idea / Writing / Revision / Done (warna-coded) |
| AI Tier Selector | Dropdown — Gratis / Standar / Premium / Ultra |
| Share | Bagikan task (view/comment/edit) |
| Export | Download PDF / DOCX |

#### Teaching Elements Summary

Meskipun General Task adalah "tool" (bukan "mentor journey"), elemen teaching tetap ada:

| Tempat | Teaching Element |
|--------|----------------|
| Dokumen tab | Inline hover: [sunting] [revisi] [tanya] |
| AI Assistant | Mode Explain + Contextual |
| AI Assistant | Setiap response Teora explain reasoning |
| Referensi tab | Auto-note kenapa referensi relevan |
| Dokumen tab | Tooltip pedagogis per section |

**Intinya:** user tidak menerima black box. Mereka selalu bisa tanya "kenapa?" di level manapun.

---

## Task Mentor — Academic Work (Detail Workspace)

> **STATUS:** Spec done. Approved 2026-09-02.

### Konteks

Academic Work = makalah, proposal, skripsi, paper, thesis, dokumen akademis panjang. Target durasi: hari hingga minggu.

**Apa yang bikin beda dari General Task:**
1. User mengerjakan journey multi-bab
2. User harus paham SCOPE dan RATIONALE di setiap keputusan
3. Teora bukan cuma generate — tapi **membimbing** user memahami setiap langkah

**Visi:** User tidak sekadar dapat dokumen. Mereka siap **jelaskan dan defend** hasil kerjaannya.

### Alur Kerja (5 Stage)

```
Instruksi masuk (tema + ide + file)
        ↓
[IDEA] Teora analisis instruksi → understand the task
        ↓
[PLAN] Teora kasih KERANGKA AWAL + LAPORAN PEMAHAMAN
        ↓
  USER + TEORA REFINING KERANGKA BARENG-BARENG
  (sampai user PUNYA PEMAHAMAN tentang scope dan struktur)
        ↓
Kerangka LOCKED → user approve
        ↓
[WRITING] Teora generate dokumen PER BAB
  User bisa tanya per bab: "kenapa begini?"
        ↓
[REVISION] Per-bab revision + pemahaman mendalam
        ↓
[DONE] Final + Bibliography (dari Pustaka Saya)
```

### Perbedaan Fundamental dari General Task

| Aspek | General Task | Academic Work |
|-------|------------|--------------|
| Dokumen | Single section | **Multi-section** (bab 1, bab 2, ...) |
| Plan stage | Tidak ada | **Ya** — wajib sebelum Writing |
| AI Report Panel | Tidak ada | **Ya** — "Pemahaman" di Plan |
| Outline | Tidak ada | **Ya** — Learning scaffold dengan tooltip |
| Teaching mode | Inline tanya | **AI Report + Teaching per-bab** |
| AI chat scope | Project-level | **Section-level** (per bab) |
| Bibliography | Tidak ada | **Ya** — APA/IEEE/MLA/Chicago |
| Durasi | Menit-jam | **Hari-minggu** |

---

### Plan Stage — AI REPORT PANEL (Inti Academic Work)

Saat user masuk Plan stage, Teora kasih **3 hal** yang bikin user punya peta mental:

#### 1. Pemahaman Task (AI Report Panel)

```
┌──────────────────────────────────────────────────────────┐
│  📖 Pemahaman Anda tentang Tugas Ini                     │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  TOPIK: Dampak Perubahan Iklim terhadap Ketahanan       │
│  Pangan Indonesia                                        │
│                                                          │
│  YANG ANDA AKAN PELAJARI:                               │
│  ├─ Apa beda "ketahanan pangan" vs "ketersediaan"     │
│  │   pangan — ini sering tertukar di makalah mahasiswa │
│  ├─ Kenapa Indonesia rentan: geografis + demografis    │
│  └─ Kenapa data BPS vs FAO sering tidak cocok...       │
│                                                          │
│  TANTANGAN KHUSUS ANDA:                                 │
│  ├─ Ruang lingkup AMAT LUAS — sarankan batasi         │
│  │   ke "dampak El Niño terhadap produksi padi Jawa"   │
│  └─ Paper terbaru (2024-2025) masih sedikit...         │
│                                                          │
│  KATA-KUNCI YANG AKAN ANDA PELAJARI:                    │
│  Food Security, Climate Resilience, El Niño,            │
│  Production Yield, IPCC, CSA                             │
│                                                          │
│  SARAN SAYA:                                            │
│  Kalau ini tugas akhir, fokus ke 1 provinsi saja —     │
│  scope lebih kecil = data lebih dalam = argumen        │
│  lebih kuat.                                             │
│                                                          │
│  [✔] Saya Paham  [Minta Penjelasan Lebih]              │
└──────────────────────────────────────────────────────────┘
```

**User tidak hanya dapat outline — mereka punya PETA MENTAL tentang topik mereka.**

#### 2. Kerangka Awal (Learning Scaffold)

Setiap item di outline punya **learning layer**:

```
BAB 1 — PENDAHULUAN
├─ Latar Belakang
│   "Kenapa kondisi INI penting?"
│   💡 [?] "Latar Belakang = KONDISI SEKARANG.
│           Bukan sejarah, bukan solusi. Gambarkan
│           perspektif global dulu, lalu Indonesia."
│
├─ Rumusan Masalah
│   "Apa persoalannya?"
│   💡 [?] "Rumusan Masalah ≠ Latar Belakang.
│           Rumusan = PERSOALAN SPESIFIK yang
│           akan Anda jawab di paper ini."
│
├─ Tujuan
│   💡 [?] "Tujuan = APA YANG INGIN DICAPAI.
│           Max 3 poin. Mulai dari yang umum ke spesifik."
│
└─ Batasan
    💡 [?] "Batasan = APA YANG TIDAK DIBHAS.
            Ini PENTING supaya paper tidak terlalu luas.
            Jelasin juga apa yang BUKAN bagian paper."
```

User klik **[?]** → Teora jelaskan. Mereka belajar **sambil membuat**.

#### 3. Refining Interface — Chat untuk Diskusi

User + Teora refine kerangka BARENG via chat:

```
Teora: Berikut kerangka awal saya untuk makalah Anda...

User: "bab 2 terlalu panjang, bagi 2"
Teora: "Setuju. Bab 2 'Tinjauan Pustaka' memang berat.
        Saya bagi jadi:
        - Bab 2: Landasan Teori (konsep ketahanan pangan)
        - Bab 3: Penelitian Terdahulu (studi sebelumnya)
        Apakah sesuai?"

User: "ya, tapi tambahin metodologinya di bab 3"
Teora: "Kalau metodologi masuk di Bab 3, kita perlu tahu
        dulu jenis paper Anda:
        - Kalau paper kuantitatif → metodologi di bab sendiri
        - Kalau paper kualitatif → metodologi bisa di bab
        Penelitian Terdahulu
        Apa jenis paper ini?"

User: "kuantitatif"
Teora: "Baik. Mari saya atur ulang:
        - Bab 2: Landasan Teori
        - Bab 3: Penelitian Terdahulu
        - Bab 4: Metodologi Penelitian
        [SIMPAN PERUBAHAN]"

User: [klik "Approve Kerangka"]
→ Kerangka LOCKED → masuk Writing stage
```

### Layout Workspace Academic Work

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ← Kembali   "Judul Paper"   [Plan ●]   [Gratis ▼]  [Kerangka] [Share] [Export] │
├─────────────────────────────────────────────────────────────────────────────┤
│  [Kerangka]  [Dokumen]  [AI Assistant]  [Referensi]                      │
├─────────────────────────────────────────────────────────────────────────────┤
│  BAB NAVIGATOR (kiri)   │   CONTENT AREA (kanan)                         │
│  ├─ 📋 Bab 1: Pendahuluan   │   (sesuai tab aktif)                       │
│  ├─ 📋 Bab 2: Tinjauan Pustaka  │                                          │
│  ├─ 📋 Bab 3: Metodologi    │   Kerangka tab: outline editor             │
│  └─ 📋 Bab 4: Pembahasan    │   Dokumen tab: rich text per bab           │
│                             │   AI Assistant: chat scoped ke bab aktif    │
│  [+ Tambah Bab]            │   Referensi: tag ke bab aktif                │
│                             │                                              │
└─────────────────────────────┴──────────────────────────────────────────────┘
```

**Catatan:** BAB NAVIGATOR selalu visible di kiri — user selalu tahu mereka di bab mana.

### Toolbar Tab Academic Work

| Tab | Fungsi | Scope |
|-----|--------|-------|
| **Kerangka** | Outline editor + refining chat | Project-level (seluruh dokumen) |
| **Dokumen** | Rich text per bab (bab aktif di navigator) | Section-level |
| **AI Assistant** | Teaching chat scoped ke bab aktif | Section-level |
| **Referensi** | Tag referensi ke bab aktif | Section-level |

### 5 Stage — Detail Setiap Tahap

#### [IDEA] — User submit instruksi
- User upload file instruksi (PDF/DOCX)
- User ketik Tema + Ide/Gagasan
- User tambah referensi (opsional)
- Klik "Mulai dengan AI"

#### [PLAN] — Plan Stage (yang paling beda)

**3 hal yang Teora kasih:**

1. **AI Report Panel** — "Pemahaman Anda tentang Tugas Ini"
   - Topik yang akan dipelajari
   - Tantangan khusus user
   - Kata kunci yang akan dipelajari
   - Saran scoping

2. **Kerangka Awal** — outline dengan learning layer
   - Setiap poin punya tooltip pedagogis [?]
   - User bisa edit langsung di outline
   - User bisa tanya kenapa ada poin ini

3. **Refining Chat** — diskusi bareng
   - User kasih feedback: "bagi 2", "tambah bab", "ini kurang"
   - Teora revise + tanya clarifying questions
   - Iterasi sampai user PUNYA PEMAHAMAN

**Trigger:** Klik "Approve Kerangka" → kerangka LOCKED → Writing stage

#### [WRITING] — Writing Stage

1. **Bab Navigator** — user pilih bab mana yang mau dikerjakan
2. **Dokumen Tab** — Teora generate konten per bab (sesuai kerangka)
3. **AI Assistant Tab** — Teaching mode scoped ke bab aktif
4. **Referensi Tab** — tag referensi ke bab aktif

**Teaching interaction per bab:**
```
User (di Bab 2): "kenapa begini?"
Teora: "Di bab ini saya menulis X karena [alasan akademis].
        Struktur ini mengikuti pola [academic convention].
        Apakah Anda ingin saya jelaskan lebih detail bagian tertentu?"
```

#### [REVISION] — Revision Stage

- User minta revisi per bab
- Teora revisi + explain reasoning
- Bisa juga minta Teora generate versi alternatif

#### [DONE] — Done Stage

- Dokumen final
- Bibliography auto-generated (dari referensi yang di-tag ke setiap bab)
- User bisa export PDF / DOCX

### Teaching Elements Summary (Academic Work)

| Tempat | Teaching Element |
|--------|----------------|
| Plan stage | AI Report Panel — peta mental topik |
| Plan stage | Kerangka dengan learning scaffold [?] |
| Plan stage | Refining chat — diskusi bareng |
| Writing stage | AI Assistant scoped ke bab aktif |
| Writing stage | "Kenapa begini?" di level paragraph |
| Reference tab | "Kenapa relevan untuk bab ini?" |

**Intinya:** Academic Work workspace = **mentor journey**. User tidak sekadar dapat dokumen. Mereka memahami SCOPE, RATIONALE, dan STRUCTURE di setiap langkah.

---

## AI Features Matrix

| AI Feature | Lokasi | Scope |
|-----------|--------|-------|
| AI Assistant | Dashboard | Shortcut ke AI |
| AI Search | Pustaka Saya | Cari paper dari internet |
| Reference AI Chat | Pustaka Saya | Tanya tentang referensi & sitasi |
| AI Analysis | Task Mentor | Analyze instruksi tugas |
| AI Writer | Task Mentor | Generate/revise konten |
| Task AI Chat | Task Mentor | Scope ke task aktif |
| Section AI Chat | Task Mentor (per bab) | Section aktif + task context (Academic Work) |
| Section References | Task Mentor (per bab) | Tag referensi ke bab (Academic Work) |
| Quiz AI Assistant | Assessment | Context-aware chat saat bikin kuis |
| Assessment AI Chat | Assessment | Chat scoped ke kuis aktif |
| Auto-Grading | Assessment | Grade MCQ + short answer |
| Bibliography Generator | Academic Work | Generate citation format dari Pustaka Saya |
| Kerangka Awal + Refine Bareng | Academic Work | AI kasih kerangka + report pemahaman, user + AI refine bareng |
| Section AI Chat | Academic Work (per bab) | Section aktif + task context |
| Section References | Academic Work (per bab) | Tag referensi ke bab |

---

## Owner Decision (2026-08-29)

| Decision | Value |
|----------|-------|
| Global Reference Library | Menu utama bernama "Pustaka Saya" |
| Referensi | Sub menu di dalam Task Mentor |
| Tim/Collaboration | Hapus menu khusus — share embed di Task Mentor + Assessment |
| Notifikasi | Icon lonceng, bukan menu sidebar |
| Account AI Chat | Hapus — cukup AI Assistant shortcut di Dashboard |
| Assessment | Menu utama untuk pengajar |
| Task Mentor split | General Task vs Academic Work |
| Progress stage | Idea → Writing → Revision → Done |
| Menu name | "Task Mentor" |
| Academic Work subtype | "Academic Work" |
| AI tier selector | Di workspace, bukan di creation form |
| Bibliography Generator | Academic Work only |
| Sinkron Zotero | Label "Segera Hadir" |
| Academic Work flow | AI kasih kerangka awal + report pemahaman, user + AI refine bareng, baru generate |

---

## Dashboard — Revisi 2026-08-29

### displayName
- **Auto-fill dari Google OAuth** — saat login, Supabase kasih `user_metadata.full_name` dari profil Google. Simpan ke `displayName` user saat first login.
- Link: `/profile` (tetap bisa diedit manual)

### Token Balance Card
- **Hapus** dari Dashboard
- Cukup tampil di **sidebar bawah** (sudah ada: nominal Rp + link ke `/topup`)

### AI Writing Tools → AI Assistant Shortcut
- Hapus 4 cards (Thesis Outline, Task Helper, dll.)
- Ganti 1 shortcut card besar:
  ```
  🤖 AI Assistant
  Tanya apa saja tentang tugas, referensi, atau penulisan akademik
  [ Mulai Chat ]
  ```
- Link: `/projects/new`
- User pilih AI tier (Gratis / Standar / Premium / Ultra) **di dalam task workspace**, bukan di Dashboard
- Reason: spec Dashboard poin "AI Assistant shortcut" bukan daftar tools, dan tier selection berada di scope task workspace

---

## Assessment — Fitur untuk Pengajar

> **STATUS:** Spec in progress. Pending owner decision.

### Target User

- **Pengajar** (dosen, akademisi) — user utama Assessment
- **Pelajar** bisa pakai Assessment untuk self-test (tab Kuis di Task Mentor)

### Fitur untuk Pelajar (yang sudah ada)

| Fitur | Lokasi | Status |
|-------|--------|--------|
| Dashboard AI Assistant shortcut | Dashboard | ✅ Ada |
| Task Mentor | Menu utama | ✅ Ada |
| Assessment (self-test) | Tab di Task Mentor | ✅ Ada (tab Kuis) |
| Pustaka Saya | Menu utama | ✅ Ada |

**Kesimpulan:** Fitur pelajar di luar Task Mentor sudah cukup. Tidak perlu fitur baru khusus pelajar.

### Fitur untuk Pengajar — Rekomendasi

#### Prioritas 1: Assessment Builder (Wajib — extend existing)

Extend dari tab Kuis yang sudah ada di Task Mentor.

**Yang sudah ada:**
- Generate kuis (MCQ + isian singkat + essay)
- Submit jawaban
- Auto-grade MCQ + isian singkat

**Yang perlu ditambah:**
| Fitur | Deskripsi |
|-------|-----------|
| Rubric Generator | AI generate draft rubric (criteria + bobot) |
| Rubric Editor | Pengajar edit rubric manual |
| Submission Viewer | Guru lihat semua submissions dalam satu view |
| Share/Assign | Bagikan kuis via link |
| Analytics | Distribusi nilai, soal yang sering salah |

**Decision needed:** Quiz standalone (menu Assessment terpisah) atau tetap di tab Task Mentor?

#### Prioritas 2: Curriculum Helper (S Valuable — fitur baru)

AI bantu pengajar susun Silabus / RPS.

```
User: "susunin Silabus untuk mata kuliah Pengantar Ilmu Politik"
Teora:
"Berikut draft Silabus:

Minggu 1-2: Konsep Dasar Politik
Minggu 3-4: Teori Politik Klasik
Minggu 5-6: Sistem Politik Komparatif
...

Apakah Anda ingin saya sesuaikan dengan 
kurikulum tertentu atau topik tertentu?"
```

#### Prioritas 3: Feedback Helper (Nice-to-have — fitur baru)

AI bantu pengajar kasih feedback ke submission student.

```
User: "beri feedback untuk esai mahasiswa ini"
Teora:
"✅ Yang bagus:
- Argumen di paragraf 2 cukup kuat
- Penggunaan data BPS relevan

⚠️ Yang perlu diperbaiki:
- Paragraf 3 kurang kausalitas
- Kesimpulan terlalu singkat
- Sitasi masih kurang

Apakah Anda ingin saya langsung masukkan feedback ini?"
```

#### Prioritas 4: Student Monitoring (Tunda)

Tracking progress mahasiswa per kelas. Butuh enrollment system — scope creep besar.

### Ringkasan Prioritas Pengajar

| Prioritas | Fitur | Tipe |
|-----------|-------|------|
| 1 | Assessment Builder | Extend existing (tab Kuis) |
| 2 | Curriculum Helper | Fitur baru |
| 3 | Feedback Helper | Fitur baru |
| 4 | Student Monitoring | Tunda (butuh enrollment) |

### Open Questions

| Pertanyaan | Options |
|-----------|---------|
| Quiz standalone atau linked ke project? | A: Tetap di tab Task Mentor (self-assessment) / B: Menu Assessment terpisah untuk pengajar |
| Student enrollment system? | Y: bikin enrollment / N: tunda |

---

## Dashboard Toggle — Pelajar vs Pengajar

> **STATUS:** Pending owner decision.

### Konsep

User masuk ke dashboard utama yang punya **toggle switch** untuk beralih antara role Pelajar dan Pengajar. Setiap dashboard punya menu spesifik yang relevan tergantung role.

```
┌──────────────────────────────────────────────────────┐
│  [🎓 Pelajar] | [👨‍🏫 Pengajar]   ← toggle di header │
└──────────────────────────────────────────────────────┘
```

### Args FOR

| Point | Penjelasan |
|-------|-----------|
| **Clean mental model** | User langsung paham: "ini ruang kerja saya sebagai pelajar" vs "ini ruang kerja saya sebagai pengajar" |
| **Relevan menus** | Pelajar tidak bingung lihat menu "Rubric Generator" yang tidak relevan; pengajar tidak bingung dengan "Daftar Task" kalau mau buat kuis |
| **Focus** | Setiap dashboard fokus ke use case yang sesuai |

### Args AGAINST

| Concern | Penjelasan |
|---------|-----------|
| **User keduanya** | Mahasiswa S2 + asisten dosent, atau dosent yang juga mahasiswa S3 → perlu switch bolak-balik. Sering switch = UX overhead. |
| **Data overlap** | Pustaka Saya, Akun, Profil sama untuk kedua role. Toggle tidak mengubah ini. |

### 3 Opsi Toggle

```
OPSI A: Full switch
  Sidebar berubah TOTAL per role
  → REJECTED: user harus re-orientasi setiap switch

OPSI B: Partial switch (REKOMENDASI)
  Sidebar sama struktur, hanya content/sub-menu yang berubah
  → dashboard content beda per role
  → assessment sub-menu beda per role
  → sidebar structure tetap

OPSI C: Sidebar sama, toggle hanya di Dashboard
  Toggle hanya ubah dashboard content
  → sidebar tidak berubah sama sekali
  → terlalu minimal benefit
```

### Opsi B — Detail

```
┌──────────────────────────────────────────────────────┐
│  [🎓 Pelajar] | [👨‍🏫 Pengajar]                      │
│   ● active     ○ inactive                            │
├──────────────────────────────────────────────────────┤
│ Sidebar: SELALU SAMA STRUKTUR                       │
│ ──────────────────────────────────────────────────  │
│ 🏠 Dashboard    → Content beda per role             │
│ 📚 Task Mentor  → Tampil untuk PELAJAR             │
│ 📚 Pustaka Saya → Tampil untuk SEMUA                 │
│ 📝 Assessment   → Sub-menu beda per role            │
│ 👤 Akun         → Tampil untuk SEMUA                 │
└──────────────────────────────────────────────────────┘
```

**Yang berubah per role:**
- Dashboard content (quick actions, recent items)
- Assessment sub-menu (lihat di bawah)

**Yang TIDAK berubah:**
- Sidebar struktur (tidak re-orientasi)
- Pustaka Saya
- Akun

### Assessment Sub-Menu per Role

```
Assessment (dropdown)
│
├─ Role: PELAJAR
│   ├─ Kuis Saya       (self-test, bikin kuis untuk diri sendiri)
│   └─ Ambil Kuis      (via link sharing dari pengajar)
│
└─ Role: PENGAJAR
    ├─ Buat Kuis         (Assessment Builder)
    ├─ Kelola Kuis      (edit, duplicate, archive)
    ├─ Submissions       (lihat jawaban student)
    ├─ Curriculum Helper (AI bantu susun Silabus/RPS)
    └─ Feedback Helper   (AI bantu kasih feedback draft)
```

### Dashboard Content per Role

```
DASHBOARD — PELAJAR:
├─ Salam + displayName
├─ Task Terbaru (card list)
├─ Aksi cepat: [+ General Task] [+ Academic Work]
└─ AI Assistant shortcut

DASHBOARD — PENGAJAR:
├─ Salam + displayName
├─ Overview stats (3 kuis aktif, 12 submission pending, dll)
├─ Aksi cepat: [+ Buat Kuis] [+ Curriculum Helper] [Lihat Submissions]
└─ Daftar kuis dengan status submission
```

### Mitigasi UX — User yang Keduanya

User yang punya kedua role (mahasiswa + asisten dosent) perlu sering switch. Mitigasi:

| Solusi | Implementasi |
|--------|-------------|
| **Simpan last active role** | localStorage — otomatis buka role terakhir |
| **Quick switch di header** | Toggle visible di semua page, tidak perlu masuk Settings |
| **Role badge visible** | Indicator di sidebar bawah menunjukkan role aktif |
| **Keyboard shortcut** | `Ctrl+Shift+R` untuk toggle cepat |

### Open Questions

| Pertanyaan | Options |
|-----------|---------|
| User bisa keduanya atau biasanya satu role? | Y: mahasiswa S2 + asisten / N: biasanya satu role |
| Toggle di mana? | A: header semua page / B: hanya di dashboard |

---

## Learning Activity System + Practice v1 — Spesifikasi Final

> **Tanggal:** 2026-09-03
> **Status:** APPROVED by owner
> **Scope:** Quiz doang, tanpa Flashcard/tools lain. Flashcard ditunda ke v2 (reuse Learning Activity infrastructure).

### Prinsip Dasar

> **Satu tes untuk semua keputusan:** Apakah fitur ini baca dari yang udah pernah dikerjakan user di Teora, atau cuma nerima input baru kayak chatbot kosong? Kalau jawabannya "cuma nerima input baru", berarti belum cukup beda dari ChatGPT — harus ditarik dari riwayat.

---

### Layout — SATU halaman, bukan hub/sub-menu

Tidak butuh sub-menu karena cuma satu alur. Bandingkan dengan Task Mentor yang genuinely punya 2 alur berbeda (General vs Academic) sehingga butuh sub-menu.

```
┌─────────────────────────────────┐
│  Practice                        │
│                                  │
│  [Rekomendasi — atas halaman]    │ ← yang pertama kelihatan
│  "Quiz dari tugas terbaru?"     │
│  "Latihan topik X?"             │
│                                  │
│  [Quiz — di halaman yang sama]  │ ← setelah pilih → quiz jalan
│                                  │
│  [Riwayat/Insight — scroll]    │ ← tab/scroll, BUKAN menu terpisah
└─────────────────────────────────┘
```

---

### Entry Flow

**User SUDAH punya Learning Activity:**
- Tampilkan 2-3 rekomendasi otomatis (atas halaman)
- "Quiz dari tugas terbaru?", "Latihan topik X?"
- User tinggal pilih → quiz jalan di halaman yang sama

**User BARU, belum ada riwayat:**
- Jangan tampilkan rekomendasi kosong
- **Ajak:** "Kerjakan dulu di Task Mentor, nanti Practice bisa kasih rekomendasi otomatis"
- Opsi manual tetap ada di pojok sebagai fallback — BUKAN yang ditonjolkan

---

### Learning Activity System

#### Apa yang dicatat

Minimal — jangan bikin taksonomi rumit:

| Field | Tipe | Desc |
|-------|------|------|
| `topic` | string[] | Topik/konsep (boleh lebih dari satu per aktivitas) |
| `subject` | string | Mata kuliah/bidang studi (kalau bisa diketahui) |
| `source_link` | ref | Link balik ke item Task Mentor |
| `timestamp` | datetime | - |
| `extracted_from` | enum | instruksi / referensi / chat — untuk internal/debug, tidak ditampilkan ke user |

#### Dari mana data masuk

| Sumber | Prioritas |
|--------|-----------|
| **Task Mentor** | ⭐ Sumber utama |
| Pustaka Saya | NYUSUL BELAKANG — bukan prioritas sekarang |
| Manual (user tag) | Opsi sekunder — bukan jalur utama |

#### Prioritas Sumber Extraksi

Ini penting: **bukan tiga-tiganya ditimbang sama rata.**

| Prioritas | Sumber | Keterangan |
|-----------|--------|-----------|
| 1 | Instruksi / Judul tugas | **Paling reliable** — paling eksplisit, paling akurat |
| 2 | Referensi | Sinyal medium — kurang eksplisit dari instruksi |
| 3 | Chat | **Sumber terakhir** — paling berisik, cuma dipakai kalau #1 dan #2 kosong |

#### Auto-extract vs manual

**AI auto-extract jadi default/utama.** Manual cuma opsional buat koreksi.

- Kalau manual jadi wajib → user lupa tag → data bolong
- Risiko akurasi AI di sini RENDAH (beda dari sitasi) — kalau ekstraksi topik meleset dikit, dampaknya cuma rekomendasi Practice kurang pas. User tinggal skip.

#### Kapan proses ekstraksi jalan (trigger)

| Task Type | Trigger |
|-----------|---------|
| General Task | Begitu user selesai/submit — BUKAN tiap kali mengetik |
| Academic Work | Begitu project dibuat (dari judul/tema awal) + ekstrak ulang HANYA kalau tema/outline berubah signifikan |

#### Storage

**Tabel/log terpisah** (`learning_activity`), BUKAN kolom tambahan di tabel project.

Alasan:
- Satu project bisa hasilkan beberapa topik sekaligus
- Data ini akan dipakai ulang lintas fitur: Practice, Tanya & Pahami, Ringkasan Mingguan
- Kalau nempel ke satu fitur → harus dibongkar ulang begitu fitur lain butuh

#### Checkpoint — Jangan Overengineer

> Sistem ini harus tetap terasa seperti "nyatat log sederhana", bukan sistem klasifikasi/tagging canggih. Kalau mulai mengarah ke embedding, vector search, atau taksonomi topik berlapis — itu tanda sudah melebihi kebutuhan sekarang.

---

### Sumber Soal Quiz

Sama prioritas-nya dengan ekstraksi. AI baca:
1. Instruksi / Judul tugas → generate soal
2. Referensi (kalau ada)
3. Chat (kalau instruksi & referensi kosong)

AI **tidak** mengarang dari nama topik doang.

---

### Fitur Pendukung

| Item | Lokasi | Desc |
|------|--------|------|
| Rekomendasi | Atas halaman | 2-3 suggestions berdasarkan Learning Activity |
| Quiz | Tengah halaman | Generate soal dari konten asli → jawab → feedback |
| Riwayat/Insight | Scroll bawah | Pattern ("3 topik yang paling sering salah"), BUKAN daftar skor |

---

### Feedback Loop (fase berikutnya, bukan v1)

Hasil quiz rendah → topik itu lebih sering muncul di rekomendasi. Sistem makin nyambung ke kebutuhan user, bukan random.

---

### Out of Scope

- Flashcard (v2 — reuse Learning Activity)
- Tanya & Pahami (v2 — reuse Learning Activity)
- Ringkasan Mingguan (v2 — reuse Learning Activity)
- Leaderboard / Gamifikasi
- Collaboration / Share quiz

---

## Slide / PPT — Fitur Tambahan Task Mentor

> **Tanggal:** 2026-09-02
> **Status:** APPROVED by owner

### General Task — PPT sebagai Output Format

**Concept:** User bisa pilih output format di creation form — Dokumen (teks) atau Slide (PPT).

**Di Creation Form:**
- Default: Dokumen
- Toggle/pilihan: "Dokumen" | "Slide Presentasi"
- Jika pilih Slide → AI tahu user mau bikin PPT → workspace menyesuaikan

**Di Workspace General Task (mode PPT):**
- Tampilan dokumen berubah jadi slide (bukan teks biasa)
- Toolbar sama (Dokumen/AI Assistant/Referensi)
- AI generate slide dari instruksi → user edit outline slide → generate slide → preview → export PPTX
- Design template slide (warna/font/layout predefined)

### Academic Work — Tab PPT (Optional)

**Concept:** Tab baru di workspace Academic Work untuk generate PPT dari dokumen ilmiah yang sudah ada.

**Di Workspace Academic Work:**
- Tab baru: **PPT** (opsional)
- User klik "Generate PPT" → AI bikin dokumen PPT
- Output: Slide presentasi dari konten dokumen (bab 1, 2, 3...)
- Minimal: kerangka per slide (outline) → user bisa refine sebelum generate full slide

**Perbedaan dengan General Task PPT:**

| Aspek | General Task PPT | Academic Work PPT |
|-------|-----------------|------------------|
| Trigger | Dipilih di creation form | Klik tab PPT di workspace |
| Scope | Dari instruksi → PPT | Dari dokumen bab → PPT |
| AI generate | Full slide generate | Kerangka slide dulu, baru generate |
| Design | Simple template | Academic template |

### Progress Stage dengan PPT

| Stage | Label | Kapan |
|-------|-------|-------|
| 1 | Idea | Task baru, AI analisis → tentukan format |
| 2 | Outline | Outline slide (General) / Kerangka bab + PPT (Academic) |
| 3 | Writing | Generate slide / edit slide |
| 4 | Revision | Feedback + refine |
| 5 | Done | Export PPTX |

### Export

- Format: PPTX (Power Point)
- Bisa dari General Task workspace atau Academic Work workspace
- Academic Work: bibliography slide auto-generated dari referensi

---

## Referensi Tool + Auto-Cite + Pustaka Saya — Spesifikasi Final (2026-09-03)

> **Status:** ✅ APPROVED by owner (DECISION 014)
> **Trigger:** Owner clarified "Bibliography itu kan tools di fitur refrensi ya, kita menawarkan fitur refrensi yg otomatis" — referensi = tool komprehensif, bukan sekadar generate daftar pustaka
> **Effort:** 12-15 hari kerja (Phase 1 + 2 + 3)

### Prinsip Dasar

1. **3 alur masuk referensi**: Cari otomatis (AI/CrossRef) · Upload (PDF/DOC extract) · Input manual (DOI auto-fill)
2. **Semua referensi otomatis masuk Pustaka Saya** (account-level library global, lintas project)
3. **Ceklist di workspace**: User pilih reference → AI auto-cite ke paragraf relevan
4. **Multi-cite per referensi** — 1 paper bisa muncul di beberapa paragraf (realita paper)
5. **User bisa geser/hapus citation manual** — trust user, AI tidak sempurna
6. **Format sitasi dipilih per project** — beda field butuh format beda
7. **Style rendering otomatis**: APA=in-text, Chicago=footnote, IEEE=numbered, dst
8. **Daftar Pustaka auto-update di akhir dokumen** — linked to ceklist

---

### 1. Pustaka Saya — Bank Referensi Global (Account-Level)

**Konsep:** Semua referensi yang pernah dicari/upload/input manual → kesimpan permanen di Pustaka Saya (per akun). Bisa di-import ke project manapun.

**Backend:** SUDAH FULL IMPLEMENTED (`routes/account-references.ts`, 6 endpoints):
- `GET /account/references` — list
- `POST /account/references` — add (dengan duplicate DOI check)
- `PUT /account/references/:id` — update
- `DELETE /account/references/:id` — delete
- `POST /account/references/:id/assign` — assign to specific project
- `POST /account/references/import` — bulk import dari DOI list (max 50)

**Frontend yang akan dibuat:**

```
┌────────────────────────────────────────────────────────────────┐
│  📚 Pustaka Saya                                                │
│  Koleksi referensi Anda — tersedia untuk semua project         │
├────────────────────────────────────────────────────────────────┤
│  [+ Tambah Manual]  [🔍 Cari di CrossRef]  [📥 Import DOI]    │
│                                                                 │
│  Search: [Cari judul, author, DOI...                  ] [🔍]    │
│  Filter:  [Semua] [Manual] [CrossRef] [Upload] [Semua Tahun ▼] │
├────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ ☑ Smith, J. & Jones, A. (2023).                          │  │
│  │   Climate change impacts on global agriculture.           │  │
│  │   Nature Climate Change, 13(5), 450-465.                 │  │
│  │   DOI: 10.1038/s41558-023-01659-2                        │  │
│  │   Source: 📄 CrossRef · Used in 2 projects               │  │
│  │   [📋 Copy Cite]  [📁 Assign to Project]  [✏ Edit]  [🗑]│  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ ☑ IPCC. (2021).                                          │  │
│  │   Climate change 2021: The physical science basis.        │  │
│  │   Cambridge University Press.                            │  │
│  │   Source: ✍️ Manual · Not yet used                       │  │
│  │   [📋 Copy Cite]  [📁 Assign to Project]  [✏ Edit]  [🗑]│  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
```

**Features:**
- List view dengan metadata lengkap (judul, author, tahun, jurnal, volume, issue, DOI)
- Source badge: Manual / CrossRef / Upload
- "Used in N projects" indicator
- Copy citation button (format sesuai project aktif)
- Assign to project: dropdown pilih project → reference ditambah ke Tab Referensi project itu
- Edit/Delete inline
- Empty state: ajakan untuk cari atau tambah referensi pertama

---

### 2. Referensi di Workspace Project (Tab Referensi)

Tab Referensi di workspace project adalah **subset dari Pustaka Saya yang di-attach ke project ini** + alat untuk mengelola citation.

**Workflow:**

```
[IDEA → WRITING]
User bikin project → Tab Referensi kosong
        ↓
User klik "Tambah Referensi" → 3 pilihan:
  ├─ Cari di CrossRef (AI search by keyword)
  ├─ Upload PDF (AI extract metadata)
  └─ Input Manual / Paste DOI (auto-fill)
        ↓
Referensi masuk ke Pustaka Saya + otomatis ke Tab Referensi project ini
        ↓
[REVIEW REFERENCES]
User lihat list referensi di Tab Referensi
- Tampil metadata lengkap
- Ada CHECKLIST per referensi (default: ON untuk yang baru ditambah)
- User bisa unchecklist kalau tidak mau dipakai
        ↓
[AUTO-CITE]
User klik tombol "Auto-Cite" dengan AI tier selector
- AI baca dokumen + referensi yang di-ceklist
- AI cari paragraf relevan → insert citation marker
- Multi-cite: 1 paper bisa muncul di beberapa paragraf
- Hasil preview: "Saya menemukan 7 lokasi yang relevan untuk 3 referensi Anda"
        ↓
[USER REVIEW]
User lihat preview:
- (Smith, 2023) muncul di paragraf 2 — Looks good
- (IPCC, 2021) muncul di paragraf 4 — Move to after 'meningkat 1.1°C'
- (Smith, 2023) muncul di paragraf 5 — Remove
        ↓
User Apply / Edit Manual
        ↓
Citation tersimpan di dokumen
Bibliography section di akhir dokumen auto-update
```

---

### 3. Citation Marker Format (7 Format)

Saat user pilih format sitasi di project settings, citation marker di dokumen auto-render sesuai style:

| Format | Cocok untuk | Style di teks | Daftar Pustaka |
|--------|-------------|---------------|----------------|
| **APA** | Umum Indonesia, psikologi, pendidikan | `(Author, Year)` | Smith, J. (2024). Title... |
| **APA 7** | Sama seperti APA, deklarasi versi eksplisit | `(Author, Year)` | (sama dengan APA) |
| **IEEE** | Teknik, IT, elektro, informatika | `[1]` numbered | [1] J. Smith, "Title...," 2024. |
| **Vancouver** | Medis, kedokteran, farmasi | `¹` superscript | 1. Smith J. Title. 2024;... |
| **Chicago** | Humaniora, sejarah, seni, filsafat | `¹` superscript + footnote detail | Smith, John. "Title." 2024. |
| **MLA** | Sastra, bahasa Inggris, jurnalisme | `(Author page)` | Smith, John. "Title." 2024, p. 12. |
| **Harvard** | Australia, UK, ekonomi | `(Author, Year)` | Smith, J. (2024) Title... |

**Pemetaan auto-detect style per format:**
- APA / APA 7 / Harvard → **in-text** (Author, Year)
- MLA → **in-text** (Author page)
- IEEE → **numbered** `[1]`, `[2]`
- Vancouver → **numbered superscript** `¹`
- Chicago → **footnote** dengan detail lengkap

**Field di project:** `projects.citationFormat` (sudah ada di schema, tinggal di-expose UI)

---

### 4. Citation Rendering di DokumenTab

**Inline marker:**
- Tampil sebagai superscript atau kurung sesuai format
- Hover → preview popup: judul, author, tahun, ringkasan
- Click → highlight reference di Tab Referensi

**Footnote section (khusus Chicago & Vancouver):**
- Tampil di bawah halaman (atau di akhir section)
- Klik superscript → scroll ke footnote detail

**Contoh APA rendering:**

```
BAB I — PENDAHULUAN

Perubahan iklim telah menjadi isu global yang signifikan (Smith & Jones, 2023).
Data dari IPCC menunjukkan bahwa suhu rata-rata permukaan bumi telah meningkat
1.1°C sejak era pra-industri (IPCC, 2021). Fenomena ini berdampak pada berbagai
sektor (Smith & Jones, 2023), termasuk pertanian dan ketahanan pangan.
```

**Contoh IEEE rendering:**

```
Perubahan iklim telah menjadi isu global yang signifikan [1]. Data dari IPCC
menunjukkan bahwa suhu rata-rata permukaan bumi telah meningkat 1.1°C sejak
era pra-industri [2]. Fenomena ini berdampak pada berbagai sektor [1], termasuk
pertanian dan ketahanan pangan.
```

---

### 5. Manual Citation Management

**User bisa action setelah AI insert:**

| Action | Cara |
|--------|------|
| **Drag citation ke paragraf lain** | Klik & drag marker ke posisi baru |
| **Remove citation** | Hover marker → click X |
| **Add manual citation** | Klik di akhir paragraf → "Insert citation" → pilih reference dari Pustaka Saya |
| **Swap reference** | Klik marker → ganti reference lain yang punya topik mirip |
| **See all citations for a reference** | Di Tab Referensi, klik reference → highlight semua citation-nya di dokumen |

**Citation tracker (`reference_citations` table — NEW):**
- `id` — primary key
- `project_id` — FK to projects
- `reference_id` — FK to references (yang di-attach ke project)
- `paragraph_index` — paragraf ke-berapa (0-based)
- `offset_in_paragraph` — posisi karakter dalam paragraf
- `format_marker` — string marker yang di-render (e.g., "(Smith & Jones, 2023)" atau "[1]")
- `created_at`, `updated_at`

---

### 6. Daftar Pustaka (Bibliography Section)

**Posisi:** Section terakhir di dokumen, sebelum export.

**Auto-generated dari:**
- Semua reference yang di-ceklist (selected = true)
- Format sesuai `project.citationFormat`

**Format di export:**
- PDF: Section "Daftar Pustaka" dengan formatting sesuai style
- DOCX: Heading 1 + entries per format

**Update trigger:**
- Otomatis saat user ceklist/unchecklist reference
- Otomatis saat user add/remove citation
- Manual regenerate button tetap ada (untuk regenerate dari AI)

---

### 7. Schema Changes

**NEW Table: `reference_citations`**

```typescript
export const referenceCitationsTable = pgTable("reference_citations", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  referenceId: integer("reference_id").notNull().references(() => referencesTable.id, { onDelete: "cascade" }),
  paragraphIndex: integer("paragraph_index").notNull(),  // 0-based
  offsetInParagraph: integer("offset_in_paragraph").notNull().default(0),
  formatMarker: text("format_marker").notNull(),  // rendered marker string
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});
```

**Existing tables yang dipakai (no schema change):**
- `referencesTable` — reference per-project (sudah ada)
- `accountReferencesTable` — Pustaka Saya global (sudah ada)
- `projectsTable.citationFormat` — format sitasi per project (sudah ada)

---

### 8. Endpoint API Baru

**Citation Management:**
- `GET /projects/:id/citations` — list semua citation positions untuk project
- `POST /projects/:id/citations` — manual add citation
- `PATCH /projects/:id/citations/:citationId` — update position (drag/remove marker text)
- `DELETE /projects/:id/citations/:citationId` — remove citation

**AI Auto-Cite:**
- `POST /projects/:id/references/auto-cite` — AI baca dokumen + references yang di-ceklist, return suggested citations dengan position
  - Body: `{ selectedReferenceIds: number[], tier?: string }`
  - Response: `{ suggestions: Array<{ referenceId, paragraphIndex, offsetInParagraph, formatMarker, reason }> }`
  - User lalu apply selected suggestions → stored di `reference_citations`

**Format Selection:**
- `PATCH /projects/:id/citation-format` — update project's citation format
  - Body: `{ format: "APA" | "APA7" | "IEEE" | "Vancouver" | "Chicago" | "MLA" | "Harvard" }`

**Existing (already implemented):**
- `POST /projects/:id/references/regenerate` — full bibliography regeneration (sudah ada)
- `POST /account/references/import` — Pustaka Saya bulk import (sudah ada)

---

### 9. Out of Scope (Phase 4+)

- Zotero sync (label "Segera Hadir")
- Live citation auto-update saat user edit teks
- AI suggest citation saat user tambah paragraf baru
- Citation style preview di selection
- Bibliography multiple format per dokumen

---

### References

- DECISION 014 di `.ai/decisions.md` (2026-09-03)
- `artifacts/api-server/src/routes/references.ts` (existing citation logic)
- `artifacts/api-server/src/routes/account-references.ts` (Pustaka Saya backend)
- `artifacts/api-server/src/lib/citation.ts` (7 format sitasi library)

---

## Last Updated

2026-09-03 — Practice v1 spec (Learning Activity + Quiz) + Slide/PPT in Task Mentor

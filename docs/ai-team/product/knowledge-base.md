# Academic Content Knowledge Base

> **Referensi persisten** — jembatan antara Legal (aturan) dan Product/Development
> (implementasi per jenjang). Dibuat 2026-08-21 dari diskusi Owner, direvisi
> setelah keputusan target jenjang dan scope plagiarism.
>
> **Prinsip dasar:** Indonesia tidak punya standar tunggal nasional untuk penulisan
> akademik, sitasi, atau modul ajar — semua bervariasi per
> institusi/bidang ilmu/guru. Ini bukan detail kecil — ini alasan kenapa Teora
> tidak boleh hardcode satu format, dan justru kenapa kesadaran-konteks ini yang
> jadi diferensiasi dari chatbot generik.

---

## Kerangka Evaluasi Fitur

Setiap fitur akademik yang dibangun/diusulkan harus dites lewat 3 pertanyaan
(3 target market Teora):

1. **Apa yang dibutuhkan siswa/mahasiswa?**
2. **Apa yang dibutuhkan guru/dosen?**
3. **Apa yang dibutuhkan institut/ruang pengajaran?**

Plus satu tes tambahan untuk tiap fitur: kalau ini bisa dilakuin chatbot
biasa (ChatGPT/Gemini generik) tanpa usaha ekstra dari user, berarti fitur
ini belum cukup unggul. Diferensiasi Teora ada di: hasil berupa artefak
tersimpan (bukan cuma jawaban chat), tetap nempel ke konteks project/
rubrik/instruksi yang sudah ada (user nggak perlu paste ulang tiap kali),
dan terstruktur sesuai kerangka domain (Bagian A/B di bawah) — bukan
jawaban generik.

**Catatan fase:** Pertanyaan #1 dijawab untuk mahasiswa dulu (Bagian A).
Kebutuhan siswa SMA/SMP dicatat di Bagian B, ditunda sampai ada sinyal
ekspansi dari Owner — jangan digabung jadi satu jawaban saat menjawab
pertanyaan #1.

---

## Bagian A — Relevan Sekarang (Tahap A: MVP Mahasiswa)

### A.1 Aturan Penulisan Karya Ilmiah

**Fakta:** Tiap kampus (bahkan tiap fakultas) punya Pedoman Penulisan Karya
Ilmiah (PPKI) sendiri — beda format, margin, halaman sampul. Yang konsisten
di semua: Bahasa Indonesia baku (bukan bahasa lurus), struktur BAB
(Pendahuluan → Tinjauan Pustaka → dst), dan hampir semua PPKI punya bagian
etika/anti-plagiarisme eksplisit.

**Batasan fitur:**
- Jangan klaim "format skripsi yang benar" secara mutlak
- Sediakan struktur umum (BAB, bahasa formal) sebagai default yang aman
- **Plagiarism scope (diperjelas):** fokus ke **citation integrity**
  (pastikan referensi yang dibuat AI itu nyata, bukan karangan/halusinasi)
  + fitur **AI Statement/disclosure** (user bisa tandai bagian mana yang
  dibantu AI, selaras SKB 7 Menteri). **BUKAN** full similarity-checker
  ala Turnitin — itu proyek besar terpisah (integrasi API pihak ketiga +
  biaya lisensi), dan aneh secara positioning kalau Teora bantu nulis
  sekaligus jadi pengecek keaslian tulisan yang dia bantu buat sendiri.
  Similarity-checker penuh disimpan untuk fase institusi nanti, kalau ada
  partner sekolah/kampus yang eksplisit minta itu.
- Disclaimer eksplisit: "sesuaikan dengan pedoman kampus/prodi kamu"
- Fitur lanjutan (bukan sekarang): user bisa upload pedoman kampusnya
  sendiri, sistem adapt ke situ

### A.2 Gaya Sitasi

**Fakta:** gaya sitasi ditentukan bidang ilmu, bukan satu gaya nasional:
- APA — ilmu sosial, psikologi, pendidikan (paling umum/general-purpose)
- IEEE — teknik, informatika, ilmu komputer
- Vancouver — kesehatan, kedokteran, farmasi; juga standar resmi proposal
  hibah penelitian Kemdiktisaintek
- Footnote (catatan kaki) — hukum dan humaniora
- Sitasi in-text (mirip APA) — ilmu sosial dan pendidikan

**Batasan fitur:**
- Fitur referensi/sitasi WAJIB punya pemilihan gaya, bukan satu default
  hardcoded — cek implementasi yang sudah ada (referensi/bibliografi sudah
  ada), pastikan field-aware
- Idealnya terhubung ke bidang studi yang user pilih saat bikin project
- Peluang fitur "belajar": AI bisa jelasin kenapa gaya tertentu dipakai di
  bidang itu, bukan cuma format mentah — selaras prinsip "bantu proses
  belajar, bukan cuma hasil akhir"

---

## Bagian B — Untuk Nanti (Ekspansi SMA/SMP & Teacher Assistant — JANGAN dibangun dulu)

### B.1 Modul Ajar Builder

**Status: DICATAT, BUKAN DIBANGUN.** Tunda sampai ada sinyal lanjut dari
Owner, sesuai urutan prioritas (core mahasiswa stabil dulu).

**Fakta:** RPP sudah digantikan Modul Ajar (RPP masih boleh dipakai versi
ringkas 1 halaman). Alur resminya:

```
Capaian Pembelajaran (CP)
  → Tujuan Pembelajaran (TP)
  → Alur Tujuan Pembelajaran (ATP)
  → Modul Ajar
  → Pembelajaran
```

Komponen Modul Ajar: tujuan pembelajaran, profil pelajar Pancasila,
pemahaman bermakna, **pertanyaan pemantik** (pertanyaan pembuka pemantik
diskusi), kegiatan pembelajaran, lembar kerja (LKPD), asesmen.

Asesmen ada 3 jenis dengan bentuk berbeda:
- **Diagnostik** (sebelum belajar) — identifikasi kebutuhan/level siswa
- **Formatif** (selama proses) — umpan balik berjalan
- **Sumatif** (akhir) — konfirmasi ketercapaian TP

Bentuk asesmen: sikap (observasi, penilaian diri/teman sebaya), performa
(presentasi, drama, pameran karya), tertulis (esai, pilihan ganda, isian).
Plus jalur **pengayaan** (siswa cepat paham) dan **remedial** (butuh
bimbingan tambahan).

### B.2 Kesadaran Fase Kurikulum Merdeka

**Status: DICATAT, BUKAN DIBANGUN.** Dipindah dari "relevan sekarang" ke
sini karena target jenjang saat ini adalah **mahasiswa**, dan Kurikulum
Merdeka adalah kerangka untuk **SD-SMA**, bukan perguruan tinggi
(universitas punya sistem kurikulum sendiri per program studi). Relevan
lagi begitu ada keputusan lanjut ekspansi ke SMA/SMP.

**Fakta:** Kurikulum Merdeka diorganisir per **Fase**, bukan per kelas:
Fase Fondasi (PAUD), A (SD kelas 1-2), B (SD 3-4), C (SD 5-6), D (seluruh
SMP kelas 7-9 jadi satu fase), E (SMA kelas 10), F (SMA kelas 11-12).
Struktur belajar = intrakurikuler (per mata pelajaran) + Projek Penguatan
Profil Pelajar Pancasila (P5) yang terpisah. Detail lain: SD punya mata
pelajaran gabungan IPAS, SMP mewajibkan Informatika, SMA pilih mata
pelajaran mulai kelas XI (bukan lagi jurusan IPA/IPS/Bahasa yang kaku).

**Batasan fitur (untuk nanti):** fitur apa pun yang perlu "sesuaikan
level" untuk segmen SMA/SMP harus map ke **Fase**, bukan cuma "kelas
berapa". Sampai saat itu tiba: jangan hardcode istilah "kelas X" dengan
asumsi K-12 di fitur yang sedang dibangun untuk mahasiswa sekarang.

---

## Cara Basis Pengetahuan Ini Berkembang

Domain di atas bukan daftar akhir — akan terus ada pertanyaan domain
baru seiring fitur baru dibangun. Pembagian kerjanya:

- **Riset fondasional** (hal yang berlaku luas, gampang salah kalau cuma
  sekali search, dan berisiko kalau keliru — regulasi, struktur resmi,
  konvensi yang ternyata bervariasi per bidang/institusi): dilakukan lewat
  diskusi Owner dengan Claude (chat), lalu ditambahkan ke file ini.
- **Riset detail implementasi** (contoh konkret, wording, format teknis
  untuk satu fitur yang sedang dikerjakan, dalam kerangka yang sudah ada
  di sini): boleh dilakukan Claude Code sendiri saat itu juga.
- **Aturan eskalasi:** kalau ketemu pertanyaan domain yang terasa
  fondasional (bisa memengaruhi banyak fitur, atau berisiko kalau salah)
  dan belum tercakup di sini — jangan tebak dan lanjut coding. Riset
  sendiri dengan hati-hati (cross-check beberapa sumber independen, jangan
  percaya satu artikel saja), atau tandai dulu untuk dibahas.
- **Kalau menemukan dua bagian di file ini yang saling kontradiksi**
  (seperti kasus scope plagiarism sebelum revisi ini) — jangan pilih salah
  satu sendiri. Tandai dan tanyakan.

---

## Instruksi untuk Claude Code

1. Simpan dokumen ini sebagai referensi persisten di
   `docs/ai-team/academic-content/`, bukan tugas yang "selesai" setelah
   dibaca sekali.
2. Bagian A boleh langsung dipertimbangkan untuk fitur akademik yang
   sedang/akan dibangun di jalur mahasiswa saat ini.
3. Bagian B eksplisit **STANDBY** — jangan diimplementasikan sampai ada
   instruksi lanjut dari Owner.
4. Kalau butuh detail lebih spesifik untuk implementasi (contoh konkret
   Modul Ajar per mata pelajaran, edisi terbaru pedoman APA, dll), riset
   lebih lanjut dulu sebelum coding — jangan asumsi dari sini saja, ini
   kerangka awal bukan spesifikasi lengkap.

---

## Appendix C — Sumber & Implementasi Notes

> Tambahan 2026-08-21 dari riset alternatif. Untuk reference saat
> development dan maintenance oleh tim AI mana pun.

### C.1 Citation Style Language (CSL)

**Temuan riset:** CSL adalah open XML standard untuk formatting sitasi dan
bibliografi. Sangat relevant untuk implementasi citation integrity di Teora.

| Aspek | Detail |
|-------|--------|
| **Standard** | Open XML — CSL 1.0.2 (2021) |
| **Style repository** | 9,000+ styles di Zotero Style Repository |
| **Supported fields** | APA, IEEE, Vancouver, Chicago, MLA, dll — mencakup semua gaya di Section A.2 |
| **Used by** | Zotero, Mendeley, Pandoc, Typst, LaTeX |
| **Processor** | citeproc-js (JavaScript) — cocok untuk React/Node stack |

**Implikasi untuk Development:**
- **Jangan invent citation formatter dari nol.** Pakai CSL processor library.
- Opsi implementasi:
  - `citeproc-js` — pure JS, client-side capable
  - Pandoc (`--citeproc`) — server-side, kalau sudah pakai Pandoc
  - Zotero API — fetch style files langsung dari repository
- Setiap style adalah `.csl` file XML yang bisa di-fetch by name (e.g.
  `https://www.zotero.org/styles/apa`)
- **Validation benefit:** CSL processor menolak invalid fields — bisa dipakai
  untuk "citation integrity" (cek apakah referensi punya field yang diperlukan
  gaya yang dipilih)

**Sumber:** Wikipedia — Citation Style Language

### C.2 Verified Sources

Fakta-fakta berikut confirmed dari Wikipedia (EN) — serve sebagai provenance
bagi klaim di atas:

| Topik | Wikipedia Source | Last Verified |
|-------|-----------------|---------------|
| Struktur pendidikan Indonesia (SD→SMP→SMA, 12 tahun wajib) | `en.wikipedia.org/wiki/Education_in_Indonesia` | 2026-08-21 |
| Kurikulum Merdeka (Feb 2022, replacing 2013 curriculum) | `en.wikipedia.org/wiki/Education_in_Indonesia` | 2026-08-21 |
| APA 7th edition (Oct 2019, author-date, social sciences) | `en.wikipedia.org/wiki/APA_style` | 2026-08-21 |
| Vancouver system (numbered, medicine/sciences) | `en.wikipedia.org/wiki/Vancouver_System` | 2026-08-21 |
| IEEE citation format (numbered brackets, engineering/CS) | `en.wikipedia.org/wiki/IEEEcitation` | 2026-08-21 |
| AI in education principles (UNESCO 2024, ethical use) | `en.wikipedia.org/wiki/Artificial_intelligence_in_education` | 2026-08-21 |
| Academic integrity (AI detection false positives, policy shift) | `en.wikipedia.org/wiki/Academic_integrity` | 2026-08-21 |
| CSL (9,000+ styles, open standard) | `en.wikipedia.org/wiki/Citation_Style_Language` | 2026-08-21 |

### C.3 Catatan Akses Web

Web search ke situs-situs berikut **tidak berfungsi** dari sesi ini:

| Sumber | Metode | Error |
|--------|--------|-------|
| UNESCO.org | WebFetch | HTTP 404 |
| Kemendikbud URLs | WebFetch | DNS resolution failed |
| Turnitin.com | WebFetch | HTTP 403 |
| Copyscape.com | WebFetch | HTTP 403 |
| Situs pemerintah Indonesia | WebFetch | DNS/404 |

**Alternatif yang work:**
- Wikipedia (EN/ID) — good untuk fakta umum, konvensi internasional
- GitHub — good untuk open source tools, SDKs, implementation patterns
- cross-check: pakai minimal 2–3 sumber berbeda sebelum accept sebagai fakta

**Implikasi:** Untuk riset fondasional yang butuh sumber Indonesia spesifik
(regulation, kebijakan, kurikulum detail), Owner perlu provide dokumen secara
langsung atau alternate access method.

### C.4 SKB 7 Menteri — Open Item

**Status: BELUM TERVERIFIKASI.**

SKB 7 Menteri (Surat Keputusan Bersama 7 Menteri) tentang AI di pendidikan
disebut sebagai landasan untuk fitur AI Statement/disclosure (Section A.1).
Tapi:

- Tidak ditemukan di Wikipedia (EN/ID) atau sumber accessible
- Kemungkinan nama resminya berbeda (SKB 4 Menteri, Peraturan Bersama, SE,
  atau istilah lain)
- Situs resmi yang kemungkinan punya dokumen ini (Kemendikbud, Kominfo)
  tidak bisa di-fetch

**Action untuk tim AI:** Kalau menemukan requirement fitur yang merujuk ke
"SKB 7 Menteri" — tanyakan Owner untuk sumber resminya sebelum implement.
Jangan asumsi isi/requirement dari title saja.

**Action untuk Owner:** Kalau punya dokumen resmi SKB 7 Menteri (atau
regulasi sejenis tentang AI disclosure di akademik), taruh di tempat yang
bisa diakses tim AI, atau berikan ringkasan isinya saat needed.

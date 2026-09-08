# Stitch Design Brief — Teora: AI Academic Workspace

> Comprehensive design specification for prototyping Teora in Google Stitch.
> After Stitch export, AI team will adapt the design into React components matching the codebase.

---

## 1. PRODUCT OVERVIEW

**Teora** is an AI-powered academic workspace platform for Indonesian students and educators. It helps users write documents, manage references, practice quizzes, and track learning progress — all in Bahasa Indonesia.

**Core product tagline**: "Asisten Akademik AI — Belajar Memahami"

**Target audience**: Indonesian university/college students and educators (18-35 age range).

**Language**: Bahasa Indonesia (primary). All user-facing text in Indonesian.

**URL structure**:
- Public: `/`, `/login`, `/register`, `/terms`, `/privacy`, `/bantuan`, `/status`, `/shared/:token`
- Protected (auth + sidebar): `/dashboard`, `/projects`, `/projects/new`, `/projects/:id`, `/assessment`, `/practice`, `/pustaka-saya`, `/akun`, `/profile`, `/subscribe`, `/usage`, `/topup`, `/referral`
- Admin (owner only): `/admin`, `/admin/users`, `/admin/finops`, `/admin/usage`, `/admin/ai-tiers`, `/admin/health`, `/admin/audit-log`, `/admin/reports`

---

## 2. BRAND IDENTITY

### Logo
- **Icon**: Hexagon shape with circuit-board pattern inside. Gradient fill (10% opacity) + 2px stroke.
- **Gradient**: Linear gradient from `#2D79FF` (top-left) to `#8E54E9` (bottom-right).
- **Text**: "Teora" in serif font, bold, tracking tight, primary ink color.
- **Sizes**: sm (32px icon), md (40px icon), lg (56px icon).
- **Never**: No tagline, no logo alone without text in navigation.

### Brand Colors
| Name | Hex | HSL | Usage |
|---|---|---|---|
| Brand Blue | `#2D79FF` | `hsl(217 92% 58%)` | Primary CTAs, links, accents |
| Brand Purple | `#8E54E9` | `hsl(255 58% 60%)` | Secondary accents, gradients |
| Deep Ink | `#1E2D4A` | `hsl(215 50% 25%)` | Primary buttons, headings (light mode) |
| Burnt Rust | `#C4622D` | `hsl(12 60% 45%)` | Accent highlights |
| Parchment | `#F5F0E8` | `hsl(40 33% 96%)` | Background (light mode) |
| Warm Cream | `#FCFAF6` | `hsl(40 40% 98%)` | Card background (light mode) |

### Brand Gradient (Signature)
`linear-gradient(from #2D79FF to #8E54E9)` — used on:
- Primary CTA buttons
- Active sidebar nav items
- Top accent bars on form cards
- Usage progress bars
- Hover effects

### Typography
| Role | Font | Weight | Usage |
|---|---|---|---|
| Headings (h1-h6) | Space Grotesk (serif) | 600 | Page titles, section headings |
| Body text | Inter (sans-serif) | 400-600 | All UI text, labels, descriptions |
| Code/monospace | JetBrains Mono | 400 | Technical text, citations |
| Logo text | Space Grotesk | 700 | Brand wordmark only |

**Line height**: 1.8 for academic prose (generous reading).
**Letter spacing**: Tight tracking on headings (`tracking-tight`).

### Border Radius
- Base: `6px` (`rounded-md`)
- Cards: `rounded-xl` (12px for containers)
- Badges/pills: `rounded-full`
- Buttons: `rounded-md`

### Shadows
**Paper-like 2D shadow system** — NOT soft blur. Each shadow level has a colored bottom border effect:
```
--shadow-sm:  0px 2px 0px 0px hsl(220 50% 15% / 0.05), 0px 1px 2px -1px hsl(220 50% 15% / 0.05)
--shadow-md:  0px 2px 0px 0px hsl(220 50% 15% / 0.05), 0px 2px 4px -1px hsl(220 50% 15% / 0.05)
--shadow-lg:  0px 2px 0px 0px hsl(220 50% 15% / 0.05), 0px 4px 6px -1px hsl(220 50% 15% / 0.05)
--shadow-xl:  0px 2px 0px 0px hsl(220 50% 15% / 0.05), 0px 8px 10px -1px hsl(220 50% 15% / 0.05)
```

### Special Effects
- **Background texture**: Subtle fractal noise SVG overlay on parchment background at 2% opacity.
- **Custom scrollbar**: 6px wide, rounded, warm border color, transparent track.
- **Focus rings**: 2px solid ring color, 2px offset.
- **Card hover**: Left accent border with gradient line (3px, opacity 0 on default, opacity 100 on group-hover).
- **Project card hover**: Lift animation (`y: -3px`) with spring transition.

---

## 3. DESIGN TOKENS — LIGHT MODE

```
Background:       hsl(40 33% 96%)     -- warm parchment cream
Foreground:       hsl(220 50% 15%)    -- deep ink blue (all text)
Border:           hsl(35 25% 85%)    -- warmer parchment border
Card:             hsl(40 40% 98%)    -- slightly lighter cream
Card Border:      hsl(35 20% 88%)
Primary:          hsl(215 50% 25%)    -- deep navy ink
Primary Foreground: hsl(40 33% 96%)
Secondary:        hsl(35 20% 88%)     -- warm beige
Secondary Foreground: hsl(220 50% 20%)
Muted:            hsl(35 20% 90%)    -- light parchment
Muted Foreground: hsl(220 20% 40%)   -- muted ink blue
Accent:           hsl(12 60% 45%)    -- burnt rust
Accent Foreground: hsl(40 33% 96%)
Destructive:      hsl(0 60% 50%)     -- muted red
Destructive Foreground: hsl(0 0% 100%)
Input:            hsl(35 25% 85%)
Ring:             hsl(215 50% 25%)

Sidebar:          hsl(40 40% 98%)
Sidebar Foreground: hsl(220 50% 15%)
Sidebar Border:    hsl(35 25% 85%)
Sidebar Primary:   hsl(215 50% 25%)
Sidebar Accent:    hsl(35 20% 90%)
Sidebar Ring:      hsl(215 50% 25%)
```

---

## 4. DESIGN TOKENS — DARK MODE

```
Background:       hsl(220 50% 10%)    -- dark navy
Foreground:       hsl(40 33% 90%)    -- warm cream
Border:           hsl(220 30% 25%)
Card:             hsl(220 45% 14%)
Primary:          hsl(40 40% 85%)    -- light cream (inverted)
Primary Foreground: hsl(220 50% 10%)
Secondary:        hsl(220 40% 20%)
Muted:            hsl(220 30% 20%)
Muted Foreground: hsl(220 20% 65%)
Accent:           hsl(12 50% 55%)    -- lighter burnt rust
Destructive:      hsl(0 60% 50%)
Sidebar:          hsl(220 45% 14%)
Sidebar Foreground: hsl(40 33% 90%)
Sidebar Accent:   hsl(220 40% 20%)

Brand Blue:        hsl(217 92% 65%)   -- brighter for dark mode
Brand Purple:     hsl(255 58% 70%)   -- brighter for dark mode
```

---

## 5. LAYOUT SYSTEM

### Sidebar Shell (Protected Pages)
```
+------------------------------------------+
|  SIDEBAR (256px)  |    MAIN CONTENT      |
|                   |                      |
| [Logo Header]     |  [Mobile Header]     |
| [User Avatar+Name]|  [Page Content]     |
|                   |  max-w-6xl centered |
| [Nav Items]       |                     |
|  - Dashboard      |                     |
|  - Task Mentor >  |                     |
|    - General      |                     |
|    - Academic     |                     |
|  - Assessment     |                     |
|  - Practice       |                     |
|  - Pustaka Saya   |                     |
|  - Akun >         |                     |
|    - Profil       |                     |
|    - Berlangganan |                     |
|    - Penggunaan   |                     |
|    - Topup Saldo  |                     |
|    - Pusat Bantuan|                     |
|                   |                     |
| [Saldo Card]      |                     |
| [Settings/Logout]|                     |
| [ToS | Privacy]  |                     |
+------------------------------------------+
```

**Sidebar width**: 256px (desktop).
**Mobile**: Sidebar becomes a Sheet/drawer sliding from left.
**Content max-width**: `max-w-6xl` (1152px) centered.
**Page padding**: `p-4` mobile, `p-8` desktop.

### Auth Pages (Login, Register, Confirm, Callback)
- Full-height centered layout on parchment background.
- No header, no sidebar, no navigation.
- Single centered card (max-w-md, p-8) with gradient top accent line.
- Card has: Logo (lg), heading, form, footer links.

### Public Pages (Landing, Help, Terms, Privacy, Monitoring)
- Sticky header with logo + nav buttons (public variant).
- Full-width content with max-width containers.
- Footer with links.

### Admin Pages
- Sidebar variant but with admin-specific navigation.
- Admin sidebar items: Overview, Users, Financial, Usage, AI Tiers, System, Audit Log, Reports.

---

## 6. NAVIGATION MAP

### Sidebar Navigation Tree

```
Teora
|
+-- Dashboard  (/)
|   → /dashboard
|
+-- Task Mentor  (FolderKanban icon)
|   +-- General Task  → /projects?type=general
|   +-- Academic Work  → /projects?type=academic
|
+-- Assessment  (ClipboardList icon)
|   → /assessment
|
+-- Practice  (Brain icon)
|   → /practice
|
+-- Pustaka Saya  (BookOpen icon)
|   → /pustaka-saya
|
+-- Akun  (CreditCard icon)
|   +-- Profil & Pengaturan  → /profile
|   +-- Berlangganan  → /subscribe
|   +-- Penggunaan  → /usage
|   +-- Topup Saldo  → /topup
|   +-- Pusat Bantuan  → /bantuan
|
[Bottom: Saldo Card]
[Settings] [Logout]
[ToS] • [Privacy]
```

### Public Navigation (Landing Page Header)
```
[Teora Logo]          [Masuk] [Daftar]
```

### Admin Navigation Sidebar
```
Admin
|
+-- Overview  → /admin
+-- Users  → /admin/users
+-- Financial  → /admin/finops
+-- Usage  → /admin/usage
+-- AI Tiers  → /admin/ai-tiers
+-- System  → /admin/health
+-- Audit Log  → /admin/audit-log
+-- Reports  → /admin/reports
```

---

## 7. ALL PAGES — DETAILED LAYOUT SPECS

---

### PAGE 1: `/` — Landing Page (Public)

**Purpose**: Marketing page for unauthenticated visitors.

**Layout structure**:
```
[Sticky Header] — logo left, "Masuk" ghost button, "Daftar" gradient button
[Hero Section] — centered, serif heading, subtitle, 2 CTA buttons, entrance animation
[Features Grid] — 3-col (responsive: 2 on sm, 3 on lg), 5 feature cards
[CTA Section] — centered secondary heading
[Footer] — copyright, ToS link, Privacy link
```

**Hero Section**:
- Heading: "Asisten Akademik AI — Belajar Memahami" (Space Grotesk, 48px+)
- Subtitle: "Tulis dokumen, kelola referensi, danlatihan kuis dengan bantuan AI yang dirancang khusus untuk kebutuhan akademik Indonesia."
- CTAs: "Mulai Gratis" (gradient button) + "Masuk" (outline button)
- Decorative gradient blur circle in background

**Feature Cards** (5 total):
1. **Task Mentor** — FolderKanban icon — "Buat tugas akademik dari awal sampai selesai dengan panduan AI"
2. **Practice** — Brain icon — "Kuis interaktif untuk menguji pemahaman materi"
3. **AI Assistant** — MessageSquare icon — "Tanya apa saja, dari konsep dasar sampai analisis mendalam"
4. **Reference Manager** — BookOpen icon — "Kelola referensi dan sitasi otomatis dengan format APA/IEEE"
5. **Export** — Download icon — "Ekspor ke DOCX, PDF, dan Slide kapan saja"

**Card style**: `rounded-xl border bg-card p-6`, icon in `w-10 h-10 bg-brand/10 rounded-lg`, title `font-serif text-lg`, description `text-sm text-muted-foreground`.
**Card hover**: `hover:shadow-lg transition-shadow`.

**Color usage**: Brand blue for icons only; CTAs use gradient button style.

---

### PAGE 2: `/login` — Sign In

**Purpose**: Authenticate via email/password or Google OAuth.

**Layout**: Full-height centered card on parchment background. NO header, NO sidebar.

**Card structure** (max-w-md, centered):
```
[Top gradient accent line — h-0.5, full-width gradient bar]
[TeoraLogo — md size, centered]
[Heading: "Masuk ke Teora"]
[Subtitle: "Asisten Akademik AI"]
---
[Google Sign-In button — full-width, white bg, Google logo SVG]
[Divider: "ATAU" — centered text with lines]
[Email field — label, input, validation]
[Password field — label, input, visibility toggle eye icon]
[Gradient "Sign In" button — full-width]
[Error banner — red, if error]
[Link: "Belum punya akun? Daftar"]
---
[Footer: Copyright • Help Center • Privacy • ToS]
```

**Google button**: White background, border, Google "G" logo SVG, "Masuk dengan Google" text.
**Gradient accent line**: `absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#2D79FF] via-[#8E54E9] to-[#2D79FF]`.
**Primary button style**: `bg-gradient-to-r from-[#2D79FF] to-[#8E54E9] text-white`.
**Input style**: `h-10 border border-input rounded-md bg-background px-3 py-2 text-sm`.
**Form validation**: Red error text below field, border turns red.

---

### PAGE 3: `/register` — Create Account

**Purpose**: Register new account with email + password + username.

**Layout**: Same as login — full-height centered card.

**Card structure**:
```
[Top gradient accent line]
[TeoraLogo — centered]
[Heading: "Buat Akun"]
[Subtitle: "Mulai gratis. Upgrade kapan saja."]
---
[Google Sign-In button]
[Divider: "ATAU"]
[Username field — with debounced availability check (spinner → green check / red X)]
[Display Name field — optional, placeholder "Contoh: Budi Santoso"]
[Email field]
[Password field — with strength indicator]
[Confirm Password field]
[Terms checkbox — "Saya setuju dengan Syarat & Ketentuan dan Kebijakan Privasi Teora"]
[Referral banner — green tint, shows if ?ref= param present]
[Gradient "Daftar" button — disabled until form valid]
[Error banner]
[Link: "Sudah punya akun? Masuk"]
---
[Footer]
```

**Username check UX**: After typing stops 500ms → show spinner → return available (green check) or taken (red X).
**Terms checkbox**: Required for submit button to enable.
**Referral banner**: `bg-emerald-50 border border-emerald-200 rounded-lg p-3` with referral code display.

---

### PAGE 4: `/dashboard` — Main Dashboard (Protected)

**Purpose**: Hub for authenticated users. Shows greeting + AI assistant shortcut + recent projects.

**Layout**: Sidebar shell.

**Sections**:
```
[Welcome Header] — "Selamat datang, {firstName}" — serif, 2xl

[Teora Assistant Banner] — full-width gradient card
  Left: Brain icon + "Teora Assistant" title + description
  Right: "Mulai Chat" gradient button
  Decorative: blur circle top-right corner

[Your Tasks section]
  Header: "Tugas Anda" + Search icon + "+ Task Baru" gradient button
  Project Grid: 3-column responsive (1 on mobile, 2 on md, 3 on lg)

[Empty State] — when no projects
  Centered illustration + "Mulai tugas pertama Anda" + button
```

**Project Card** (inside grid):
```
[Status badge — top-left corner, pill shape]
  completed: green bg
  draft: gray bg
  analyzing: amber bg + pulse animation
  writing: purple bg + pulse animation
[Title — serif, font-semibold, truncate]
[Subject label — small text]
[Instruction preview — 2 lines, text-sm muted]
[Progress bar — h-1, thin]
[Footer: relative timestamp + "Mulai/Lanjutkan" button]
```
**Card hover**: Lift `y: -3px`, left accent border gradient appears.

---

### PAGE 5: `/projects` — Task Mentor / Daftar Task (Protected)

**Purpose**: Full project listing with type tabs and stage filters.

**Layout**: Sidebar shell.

**Structure**:
```
[Page Header] — serif title "Task Mentor", subtitle, "+ Task Baru" gradient button

[Type Tabs] — segmented button group
  [General Task] [Academic Work]
  Active: gradient bg + white text
  Inactive: transparent + muted text

[Two-column layout]
  Left sidebar (220px): Stage filters
    Filter chips with count badges
    Optional color dots (green/yellow/red/orange)
  Right main area: Search + Project grid
```

**Stage Filter Chips**:
- Label + count badge (muted)
- Optional color dot indicator
- Active: `bg-primary/10 border border-primary/20`
- Inactive: hover state with muted bg

**Task Card** (in grid):
```
[Stage badge — pill, color-coded]
[Title — serif truncate]
[Type label — small badge]
[Action button: "Mulai Kerjakan" (new) or "Lanjutkan" (in-progress)]
```

---

### PAGE 6: `/projects/new` — New Project Creation (Protected)

**Purpose**: Create a new project by entering instructions and configuring options.

**Layout**: Sidebar shell. Single centered form card (max-w-3xl).

**Structure**:
```
[Back link] — "< Kembali ke Daftar Task"

[Form Card]
  [Header] — Icon + "Task Baru" + subtitle + Flow badge "4 tahap: Idea → Writing → Revision → Done"

  [Title field] — large input, py-5, optional, placeholder "Judul tugas Anda"

  [Output Format] — segmented toggle
    [Dokumen] [Slide]
    Active: bg-primary text-primary-foreground
    Container: border rounded-md

  [Instruction textarea] — min-h-200, required
    Placeholder differs by type:
    - General: "Jelaskan tugas Anda secara detail. Semakin lengkap, semakin baik hasilnya."
    - Academic: "Tuliskan topik, tujuan, dan ruang lingkup karya ilmiah Anda."

  [Citation Format] — Select dropdown (academic only)
    Options: APA 7, IEEE, Chicago, MLA, Harvard, Vancouver, ICMJE
    Each option has description subtitle

  [File Upload] — optional
    "Unggah file referensi (PDF, DOC, TXT)"
    Button: "Pilih File"
    Uploaded files show as chips with X remove button

  [Submit button] — full-width, gradient
    - General: blue gradient
    - Academic: indigo gradient
```

---

### PAGE 7: `/projects/:id` — Project Workspace (Protected, Most Complex)

**Purpose**: Core workspace — document editing, AI chat, references, quiz, timeline, comments.

**Layout**: Sidebar shell. Full-width workspace area.

**Top Bar** (sticky):
```
[Back link] [Project Title] [Status Badge] [AI disclosure toggle] | [Export] [Share] [Action]
```

**Document Bar** (horizontal scrollable row below top bar):
```
[Document pill 1] [Document pill 2] [+ Tambah Dokumen]
Each pill: icon + truncated title (max 140px) + optional "active" badge
Hover: dropdown menu (Rename / Set Aktif / Delete)
Double-click: inline rename input
```

**Tab Bar** (10 tabs, border-b underline style):
```
[Preview] [Outline] [Chat AI] [Referensi] [Slide] [Lampiran] [Riwayat] [Timeline] [Kuis] [Komentar]
Active tab: gradient underline, bold text
Inactive: muted text, hover shows underline
```

---

**TAB 7.1: Preview**
- Renders HTML document content (academic prose style)
- Click citation markers → opens CitationMarkerMenu popup
- Bibliography card (Daftar Pustaka) below content
- Footer: "Dibantu oleh AI" badge

---

**TAB 7.2: Outline**
- Document structure text display
- Edit toggle button (pencil icon)
- Regenerate button + tier selector
- Generate Document button + tier selector
- Editable textarea in edit mode (mono font)

---

**TAB 7.3: Chat AI** (most complex)
```
[ScrollArea — message history]
  User messages: right-aligned, primary bg, rounded-lg
  AI messages: left-aligned, secondary bg, serif font, left border accent, rounded-lg
  "Thinking..." placeholder when pending

[Mode selector pills]
  [Generate] [Revise] [Reflect] [Socratic] [Quiz] [Summary]
  Active: gradient bg

[Tier selector row]
  Tier dropdown + "Saldo: Rp XXX" indicator

[Input area]
  Textarea + Send button
  Placeholder text changes by mode:
  - Generate: "Ketik instruksi untuk dokumen baru..."
  - Revise: "Apa yang ingin Anda ubah?"
  - Reflect: "Apa pertanyaan Anda tentang dokumen ini?"
  - Socratic: "Ajukan pertanyaan tentang konsep yang ingin dipahami..."
  - Quiz: "Masukkan topik untuk kuis..."
  - Summary: "Ringkasan apa yang Anda butuhkan?"

[Quick actions] (empty state)
  Suggestion badges: "Buat pendahuluan", "Tambahkan sitasi", "Ringkaskan bab 2"
```

---

**TAB 7.4: Referensi**
```
[Citation format selector] [Auto-Cite button] [Tier selector] [Regenerate button]

[Reference Table]
  Columns: □ | Status | Source | Year | Used In | Actions
  Status icons: checkmark (used), minus (unused)
  Source badge colors: manual=blue, crossref=green, file=amber

[Add Reference button] — opens dialog
  [DOI/ISBN auto-fill tab] — input + "Cari" button
  [Manual entry tab] — title, author, year, journal, DOI fields
  [CrossRef Search tab] — search input + results list

[Existing Citations summary card]
```

---

**TAB 7.5: Slide** (only for pptx output format)
```
[Slide grid] — 2-column responsive grid of slide cards
[Preview button] — opens dialog with slide iframe
[Download PPTX button]
```

---

**TAB 7.6: Lampiran** (Attachments)
```
[Upload button] — opens dialog with file picker + type selector
[Attachment grid] — 3-column
  Each card: file type icon, filename, type badge, file size, delete button
```

---

**TAB 7.7: Riwayat Versi** (Version History)
```
[Table]
  Columns: Versi | Deskripsi | Tanggal | Aksi
  View button — opens dialog with full version content in ScrollArea
```

---

**TAB 7.8: Timeline**
```
[3 Stat Cards — horizontal row]
  Total Aktivitas | Milestone | Hari Ini

[Vertical Timeline]
  Left: vertical line with dots
  Each event: type badge, description, relative timestamp
```

---

**TAB 7.9: Kuis** (Quiz)
```
[Generate Kuis button] — opens dialog
  Title field, Topic field, Question count (range slider 3-20),
  Question types checkboxes, Difficulty select, Tier selector

[Quiz list — card grid] or [Quiz viewer]
  Quiz cards: title, topic, question count, action button
  Quiz viewer: question cards with radio buttons or textarea input + Submit
```

---

**TAB 7.10: Komentar** (Comments)
```
[New comment textarea] + [Kirim] button
[Comment list — sorted, resolved last]
  Each: optional quote, content, author avatar+name, timestamp,
        resolved badge, Actions (Resolve/Edit/Delete)
[Empty state] — when no document selected
```

---

**SHARED SUB-COMPONENTS** (visible across tabs):
- **ExportButton**: Dialog with DOCX / PDF / PPTX download buttons
- **ShareButton**: Dialog with access mode (view/comment/edit), label, expiry, active links list
- **InsufficientBalanceDialog**: HTTP 402 error modal with topup CTA
- **CitationMarkerMenu**: Popover for editing/repositioning/deleting citation markers

---

### PAGE 8: `/assessment` — Assessment Page (Protected)

**Purpose**: Placeholder for quiz/evaluation management.

**Layout**: Sidebar shell.

**Structure**:
```
[Header] — "Assessment" serif title + "Buat Assessment" outline button
[Search bar]
[3-column grid of category cards]
  1. Quiz — ClipboardList icon — "Kelola dan lihat kuis Anda"
  2. Evaluasi — CheckSquare icon — "Evaluasi pemahaman materi"
  3. Riwayat — History icon — "Lihat hasil kuis sebelumnya"
[Recent assessments empty state card]
```

---

### PAGE 9: `/practice` — Practice / Quiz Recommendations (Protected)

**Purpose**: AI-recommended quizzes based on learning activity.

**Layout**: Sidebar shell.

**Structure**:
```
[Header] — Brain icon + "Practice" title + "Refresh" outline button

[Recommendations section]
  "Rekomendasi untuk Anda" subtitle
  3-column responsive grid of RecommendationCards
    Each: type icon + type badge (Recent/Frequent/Weak),
          reason text, topic tags, "Mulai Kuis" button

[Recent Activity section]
  "Aktivitas Terbaru" subtitle
  List of activity items: type badge, date, topic pills
```

---

### PAGE 10: `/pustaka-saya` — Personal Library (Protected)

**Purpose**: Account-level reference library, CrossRef import, DOI import.

**Layout**: Sidebar shell.

**Structure**:
```
[Header]
  "Pustaka Saya" + reference count badge
  Actions: [+ Tambah Manual] [Cari CrossRef] [Import DOI]

[Search + Filter row]
  Search input with clear button
  Filter chips: Semua | Manual | CrossRef | Upload

[Reference list — vertical stack]
  Each card:
    Title (serif, font-medium)
    Source badge (color-coded: blue=manual, green=crossref, amber=file)
    Authors, year, journal/volume/issue
    DOI link (small, muted)
    Actions: [Copy cite key] [Assign to project] [Edit] [Delete]

[Dialogs: ManualEntry | CrossRefSearch | ImportDoi | AssignProject | DeleteConfirm]
```

---

### PAGE 11: `/akun` — Account Hub (Protected)

**Purpose**: Central account page with balance, stats, and navigation.

**Layout**: Sidebar shell.

**Structure**:
```
[Balance Card — gradient border, full-width]
  Gradient border: border-[#2D79FF]/20
  Gradient bg: bg-gradient-to-br from-[#2D79FF]/5 to-[#8E54E9]/5
  Content:
    Wallet icon + "Saldo" label + large balance display (Rp X)
    [Topup Sekarang] gradient button
    7-day stats: X requests, Rp X used
    Recent transactions list (3 items)
    [Lihat penggunaan lengkap →] link

[Account sections — 2-column grid]
  Each card: icon + label + description + chevron right
  1. Profil & Pengaturan → /profile
  2. Berlangganan → /subscribe
  3. Topup Saldo → /topup
  4. Privasi → /privacy
  5. Keamanan (placeholder)
  6. Pusat Bantuan → /bantuan
```

---

### PAGE 12: `/subscribe` — Subscription / Langganan (Protected)

**Purpose**: Display 30 SKU pricing matrix and manage subscription.

**Layout**: Sidebar shell.

**Structure**:
```
[Header] — "Paket Berlangganan" serif title

[Explanation section]
  "Cara Kerja Kuota" explanation card
  Rolling window info: 5h cap = 1/10 of 7d cap
  Rolling window anchored to first use

[Saldo card] — shows current balance
  Wallet icon, "Saldo Anda: Rp X"

[Package Grid — 5 columns (responsive: 2 on md, 3 on lg, 5 on xl)]
  Each tier card:
    Tier name badge (Starter/Standar/Premium/Pro/Ultra)
    Period tabs: [15 Hari] [30 Hari]
    Model mode tabs: [Flash] [Plus] [Pro]
    Price display: Rp XX.XXX
    "Hemat X%" badge if applicable
    Features list (checkmarks)
    [Pilih Paket] outline button

[Popular badge] — most popular tier has ring + gradient top banner
```

---

### PAGE 13: `/usage` — Usage Statistics (Protected)

**Purpose**: Detailed usage breakdown with time-based limits.

**Layout**: Sidebar shell.

**Structure**:
```
[Header] — "< Kembali" back link, "Penggunaan" title, subtitle

[Active Package Card — gradient bg]
  Package name, "Aktif" green badge, expiry date, [Lihat Paket] button

[2-column Usage Columns]
  Column 1: "Batas 5 Jam"
    Icon + "Batas 5 Jam" label
    Remaining: X.Xh / X.Xh
    Progress bar (brand blue gradient)
    Percentage + reset date
  Column 2: "Batas 7 Hari"
    Icon + "Batas 7 Hari" label
    Remaining: X.Xh / X.Xh
    Progress bar (brand purple gradient)
    Percentage + reset date

[Saldo Card — green gradient]
  Wallet icon, "Saldo", current balance, today's usage

[Daily History — collapsible]
  Expandable rows: date | hours | cost (Rp)
  Click row to expand and show per-feature breakdown
```

---

### PAGE 14: `/topup` — Balance Topup (Protected)

**Purpose**: Load credits into account (Stripe/Midtrans pending).

**Layout**: Sidebar shell.

**Structure**:
```
[Header] — back link, "Topup Saldo" title, subtitle

[Balance Card]
  Gradient top bar, wallet icon, large balance, "Aktif" badge
  [Back to: /dashboard] [Berlangganan →]

[Warning Card — orange tint]
  "Integrasi pembayaran belum aktif" message

[Topup Packages — 2x2 grid]
  Rp10.000 | Rp25.000 | Rp50.000 | Rp100.000
  Popular package (Rp50.000): ring + gradient top banner

[Recent Transactions — list]
  Each: Coins icon, description, timestamp, amount (green/red)
```

---

### PAGE 15: `/referral` — Referral & Rewards (Protected)

**Purpose**: Show referral link, progress, and token packages.

**Layout**: Sidebar shell.

**Structure**:
```
[Header] — "Ajukan Teman, Dapat Kuota" title

[2-column row]
  Left: Referral Link Card
    Gift icon + "Berikan 500, Dapatkan 500" badge
    URL display + Copy button + Share button
  Right: Progress Card
    Circular SVG progress ring (gradient stroke)
    X/Y referrals + stat

[Token Packages — 3-column]
  LITE | PRO | ELITE
  Each: price, features list, CTA button
  PRO: blue border + shadow + "MOST POPULAR" banner

[Info Cards row — 3 cards]
  "Nilai Token" | "Tanpa Kadaluarsa" | "Pembayaran Aman"
```

---

### PAGE 16: `/profile` — User Profile (Protected)

**Purpose**: Edit display name, avatar, view stats, delete account.

**Layout**: Sidebar shell.

**Structure**:
```
[Avatar Section]
  Large circular avatar (96px) with initials fallback
  Hover overlay: camera icon + "Upload" text
  Native file input triggered on click

[Display Name field]
  Input + Save button (disabled until changed)

[Account Info Card]
  Email (read-only)
  Username (@xxx)
  Join date
  Owner badge (if owner email)

[Usage Summary Card — 2x4 stat grid]
  Total Request | Input Tokens | Output Tokens | Total Cost
  Biaya Flash | Biaya Plus | Biaya Pro | Sisa Saldo

[Danger Zone — red-bordered card]
  "Zona Berbahaya" title
  "Hapus Akun" button — opens password confirmation dialog
```

---

### PAGE 17: `/bantuan` — Help Center / FAQ (Protected)

**Purpose**: FAQ and feature overview.

**Layout**: Sidebar shell.

**Structure**:
```
[Header] — "Pusat Bantuan" title, subtitle

[Feature Overview — 2x2 grid]
  Task Mentor | Practice | AI Assistant | Export

[FAQ — expandable details]
  Each item: <details> element with custom chevron
  7 FAQ items covering: akun, pembayaran, fitur AI, referensi, privasi

[Contact section]
  Email: teora@example.com
  [Kembali ke Dashboard →]
```

---

### PAGE 18: `/terms` — Terms of Service (Public)

**Purpose**: Legal document in Indonesian.

**Layout**: Sidebar shell or full-width.

**Structure**:
```
[Back button] [Judul: Syarat & Ketentuan]
[Content card — prose typography]
  14 sections: Pendahuluan, Definisi, Layanan, Akun, Pembayaran, Hak Kekayaan Intelektual, Batasan Tanggung Jawab, Ganti Rugi, Perubahan Layanan, Hukum yang Berlaku, Penyelesaian Sengketa, Ketentuan Lain, Kontak Kami, Persetujuan
[Footer links]
```

---

### PAGE 19: `/privacy` — Privacy Policy (Public)

**Purpose**: Privacy policy in Indonesian.

**Layout**: Same as terms.

**Structure**: 12 sections covering: data collected, usage, protection, sharing, cookies, rights (UU PDP 2022), security, retention, changes, contact.

---

### PAGE 20: `/status` — System Status (Public)

**Purpose**: Uptime monitoring for all services.

**Layout**: Full-width public page.

**Structure**:
```
[Header] — "Status Sistem Teora" + Refresh button

[Overall Status Banner — full-width, color-coded]
  Green: Semua layanan aktif
  Yellow: Beberapa degradasi
  Red: Gangguan

[Services Grid — 3-column]
  Each: icon + service name + latency + status dot (pulsing green/amber/red)

[Incident History — table]
  Severity badge | Description | Date

[Monitoring Setup Guide]
  Cards: Vercel Analytics | UptimeRobot | Error Monitoring | Cost Alerts | Auto-rollback
```

---

### PAGE 21: `/shared/:token` — Shared Project (Public, No Auth)

**Purpose**: Read-only public view of a shared project.

**Layout**: Full-width, no sidebar, no auth.

**Structure**:
```
[Header Bar]
  Access mode badge (view=gray, comment=amber, edit=green)
  Project title + owner email + date + status badge

[Document Card — full prose content]
  Rendered HTML with academic typography
  [Empty state if no document shared]
```

---

### PAGE 22: `/admin` — Admin Dashboard (Owner Only)

**Purpose**: System-wide overview for Teora owner.

**Layout**: Admin sidebar shell.

**Structure**:
```
[Admin Header] — "Admin Dashboard" + period toggle (Hari/Minggu/Bulan/Semua)

[Test Mode Banner — amber warning]
  "Mode test — Anda login sebagai owner"

[4-column Financial Stats grid]
  Total Users | AI Requests | Revenue | AI Cost
  Each: icon + label + value + sub-text

[2-column row]
  Left: Owner Usage Card
  Right: Top Consumers list

[Quick Navigation — 3x3 grid]
  Users | Financial | Usage | AI Tiers | System | Audit Log | Reports | [empty] | [empty]
```

---

### PAGE 23: `/admin/users` — User Management (Owner Only)

**Purpose**: Admin table of all registered users.

**Layout**: Admin sidebar shell.

**Structure**:
```
[Header] — "Manajemen User" + total count

[Search form]
  Search input + Search button

[Users Table — native HTML table]
  User (avatar+name+email) | Tier (dropdown select) | Projects | Requests | Cost | Status | Actions
  Status badges: active (green), suspended (red)
  Actions: Suspend/Activate toggle button

[Pagination] — Prev | Page X of Y | Next
```

---

### PAGE 24: `/admin/finops` — Financial Operations (Owner Only)

**Purpose**: Revenue, costs, profit analysis.

**Layout**: Admin sidebar shell.

**Structure**:
```
[Period toggle] — Minggu / Bulan / Semua

[4-column stats grid]
  Gross Revenue | Refunds | Net Revenue | Biaya Teora

[2-column row]
  Left: Cost Breakdown by Provider
    Horizontal gradient bars for each AI provider
  Right: Metrics
    Avg revenue/transaction | Avg cost/request | Net Profit

[Profit display] — green if positive, red if negative
```

---

### PAGE 25: `/confirm` — Email Confirmation

**Purpose**: Handle Supabase email verification callback.

**Layout**: Full-height centered card (no sidebar).

**States**:
- Loading: Spinner + "Memverifikasi..."
- Success: Green check icon + "Email berhasil dikonfirmasi!" + auto-redirect
- Error: Red X icon + error message + "Ke Halaman Masuk" button

---

### PAGE 26: `/auth-callback` — OAuth Callback

**Purpose**: Handle OAuth PKCE callback, exchange code for tokens, redirect.

**Layout**: Full-height centered card (no sidebar).

**States**:
- Loading: Spinner + "Memproses login..."
- Success: Welcome message + redirect to dashboard
- Error: Error message + "Kembali ke Login" button

---

## 8. COMPONENT LIBRARY REFERENCE

### Button
| Variant | Style |
|---|---|
| default | `bg-primary text-primary-foreground hover:bg-primary/90` |
| destructive | `bg-destructive text-white hover:bg-destructive/90` |
| gradient | `bg-gradient-to-r from-[#2D79FF] to-[#8E54E9] text-white hover:shadow-md` |
| outline | `border border-border bg-background hover:bg-accent hover:text-accent-foreground` |
| secondary | `bg-secondary text-secondary-foreground hover:bg-secondary/80` |
| ghost | `hover:bg-accent hover:text-accent-foreground` |
| Sizes: | default (h-10 px-4), sm (h-9 px-3), lg (h-11 px-8), icon (h-10 w-10) |

### Card
| Variant | Style |
|---|---|
| default | `rounded-lg border bg-card shadow-sm` |
| elevated | `rounded-lg border bg-card shadow-md shadow-xl` |
| ghost | `border-transparent bg-transparent shadow-none` |
| accent | `bg-sidebar-accent border-sidebar-accent-border` |
**Sub-components**: CardHeader (p-6), CardTitle (serif, text-2xl), CardDescription, CardContent (pt-0), CardFooter

### Input
`h-10 border border-input rounded-md bg-background px-3 py-2 text-sm`
Focus: 2px ring with `--ring` color and 2px offset.

### Badge
| Variant | Usage |
|---|---|
| default | solid primary bg |
| secondary | `bg-secondary` |
| destructive | `bg-destructive text-white` |
| success | `bg-emerald-600 text-white` |
| warning | `bg-amber-500 text-white` |
| info | `bg-sky-500 text-white` |
| academic-purple | `bg-violet-100 text-violet-800` |
| academic-amber | `bg-amber-100 text-amber-800` |
| outline | text only + subtle border |

### Tabs
- List: `inline-flex h-10 rounded-md bg-muted p-1`
- Trigger inactive: `rounded-sm px-3 py-1.5 text-sm font-medium text-muted-foreground`
- Trigger active: `bg-background text-foreground shadow-sm rounded-sm`
- Content: `mt-2`

### Dialog (Modal)
- Overlay: `fixed inset-0 z-50 bg-black/80`
- Content: `fixed left-[50%] top-[50%] grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] border bg-background p-6 shadow-lg rounded-lg`
- Animation: zoom in/out (95%) + fade
- Header: centered text, `text-lg font-semibold tracking-tight font-serif`
- Close button: `absolute right-4 top-4 rounded-sm opacity-70`

### Sheet (Drawer)
- Side left: `inset-y-0 left-0 h-full w-3/4 border-r`, max `sm:max-w-sm`
- Side right: `inset-y-0 right-0 h-full w-3/4 border-l`, max `sm:max-w-sm`
- Overlay: `bg-black/80` fade

### Table
- Wrapper: `relative w-full overflow-auto rounded-md border`
- Header: `bg-muted/50`, bottom border, `h-12 px-4`
- Rows: `border-b hover:bg-muted/50`
- Cells: `p-4 align-middle`

### Avatar
- Size: `h-10 w-10 rounded-full`
- Fallback: initials on `bg-muted`

### Skeleton
- `relative overflow-hidden rounded-md bg-muted`
- Shimmer overlay: `animate-[shimmer_2s_infinite]`

### Empty State
- Container: `flex min-w-0 flex-1 flex-col items-center justify-center gap-6 text-balance rounded-lg border-dashed p-6 text-center`
- Illustrations: papers, book, attachment, chat, quiz (SVG, 80x80)
- Title: `text-lg font-medium tracking-tight`
- Description: `text-sm text-muted-foreground`

### Alert
- Container: `relative w-full rounded-lg border px-4 py-3 text-sm`
- destructive: `border-destructive/50 text-destructive`
- Icon: `absolute left-4 top-4`

### Checkbox
- Size: `h-4 w-4`
- Unchecked: transparent bg, primary border
- Checked: `bg-primary text-primary-foreground` + checkmark

### Select
- Trigger: same as Input styling
- Content: `rounded-md border bg-popover shadow-md`
- Item: `rounded-sm py-1.5 pl-8 pr-2 text-sm`

### Switch
- Track: `h-5 w-9 rounded-full`
- Unchecked: `bg-input`
- Checked: `bg-primary`
- Thumb: `h-4 w-4 rounded-full bg-background shadow-lg`

### Progress
- Track: `h-4 w-full overflow-hidden rounded-full bg-secondary`
- Indicator: `h-full bg-primary transition-all`

### Tooltip
- Content: `rounded-md border bg-popover px-3 py-1.5 text-sm shadow-md`

### Dropdown Menu
- Content: `min-w-[8rem] rounded-md border bg-popover p-1 shadow-md`
- Item: `rounded-sm px-2 py-1.5 text-sm`
- Hover: `bg-accent text-accent-foreground`

### Popover
- Content: `w-72 rounded-md border bg-popover p-4 shadow-md`

---

## 9. ANIMATION & INTERACTION PATTERNS

| Pattern | Implementation |
|---|---|
| Page entrance | Framer Motion: `opacity: 0→1, y: 8→0`, duration 250ms, easeOut |
| Page exit | `opacity: 1→0, y: 0→-8`, duration 150ms, easeIn |
| Project card hover | `whileHover={{ y: -3 }}` spring transition |
| Landing stagger | `containerVariants` + `itemVariants`, 100ms stagger |
| Dialog open | Zoom 95%→100% + fade |
| Sheet slide | 300ms close, 500ms open, ease-in-out |
| Citation menu | Popover with slide-in |
| Copy feedback | Icon swap to checkmark for 2 seconds |
| Accordion/FAQ | Native `<details>` + chevron rotate-180 |
| Skeleton shimmer | `translate-x-full animate-[shimmer_2s_infinite]` |
| Status pulse | `animate-pulse` on amber/red dots |
| Thinking... | Pulsing opacity animation |

---

## 10. ICON LIBRARY

**Lucide React** throughout. All icons are 24px default (w-5 h-5 or w-4 h-4 in nav).

Key icons used:
- LayoutDashboard — Dashboard
- FolderKanban — Task Mentor
- ClipboardList — Assessment
- Brain — Practice
- BookOpen — Pustaka Saya
- CreditCard — Akun
- Coins — Saldo
- Settings — Settings
- LogOut — Logout
- ChevronDown/Right — Nav expand
- Menu/X — Mobile toggle
- Wallet — Balance
- Plus — Add/Create
- Search — Search
- Send — Chat send
- Download — Export/Download
- Share2 — Share
- Copy — Copy
- Check — Success
- X — Close/Error
- ExternalLink — External links
- Gift — Referral
- BarChart3 — Stats
- Users — User management
- Shield — Security
- Heart — Practice/favorite
- FileText — Document
- Presentation — Slide
- Paperclip — Attachment
- History — Version history
- Clock — Timeline
- MessageSquare — Comments/Chat
- Lightbulb — AI/Suggestions
- Loader2 — Loading
- Eye/EyeOff — Password toggle
- CheckCircle — Success state
- AlertCircle — Warning
- Info — Info
- Lock — Restricted

---

## 11. IMPORTANT NOTES FOR STITCH

### Do's
1. **Use the gradient** — the `#2D79FF` → `#8E54E9` gradient is the signature visual. It must appear on CTAs, active states, and accent elements.
2. **Warm parchment aesthetic** — background is cream, not white. Cards are slightly lighter cream, not stark white.
3. **Serif headings** — Space Grotesk for ALL headings (h1-h6). Never Inter for headings.
4. **Indonesian text** — all labels, buttons, descriptions must be in Bahasa Indonesia.
5. **Academic feel** — generous line-height (1.8), scholarly typography, book-like aesthetic.
6. **Dark mode** — fully supported. Background becomes dark navy, primary inverts to cream.
7. **Subtle shadows** — paper-like 2D shadows with colored bottom border, NOT soft blur.

### Don'ts
1. **No cold/stark white backgrounds** — everything is warm parchment.
2. **No plain black text on white** — deep ink blue on parchment.
3. **No sans-serif headings** — headings always Space Grotesk serif.
4. **No generic blue buttons** — use the brand gradient for primary CTAs.
5. **No rounded-full on everything** — restrained 6px radius base.
6. **No heavy drop shadows** — subtle, flat, paper-like.

### Responsive Breakpoints
- Mobile: < 768px (sidebar becomes drawer, grids collapse to 1 column)
- Tablet: 768px - 1024px (2 columns, some adjustments)
- Desktop: > 1024px (full sidebar, 3 columns, all features)

---

## 12. WORKFLOW FOR REDESIGN

1. **Stitch creates prototypes** of all 26 pages using this spec.
2. **Owner reviews and edits** in Stitch directly.
3. **Owner exports** the redesigned pages.
4. **AI team receives** the Stitch export.
5. **AI team adapts** the design into:
   - Updated CSS design tokens (`index.css`)
   - New/modified React components (`src/components/ui/`)
   - New page layouts (`src/pages/*.tsx`)
6. **AI team verifies** all interactions, animations, and responsive behavior.
7. **Deploy** and owner final review on production.

/**
 * AI Scope Guard — DECISION 026
 *
 * Standard universal untuk AI di setiap menu/fitur.
 * Setiap AI route WAJIB deklarasi scope agar AI tidak bocor konteks antar-menu.
 *
 * Konsep:
 * - aiScope: identifier menu (e.g., "dashboard.global", "workspace.project")
 * - scope: data yang WAJIB ada di system prompt
 * - forbiddenSources: data yang TIDAK BOLEH di-query/digunakan
 * - crossProjectPolicy: "isolated" | "summary_only" | "full"
 */

export type CrossProjectPolicy = "isolated" | "summary_only" | "full";

export interface AIScope {
  /** Unique identifier untuk scope ini */
  aiScope: string;
  /** Nama menu yang terlihat user */
  menuName: string;
  /** Deskripsi singkat untuk AI */
  description: string;
  /** Policy akses lintas project */
  crossProjectPolicy: CrossProjectPolicy;
  /** Data yang WAJIB ada di system prompt */
  requiredContext: string[];
  /** Data yang TIDAK BOLEH AI akses */
  forbiddenData: string[];
  /** Pesan yang perlu disisipkan ke system prompt */
  systemPromptInjection: string;
}

/**
 * Scope registry — semua AI scope yang tersedia di Teora.
 * Setiap scope = satu "position" AI di app.
 */
export const AI_SCOPES: Record<string, AIScope> = {
  /**
   * Dashboard Chat — Global AI Assistant
   * Policy: summary_only (bisa lihat ringkasan semua project, tapi detail spesifik harus diminta)
   */
  "dashboard.global": {
    aiScope: "dashboard.global",
    menuName: "Dashboard Teora Assistant",
    description: "AI assistant global yang bisa diakses dari dashboard utama. Memiliki konteks akun user secara umum.",
    crossProjectPolicy: "summary_only",
    requiredContext: [
      "akun_user",
      "daftar_project",
      "subscription_tier",
      "saldo",
      "menu_teora",
    ],
    forbiddenData: [
      "dokumen_detail_project_lain",
      "referensi_user_lain",
      "data_user_lain",
    ],
    systemPromptInjection: `POSISI ANDA: Anda berada di Dashboard Teora Assistant — AI global yang membantu dari halaman utama.
FOKUS ANDA: Membantu user dengan pertanyaan umum tentang tugas akademik, fitur Teora, dan konsultasi project.
SCOPE: GLOBAL (semua project user) — Anda memiliki akses ke ringkasan semua project user untuk memberi saran kontekstual.
BATASAN:
- Anda boleh melihat judul, subject, dan progress project user
- Anda TIDAK boleh menampilkan detail isi dokumen project tertentu kecuali user Meminta secara spesifik
- Anda TIDAK boleh mengakses project/user lain selain akun ini
- Anda TIDAK boleh membocorkan credential, API key, atau konfigurasi internal`,
  },

  /**
   * Task Mentor (Workspace) — Per-Project AI
   * Policy: isolated (hanya project aktif, tidak boleh keluar)
   */
  "workspace.project": {
    aiScope: "workspace.project",
    menuName: "Task Mentor",
    description: "AI assistant di dalam workspace project spesifik. Hanya fokus ke project aktif.",
    crossProjectPolicy: "isolated",
    requiredContext: [
      "project_aktif",
      "dokumen_project",
      "instruksi_dosen",
      "metadata_project",
    ],
    forbiddenData: [
      "project_lain_user",
      "dokumen_project_lain",
      "referensi_project_lain",
      "subscription_detail",
      "saldo_detail",
    ],
    systemPromptInjection: `POSISI ANDA: Anda berada di Task Mentor — workspace project spesifik milik user.
FOKUS ANDA: Membantu user mengerjakan tugas pada project ini saja.
SCOPE: ISOLATED (project tunggal) — Anda hanya boleh mengakses data project yang sedang aktif.
BATASAN:
- Anda TIDAK boleh membahas, mereferensikan, atau mengakses project lain milik user ini
- Anda TIDAK boleh memberikan informasi dari project yang berbeda
- Anda TIDAK boleh mengakses subscription atau saldo user
- Jika user bertanya tentang project lain, arahkan ke Dashboard untuk konteks global`,
  },

  /**
   * Pustaka Saya — References AI
   * Policy: isolated (hanya referensi user, tidak boleh keluar)
   */
  "pustaka.references": {
    aiScope: "pustaka.references",
    menuName: "Pustaka Saya",
    description: "AI assistant untuk mengelola referensi dan sitasi. Hanya fokus ke pustaka user.",
    crossProjectPolicy: "isolated",
    requiredContext: [
      "referensi_user",
      "format_sitasi",
      "metadata_referensi",
    ],
    forbiddenData: [
      "dokumen_project",
      "project_aktif",
      "draft_project",
      "subscription",
      "saldo",
    ],
    systemPromptInjection: `POSISI ANDA: Anda berada di Pustaka Saya — halaman pengelolaan referensi dan sitasi.
FOKUS ANDA: Membantu user mengelola referensi, mencari sitasi, dan menyusun bibliography.
SCOPE: REFERENCES ONLY — Anda hanya boleh mengakses data referensi user ini.
BATASAN:
- Anda TIDAK boleh mengakses isi dokumen project
- Anda TIDAK boleh memberikan informasi tentang project aktif user
- Anda TIDAK boleh mengakses subscription atau saldo`,
  },

  /**
   * Akun / Billing — Account AI
   * Policy: isolated (hanya akun, tidak boleh keluar)
   */
  "akun.billing": {
    aiScope: "akun.billing",
    menuName: "Akun & Billing",
    description: "AI assistant untuk pertanyaan seputar akun, langganan, dan billing.",
    crossProjectPolicy: "isolated",
    requiredContext: [
      "subscription",
      "saldo",
      "tier_preference",
      "usage_stats",
    ],
    forbiddenData: [
      "project",
      "dokumen",
      "referensi",
      "instruksi_dosen",
    ],
    systemPromptInjection: `POSISI ANDA: Anda berada di halaman Akun & Billing.
FOKUS ANDA: Membantu user dengan pertanyaan seputar akun, langganan, saldo, dan penggunaan.
SCOPE: BILLING ONLY — Anda hanya boleh mengakses informasi akun dan billing.
BATASAN:
- Anda TIDAK boleh mengakses project atau dokumen user
- Anda TIDAK boleh memberikan informasi tentang tugas atau referensi user
- Anda boleh menjelaskan status subscription, sisa quota, dan opsi topup`,
  },

  /**
   * Admin Dashboard — Owner AI
   * Policy: full (akses ke semua data, untuk owner/admin saja)
   */
  "admin.global": {
    aiScope: "admin.global",
    menuName: "Admin Dashboard",
    description: "AI assistant untuk admin/owner. Akses penuh ke semua data user dan sistem.",
    crossProjectPolicy: "full",
    requiredContext: [
      "semua_user",
      "semua_project",
      "statistik_sistem",
      "subscription_all",
    ],
    forbiddenData: [
      "credential_internal",
      "api_key_other_users",
    ],
    systemPromptInjection: `POSISI ANDA: Anda berada di Admin Dashboard — akses sebagai owner/admin.
FOKUS ANDA: Membantu owner mengelola sistem, memantau statistik, dan troubleshooting.
SCOPE: FULL ACCESS — Anda memiliki akses ke semua data user dan sistem.
BATASAN:
- Anda TIDAK boleh membocorkan data user ke user lain
- Anda TIDAK boleh menampilkan credential atau API key internal
- Gunakan akses dengan bertanggung jawab`,
  },
};

/**
 * Default scope untuk route yang belum di-migrate ke scope pattern.
 */
export const DEFAULT_SCOPE = AI_SCOPES["dashboard.global"];

/**
 * Get scope config by scope ID.
 * Returns default scope if not found.
 */
export function getAIScope(scopeId: string): AIScope {
  return AI_SCOPES[scopeId] ?? DEFAULT_SCOPE;
}

/**
 * Build system prompt section untuk scope guard.
 * Dipanggil saat build system prompt di messages.ts atau route AI lain.
 */
export function buildScopePrompt(scopeId: string): string {
  const scope = getAIScope(scopeId);
  return scope.systemPromptInjection;
}

/**
 * Check apakah sebuah scope memiliki akses ke data tertentu.
 * Helper untuk validasi di route level.
 */
export function scopeCanAccess(scopeId: string, dataType: string): boolean {
  const scope = getAIScope(scopeId);
  return scope.requiredContext.includes(dataType);
}

/**
 * Check apakah sebuah scope DILARANG mengakses data tertentu.
 * Helper untuk validasi di route level.
 */
export function scopeMustForbid(scopeId: string, dataType: string): boolean {
  const scope = getAIScope(scopeId);
  return scope.forbiddenData.includes(dataType);
}

/**
 * Get cross-project policy untuk scope.
 */
export function getCrossProjectPolicy(scopeId: string): CrossProjectPolicy {
  const scope = getAIScope(scopeId);
  return scope.crossProjectPolicy;
}

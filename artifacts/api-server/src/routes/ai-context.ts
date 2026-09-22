import { Router, type IRouter } from "express";
import { eq, desc, and, ne, sql } from "drizzle-orm";
import {
  db,
  projectsTable,
  subscriptionsTable,
  packagesTable,
  userBalancesTable,
  projectMetadataTable,
} from "@workspace/db";
import { isOwnerEmail } from "../middlewares/owner.js";
import { getAllActiveTiers } from "../lib/ai.js";

const router: IRouter = Router();

/**
 * GET /api/ai/context
 *
 * Returns user account context for AI enrichment in Dashboard Chat.
 * This data is injected into the system prompt so AI knows:
 * - User's project list (titles, status, progress, subjects)
 * - Subscription tier and expiry
 * - Saldo balance
 * - Preferred AI tier
 * - Menu structure of Teora
 *
 * DECISION 026: This endpoint powers the "dashboard.global" scope.
 */

interface ProjectSummary {
  id: number;
  title: string | null;
  status: string;
  progress: number;
  subject: string | null;
  taskType: string | null;
  updatedAt: Date;
}

interface SubscriptionInfo {
  tier: string;
  expiresAt: Date | null;
  status: "active" | "expired" | "none";
}

interface BalanceInfo {
  cents: number;
  display: string;
  autofallbackEnabled: boolean;
}

interface ContextResponse {
  user: {
    id: string;
    email: string;
    isOwner: boolean;
  };
  projects: ProjectSummary[];
  activeProjectCount: number;
  subscription: SubscriptionInfo;
  balance: BalanceInfo;
  preferredTier: {
    id: string;
    name: string;
    isFree: boolean;
  } | null;
  recentSubjects: string[];
  menuGuide: string;
  learningPathNote: string;
}

function formatBalance(cents: number): string {
  if (cents >= 100) {
    const rupiah = Math.floor(cents / 100);
    return `Rp${rupiah.toLocaleString("id-ID")}`;
  }
  return `${cents} Credits`;
}

router.get("/ai/context", async (req, res): Promise<void> => {
  if (!req.user?.id) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const userId = req.user.id;
  const userEmail = req.user.email ?? "";
  const isOwner = isOwnerEmail(userEmail);

  try {
    // 1. Get user's projects (exclude dashboard_chat scratchpad)
    const projects = await db
      .select({
        id: projectsTable.id,
        title: projectsTable.title,
        status: projectsTable.status,
        progress: projectsTable.progress,
        subject: projectsTable.subject,
        taskType: projectsTable.taskType,
        updatedAt: projectsTable.updatedAt,
      })
      .from(projectsTable)
      .where(
        and(
          eq(projectsTable.userId, userId),
          ne(projectsTable.taskType, "dashboard_chat")
        )
      )
      .orderBy(desc(projectsTable.updatedAt))
      .limit(20); // Top 20 most recent

    // 2. Get subscription info
    let subscription: SubscriptionInfo = { tier: "none", expiresAt: null, status: "none" };
    const activeSubs = await db
      .select({
        packageId: subscriptionsTable.packageId,
        expiresAt: subscriptionsTable.expiresAt,
      })
      .from(subscriptionsTable)
      .where(
        and(
          eq(subscriptionsTable.userId, userId),
          sql`${subscriptionsTable.expiresAt} > NOW()`
        )
      )
      .limit(1);

    if (activeSubs.length > 0) {
      const [sub] = activeSubs;
      const [pkg] = await db
        .select({ tier: packagesTable.tier })
        .from(packagesTable)
        .where(eq(packagesTable.id, sub.packageId))
        .limit(1);

      subscription = {
        tier: pkg?.tier ?? "unknown",
        expiresAt: sub.expiresAt ?? null,
        status: "active",
      };
    } else {
      subscription.status = "expired";
    }

    // 3. Get balance info
    const [balance] = await db
      .select({
        balanceCents: userBalancesTable.balanceCents,
        autofallbackEnabled: userBalancesTable.autofallbackEnabled,
      })
      .from(userBalancesTable)
      .where(eq(userBalancesTable.userId, userId))
      .limit(1);

    const balanceInfo: BalanceInfo = {
      cents: balance?.balanceCents ?? 0,
      display: formatBalance(balance?.balanceCents ?? 0),
      autofallbackEnabled: balance?.autofallbackEnabled ?? true,
    };

    // 4. Get preferred AI tier
    let preferredTier: ContextResponse["preferredTier"] = null;
    try {
      const tiers = await getAllActiveTiers();
      // Find user's preferred tier from balance data (passed via header or use first available)
      const firstTier = tiers[0];
      if (firstTier) {
        preferredTier = {
          id: firstTier.id,
          name: firstTier.name,
          isFree: firstTier.isFree,
        };
      }
    } catch {
      // Ignore tier loading errors — return null preferred tier
    }

    // 5. Extract recent subjects from projects
    const subjectCounts: Record<string, number> = {};
    for (const p of projects) {
      if (p.subject) {
        subjectCounts[p.subject] = (subjectCounts[p.subject] ?? 0) + 1;
      }
    }
    const recentSubjects = Object.entries(subjectCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([subject]) => subject);

    // 6. Build menu guide
    const menuGuide = `MENU UTAMA TEORA:
1. Dashboard — Ringkasan aktivitas dan shortcut ke fitur utama
2. Task Mentor — Kerjakan tugas akademik dengan AI (mode: Generate, Revise, Socratic, Quiz, Summary)
3. Pustaka Saya — Kelola referensi dan sitasi (format: APA, MLA, Chicago, dll)
4. Akun — Kelola langganan, saldo, dan preferensi AI

CARA PAKAI:
- Buat task baru: Klik "New Task" → Pilih jenis (General/Academic) → Isi instruksi → Klik "Mulai Kerjakan"
- AI di Task Mentor fokus ke project aktif. Untuk konsultasi umum, gunakan Dashboard Teora Assistant.
- Export dokumen: Di workspace, klik menu → Export → Pilih format (DOCX/PDF)
- Kelola referensi: Di Pustaka Saya, cari via CrossRef atau tambah manual`;

    // 7. Learning path placeholder (Item 3)
    const learningPathNote = `CATATAN: Fitur "Progres Belajar" sedang dalam pengembangan.
Untuk saat ini, AI belum memiliki akses ke data progres pembelajaran individual.
Progres yang terlihat adalah progress project (draft/completed/archived), bukan progres pembelajaran siswa.`;

    const response: ContextResponse = {
      user: {
        id: userId,
        email: userEmail,
        isOwner,
      },
      projects: projects.map((p) => ({
        id: p.id,
        title: p.title,
        status: p.status,
        progress: p.progress,
        subject: p.subject,
        taskType: p.taskType,
        updatedAt: p.updatedAt,
      })),
      activeProjectCount: projects.filter((p) => p.status !== "archived").length,
      subscription,
      balance: balanceInfo,
      preferredTier,
      recentSubjects,
      menuGuide,
      learningPathNote,
    };

    res.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: "Failed to load user context", detail: message });
  }
});

export default router;

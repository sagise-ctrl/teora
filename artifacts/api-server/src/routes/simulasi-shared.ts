import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import {
  db,
  simulationSessionsTable,
  simulationMessagesTable,
  simulationReportsTable,
  shareTokensTable,
} from "@workspace/db";
import {
  GetSharedSimulationReportParams,
} from "@workspace/api-zod";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

// GET /shared/simulasi/:tokenId — public shared report
router.get("/shared/simulasi/:tokenId", async (req, res): Promise<void> => {
  const params = GetSharedSimulationReportParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { tokenId } = params.data;

  // Validate share token
  const [token] = await db
    .select()
    .from(shareTokensTable)
    .where(and(
      eq(shareTokensTable.token, tokenId),
      eq(shareTokensTable.type, "simulation_report"),
      eq(shareTokensTable.isRevoked, false)
    ));

  if (!token) {
    res.status(404).json({ error: "Token tidak valid atau sudah kadaluarsa" });
    return;
  }

  if (token.expiresAt && new Date() > token.expiresAt) {
    res.status(410).json({ error: "Link sudah kadaluarsa" });
    return;
  }

  // Get the session
  const [session] = await db
    .select()
    .from(simulationSessionsTable)
    .where(eq(simulationSessionsTable.id, token.resourceId));

  if (!session) {
    res.status(404).json({ error: "Sesi simulasi tidak ditemukan" });
    return;
  }

  // Get messages
  const messages: import("@workspace/db").SimulationMessage[] = await db
    .select()
    .from(simulationMessagesTable)
    .where(eq(simulationMessagesTable.sessionId, session.id))
    .orderBy(simulationMessagesTable.sequenceIndex);

  // Get report
  const [report] = await db
    .select()
    .from(simulationReportsTable)
    .where(eq(simulationReportsTable.sessionId, session.id))
    .limit(1);

  logger.info({ tokenId, sessionId: session.id }, "Shared simulation report accessed");

  res.json({
    session: {
      id: session.id,
      persona: session.persona,
      status: session.status,
      questionsAsked: session.questionsAsked,
      totalCostCents: session.totalCostCents,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
    },
    messages: messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      sequenceIndex: m.sequenceIndex,
    })),
    report: report ?? null,
    sharedAt: token.createdAt,
  });
});

export default router;

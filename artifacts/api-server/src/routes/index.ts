import { Router, type IRouter } from "express";
import { authMiddleware } from "../middlewares/auth.js";
import { aiLimiter } from "../lib/ai-limiter.js";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import sharedRouter from "./shared.js";
import projectsRouter from "./projects.js";
import messagesRouter from "./messages.js";
import documentsRouter from "./documents.js";
import referencesRouter from "./references.js";
import attachmentsRouter from "./attachments.js";
import activitiesRouter from "./activities.js";
import jobsRouter from "./jobs.js";
import metadataRouter from "./metadata.js";
import exportsRouter from "./exports.js";
import aiUsageRouter from "./ai-usage.js";
import commentsRouter from "./comments.js";
import projectMembersRouter from "./project-members.js";
import quizzesRouter from "./quizzes.js";
import rubricsRouter from "./rubrics.js";
import writingStyleRouter from "./writing-style.js";
import aiTiersRouter from "./ai-tiers.js";
import packagesRouter from "./packages.js";
import balanceRouter from "./balance.js";
import autofallbackRouter from "./autofallback.js";
import subscriptionsRouter from "./subscriptions.js";
import profileRouter from "./profile.js";
import accountReferencesRouter from "./account-references.js";
import learningActivitiesRouter from "./learning-activities.js";
import usageRouter from "./usage.js";
import documentTemplatesRouter from "./document-templates.js";
import adminAiTiersRouter from "./admin-ai-tiers.js";
import adminRouter from "./admin.js";
import referralRouter from "./referral.js";
import simulasiRouter from "./simulasi.js";
import simulasiSharedRouter from "./simulasi-shared.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(sharedRouter);
// Webhook handler — no auth (signature-verified instead). MUST be registered
// BEFORE router.use(authMiddleware) per DECISION 006.
// Note: referralWebhookRouter is mounted in app.ts with express.raw() before
// express.json() to preserve raw body for HMAC verification.
router.use(authMiddleware);

router.use(aiTiersRouter);
router.use(packagesRouter);

// AI rate limiter — mounted AFTER authMiddleware so req.user.id is populated.
// keyGenerator uses req.user.id for per-user quota (not per-IP).
// These paths cover all AI-generating endpoints (chat, quiz, rubric,
// references, analyze, outline, documents/generate, writing-style).
// See .ai/ai-api-audit-report-20260905.md for full analysis.
router.use("/projects/:projectId/messages", aiLimiter);
router.use("/projects/:projectId/quizzes", aiLimiter);
router.use("/projects/:projectId/references", aiLimiter);
router.use("/projects/:projectId/analyze", aiLimiter);
router.use("/projects/:projectId/outline", aiLimiter);
router.use("/projects/:projectId/documents/generate", aiLimiter);
router.use("/users/me/writing-style/analyze", aiLimiter);
router.use("/projects/:projectId/simulasi", aiLimiter);

router.use(projectsRouter);
router.use(messagesRouter);
router.use(documentsRouter);
router.use(referencesRouter);
router.use(accountReferencesRouter);
router.use(learningActivitiesRouter);
router.use(attachmentsRouter);
router.use(activitiesRouter);
router.use(jobsRouter);
router.use(metadataRouter);
router.use(exportsRouter);
router.use(aiUsageRouter);
router.use(commentsRouter);
router.use(projectMembersRouter);
router.use(quizzesRouter);
router.use(rubricsRouter);
router.use(writingStyleRouter);
router.use(balanceRouter);
router.use(autofallbackRouter);
router.use(subscriptionsRouter);
router.use(usageRouter);
router.use(documentTemplatesRouter);
router.use(adminAiTiersRouter);
router.use(adminRouter);
router.use(referralRouter);
router.use(simulasiRouter);
router.use(simulasiSharedRouter);

export default router;

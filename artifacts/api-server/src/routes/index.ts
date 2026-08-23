import { Router, type IRouter } from "express";
import { authMiddleware } from "../middlewares/auth";
import healthRouter from "./health";
import authRouter from "./auth";
import sharedRouter from "./shared";
import projectsRouter from "./projects";
import messagesRouter from "./messages";
import documentsRouter from "./documents";
import referencesRouter from "./references";
import attachmentsRouter from "./attachments";
import activitiesRouter from "./activities";
import jobsRouter from "./jobs";
import metadataRouter from "./metadata";
import exportsRouter from "./exports";
import aiUsageRouter from "./ai-usage";
import commentsRouter from "./comments";
import projectMembersRouter from "./project-members";
import quizzesRouter from "./quizzes";
import rubricsRouter from "./rubrics";
import writingStyleRouter from "./writing-style";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
// Public endpoint — no auth required for shared project access
router.use(sharedRouter);
router.use(authMiddleware);
router.use(projectsRouter);
router.use(messagesRouter);
router.use(documentsRouter);
router.use(referencesRouter);
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

export default router;

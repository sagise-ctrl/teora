import { Router, type IRouter } from "express";
import healthRouter from "./health";
import projectsRouter from "./projects";
import messagesRouter from "./messages";
import documentsRouter from "./documents";
import referencesRouter from "./references";
import attachmentsRouter from "./attachments";
import activitiesRouter from "./activities";
import jobsRouter from "./jobs";
import metadataRouter from "./metadata";
import exportsRouter from "./exports";

const router: IRouter = Router();

router.use(healthRouter);
router.use(projectsRouter);
router.use(messagesRouter);
router.use(documentsRouter);
router.use(referencesRouter);
router.use(attachmentsRouter);
router.use(activitiesRouter);
router.use(jobsRouter);
router.use(metadataRouter);
router.use(exportsRouter);

export default router;

import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, attachmentsTable } from "@workspace/db";
import {
  ListAttachmentsParams,
  UploadAttachmentParams,
  UploadAttachmentBody,
  DeleteAttachmentParams,
} from "@workspace/api-zod";
import { logActivity } from "../lib/activity.js";
import { requireProjectOwnership } from "../lib/ownership.js";
import { sanitizeFileContent } from "../lib/prompt-injection.js";
import { supabaseAdmin } from "../lib/supabase-admin.js";
import path from "path";

const BUCKET_ID = "attachments";

const router: IRouter = Router();

// GET /projects/:projectId/attachments
router.get("/projects/:projectId/attachments", async (req, res): Promise<void> => {
  const params = ListAttachmentsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  if (!req.user?.id) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const ok = await requireProjectOwnership(params.data.projectId, req.user.id, res);
  if (!ok) return;

  const attachments = await db
    .select()
    .from(attachmentsTable)
    .where(eq(attachmentsTable.projectId, params.data.projectId));

  res.json(
    attachments.map((a) => ({
      ...a,
      mimeType: a.mimeType ?? null,
      sizeBytes: a.sizeBytes ?? null,
      extractedText: a.extractedText ?? null,
    }))
  );
});

// POST /projects/:projectId/attachments
router.post("/projects/:projectId/attachments", async (req, res): Promise<void> => {
  const params = UploadAttachmentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  if (!req.user?.id) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const ok = await requireProjectOwnership(params.data.projectId, req.user.id, res);
  if (!ok) return;

  const parsed = UploadAttachmentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const buffer = Buffer.from(parsed.data.base64Content, "base64");
  const safeFilename = `${Date.now()}-${path.basename(parsed.data.filename)}`;
  const storagePath = `${params.data.projectId}/${req.user!.id}/${safeFilename}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from(BUCKET_ID)
    .upload(storagePath, buffer, {
      contentType: parsed.data.mimeType ?? "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    res.status(500).json({ error: "Failed to upload file: " + uploadError.message });
    return;
  }

  let extractedText: string | null = null;
  if (parsed.data.mimeType?.includes("text") || parsed.data.filename.endsWith(".md")) {
    const rawText = buffer.toString("utf-8").substring(0, 50000);
    extractedText = sanitizeFileContent(rawText);
  }

  const [attachment] = await db
    .insert(attachmentsTable)
    .values({
      projectId: params.data.projectId,
      filename: storagePath,
      originalName: parsed.data.filename,
      mimeType: parsed.data.mimeType ?? null,
      sizeBytes: buffer.length,
      attachmentType: parsed.data.attachmentType,
      extractedText,
    })
    .returning();

  await logActivity(
    params.data.projectId,
    "attachment_uploaded",
    `File "${parsed.data.filename}" diunggah`
  );

  res.status(201).json({
    ...attachment,
    mimeType: attachment.mimeType ?? null,
    sizeBytes: attachment.sizeBytes ?? null,
    extractedText: attachment.extractedText ?? null,
  });
});

// DELETE /projects/:projectId/attachments/:attachmentId
router.delete(
  "/projects/:projectId/attachments/:attachmentId",
  async (req, res): Promise<void> => {
    const params = DeleteAttachmentParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    if (!req.user?.id) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const ok = await requireProjectOwnership(params.data.projectId, req.user.id, res);
    if (!ok) return;

    const [attachment] = await db
      .delete(attachmentsTable)
      .where(eq(attachmentsTable.id, params.data.attachmentId))
      .returning();

    if (!attachment) {
      res.status(404).json({ error: "Attachment not found" });
      return;
    }

    await supabaseAdmin.storage
      .from(BUCKET_ID)
      .remove([attachment.filename]);

    res.sendStatus(204);
  }
);

// GET /projects/:projectId/attachments/:attachmentId/download
router.get(
  "/projects/:projectId/attachments/:attachmentId/download",
  async (req, res): Promise<void> => {
    const params = DeleteAttachmentParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    if (!req.user?.id) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const ok = await requireProjectOwnership(params.data.projectId, req.user.id, res);
    if (!ok) return;

    const [attachment] = await db
      .select()
      .from(attachmentsTable)
      .where(eq(attachmentsTable.id, params.data.attachmentId));

    if (!attachment) {
      res.status(404).json({ error: "Attachment not found" });
      return;
    }

    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET_ID)
      .download(attachment.filename);

    if (error || !data) {
      res.status(404).json({ error: "File not found in storage" });
      return;
    }

    const buffer = Buffer.from(await data.arrayBuffer());
    res.set({
      "Content-Type": attachment.mimeType ?? "application/octet-stream",
      "Content-Disposition": `attachment; filename="${attachment.originalName}"`,
      "Content-Length": buffer.length,
    });
    res.end(buffer);
  }
);

export default router;


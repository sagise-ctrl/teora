import type { Request, Response, NextFunction } from "express";

const OWNER_EMAIL = process.env.OWNER_EMAIL ?? "";

/**
 * Checks if the authenticated user is the owner.
 * Must be called AFTER authMiddleware (req.user is set).
 */
export function requireOwner(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  if (req.user.email?.toLowerCase() !== OWNER_EMAIL.toLowerCase()) {
    res.status(403).json({ error: "Forbidden — admin access required" });
    return;
  }

  next();
}

/**
 * Checks if the authenticated user is the owner — returns boolean without sending response.
 * Use this for conditional logic (e.g., adding owner-only UI elements).
 */
export function isOwnerEmail(email: string | undefined): boolean {
  if (!email || !OWNER_EMAIL) return false;
  return email.toLowerCase() === OWNER_EMAIL.toLowerCase();
}

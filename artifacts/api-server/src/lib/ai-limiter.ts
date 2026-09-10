import rateLimit from "express-rate-limit";

/**
 * Rate limiter for AI-generating endpoints (30 requests per user per minute).
 *
 * IMPORTANT: This MUST be mounted AFTER authMiddleware so that `req.user.id` is
 * populated. Mounting before auth (in app.ts) caused req.user to be undefined
 * and the limiter fell back to per-IP keying — defeating per-user quota.
 *
 * See: .ai/ai-api-audit-report-20260905.md for full analysis.
 *
 * User-level quota enforcement will be added after payment system is implemented.
 */
export const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // req.user is guaranteed set because this limiter is mounted after authMiddleware
    // in routes/index.ts. Fallback to IP only as a defensive guard.
    return req.user?.id ?? req.ip ?? "unknown";
  },
  message: { error: "Terlalu banyak permintaan AI. Silakan tunggu sebentar." },
});

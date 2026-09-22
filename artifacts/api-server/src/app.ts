import express, { type Express } from "express";
import type { Request } from "express";
import cors from "cors";
import { pinoHttp } from "pino-http";
import router from "./routes/index.js";
import webhooksRouter from "./routes/webhooks.js";
import referralWebhookRouter from "./routes/referral-webhook.js";
import { logger } from "./lib/logger.js";

const app: Express = express();

// Trust Vercel's proxy so req.ip reflects the real client IP.
// Required by express-rate-limit when X-Forwarded-For is present.
app.set("trust proxy", 1);

// Test endpoint — if this returns 200, Express is running
app.get("/test", (_req, res) => {
  res.json({ ok: true, ts: Date.now() });
});

// CORS — whitelist production domains, allow localhost for development
const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? "http://localhost:5173,http://localhost:18543")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req: { id: unknown; method: string; url?: string }) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res: { statusCode: number }) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g., mobile apps, server-to-server, curl)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      // Deny without throwing — throwing becomes a 500; this becomes a clean 403
      logger.warn({ origin, allowedOrigins }, "CORS: origin not allowed");
      return callback(null, false);
    },
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// H4 fix: Mount referral webhook with express.raw() BEFORE express.json().
// This preserves the raw Buffer body needed for HMAC signature verification.
// The HMAC must be computed over the exact bytes sent by the payment gateway,
// not the JSON-parsed representation (JSON.stringify can change whitespace/ordering).
app.use("/webhooks/payment-success", express.raw({ type: "application/json" }), referralWebhookRouter);
// email-verified webhook uses JSON body (parsed by express.json() above) — secret header check only
app.use("/webhooks", webhooksRouter);

// Rate limiting for auth endpoints lives PER-ROUTE inside routes/auth.ts
// (loginLimiter + registerLimiter). It used to be mounted blanket at
// `/api/auth` here, but a Google OAuth flow consumes ~5 calls per attempt
// (login + me + refresh + me), so 2 OAuth attempts would hit the 5/min cap
// and lock the user out — see `ERR-007` in `.ai/lessons-learned.md` and the
// owner incident report from 2026-09-21.
//
// aiLimiter lives in lib/ai-limiter.ts and is mounted per-route in routes/index.ts
// AFTER authMiddleware — see audit report .ai/ai-api-audit-report-20260905.md.

app.use("/api", router);

// Global error handler — catches unhandled errors (including async rejections
// from Express 4.x handlers) and returns a JSON 500 instead of letting
// Vercel render an HTML error page. MUST be registered last so route-level
// errors (e.g. res.status(401).json) are not intercepted.
// DECISION 021. Owner encountered HTML <pre>Internal Server Error</pre> on
// POST /api/projects when title was null and DB rejected the insert.
app.use((err: Error, req: Request, res: import("express").Response, _next: import("express").NextFunction) => {
  logger.error(
    { err, url: req.url, method: req.method },
    "Unhandled error in API request",
  );
  res.status(500).json({
    error: "internal_server_error",
    message: "Terjadi kesalahan pada server. Silakan coba lagi.",
  });
});

export default app;

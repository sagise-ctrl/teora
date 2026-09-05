import express, { type Express } from "express";
import cors from "cors";
import { pinoHttp } from "pino-http";
import rateLimit from "express-rate-limit";
import router from "./routes/index.js";
import webhooksRouter from "./routes/webhooks.js";
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

// Webhook endpoints (no auth, secret-based validation)
app.use("/webhooks", webhooksRouter);

// Rate limiter for auth endpoints (5 attempts per IP per minute)
// Auth endpoints don't need req.user (they SET it via login/register), so
// mounting at app level before the router is fine here.
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === "/healthz",
  message: { error: "Terlalu banyak percobaan. Silakan coba lagi setelah satu menit." },
});

// aiLimiter lives in lib/ai-limiter.ts and is mounted per-route in routes/index.ts
// AFTER authMiddleware — see audit report .ai/ai-api-audit-report-20260905.md.

app.use("/api/auth", authLimiter);

app.use("/api", router);

export default app;

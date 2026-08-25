import express, { type Express } from "express";
import cors from "cors";
import { pinoHttp } from "pino-http";
import rateLimit from "express-rate-limit";
import router from "./routes/index.js";
import webhooksRouter from "./routes/webhooks.js";
import { logger } from "./lib/logger.js";

const app: Express = express();

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
      // Allow requests with no origin (e.g., mobile apps, server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Webhook endpoints (no auth, secret-based validation)
app.use("/webhooks", webhooksRouter);

// Rate limiter for auth endpoints (5 attempts per IP per minute)
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === "/healthz",
  message: { error: "Too many attempts. Please try again after a minute." },
});

// Rate limiter for AI endpoints (30 requests per user per minute)
// User-level quota enforcement will be added after payment system is implemented
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id ?? req.ip ?? "unknown",
  message: { error: "Too many AI requests. Please wait a moment." },
});

// Rate-limit auth routes
app.use("/api/auth", authLimiter);

// Rate-limit AI endpoints
app.use("/api/projects/:projectId/messages", aiLimiter);
app.use("/api/projects/:projectId/references/regenerate", aiLimiter);
app.use("/api/projects/:projectId/analyze", aiLimiter);

app.use("/api", router);

export default app;

import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import rateLimit from "express-rate-limit";
import router from "./routes";
import webhooksRouter from "./routes/webhooks";
import { logger } from "./lib/logger";

const app: Express = express();

// Rate limiter for auth endpoints (5 attempts per IP per minute)
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === "/healthz",
  message: { error: "Too many attempts. Please try again after a minute." },
});

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Webhook endpoints (no auth, secret-based validation)
app.use("/webhooks", webhooksRouter);

// Rate-limit auth routes
app.use("/api/auth", authLimiter);

app.use("/api", router);

export default app;

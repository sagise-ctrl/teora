import { Router, type IRouter } from "express";

const router: IRouter = Router();

// GET /api/diag — show which env vars are readable at runtime
router.get("/diag", (_req, res) => {
  const allKeys = Object.keys(process.env).sort();
  res.json({
    envVars: {
      OLAGON_API_KEY: process.env.OLAGON_API_KEY ? "[SET]" : "[EMPTY]",
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ? "[SET]" : "[EMPTY]",
      AI_API_KEY: process.env.AI_API_KEY ? "[SET]" : "[EMPTY]",
      OWNER_EMAIL: process.env.OWNER_EMAIL ? "[SET]" : "[EMPTY]",
      AI_PROVIDER: process.env.AI_PROVIDER ?? "[NOT SET]",
      AI_BASE_URL: process.env.AI_BASE_URL ?? "[NOT SET]",
      SUPABASE_URL: process.env.SUPABASE_URL ?? "[NOT SET]",
      SUPABASE_JWT_SECRET: process.env.SUPABASE_JWT_SECRET ? "[SET]" : "[EMPTY]",
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? "[SET]" : "[EMPTY]",
      DATABASE_URL: !!process.env.DATABASE_URL,
      DATABASE_POOLER_URL: !!process.env.DATABASE_POOLER_URL,
      VERBOSE_allKeys: allKeys,
    },
  });
});

export default router;

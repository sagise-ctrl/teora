import type { Request, Response, NextFunction } from "express";
import * as jose from "jose";
import { logger } from "../lib/logger.js";

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET ?? "";

logger.info({ SUPABASE_URL, SUPABASE_JWT_SECRET_set: !!SUPABASE_JWT_SECRET }, "Auth middleware loaded");

// JWKS cache — cached indefinitely (keys rarely rotate)
let jwks: jose.JWTVerifyGetKey | null = null;

async function getJwks(): Promise<jose.JWTVerifyGetKey> {
  if (jwks) return jwks;
  // Supabase hosted JWKS endpoint: /auth/v1/.well-known/jwks.json (NOT /jwt/v1/keys)
  // Modern Supabase (2024+) signs access tokens with ES256 (asymmetric, JWKS).
  // Legacy / local dev uses HS256 (symmetric, SUPABASE_JWT_SECRET).
  const jwksUrl = new URL(`${SUPABASE_URL}/auth/v1/.well-known/jwks.json`);
  logger.info({ jwksUrl: jwksUrl.toString() }, "getJwks: JWKS URL");
  jwks = jose.createRemoteJWKSet(jwksUrl, {
    // Allow ES256 — Supabase uses P-256 ECDSA keys
    allowedJWSSigParams: new Set(["ES256", "ES384", "ES512"]),
  });
  return jwks;
}

export interface AuthUser {
  id: string; // Supabase user ID (UUID)
  email?: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- module augmentation requires namespace syntax
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/** Detect algorithm from JWT header without verification (safe — header is base64, not crypto).
 *  Returns "unknown" if the token format is not recognized. */
function detectJwtAlgorithm(token: string): string {
  try {
    const [headerB64] = token.split(".");
    const headerJson = Buffer.from(headerB64, "base64url").toString("utf-8");
    const header = JSON.parse(headerJson);
    return header.alg ?? "unknown";
  } catch {
    return "unknown";
  }
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // Extract token from cookie first, then Authorization header
  const token =
    req.cookies?.sb_access_token ||
    req.headers.authorization?.replace("Bearer ", "") ||
    req.headers["x-supabase-access-token"] as string | undefined;

  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const alg = detectJwtAlgorithm(token);
    const secret = SUPABASE_JWT_SECRET || undefined;
    let payload: jose.JWTPayload;

    // Algorithm routing:
    // - HS256/HS384/HS512: symmetric, verify with SUPABASE_JWT_SECRET
    // - ES256/ES384/ES512/EdDSA/RS256/etc: asymmetric, verify with JWKS
    const isSymmetricAlg = alg === "HS256" || alg === "HS384" || alg === "HS512";

    if (isSymmetricAlg && secret) {
      // Legacy Supabase (local dev): verify with symmetric secret
      const { payload: p } = await jose.jwtVerify(token, new TextEncoder().encode(secret));
      payload = p;
      logger.info({ userId: payload.sub as string, email: payload.email as string, alg }, "authMiddleware: HS256 verified");
    } else {
      // Modern Supabase (Google OAuth / production): verify with JWKS
      const keySet = await getJwks();
      const { payload: p } = await jose.jwtVerify(token, keySet);
      payload = p;
      logger.info({ userId: payload.sub as string, email: payload.email as string, alg }, "authMiddleware: JWKS verified");
    }

    req.user = {
      id: payload.sub as string,
      email: payload.email as string | undefined,
    };

    next();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const alg = detectJwtAlgorithm(token);
    logger.warn(
      { err: msg, alg, hasSecret: !!SUPABASE_JWT_SECRET, supabaseUrl: SUPABASE_URL || "[EMPTY]" },
      "authMiddleware: token verify failed"
    );
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

// Optional auth — sets user if token present, but doesn't block if missing
export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token =
    req.cookies?.sb_access_token ||
    req.headers.authorization?.replace("Bearer ", "") ||
    req.headers["x-supabase-access-token"] as string | undefined;

  if (!token) {
    next();
    return;
  }

  try {
    const alg = detectJwtAlgorithm(token);
    const secret = SUPABASE_JWT_SECRET || undefined;
    let payload: jose.JWTPayload;

    const isSymmetricAlg = alg === "HS256" || alg === "HS384" || alg === "HS512";

    if (isSymmetricAlg && secret) {
      const { payload: p } = await jose.jwtVerify(token, new TextEncoder().encode(secret));
      payload = p;
    } else {
      const keySet = await getJwks();
      const { payload: p } = await jose.jwtVerify(token, keySet);
      payload = p;
    }

    req.user = {
      id: payload.sub as string,
      email: payload.email as string | undefined,
    };
  } catch {
    // Token invalid — user remains undefined
  }

  next();
}

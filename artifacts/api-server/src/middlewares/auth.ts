import type { Request, Response, NextFunction } from "express";
import * as jose from "jose";

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET ?? "";

// JWKS cache
let jwks: jose.JWTVerifyGetKey | null = null;

async function getJwks(): Promise<jose.JWTVerifyGetKey> {
  if (jwks) return jwks;
  // Supabase hosted JWKS endpoint: /auth/v1/.well-known/jwks.json (NOT /jwt/v1/keys)
  // Modern Supabase (2024+) signs access tokens with ES256 (asymmetric, JWKS).
  // Legacy / local dev uses HS256 (symmetric, SUPABASE_JWT_SECRET).
  const jwksUrl = new URL(`${SUPABASE_URL}/auth/v1/.well-known/jwks.json`);
  jwks = jose.createRemoteJWKSet(jwksUrl);
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
    const secret = SUPABASE_JWT_SECRET || undefined;
    let payload: jose.JWTPayload;

    // Try HS256 first (legacy / local dev tokens).
    // If SUPABASE_JWT_SECRET is set but the token is signed with ES256 (modern Supabase
    // Google OAuth), HS256 verify throws "Invalid Compact JWS" — fall back to JWKS.
    let verified = false;
    if (secret) {
      try {
        const { payload: p } = await jose.jwtVerify(token, new TextEncoder().encode(secret));
        payload = p;
        verified = true;
      } catch {
        // HS256 failed — fall through to JWKS
      }
    }

    if (!verified) {
      // Production: verify with JWKS (covers ES256 and RS256).
      const keySet = await getJwks();
      const { payload: p } = await jose.jwtVerify(token, keySet);
      payload = p;
    }

    req.user = {
      id: payload.sub as string,
      email: payload.email as string | undefined,
    };

    next();
  } catch (err) {
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
    const secret = SUPABASE_JWT_SECRET || undefined;
    let payload: jose.JWTPayload;

    let verified = false;
    if (secret) {
      try {
        const { payload: p } = await jose.jwtVerify(token, new TextEncoder().encode(secret));
        payload = p;
        verified = true;
      } catch {
        // HS256 failed — fall through to JWKS
      }
    }

    if (!verified) {
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

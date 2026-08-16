import type { Request, Response, NextFunction } from "express";
import * as jose from "jose";

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET ?? "";

// JWKS cache
let jwks: jose.JWTVerifyGetKey | null = null;

async function getJwks(): Promise<jose.JWTVerifyGetKey> {
  if (jwks) return jwks;
  const jwksUrl = new URL(`${SUPABASE_URL}/jwt/v1/keys`);
  jwks = jose.createRemoteJWKSet(jwksUrl);
  return jwks;
}

export interface AuthUser {
  id: string; // Supabase user ID (UUID)
  email?: string;
}

declare global {
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
  let token =
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

    if (secret) {
      // Use secret for local development / anon key verification
      const { payload: p } = await jose.jwtVerify(token, new TextEncoder().encode(secret));
      payload = p;
    } else {
      // Production: verify with JWKS
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

    if (secret) {
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

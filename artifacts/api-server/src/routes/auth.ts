import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { customAlphabet } from "nanoid";
import { db, usersTable, referralsTable, referralEventsTable } from "@workspace/db";
import { authMiddleware } from "../middlewares/auth.js";

const router: IRouter = Router();

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

const supabaseAdmin: SupabaseClient | null = SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null;

const generateReferralCode = customAlphabet("ABCDEFGHJKMNPQRSTUVWXYZ23456789", 8);

// Username validation: 3-30 chars, alphanumeric + underscore only
const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,30}$/;

function validateUsername(username: string): string | null {
  if (!USERNAME_REGEX.test(username)) {
    return "Username must be 3-30 characters, letters, numbers, and underscores only";
  }
  return null;
}

function toUserJson(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    isOwner: user.isOwner,
    referralCode: user.referralCode,
    createdAt: user.createdAt,
  };
}

async function logReferralEvent(
  referralId: number,
  actorId: string | null,
  actorType: "system" | "user" | "admin",
  fromStatus: string | null,
  toStatus: string,
  reason: string,
  metadata?: Record<string, unknown>
) {
  await db.insert(referralEventsTable).values({
    referralId,
    actorId,
    actorType,
    fromStatus,
    toStatus,
    reason,
    metadata,
  });
}

// GET /auth/me
router.get("/auth/me", authMiddleware, async (req, res): Promise<void> => {
  if (!req.user?.id) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, req.user.id));

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(toUserJson(user));
});

// POST /auth/login
router.post("/auth/login", async (req, res): Promise<void> => {
  const { access_token, refresh_token } = req.body as {
    access_token?: string;
    refresh_token?: string;
  };

  if (!access_token) {
    res.status(400).json({ error: "access_token is required" });
    return;
  }

  const userResponse = await supabaseAdmin?.auth.getUser(access_token);

  if (!userResponse || userResponse.error || !userResponse.data?.user) {
    res.status(401).json({ error: "Invalid token" });
    return;
  }

  const supabaseUser = userResponse.data.user;

  // Backfill username from displayName or email for existing users (migration)
  const deriveUsername = (): string => {
    const raw =
      supabaseUser.user_metadata?.displayName ||
      supabaseUser.email?.split("@")[0] ||
      "user";
    return (
      raw
        .replace(/[^a-zA-Z0-9]/g, "_")
        .toLowerCase()
        .replace(/^[0-9_]+/, "")
        .substring(0, 20) || "user"
    );
  };

  const [localUser] = await db
    .insert(usersTable)
    .values({ id: supabaseUser.id, email: supabaseUser.email ?? "", username: deriveUsername() })
    .onConflictDoUpdate({
      target: usersTable.id,
      set: {
        email: supabaseUser.email ?? "",
        username: db.sql`COALESCE(${usersTable.username}, ${deriveUsername()})`,
      },
    })
    .returning();

  // Safety: if username is null, find unique suffix
  if (!localUser.username) {
    let candidate = deriveUsername();
    for (let i = 0; i < 10; i++) {
      const suffix = i === 0 ? "" : String(i + 1);
      const [existing] = await db
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(eq(usersTable.username, candidate + suffix));
      if (!existing) {
        await db
          .update(usersTable)
          .set({ username: candidate + suffix })
          .where(eq(usersTable.id, supabaseUser.id));
        break;
      }
    }
  }

  res.cookie("sb_access_token", access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 3600000,
    path: "/",
  });

  if (refresh_token) {
    res.cookie("sb_refresh_token", refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 604800000,
      path: "/",
    });
  }

  res.json(toUserJson(localUser));
});

// POST /auth/register
router.post("/auth/register", async (req, res): Promise<void> => {
  const { email, password, username, displayName, referralCode } = req.body as {
    email?: string;
    password?: string;
    username?: string;
    displayName?: string;
    referralCode?: string;
  };

  if (!email || !password) {
    res.status(400).json({ error: "email and password are required" });
    return;
  }

  if (!username) {
    res.status(400).json({ error: "username is required" });
    return;
  }

  const usernameError = validateUsername(username);
  if (usernameError) {
    res.status(400).json({ error: usernameError });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters" });
    return;
  }

  if (!supabaseAdmin) {
    res.status(500).json({ error: "Auth not configured" });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedUsername = username.trim().toLowerCase();

  // Step 1: Check username availability
  const [existingUsername] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.username, normalizedUsername));

  if (existingUsername) {
    res.status(400).json({ error: "This username is already taken. Please choose another." });
    return;
  }

  // Step 2: Lookup referral code (if provided)
  let referrerUser: typeof usersTable.$inferSelect | null = null;

  if (referralCode && referralCode.trim() !== "") {
    const code = referralCode.trim().toUpperCase();
    const [found] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.referralCode, code));

    if (found) {
      referrerUser = found;
    }
  }

  // Step 3: Create user in Supabase Auth
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: normalizedEmail,
    password,
    email_confirm: process.env.NODE_ENV === "development",
    user_metadata: { displayName: displayName ?? null, username: normalizedUsername },
  });

  if (authError) {
    const isDuplicate = authError.message.toLowerCase().includes("already");
    if (isDuplicate) {
      res.status(400).json({ error: "An account with this email already exists" });
      return;
    }
    res.status(400).json({ error: authError.message });
    return;
  }

  if (!authData?.user) {
    res.status(500).json({ error: "Failed to create user" });
    return;
  }

  const newUserId = authData.user.id;

  // Step 4: Anti self-referral
  if (referrerUser && referrerUser.id === newUserId) {
    referrerUser = null;
  }

  // Step 5: Generate referral code
  let newUserReferralCode: string | null = null;
  let codeCollision = true;
  let attempts = 0;

  while (codeCollision && attempts < 10) {
    const candidate = generateReferralCode();
    const [existing] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.referralCode, candidate));

    if (!existing) {
      newUserReferralCode = candidate;
      codeCollision = false;
    }
    attempts++;
  }

  if (!newUserReferralCode) {
    res.status(500).json({ error: "Failed to generate referral code" });
    return;
  }

  // Step 6: Create local user record
  const [localUser] = await db
    .insert(usersTable)
    .values({
      id: newUserId,
      email: normalizedEmail,
      username: normalizedUsername,
      displayName: displayName ?? null,
      referralCode: newUserReferralCode,
    })
    .returning();

  // Step 7: Create referral record (if valid referrer found)
  if (referrerUser) {
    const [existingReferral] = await db
      .select({ id: referralsTable.id })
      .from(referralsTable)
      .where(eq(referralsTable.referredId, newUserId));

    if (!existingReferral) {
      const [referral] = await db
        .insert(referralsTable)
        .values({
          referrerId: referrerUser.id,
          referredId: newUserId,
          referredEmail: normalizedEmail,
          referralCode: referralCode?.trim().toUpperCase() ?? "",
          status: "pending",
        })
        .returning();

      await logReferralEvent(
        referral.id,
        null,
        "system",
        null,
        "pending",
        "user_registered",
        { referralCode: referralCode?.trim().toUpperCase() }
      );
    }
  }

  // Step 8: Set auth cookies
  const session =
    "session" in authData
      ? (authData as { session?: { access_token: string; refresh_token: string } }).session
      : null;

  const responseBody: Record<string, unknown> = toUserJson(localUser);
  if (session) {
    responseBody.access_token = session.access_token;
  }

  if (session) {
    res.cookie("sb_access_token", session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 3600000,
      path: "/",
    });

    res.cookie("sb_refresh_token", session.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 604800000,
      path: "/",
    });
  }

  res.status(201).json(responseBody);
});

// POST /auth/logout
router.post("/auth/logout", (_req, res): void => {
  res.clearCookie("sb_access_token", { path: "/" });
  res.clearCookie("sb_refresh_token", { path: "/" });
  res.json({ message: "Logged out" });
});

// POST /auth/refresh
router.post("/auth/refresh", async (req, res): Promise<void> => {
  const refreshToken =
    (req.body as { refresh_token?: string })?.refresh_token ||
    req.cookies?.sb_refresh_token;

  if (!refreshToken || !supabaseAdmin) {
    res.status(401).json({ error: "No refresh token" });
    return;
  }

  const { data, error } = await supabaseAdmin.auth.refreshSession({
    refresh_token: refreshToken,
  });

  if (error || !data.session) {
    res.clearCookie("sb_access_token", { path: "/" });
    res.clearCookie("sb_refresh_token", { path: "/" });
    res.status(401).json({ error: "Session expired" });
    return;
  }

  res.cookie("sb_access_token", data.session.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 3600000,
    path: "/",
  });

  res.json({ message: "Token refreshed" });
});

// GET /auth/referrals
router.get("/auth/referrals", authMiddleware, async (req, res): Promise<void> => {
  if (!req.user?.id) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const referrals = await db
    .select()
    .from(referralsTable)
    .where(eq(referralsTable.referrerId, req.user.id));

  const stats = {
    total: referrals.length,
    pending: referrals.filter((r) => r.status === "pending").length,
    verified: referrals.filter((r) => r.status === "verified").length,
    qualified: referrals.filter((r) => r.status === "qualified").length,
    rewarded: referrals.filter((r) => r.status === "rewarded").length,
    rejected: referrals.filter((r) => r.status === "rejected").length,
  };

  res.json({ stats, referrals });
});

// GET /auth/check-username?username=xxx
router.get("/auth/check-username", async (req, res): Promise<void> => {
  const username = (req.query.username as string | undefined)?.trim().toLowerCase();

  if (!username) {
    res.status(400).json({ error: "username query parameter is required" });
    return;
  }

  const usernameError = validateUsername(username);
  if (usernameError) {
    res.json({ available: false, username });
    return;
  }

  const [existing] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.username, username));

  res.json({ available: !existing, username });
});

export default router;

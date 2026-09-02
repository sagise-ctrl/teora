import * as jose from "jose";

export const TEST_USER_ID = "123e4567-e89b-12d3-a456-426614174000";
export const TEST_USER_EMAIL = "test@example.com";
export const TEST_SECRET = "test-secret-key-for-testing-only-32chars";

export async function generateTestToken(
  userId: string = TEST_USER_ID,
  email: string = TEST_USER_EMAIL,
  expiresIn: string = "1h"
): Promise<string> {
  const secret = new TextEncoder().encode(TEST_SECRET);
  const payload = { sub: userId, email };
  return new jose.SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secret);
}

export async function generateExpiredToken(): Promise<string> {
  return generateTestToken(TEST_USER_ID, TEST_USER_EMAIL, "-1h");
}

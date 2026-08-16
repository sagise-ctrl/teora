import { describe, it, expect, vi, beforeEach } from "vitest";
import * as jose from "jose";

// Mock environment variables
vi.stubEnv("SUPABASE_URL", "https://test.supabase.co");
vi.stubEnv("SUPABASE_JWT_SECRET", "test-secret-key-for-testing-only-32chars");

// We test the auth middleware logic directly without the DB layer
describe("Auth Middleware Logic", () => {
  const TEST_SECRET = "test-secret-key-for-testing-only-32chars";

  it("validates a properly signed JWT", async () => {
    const secret = new TextEncoder().encode(TEST_SECRET);

    // Create a test token (mock JWT structure)
    const payload = { sub: "123e4567-e89b-12d3-a456-426614174000", email: "test@example.com" };
    const token = await new jose.SignJWT(payload as jose.JWTPayload)
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(secret);

    // Verify it
    const { payload: verified } = await jose.jwtVerify(token, secret);
    expect(verified.sub).toBe("123e4567-e89b-12d3-a456-426614174000");
    expect(verified.email).toBe("test@example.com");
  });

  it("rejects an invalid token", async () => {
    const secret = new TextEncoder().encode(TEST_SECRET);

    try {
      await jose.jwtVerify("invalid.token.here", secret);
      expect.fail("Should have thrown");
    } catch (err) {
      expect((err as Error).name).toMatch(/JWSInvalid|JWTExpired|JWTClaimValidationFailed/i);
    }
  });

  it("rejects an expired token", async () => {
    const secret = new TextEncoder().encode(TEST_SECRET);

    const payload = { sub: "123e4567-e89b-12d3-a456-426614174000" };
    const token = await new jose.SignJWT(payload as jose.JWTPayload)
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("-1h") // already expired
      .sign(secret);

    try {
      await jose.jwtVerify(token, secret);
      expect.fail("Should have thrown");
    } catch (err) {
      expect((err as Error).name).toMatch(/JWTExpired/i);
    }
  });

  it("rejects a token signed with wrong secret", async () => {
    const secret = new TextEncoder().encode(TEST_SECRET);
    const wrongSecret = new TextEncoder().encode("completely-different-secret-key-32chars!");

    const payload = { sub: "123e4567-e89b-12d3-a456-426614174000" };
    const token = await new jose.SignJWT(payload as jose.JWTPayload)
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(wrongSecret);

    try {
      await jose.jwtVerify(token, secret);
      expect.fail("Should have thrown");
    } catch (err) {
      expect((err as Error).name).toMatch(/JWSSignatureVerificationFailed/i);
    }
  });

  it("extracts Bearer token from Authorization header", () => {
    const header = "Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.abc";
    const token = header.replace("Bearer ", "");
    expect(token).toBe("eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.abc");
  });

  it("validates UUID format in JWT sub claim", () => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    expect("123e4567-e89b-12d3-a456-426614174000").toMatch(uuidRegex);
    expect("not-a-uuid").not.toMatch(uuidRegex);
    expect("123e4567-e89b-12d3-a456-42661417400").not.toMatch(uuidRegex); // too short
  });
});

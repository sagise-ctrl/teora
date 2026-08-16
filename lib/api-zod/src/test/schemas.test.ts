import { describe, it, expect } from "vitest";
import { z } from "zod";

import {
  LoginBody,
  RegisterBody,
  ListProjectsResponseItem,
  ListMessagesResponseItem,
  ListReferencesResponseItem,
  registerBodyEmailRegExp,
  registerBodyPasswordMin,
} from "@workspace/api-zod";

describe("Zod Schemas - Auth", () => {
  describe("LoginBody", () => {
    it("accepts valid login request", () => {
      const result = LoginBody.safeParse({
        access_token: "test-token",
        refresh_token: "refresh-token",
      });
      expect(result.success).toBe(true);
    });

    it("accepts login without refresh token", () => {
      const result = LoginBody.safeParse({ access_token: "test-token" });
      expect(result.success).toBe(true);
    });

    it("rejects login without access token", () => {
      const result = LoginBody.safeParse({});
      expect(result.success).toBe(false);
    });

    it("rejects access token wrong type", () => {
      const result = LoginBody.safeParse({ access_token: 123 });
      expect(result.success).toBe(false);
    });
  });

  describe("RegisterBody", () => {
    it("accepts valid register request", () => {
      const result = RegisterBody.safeParse({
        email: "test@example.com",
        password: "password123",
        displayName: "Test User",
        referralCode: "ABC12345",
      });
      expect(result.success).toBe(true);
    });

    it("accepts minimal register request", () => {
      const result = RegisterBody.safeParse({
        email: "test@example.com",
        password: "password123",
      });
      expect(result.success).toBe(true);
    });

    it("rejects missing email", () => {
      const result = RegisterBody.safeParse({ password: "password123" });
      expect(result.success).toBe(false);
    });

    it("rejects missing password", () => {
      const result = RegisterBody.safeParse({ email: "test@example.com" });
      expect(result.success).toBe(false);
    });

    it("rejects invalid email format", () => {
      const result = RegisterBody.safeParse({
        email: "not-an-email",
        password: "password123",
      });
      expect(result.success).toBe(false);
    });

    it("rejects password too short", () => {
      const result = RegisterBody.safeParse({
        email: "test@example.com",
        password: "12345",
      });
      expect(result.success).toBe(false);
    });

    it("accepts valid email per regex", () => {
      expect(registerBodyEmailRegExp.test("test@example.com")).toBe(true);
      expect(registerBodyEmailRegExp.test("user.name@domain.co.uk")).toBe(true);
      expect(registerBodyEmailRegExp.test("not-an-email")).toBe(false);
      expect(registerBodyEmailRegExp.test("@example.com")).toBe(false);
      expect(registerBodyEmailRegExp.test("test@")).toBe(false);
    });

    it("enforces minimum password length", () => {
      expect(registerBodyPasswordMin).toBe(6);
    });
  });
});

describe("Zod Schemas - Domain", () => {
  describe("ListProjectsResponseItem", () => {
    it("accepts minimal valid project", () => {
      const result = ListProjectsResponseItem.safeParse({
        id: 1,
        title: "My Project",
        status: "draft",
        progress: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      expect(result.success).toBe(true);
    });

    it("accepts valid status values", () => {
      const statuses = ["draft", "analyzing", "writing", "waiting_revision", "completed", "archived"];
      for (const status of statuses) {
        const result = ListProjectsResponseItem.safeParse({
          id: 1,
          title: "Test",
          status,
          progress: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        expect(result.success).toBe(true);
      }
    });

    it("rejects invalid status", () => {
      const result = ListProjectsResponseItem.safeParse({
        id: 1,
        title: "Test",
        status: "invalid_status",
        progress: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      expect(result.success).toBe(false);
    });

    it("accepts valid progress 0-100", () => {
      const result = ListProjectsResponseItem.safeParse({
        id: 1,
        title: "Test",
        status: "draft",
        progress: 50,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      expect(result.success).toBe(true);
    });
  });

  describe("ListMessagesResponseItem", () => {
    it("accepts valid user message", () => {
      const result = ListMessagesResponseItem.safeParse({
        id: 1,
        projectId: 1,
        content: "Hello, world!",
        role: "user",
        createdAt: new Date().toISOString(),
      });
      expect(result.success).toBe(true);
    });

    it("accepts valid assistant message", () => {
      const result = ListMessagesResponseItem.safeParse({
        id: 1,
        projectId: 1,
        content: "Hello! How can I help?",
        role: "assistant",
        createdAt: new Date().toISOString(),
      });
      expect(result.success).toBe(true);
    });

    it("accepts valid roles", () => {
      const roles = ["user", "assistant", "system"];
      for (const role of roles) {
        const result = ListMessagesResponseItem.safeParse({
          id: 1,
          projectId: 1,
          content: "test",
          role,
          createdAt: new Date().toISOString(),
        });
        expect(result.success).toBe(true);
      }
    });

    it("rejects invalid role", () => {
      const result = ListMessagesResponseItem.safeParse({
        id: 1,
        projectId: 1,
        content: "test",
        role: "invalid-role",
        createdAt: new Date().toISOString(),
      });
      expect(result.success).toBe(false);
    });
  });

  describe("ListReferencesResponseItem", () => {
    it("accepts valid reference with all required fields", () => {
      const data = {
        id: 1,
        projectId: 1,
        title: "Research Paper Title",
        validationStatus: "unverified",
        createdAt: new Date().toISOString(),
      };
      const result = ListReferencesResponseItem.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("accepts validation status values", () => {
      const statuses = ["unverified", "verified", "invalid"];
      for (const status of statuses) {
        const result = ListReferencesResponseItem.safeParse({
          id: 1,
          projectId: 1,
          title: "Test",
          validationStatus: status,
          createdAt: new Date().toISOString(),
        });
        expect(result.success).toBe(true);
      }
    });

    it("rejects invalid validation status", () => {
      const result = ListReferencesResponseItem.safeParse({
        id: 1,
        projectId: 1,
        title: "Test",
        validationStatus: "pending",
        createdAt: new Date().toISOString(),
      });
      expect(result.success).toBe(false);
    });

    it("accepts optional fields", () => {
      const result = ListReferencesResponseItem.safeParse({
        id: 1,
        projectId: 1,
        title: "Test Reference",
        authors: "John Doe, Jane Smith",
        year: 2024,
        journal: "Nature",
        volume: "42",
        issue: "3",
        doi: "10.1234/test.doi",
        url: "https://example.com",
        validationStatus: "verified",
        usedInChapters: "Chapter 1, Chapter 3",
        createdAt: new Date().toISOString(),
      });
      expect(result.success).toBe(true);
    });
  });
});

describe("Zod Schemas - Error Handling", () => {
  it("returns detailed error on invalid input", () => {
    const result = LoginBody.safeParse({ access_token: 123 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.length).toBeGreaterThan(0);
      expect(result.error.issues[0].path).toContain("access_token");
    }
  });

  it("handles completely invalid input gracefully", () => {
    const result = LoginBody.safeParse(null);
    expect(result.success).toBe(false);
  });

  it("handles undefined input gracefully", () => {
    const result = LoginBody.safeParse(undefined);
    expect(result.success).toBe(false);
  });

  it("handles wrong type array input gracefully", () => {
    const result = LoginBody.safeParse([]);
    expect(result.success).toBe(false);
  });
});

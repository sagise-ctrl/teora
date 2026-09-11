/**
 * Gap #5 — AI Gate Integration Tests
 *
 * Purpose: Lock in owner-confirmed AI gate behavior so future refactors can't
 * silently change it. Covers 3 functions in `src/lib/subscription.ts`:
 *
 * 1. checkAIAccess()       — pre-check subscription vs autofallback+saldo (dry-run)
 * 2. consumeQuotaForAIRequest() — apply actual quota/saldo deduction
 * 3. checkQuotaAndAccumulate() — quota enforcement (called by #2)
 *
 * Owner-confirmed behaviors (2026-09-09/11):
 * - Saldo is FREE-FOR-ALL for any model choice (not tied to subscription package)
 * - autofallbackEnabled defaults to TRUE for all new users
 * - Out-of-package AI requests use saldo (not a leak; intentional)
 *
 * @see docs/ai-team/development/ai-gate-integration-tests.md for full rationale
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Hoisted mock factory ───────────────────────────────────────────────
// Returns:
//   - DB_MOCK: chainable mock for `db`
//   - setScenario: per-test helper to populate mock data
//   - getBalanceUpdates / getTransactions / getUsageWindowUpdates: assertion helpers
//
// The chain tracks table name via Symbol.for("drizzle:tableName") (same pattern
// as routes.integration.test.ts) and dispatches data based on which table is
// being queried in .from().

const hoisted = vi.hoisted(() => {
  const USER_ID = "123e4567-e89b-12d3-a456-426614174000";

  // Inline table names (avoid TDZ by referencing TABLE from outside vi.hoisted)
  const T_SUB = "subscriptions";
  const T_PKG = "subscription_packages";
  const T_WIN = "usage_windows";
  const T_BAL = "user_balances";
  const T_TX = "token_transactions";

  // Mutable mock scenario state — set per-test via setScenario()
  const scenario: {
    activeSubscription: null | Record<string, unknown>;
    balance: null | Record<string, unknown>;
    usageWindow: null | Record<string, unknown>;
  } = {
    activeSubscription: null,
    balance: null,
    usageWindow: null,
  };

  // Track writes for assertions
  const writes = {
    balanceUpdates: [] as Array<{ balanceCents: number }>,
    transactions: [] as Array<{
      userId: string;
      type: string;
      amountCents: number;
      balanceAfterCents: number;
      description: string;
    }>,
    usageWindowUpdates: [] as Array<{
      haikuTokensUsed: number;
      sonnetTokensUsed: number;
      costCents: number;
      isExhausted: boolean;
    }>,
  };

  let _currentTable = "";
  let _lastOp: "select" | "insert" | "update" = "select";
  let _insertTable = "";
  let _joined = false;
  let _data: unknown[] = [];

  const getTableFromSymbol = (table: unknown): string => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const t = table as any;
    return (
      t[Symbol.for("drizzle:tableName")] as string ??
      t[Symbol.for("drizzle:Table")]?.config?.name as string ??
      t?._?.table?.name as string ??
      ""
    );
  };

  const chain = Object.create(Array.prototype, {
    select: { value: vi.fn().mockReturnThis() },
    from: {
      value: vi.fn().mockImplementation(function (this: typeof chain, table: unknown) {
        _currentTable = getTableFromSymbol(table);
        _joined = false; // Reset on .from()
        _data = [];
        return this;
      }),
    },
    where: {
      value: vi.fn().mockImplementation(function (this: typeof chain) {
        if (_lastOp !== "update") _lastOp = "select";

        // SELECT: dispatch based on current table
        // If .innerJoin() was called, return join shape {subscriptions, packages}
        // Otherwise return flat subscription/package row
        if (_currentTable === T_SUB && scenario.activeSubscription) {
          if (_joined) {
            _data = [{
              subscriptions: scenario.activeSubscription,
              packages: (scenario.activeSubscription as any).package,
            }];
          } else {
            _data = [scenario.activeSubscription];
          }
        } else if (_currentTable === T_PKG && scenario.activeSubscription) {
          _data = [(scenario.activeSubscription as any).package];
        } else if (_currentTable === T_WIN && scenario.usageWindow) {
          _data = [scenario.usageWindow];
        } else if (_currentTable === T_BAL && scenario.balance) {
          _data = [scenario.balance];
        } else {
          _data = [];
        }
        return this;
      }),
    },
    innerJoin: {
      value: vi.fn().mockImplementation(function (this: typeof chain) {
        _joined = true;
        return this;
      }),
    },
    orderBy: { value: vi.fn().mockReturnThis() },
    limit: { value: vi.fn().mockReturnThis() },
    offset: { value: vi.fn().mockReturnThis() },
    insert: {
      value: vi.fn().mockImplementation(function (this: typeof chain, table: unknown) {
        _lastOp = "insert";
        _insertTable = getTableFromSymbol(table);
        return this;
      }),
    },
    values: {
      value: vi.fn().mockImplementation(function (this: typeof chain, v: Record<string, unknown>) {
        if (_lastOp === "insert" && _insertTable === T_TX) {
          writes.transactions.push({
            userId: v.userId as string,
            type: v.type as string,
            amountCents: v.amountCents as number,
            balanceAfterCents: v.balanceAfterCents as number,
            description: v.description as string,
          });
        }
        return this;
      }),
    },
    returning: {
      value: vi.fn().mockImplementation(function () {
        if (_lastOp === "insert" && _insertTable === T_TX) {
          return [writes.transactions[writes.transactions.length - 1] ?? {}];
        }
        return [];
      }),
    },
    update: {
      value: vi.fn().mockImplementation(function (this: typeof chain, table: unknown) {
        _lastOp = "update";
        _currentTable = getTableFromSymbol(table);
        return this;
      }),
    },
    set: {
      value: vi.fn().mockImplementation(function (this: typeof chain, v: Record<string, unknown>) {
        if (_lastOp === "update" && _currentTable === T_BAL) {
          writes.balanceUpdates.push({ balanceCents: v.balanceCents as number });
        }
        if (_lastOp === "update" && _currentTable === T_WIN) {
          writes.usageWindowUpdates.push({
            haikuTokensUsed: v.haikuTokensUsed as number,
            sonnetTokensUsed: v.sonnetTokensUsed as number,
            costCents: v.costCents as number,
            isExhausted: v.isExhausted as boolean,
          });
        }
        return this;
      }),
    },
    delete: { value: vi.fn().mockReturnThis() },
    count: { value: vi.fn().mockReturnValue({ count: 1 }) },
    as: { value: vi.fn() },
    onConflictDoUpdate: { value: vi.fn().mockReturnThis() },
    transaction: {
      value: vi.fn().mockImplementation(async (fn: (tx: typeof chain) => Promise<unknown>) => {
        return fn(chain);
      }),
    },
  });

  // Make chain array-like so `const [x] = await chain` works
  Object.defineProperty(chain, "length", { get: () => _data.length });
  for (let i = 0; i < 100; i++) {
    Object.defineProperty(chain, i, { get: () => _data[i] });
  }

  return {
    DB_MOCK: chain,
    USER_ID,
    setScenario(s: Partial<typeof scenario>) {
      Object.assign(scenario, s);
    },
    resetScenario() {
      scenario.activeSubscription = null;
      scenario.balance = null;
      scenario.usageWindow = null;
    },
    resetWrites() {
      writes.balanceUpdates = [];
      writes.transactions = [];
      writes.usageWindowUpdates = [];
      _joined = false;
    },
    getBalanceUpdates: () => writes.balanceUpdates,
    getTransactions: () => writes.transactions,
    getUsageWindowUpdates: () => writes.usageWindowUpdates,
  };
});

vi.mock("@workspace/db", () => ({
  db: hoisted.DB_MOCK,
  subscriptionsTable: { [Symbol.for("drizzle:tableName")]: "subscriptions" },
  packagesTable: { [Symbol.for("drizzle:tableName")]: "subscription_packages" },
  usageWindowsTable: { [Symbol.for("drizzle:tableName")]: "usage_windows" },
  userBalancesTable: { [Symbol.for("drizzle:tableName")]: "user_balances" },
  tokenTransactionsTable: { [Symbol.for("drizzle:tableName")]: "token_transactions" },
}));

// Import after mocks are set up
import {
  checkAIAccess,
  consumeQuotaForAIRequest,
} from "../lib/subscription.js";

// ─── Test scenario helpers ──────────────────────────────────────────────

function makeActiveSubscription(modelType: "lama" | "baru" | "campuran") {
  // Quota caps per modelType (matches business rules):
  // - "lama": only Haiku (Sonnet quota = 0)
  // - "baru": only Sonnet (Haiku quota = 0)
  // - "campuran": both Haiku and Sonnet
  const caps =
    modelType === "lama"
      ? {
          quota5hHaikuTokens: 100000,
          quota5hSonnetTokens: 0, // Tidak cover Sonnet
          quota7dHaikuTokens: 500000,
          quota7dSonnetTokens: 0,
        }
      : modelType === "baru"
        ? {
            quota5hHaikuTokens: 0, // Tidak cover Haiku
            quota5hSonnetTokens: 50000,
            quota7dHaikuTokens: 0,
            quota7dSonnetTokens: 250000,
          }
        : {
            quota5hHaikuTokens: 100000,
            quota5hSonnetTokens: 50000,
            quota7dHaikuTokens: 500000,
            quota7dSonnetTokens: 250000,
          };

  return {
    id: "sub-1",
    userId: hoisted.USER_ID,
    packageId: `pkg-${modelType}`,
    status: "active" as const,
    startsAt: new Date("2026-09-01T00:00:00Z"),
    expiresAt: new Date("2026-10-01T00:00:00Z"),
    pricePaidCents: 29000_00,
    paymentId: null,
    queuedForStartAt: null,
    autoRenew: false,
    cancelledAt: null,
    usageAnchorAt: new Date("2026-09-01T00:00:00Z"),
    createdAt: new Date("2026-09-01T00:00:00Z"),
    updatedAt: new Date("2026-09-01T00:00:00Z"),
    package: {
      id: `pkg-${modelType}`,
      name: `Paket ${modelType}`,
      modelType,
      ...caps,
    },
  };
}

function makeBalance(balanceCents: number, autofallbackEnabled = true) {
  return {
    id: "bal-1",
    userId: hoisted.USER_ID,
    balanceCents,
    rewardBalanceCents: 0,
    autofallbackEnabled,
    preferredTierId: null,
  };
}

function makeUsageWindow(opts: {
  subscriptionId: string;
  modelType: "lama" | "baru" | "campuran";
  haikuTokensUsed?: number;
  sonnetTokensUsed?: number;
  costCents?: number;
  isExhausted?: boolean;
}) {
  // Use far-future dates so the test doesn't depend on real-time Date.now()
  return {
    id: "win-1",
    subscriptionId: opts.subscriptionId,
    userId: hoisted.USER_ID,
    modelType: opts.modelType,
    windowType: "5h" as const,
    windowNumber: 1,
    windowStartAt: new Date("2026-09-11T00:00:00Z"),
    windowEndAt: new Date("2030-01-01T00:00:00Z"), // Far future
    haikuTokensUsed: opts.haikuTokensUsed ?? 0,
    sonnetTokensUsed: opts.sonnetTokensUsed ?? 0,
    costCents: opts.costCents ?? 0,
    isExhausted: opts.isExhausted ?? false,
    isOverLimit: false,
  };
}

beforeEach(() => {
  hoisted.resetScenario();
  hoisted.resetWrites();
});

// ─── TEST 1 ─────────────────────────────────────────────────────────────
// Subscribe Lama + request Haiku → method: subscription (covered, no deduction)
it("T1: Subscribe Lama + request Haiku → subscription path, no saldo deduction", async () => {
  hoisted.setScenario({
    activeSubscription: makeActiveSubscription("lama"),
    usageWindow: makeUsageWindow({
      subscriptionId: "sub-1",
      modelType: "lama",
    }),
  });

  const result = await checkAIAccess({
    userId: hoisted.USER_ID,
    tierId: "haiku-4.5",
    estimatedCostCents: 100,
  });

  expect(result.allowed).toBe(true);
  if (result.allowed) {
    expect(result.method).toBe("subscription");
  }
});

// ─── TEST 2 ─────────────────────────────────────────────────────────────
// No subscription + autofallback + saldo cukup → allowed via saldo
it("T2: No subscription + autofallback ON + saldo cukup → allowed via saldo", async () => {
  hoisted.setScenario({
    balance: makeBalance(10000, true),
  });

  const result = await checkAIAccess({
    userId: hoisted.USER_ID,
    tierId: "haiku-4.5",
    estimatedCostCents: 5000,
  });

  expect(result.allowed).toBe(true);
  if (result.allowed) {
    expect(result.method).toBe("saldo");
  }
});

// ─── TEST 3 ─────────────────────────────────────────────────────────────
// No subscription + autofallback + saldo 0 → denied saldo_insufficient
it("T3: No subscription + autofallback ON + saldo 0 → denied saldo_insufficient", async () => {
  hoisted.setScenario({
    balance: makeBalance(0, true),
  });

  const result = await checkAIAccess({
    userId: hoisted.USER_ID,
    tierId: "haiku-4.5",
    estimatedCostCents: 5000,
  });

  expect(result.allowed).toBe(false);
  if (!result.allowed) {
    expect(result.reason).toBe("saldo_insufficient");
  }
});

// ─── TEST 4 ─────────────────────────────────────────────────────────────
// No subscription + autofallback OFF → denied quota_exhausted
it("T4: No subscription + autofallback OFF + saldo cukup → denied quota_exhausted", async () => {
  hoisted.setScenario({
    balance: makeBalance(10000, false),
  });

  const result = await checkAIAccess({
    userId: hoisted.USER_ID,
    tierId: "haiku-4.5",
    estimatedCostCents: 5000,
  });

  expect(result.allowed).toBe(false);
  if (!result.allowed) {
    expect(result.reason).toBe("quota_exhausted");
  }
});

// ─── TEST 5 ─────────────────────────────────────────────────────────────
// consumeQuotaForAIRequest: Subscribe Lama + Haiku → subscription, no deduction
describe("AI Gate — consumeQuotaForAIRequest (real deduction)", () => {
  it("T5: Subscribe Lama + request Haiku → subscription, no saldo deduction", async () => {
    hoisted.setScenario({
      activeSubscription: makeActiveSubscription("lama"),
      usageWindow: makeUsageWindow({
        subscriptionId: "sub-1",
        modelType: "lama",
      }),
    });

    const result = await consumeQuotaForAIRequest({
      userId: hoisted.USER_ID,
      tierId: "haiku-4.5",
      inputTokens: 1000,
      outputTokens: 500,
      costCents: 200,
    });

    expect(result.allowed).toBe(true);
    if (result.allowed) {
      expect(result.method).toBe("subscription");
    }
    // No saldo deduction
    expect(hoisted.getBalanceUpdates().length).toBe(0);
    expect(hoisted.getTransactions().length).toBe(0);
  });

  // ─── TEST 6 ───────────────────────────────────────────────────────────
  // Subscribe Lama + request Sonnet + saldo cukup → method: saldo (out-of-package)
  it("T6: Subscribe Lama + request Sonnet + saldo cukup → method: saldo (out-of-package)", async () => {
    // Behavior: "lama" package doesn't cover Sonnet (modelType "baru").
    // Subscription quota path denies → autofallback to saldo.
    hoisted.setScenario({
      activeSubscription: makeActiveSubscription("lama"),
      usageWindow: makeUsageWindow({
        subscriptionId: "sub-1",
        modelType: "baru", // Sonnet's modelType is "baru"
      }),
      balance: makeBalance(10000, true),
    });

    const result = await consumeQuotaForAIRequest({
      userId: hoisted.USER_ID,
      tierId: "sonnet-5",
      inputTokens: 1000,
      outputTokens: 500,
      costCents: 200,
    });

    // Out-of-package behavior: should fall through to saldo
    expect(result.allowed).toBe(true);
    if (result.allowed) {
      expect(result.method).toBe("saldo");
    }
    expect(hoisted.getBalanceUpdates().length).toBeGreaterThan(0);
    expect(hoisted.getTransactions().length).toBe(1);
  });

  // ─── TEST 7 ───────────────────────────────────────────────────────────
  // Subscribe Baru + request Haiku + saldo cukup → method: saldo (Saldo free-for-all)
  it("T7: Subscribe Baru + request Haiku + saldo cukup → method: saldo (Saldo free-for-all)", async () => {
    hoisted.setScenario({
      activeSubscription: makeActiveSubscription("baru"),
      usageWindow: makeUsageWindow({
        subscriptionId: "sub-1",
        modelType: "lama", // Haiku's modelType is "lama"
      }),
      balance: makeBalance(10000, true),
    });

    const result = await consumeQuotaForAIRequest({
      userId: hoisted.USER_ID,
      tierId: "haiku-4.5",
      inputTokens: 1000,
      outputTokens: 500,
      costCents: 200,
    });

    expect(result.allowed).toBe(true);
    if (result.allowed) {
      // Critical assertion: Haiku via saldo, NOT blocked by "baru" package
      expect(result.method).toBe("saldo");
    }
  });

  // ─── TEST 8 ───────────────────────────────────────────────────────────
  // Subscribe Baru + request Sonnet → method: subscription (covered)
  it("T8: Subscribe Baru + request Sonnet → method: subscription", async () => {
    hoisted.setScenario({
      activeSubscription: makeActiveSubscription("baru"),
      usageWindow: makeUsageWindow({
        subscriptionId: "sub-1",
        modelType: "baru",
      }),
    });

    const result = await consumeQuotaForAIRequest({
      userId: hoisted.USER_ID,
      tierId: "sonnet-5",
      inputTokens: 1000,
      outputTokens: 500,
      costCents: 200,
    });

    expect(result.allowed).toBe(true);
    if (result.allowed) {
      expect(result.method).toBe("subscription");
    }
  });

  // ─── TEST 9 ───────────────────────────────────────────────────────────
  // Subscribe Lama + request Sonnet + saldo 0 → denied saldo_insufficient
  it("T9: Subscribe Lama + request Sonnet + saldo 0 → denied saldo_insufficient", async () => {
    hoisted.setScenario({
      activeSubscription: makeActiveSubscription("lama"),
      usageWindow: makeUsageWindow({
        subscriptionId: "sub-1",
        modelType: "baru",
      }),
      balance: makeBalance(0, true),
    });

    const result = await consumeQuotaForAIRequest({
      userId: hoisted.USER_ID,
      tierId: "sonnet-5",
      inputTokens: 1000,
      outputTokens: 500,
      costCents: 200,
    });

    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.reason).toBe("saldo_insufficient");
    }
  });

  // ─── TEST 10 ──────────────────────────────────────────────────────────
  // autofallback OFF + no subscription + saldo cukup → denied quota_exhausted
  it("T10: autofallback OFF + no subscription + saldo cukup → denied quota_exhausted", async () => {
    hoisted.setScenario({
      balance: makeBalance(10000, false),
    });

    const result = await consumeQuotaForAIRequest({
      userId: hoisted.USER_ID,
      tierId: "haiku-4.5",
      inputTokens: 1000,
      outputTokens: 500,
      costCents: 200,
    });

    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.reason).toBe("quota_exhausted");
    }
    // Verify NO saldo deduction
    expect(hoisted.getBalanceUpdates().length).toBe(0);
  });
});

/**
 * Referral Rewards — Unit Tests
 *
 * Tests the referral-rewards.ts service logic:
 *   1. Referee cashback: one-time Rp 5.000 on first payment
 *   2. Referrer reward: 3% per payment, capped at 5 tx per pair
 *   3. Idempotency via paymentEventId
 *   4. Edge cases: no referral, duplicate, cap reached, amount too small
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PaymentSuccessEvent } from "../lib/referral-rewards.js";

// ── Hoisted mock factory ──────────────────────────────────────────────────────
// The mock tracks which table is queried via Symbol.for("drizzle:tableName").
// Per-test data is set via setScenario().

const hoisted = vi.hoisted(() => {
  // Per-test mutable scenario
  const scenario: {
    referral: Record<string, unknown> | null;
    referralEvents: Record<string, unknown>[];
    refereeBalance: Record<string, unknown> | null;
    referrerBalance: Record<string, unknown> | null;
    cashbackUpdateRows: Record<string, unknown>[];
    referrerUpdateRows: Record<string, unknown>[];
  } = {
    referral: null,
    referralEvents: [],
    refereeBalance: null,
    referrerBalance: null,
    cashbackUpdateRows: [],
    referrerUpdateRows: [],
  };

  // Per-call state
  let updateCallCount = 0;
  let selectFromCallCount = 0;
  let txBalanceCallCount = 0;
  let currentTableDesc = "";

  // The chain inherits from Array so `await chain` / destructuring works.
  // Methods use { value: fn } pattern so `this` = chain for chaining.
  const chain = Object.create(Array.prototype, {
    select: {
      value: function (this: typeof chain) {
        selectFromCallCount = 0;
        return this;
      },
    },
    from: {
      value: function (this: typeof chain, table: unknown) {
        // Capture table description for .where() to use
        currentTableDesc = String(table);
        return this;
      },
    },
    where: {
      value: function (this: typeof chain, _cond: unknown) {
        selectFromCallCount++;
        // Push data to chain (chain inherits Array so chain[0] = data[0])
        this.length = 0;

        if (currentTableDesc.includes("referralsTable")) {
          if (scenario.referral) this.push(scenario.referral);
        } else if (currentTableDesc.includes("referralEventsTable")) {
          scenario.referralEvents.forEach((e) => this.push(e));
        } else if (currentTableDesc.includes("userBalancesTable")) {
          // Transaction context: first = referee, second = referrer
          txBalanceCallCount++;
          if (txBalanceCallCount === 1 && scenario.refereeBalance) {
            this.push(scenario.refereeBalance);
          } else if (txBalanceCallCount === 2 && scenario.referrerBalance) {
            this.push(scenario.referrerBalance);
          }
        }
        return this;
      },
    },
    limit: {
      value: function (this: typeof chain, _n: number) {
        // .limit() is chained after .where() for referralEventsTable — just return this
        return this;
      },
    },
    set: {
      value: function (this: typeof chain, _vals: unknown) {
        return this;
      },
    },
    returning: {
      value: function (this: typeof chain, _cols?: unknown) {
        updateCallCount++;
        this.length = 0;
        const rows = updateCallCount === 1 ? scenario.cashbackUpdateRows : scenario.referrerUpdateRows;
        rows.forEach((r) => this.push(r));
        return this;
      },
    },
    values: {
      value: function (this: typeof chain, _vals: unknown) {
        return this;
      },
    },
    update: {
      value: function (this: typeof chain, _table: unknown) {
        return this;
      },
    },
    insert: {
      value: function (this: typeof chain, _table: unknown) {
        return this;
      },
    },
    transaction: {
      value: async function (this: typeof chain, fn: (tx: typeof chain) => Promise<unknown>) {
        txBalanceCallCount = 0;
        await fn(chain);
      },
    },
  });

  const db = {
    select: vi.fn(() => chain),
    update: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    transaction: chain.transaction,
  };

  function setScenario(s: Partial<typeof scenario>) {
    Object.assign(scenario, s);
  }

  function clearScenario() {
    scenario.referral = null;
    scenario.referralEvents = [];
    scenario.refereeBalance = null;
    scenario.referrerBalance = null;
    scenario.cashbackUpdateRows = [];
    scenario.referrerUpdateRows = [];
    updateCallCount = 0;
    selectFromCallCount = 0;
    txBalanceCallCount = 0;
    chain.length = 0;
    currentTableDesc = "";
  }

  return { db, setScenario, clearScenario };
});

// ── Module under test ─────────────────────────────────────────────────────────
vi.mock("@workspace/db", () => ({
  db: hoisted.db,
  referralsTable: Symbol("referralsTable"),
  referralEventsTable: Symbol("referralEventsTable"),
  userBalancesTable: Symbol("userBalancesTable"),
  tokenTransactionsTable: Symbol("tokenTransactionsTable"),
}));

import {
  processReferralPayment,
  REFEREE_CASHBACK_CENTS,
  REFERRER_REWARD_PERCENT,
  REFERRER_REWARD_TX_CAP,
} from "../lib/referral-rewards.js";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeEvent(overrides: Partial<PaymentSuccessEvent> = {}): PaymentSuccessEvent {
  return {
    paymentEventId: "evt_test_001",
    userId: "user_referee_123",
    paidAmountCents: 100_000, // Rp 1.000
    method: "topup",
    paidAt: new Date("2026-09-15T10:00:00Z"),
    ...overrides,
  };
}

function makeReferral(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "ref_001",
    referrerId: "user_referrer_456",
    referredId: "user_referee_123",
    referralCode: "REFCODE",
    status: "verified",
    refereeCashbackClaimed: false,
    referrerRewardTxCount: 0,
    referrerRewardPaidCents: 0,
    firstPaymentAt: null,
    firstPaymentEventId: null,
    updatedAt: new Date(),
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Referral Rewards — Constants", () => {
  it("exports correct constants", () => {
    expect(REFEREE_CASHBACK_CENTS).toBe(500_000); // Rp 5.000
    expect(REFERRER_REWARD_PERCENT).toBe(0.03); // 3%
    expect(REFERRER_REWARD_TX_CAP).toBe(5);
  });
});

describe("Referral Rewards — Referee Cashback", () => {
  beforeEach(() => {
    hoisted.clearScenario();
  });

  it("credits Rp 5.000 to referee on first payment", async () => {
    const referral = makeReferral({ refereeCashbackClaimed: false });
    hoisted.setScenario({
      referral,
      refereeBalance: { userId: "user_referee_123", balanceCents: 0 },
      cashbackUpdateRows: [{ ...referral, refereeCashbackClaimed: true }],
    });

    const result = await processReferralPayment(makeEvent());

    expect(result.refereeCashback.credited).toBe(true);
    expect(result.refereeCashback.reason).toBe("credited");
    expect(result.refereeCashback.amountCents).toBe(500_000);
  });

  it("skips cashback if already claimed", async () => {
    const referral = makeReferral({ refereeCashbackClaimed: true });
    hoisted.setScenario({ referral });

    const result = await processReferralPayment(makeEvent());

    expect(result.refereeCashback.credited).toBe(false);
    expect(result.refereeCashback.reason).toBe("already_claimed");
    expect(result.refereeCashback.amountCents).toBe(0);
  });

  it("skips cashback if no referral relationship", async () => {
    hoisted.setScenario({ referral: null });

    const result = await processReferralPayment(makeEvent());

    expect(result.refereeCashback.credited).toBe(false);
    expect(result.refereeCashback.reason).toBe("no_user");
  });

  it("prevents double-claim via atomic WHERE guard (race condition)", async () => {
    // UPDATE returns 0 rows — another request already claimed
    const referral = makeReferral({ refereeCashbackClaimed: false });
    hoisted.setScenario({
      referral,
      cashbackUpdateRows: [], // 0 rows updated
    });

    const result = await processReferralPayment(makeEvent());

    expect(result.refereeCashback.credited).toBe(false);
    expect(result.refereeCashback.reason).toBe("already_claimed");
  });
});

describe("Referral Rewards — Referrer Reward", () => {
  beforeEach(() => {
    hoisted.clearScenario();
  });

  it("credits 3% of payment to referrer", async () => {
    const referral = makeReferral({ referrerRewardTxCount: 0 });
    hoisted.setScenario({
      referral,
      referralEvents: [], // not a duplicate
      referrerBalance: { userId: "user_referrer_456", rewardBalanceCents: 0 },
      cashbackUpdateRows: [{ ...referral, refereeCashbackClaimed: true }],
      referrerUpdateRows: [{ ...referral, referrerRewardTxCount: 1 }],
    });

    // paidAmountCents: 100_000 → 3% = 3_000
    const result = await processReferralPayment(makeEvent({ paidAmountCents: 100_000 }));

    expect(result.referrerReward.credited).toBe(true);
    expect(result.referrerReward.reason).toBe("credited");
    expect(result.referrerReward.amountCents).toBe(3_000);
    expect(result.referrerReward.txCount).toBe(1);
  });

  it("stops crediting after 5 transactions (cap)", async () => {
    const referral = makeReferral({ referrerRewardTxCount: 5 });
    hoisted.setScenario({ referral, referralEvents: [] });

    const result = await processReferralPayment(makeEvent());

    expect(result.referrerReward.credited).toBe(false);
    expect(result.referrerReward.reason).toBe("cap_reached");
    expect(result.referrerReward.amountCents).toBe(0);
  });

  it("skips reward on duplicate paymentEventId (idempotency)", async () => {
    const referral = makeReferral({ referrerRewardTxCount: 2 });
    hoisted.setScenario({ referral, referralEvents: [{ id: "ev1" }] }); // duplicate

    const result = await processReferralPayment(makeEvent());

    expect(result.referrerReward.credited).toBe(false);
    expect(result.referrerReward.reason).toBe("duplicate_event");
  });

  it("rounds down when 3% produces fractional cents", async () => {
    const referral = makeReferral({ referrerRewardTxCount: 0 });
    hoisted.setScenario({
      referral,
      referralEvents: [],
      referrerBalance: { userId: "user_referrer_456", rewardBalanceCents: 0 },
      cashbackUpdateRows: [{ ...referral, refereeCashbackClaimed: true }],
      referrerUpdateRows: [{ ...referral, referrerRewardTxCount: 1 }],
    });

    // 100 * 0.03 = 3.0 → exact
    const result = await processReferralPayment(makeEvent({ paidAmountCents: 100 }));

    expect(result.referrerReward.credited).toBe(true);
    expect(result.referrerReward.amountCents).toBe(3);
  });

  it("skips reward when 3% rounds to 0", async () => {
    const referral = makeReferral({ referrerRewardTxCount: 0 });
    hoisted.setScenario({ referral, referralEvents: [] });

    // 10 * 0.03 = 0.3 → floor = 0
    const result = await processReferralPayment(makeEvent({ paidAmountCents: 10 }));

    expect(result.referrerReward.credited).toBe(false);
    expect(result.referrerReward.reason).toBe("amount_too_small");
  });
});

describe("Referral Rewards — Full Payment Flow", () => {
  beforeEach(() => {
    hoisted.clearScenario();
  });

  it("credits both referee cashback AND referrer reward in one payment", async () => {
    const referral = makeReferral({
      refereeCashbackClaimed: false,
      referrerRewardTxCount: 0,
    });
    hoisted.setScenario({
      referral,
      referralEvents: [],
      refereeBalance: { userId: "user_referee_123", balanceCents: 0 },
      referrerBalance: { userId: "user_referrer_456", rewardBalanceCents: 0 },
      cashbackUpdateRows: [{ ...referral, refereeCashbackClaimed: true }],
      referrerUpdateRows: [{ ...referral, referrerRewardTxCount: 1 }],
    });

    const result = await processReferralPayment(makeEvent({ paidAmountCents: 100_000 }));

    expect(result.refereeCashback.credited).toBe(true);
    expect(result.refereeCashback.amountCents).toBe(500_000);
    expect(result.referrerReward.credited).toBe(true);
    expect(result.referrerReward.amountCents).toBe(3_000);
    expect(result.referrerReward.txCount).toBe(1);
  });

  it("credits referrer reward on subsequent payments (NOT referee cashback)", async () => {
    const referral = makeReferral({
      refereeCashbackClaimed: true, // already claimed
      referrerRewardTxCount: 1,
    });
    hoisted.setScenario({
      referral,
      referralEvents: [],
      referrerBalance: { userId: "user_referrer_456", rewardBalanceCents: 3000 },
      cashbackUpdateRows: [], // no cashback update (already claimed)
      referrerUpdateRows: [{ ...referral, referrerRewardTxCount: 2 }],
    });

    const result = await processReferralPayment(makeEvent({ paidAmountCents: 100_000 }));

    expect(result.refereeCashback.credited).toBe(false);
    expect(result.refereeCashback.reason).toBe("already_claimed");
    expect(result.referrerReward.credited).toBe(true);
    expect(result.referrerReward.txCount).toBe(2);
  });

  it("allows exactly 5th transaction (cap boundary)", async () => {
    const referral = makeReferral({
      refereeCashbackClaimed: true,
      referrerRewardTxCount: 4, // one below cap
    });
    hoisted.setScenario({
      referral,
      referralEvents: [],
      referrerBalance: { userId: "user_referrer_456", rewardBalanceCents: 9000 },
      cashbackUpdateRows: [],
      referrerUpdateRows: [{ ...referral, referrerRewardTxCount: 5 }],
    });

    const result = await processReferralPayment(makeEvent({ paidAmountCents: 100_000 }));

    expect(result.referrerReward.credited).toBe(true);
    expect(result.referrerReward.txCount).toBe(5);
    // And 6th would be cap_reached...
  });

  it("rejects 6th transaction (past cap)", async () => {
    const referral = makeReferral({
      refereeCashbackClaimed: true,
      referrerRewardTxCount: 5, // already at cap
    });
    hoisted.setScenario({ referral, referralEvents: [] });

    const result = await processReferralPayment(makeEvent({ paidAmountCents: 100_000 }));

    expect(result.referrerReward.credited).toBe(false);
    expect(result.referrerReward.reason).toBe("cap_reached");
  });

  it("triggers on both subscription and topup payment methods", async () => {
    const referral = makeReferral({ refereeCashbackClaimed: false, referrerRewardTxCount: 0 });
    hoisted.setScenario({
      referral,
      referralEvents: [],
      refereeBalance: { userId: "user_referee_123", balanceCents: 0 },
      referrerBalance: { userId: "user_referrer_456", rewardBalanceCents: 0 },
      cashbackUpdateRows: [{ ...referral, refereeCashbackClaimed: true }],
      referrerUpdateRows: [{ ...referral, referrerRewardTxCount: 1 }],
    });

    // subscription
    const r1 = await processReferralPayment(makeEvent({ method: "subscription", paidAmountCents: 500_000 }));
    expect(r1.refereeCashback.credited).toBe(true);
    hoisted.clearScenario();
    hoisted.setScenario({
      referral: { ...referral, refereeCashbackClaimed: true, referrerRewardTxCount: 1 },
      referralEvents: [],
      referrerBalance: { userId: "user_referrer_456", rewardBalanceCents: 15_000 },
      cashbackUpdateRows: [],
      referrerUpdateRows: [{ ...referral, referrerRewardTxCount: 2 }],
    });

    // topup
    const r2 = await processReferralPayment(makeEvent({ method: "topup", paidAmountCents: 200_000 }));
    expect(r2.referrerReward.credited).toBe(true);
    expect(r2.referrerReward.amountCents).toBe(6_000); // 3% of 200_000
  });
});

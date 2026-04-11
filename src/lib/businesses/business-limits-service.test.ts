import assert from "node:assert/strict";
import test from "node:test";
import {
  evaluateBusinessCreationLimit,
  pickNextMaxBusinessesRecommendation,
} from "@/lib/businesses/business-limits-service";
import { BUSINESS_LIMIT_REACHED_CODE } from "@/lib/businesses/errors";

test("solo user with 1 existing business is blocked", () => {
  const error = evaluateBusinessCreationLimit(1, 1);
  assert.ok(error);
  assert.equal(error.code, BUSINESS_LIMIT_REACHED_CODE);
  assert.equal(error.current_usage, 1);
  assert.equal(error.limit, 1);
});

test("starter user with 2 existing businesses can create", () => {
  const error = evaluateBusinessCreationLimit(3, 2);
  assert.equal(error, null);
});

test("pro user with unlimited businesses can create", () => {
  const error = evaluateBusinessCreationLimit(null, 10_000);
  assert.equal(error, null);
});

test("recommendation ladder moves from 1 to starter 3", () => {
  const recommendation = pickNextMaxBusinessesRecommendation(
    [
      { plan_code: "solo", limit_value: 1 },
      { plan_code: "starter", limit_value: 3 },
      { plan_code: "business", limit_value: 10 },
      { plan_code: "pro", limit_value: null },
    ],
    1,
  );

  assert.deepEqual(recommendation, {
    recommendedPlan: "starter",
    nextLimit: 3,
  });
});

test("recommendation ladder moves from 10 to unlimited", () => {
  const recommendation = pickNextMaxBusinessesRecommendation(
    [
      { plan_code: "solo", limit_value: 1 },
      { plan_code: "starter", limit_value: 3 },
      { plan_code: "business", limit_value: 10 },
      { plan_code: "pro", limit_value: null },
    ],
    10,
  );

  assert.deepEqual(recommendation, {
    recommendedPlan: "pro",
    nextLimit: null,
  });
});

test("concurrent create requests allow only one when limit is one", async () => {
  const state = { ownerBusinessCount: 0 };
  let lock: Promise<void> = Promise.resolve();

  async function createWithAtomicGuard(maxBusinesses: number | null) {
    const previousLock = lock;
    let release!: () => void;
    lock = new Promise<void>((resolve) => {
      release = resolve;
    });

    await previousLock;
    try {
      const limitError = evaluateBusinessCreationLimit(
        maxBusinesses,
        state.ownerBusinessCount,
      );
      if (limitError) {
        return { ok: false as const, error: limitError };
      }
      state.ownerBusinessCount += 1;
      return { ok: true as const };
    } finally {
      release();
    }
  }

  const [first, second] = await Promise.all([
    createWithAtomicGuard(1),
    createWithAtomicGuard(1),
  ]);

  const successCount = [first, second].filter((result) => result.ok).length;
  const blockedCount = [first, second].filter(
    (result) => !result.ok && result.error.code === BUSINESS_LIMIT_REACHED_CODE,
  ).length;

  assert.equal(successCount, 1);
  assert.equal(blockedCount, 1);
});

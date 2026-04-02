import assert from "node:assert/strict";
import test from "node:test";
import { deriveEndedAt, normalizeSubscriptionStatus } from "@/lib/billing/subscription-lifecycle";

test("payment failure maps to past_due", () => {
  assert.equal(normalizeSubscriptionStatus("past_due"), "past_due");
});

test("cancel status maps to canceled and ended_at gets set", () => {
  assert.equal(normalizeSubscriptionStatus("cancelled"), "canceled");
  const endedAt = deriveEndedAt(
    "canceled",
    "2026-05-01T00:00:00Z",
    "2026-04-02T00:00:00Z",
  );
  assert.equal(endedAt, "2026-04-02T00:00:00Z");
});


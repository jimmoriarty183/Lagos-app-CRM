import assert from "node:assert/strict";
import test from "node:test";
import { isDuplicateWebhookInsertError, normalizePaddleWebhookEvent } from "@/lib/billing/webhooks";

test("webhook duplicate db error is detected", () => {
  assert.equal(isDuplicateWebhookInsertError({ code: "23505" }), true);
  assert.equal(isDuplicateWebhookInsertError({ code: "22001" }), false);
});

test("normalize paddle webhook extracts key billing fields", () => {
  const normalized = normalizePaddleWebhookEvent({
    event_id: "evt_1",
    event_type: "subscription.updated",
    data: {
      id: "sub_123",
      customer_id: "ctm_123",
      status: "active",
      current_billing_period: {
        starts_at: "2026-04-01T00:00:00Z",
        ends_at: "2026-05-01T00:00:00Z",
      },
      custom_data: { account_id: "acc_123" },
      items: [
        {
          price: { id: "pri_123" },
          product: { id: "pro_123" },
        },
      ],
    },
  });

  assert.equal(normalized.externalEventId, "evt_1");
  assert.equal(normalized.eventType, "subscription.updated");
  assert.equal(normalized.paddleSubscriptionId, "sub_123");
  assert.equal(normalized.paddleCustomerId, "ctm_123");
  assert.equal(normalized.paddlePriceId, "pri_123");
  assert.equal(normalized.accountId, "acc_123");
});

test("normalize paddle webhook normalizes underscore event types", () => {
  const normalized = normalizePaddleWebhookEvent({
    event_id: "evt_2",
    event_type: "subscription_created",
    data: {
      id: "sub_456",
      customer_id: "ctm_456",
      status: "trialing",
      current_billing_period: {
        starts_at: "2026-04-01T00:00:00Z",
        ends_at: "2026-04-08T00:00:00Z",
      },
      custom_data: { account_id: "acc_456" },
      items: [
        {
          price: { id: "pri_456" },
          product: { id: "pro_456" },
        },
      ],
    },
  });

  assert.equal(normalized.eventType, "subscription.created");
  assert.equal(normalized.paddlePriceId, "pri_456");
});


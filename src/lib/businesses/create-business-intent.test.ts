import assert from "node:assert/strict";
import test from "node:test";
import {
  clearCreateBusinessIntent,
  markCreateBusinessIntentRetry,
  readCreateBusinessIntent,
  saveCreateBusinessIntent,
} from "@/lib/businesses/create-business-intent";

type StorageRecord = Record<string, string>;

function createSessionStorage() {
  const state: StorageRecord = {};
  return {
    getItem(key: string) {
      return key in state ? state[key] : null;
    },
    setItem(key: string, value: string) {
      state[key] = value;
    },
    removeItem(key: string) {
      delete state[key];
    },
  };
}

test("stores and restores business create intent", () => {
  const originalWindow = globalThis.window;
  Object.defineProperty(globalThis, "window", {
    value: { sessionStorage: createSessionStorage() },
    configurable: true,
  });

  try {
    clearCreateBusinessIntent();
    saveCreateBusinessIntent({ business_name: "Acme Ops" });
    const restored = readCreateBusinessIntent();
    assert.ok(restored);
    assert.equal(restored.draft.business_name, "Acme Ops");
    assert.equal(restored.retry_count, 0);
    assert.equal(restored.upgrade_started_at, null);
    assert.equal(restored.last_retry_at, null);
  } finally {
    Object.defineProperty(globalThis, "window", {
      value: originalWindow,
      configurable: true,
    });
  }
});

test("increments retry count for existing intent", () => {
  const originalWindow = globalThis.window;
  Object.defineProperty(globalThis, "window", {
    value: { sessionStorage: createSessionStorage() },
    configurable: true,
  });

  try {
    clearCreateBusinessIntent();
    saveCreateBusinessIntent({ business_name: "Retry Corp" });
    markCreateBusinessIntentRetry();
    const restored = readCreateBusinessIntent();
    assert.ok(restored);
    assert.equal(restored.retry_count, 1);
    assert.ok(typeof restored.last_retry_at === "number");
  } finally {
    Object.defineProperty(globalThis, "window", {
      value: originalWindow,
      configurable: true,
    });
  }
});

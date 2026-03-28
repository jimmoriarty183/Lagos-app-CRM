import assert from "node:assert/strict";
import test from "node:test";

import { resolveCampaignCompletionState } from "@/lib/campaigns/completion-state";

test("resolveCampaignCompletionState uses survey responses when state timestamp is missing", () => {
  const result = resolveCampaignCompletionState({
    surveyCompletedAt: null,
    latestSurveyResponseAt: "2026-03-28T10:00:00.000Z",
    latestCompletedEventAt: null,
    isCompletedFlag: true,
  });

  assert.equal(result.isCompleted, true);
  assert.equal(result.effectiveCompletedAt, "2026-03-28T10:00:00.000Z");
});

test("resolveCampaignCompletionState prefers explicit state timestamp when present", () => {
  const result = resolveCampaignCompletionState({
    surveyCompletedAt: "2026-03-28T08:00:00.000Z",
    latestSurveyResponseAt: "2026-03-28T10:00:00.000Z",
    latestCompletedEventAt: "2026-03-28T11:00:00.000Z",
    isCompletedFlag: true,
  });

  assert.equal(result.isCompleted, true);
  assert.equal(result.effectiveCompletedAt, "2026-03-28T08:00:00.000Z");
});

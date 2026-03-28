import assert from "node:assert/strict";
import test from "node:test";

import {
  getInboxBellIndicatorState,
  getInboxNotificationDisplayState,
  getInboxNotificationTypeDisplay,
} from "@/lib/inbox/display-state";

test("new count only tracks actually unread items", () => {
  const state = getInboxBellIndicatorState([
    {
      id: "campaign:1",
      type: "campaign_survey",
      is_read: true,
      metadata: {
        survey_state: "voted",
        survey_unseen_in_bell: true,
      },
    },
    {
      id: "campaign:2",
      type: "campaign_announcement",
      is_read: false,
      metadata: {},
    },
  ]);

  assert.equal(state.unreadCount, 1);
  assert.equal(state.answeredUnseenCount, 0);
});

test("answered survey unseen in bell is still presented as answered", () => {
  const state = getInboxNotificationDisplayState({
    id: "campaign:1",
    type: "campaign_survey",
    is_read: true,
    metadata: {
      survey_state: "voted",
      survey_unseen_in_bell: true,
    },
  });

  assert.equal(state.tone, "answered");
  assert.equal(state.label, "Answered");
  assert.equal(state.emphasized, false);
});

test("answered survey already seen is presented as answered", () => {
  const state = getInboxNotificationDisplayState({
    id: "campaign:1",
    type: "campaign_survey",
    is_read: true,
    metadata: {
      survey_state: "voted",
      survey_unseen_in_bell: false,
    },
  });

  assert.equal(state.tone, "answered");
  assert.equal(state.label, "Answered");
  assert.equal(state.emphasized, false);
});

test("answered survey does not fall back to new when it is merely unread", () => {
  const state = getInboxNotificationDisplayState({
    id: "campaign:1",
    type: "campaign_survey",
    is_read: false,
    metadata: {
      survey_state: "voted",
      survey_unseen_in_bell: false,
    },
  });

  assert.equal(state.tone, "answered");
  assert.equal(state.label, "Answered");
  assert.equal(state.emphasized, false);
});

test("opened item is not shown as new even when read flag is stale", () => {
  const state = getInboxNotificationDisplayState({
    id: "notification:1",
    type: "important_comment_received",
    is_read: false,
    metadata: {
      opened_at: "2026-03-28T12:00:00.000Z",
    },
  });

  assert.equal(state.tone, "neutral");
  assert.equal(state.label, "Read");
  assert.equal(state.emphasized, false);
});

test("survey items expose survey type label", () => {
  const typeDisplay = getInboxNotificationTypeDisplay({
    id: "campaign:1",
    type: "campaign_survey",
    is_read: false,
    metadata: {},
  });

  assert.equal(typeDisplay.kind, "survey");
  assert.equal(typeDisplay.label, "Survey");
});

test("non-survey items expose notification type label", () => {
  const typeDisplay = getInboxNotificationTypeDisplay({
    id: "notification:1",
    type: "mention_received",
    is_read: false,
    metadata: {},
  });

  assert.equal(typeDisplay.kind, "update");
  assert.equal(typeDisplay.label, "Notification");
});

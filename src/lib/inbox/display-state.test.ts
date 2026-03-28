import assert from "node:assert/strict";
import test from "node:test";

import { getInboxBellIndicatorState } from "@/lib/inbox/display-state";

test("answered unseen badge is derived independently from unread count", () => {
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
  assert.equal(state.answeredUnseenCount, 1);
});

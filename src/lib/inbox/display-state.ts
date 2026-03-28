export type InboxNotificationLike = {
  id: string;
  type: string;
  is_read: boolean;
  entity_type?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type InboxBellIndicatorState = {
  unreadCount: number;
  answeredUnseenCount: number;
};

export type InboxNotificationDisplayState = {
  tone: "new" | "answered" | "neutral";
  label: "New" | "Answered" | "Read";
  srLabel: string;
  emphasized: boolean;
  iconTone: "accent" | "success" | "muted";
};

function getMetadataBoolean(
  metadata: Record<string, unknown> | null | undefined,
  key: string,
) {
  return metadata?.[key] === true;
}

export function isSurveyNotification(item: InboxNotificationLike) {
  return item.type === "campaign_survey";
}

export function isAnsweredSurvey(item: InboxNotificationLike) {
  if (!isSurveyNotification(item)) return false;
  const surveyState = String(item.metadata?.survey_state ?? "").trim().toLowerCase();
  return surveyState === "voted";
}

export function isAnsweredSurveyUnseenInBell(item: InboxNotificationLike) {
  if (!isAnsweredSurvey(item)) return false;
  return getMetadataBoolean(item.metadata, "survey_unseen_in_bell");
}

export function getInboxNotificationDisplayState(
  item: InboxNotificationLike,
): InboxNotificationDisplayState {
  if (isAnsweredSurvey(item)) {
    return {
      tone: "answered",
      label: "Answered",
      srLabel: "Answered",
      emphasized: false,
      iconTone: "success",
    };
  }

  if (!item.is_read) {
    return {
      tone: "new",
      label: "New",
      srLabel: "New update",
      emphasized: true,
      iconTone: "accent",
    };
  }

  return {
    tone: "neutral",
    label: "Read",
    srLabel: "Read",
    emphasized: false,
    iconTone: "muted",
  };
}

export function getInboxBellIndicatorState(items: InboxNotificationLike[]): InboxBellIndicatorState {
  return items.reduce<InboxBellIndicatorState>(
    (acc, item) => {
      if (!item.is_read) acc.unreadCount += 1;
      return acc;
    },
    { unreadCount: 0, answeredUnseenCount: 0 },
  );
}

import type { SupabaseClient } from "@supabase/supabase-js";
import { buildSafeUserFallback, resolveUserDisplay } from "@/lib/user-display";
import {
  campaignPayloadSchema,
  surveyOptionPayloadSchema,
  surveyQuestionPayloadSchema,
  surveySubmitSchema,
} from "@/lib/campaigns/validation";
import type {
  AdminCampaignFilters,
  AppRole,
  Campaign,
  CampaignBellItem,
  CampaignChannel,
  CampaignDeliveryMode,
  CampaignDatabase,
  CampaignAnalyticsSummary,
  CampaignStatus,
  CreateCampaignPayload,
  CreateSurveyOptionPayload,
  CreateSurveyQuestionPayload,
  Survey,
  SurveyAnswerPayload,
  SurveyOption,
  SurveyOptionStats,
  SurveyQuestion,
  SurveyQuestionType,
  SurveyQuestionStats,
  SurveyStats,
  UpdateCampaignPayload,
  UserCampaignState,
} from "@/lib/campaigns/types";

type CampaignClient = SupabaseClient<CampaignDatabase>;

type CampaignRecipientSnapshot = {
  userId: string;
  role: string | null;
  segment: string | null;
  label: string;
  email: string | null;
};

export type CampaignPreviewDetails = {
  campaign: Campaign;
  status: CampaignStatus;
  sentAt: string | null;
  sentByUserId: string | null;
  sentByLabel: string | null;
  sentRecipientCount: number;
  targetRoles: string[];
  targetSegments: string[];
  recipientsPreview: CampaignRecipientSnapshot[];
  analytics: CampaignAnalyticsSummary;
};

const POPUP_CHANNEL: CampaignChannel = "popup_right";
const BELL_CHANNEL: CampaignChannel = "bell";
const CAMPAIGN_SELECT_EXTENDED = "*";
const SURVEY_QUESTION_SELECT_PRIMARY = "id, campaign_id, question_order, question_type, title";
const SURVEY_QUESTION_SELECT_FALLBACK = "id, campaign_id, question_order, type, title";
const SURVEY_OPTION_SELECT_PRIMARY = "id, question_id, option_order, label, value";
const SURVEY_OPTION_SELECT_FALLBACK = "id, question_id, option_order, text, value";

function isMissingColumnError(error: unknown) {
  const code = String((error as { code?: string } | null)?.code ?? "");
  const message = String((error as { message?: string } | null)?.message ?? "").toLowerCase();
  return (
    code === "42703" ||
    code === "PGRST204" ||
    (message.includes("column") && (message.includes("does not exist") || message.includes("schema cache")))
  );
}

function isMissingRelationError(error: unknown) {
  const code = String((error as { code?: string } | null)?.code ?? "");
  const message = String((error as { message?: string } | null)?.message ?? "").toLowerCase();
  return (
    code === "42P01" ||
    code === "PGRST205" ||
    (message.includes("could not find the table") && message.includes("schema cache")) ||
    (message.includes("relation") && message.includes("does not exist"))
  );
}

function isMissingSchemaError(error: unknown) {
  return isMissingColumnError(error) || isMissingRelationError(error);
}

function isInvalidInputSyntaxError(error: unknown) {
  const code = String((error as { code?: string } | null)?.code ?? "");
  return code === "22P02";
}

function isUuidLike(value: string | null | undefined) {
  const normalized = String(value ?? "").trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(normalized);
}

function isInvalidEnumError(error: unknown) {
  const code = String((error as { code?: string } | null)?.code ?? "");
  return code === "22P02";
}

function extractMissingColumnName(error: unknown, table: string): string | null {
  const message = String((error as { message?: string } | null)?.message ?? "");
  const lower = message.toLowerCase();
  const tableLower = table.toLowerCase();

  const patternA = new RegExp(`column\\s+${tableLower}\\.([a-z0-9_]+)\\s+does not exist`, "i");
  const matchA = message.match(patternA);
  if (matchA?.[1]) return matchA[1];

  const patternB = new RegExp(`could not find the '([a-z0-9_]+)' column of '${tableLower}'`, "i");
  const matchB = lower.match(patternB);
  if (matchB?.[1]) return matchB[1];

  return null;
}

function toErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  const message = String((error as { message?: unknown } | null)?.message ?? "").trim();
  if (message) return message;
  return "Unknown error";
}

function buildCampaignSchemaError(error: unknown) {
  return new Error(
    `Campaign delivery schema is incomplete. Run latest migrations before using campaigns. Root: ${toErrorMessage(error)}`,
  );
}

function normalizeRole(value: string) {
  return value.trim().toUpperCase();
}

function normalizeStatus(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase();
}

function normalizeType(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase();
}

function pickString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
    if (typeof value === "bigint") return String(value);
  }
  return null;
}

function pickStringArray(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) {
      return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
    }
  }
  return [] as string[];
}

function pickBoolean(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "boolean") return value;
  }
  return null;
}

function parseChannels(row: CampaignDatabase["public"]["Tables"]["campaigns"]["Row"]): CampaignChannel[] {
  const channels = Array.isArray(row.channels) ? row.channels : [];
  const set = new Set<CampaignChannel>();

  for (const channel of channels) {
    const normalized = String(channel).trim().toLowerCase();
    if (normalized === "bell") set.add("bell");
    if (normalized === "popup_right") set.add("popup_right");
  }

  if (row.show_in_bell) set.add("bell");
  if (row.show_in_popup_right) set.add("popup_right");

  if (set.size === 0) {
    set.add("bell");
  }

  return [...set];
}

function normalizeCampaignRow(row: Record<string, unknown>): CampaignDatabase["public"]["Tables"]["campaigns"]["Row"] {
  const channels = pickStringArray(row, ["channels"]);
  const showInBell = pickBoolean(row, ["show_in_bell", "showInBell"]);
  const showInPopup = pickBoolean(row, ["show_in_popup_right", "showInPopupRight"]);

  return {
    id: pickString(row, ["id", "campaign_id", "campaignId"]) ?? "",
    type: (normalizeType(pickString(row, ["type"])) || "announcement") as CampaignDatabase["public"]["Tables"]["campaigns"]["Row"]["type"],
    title: pickString(row, ["title"]) ?? "",
    body: pickString(row, ["body", "message", "description"]),
    status: (normalizeStatus(pickString(row, ["status"])) || "draft") as CampaignStatus,
    starts_at: pickString(row, ["starts_at", "start_at", "start_date", "startsAt"]),
    ends_at: pickString(row, ["ends_at", "end_at", "end_date", "endsAt"]),
    channels,
    show_in_bell: showInBell,
    show_in_popup_right: showInPopup,
    target_segment: pickString(row, ["target_segment", "segment"]),
    target_segments: pickStringArray(row, ["target_segments", "segments"]),
    created_at: pickString(row, ["created_at", "createdAt"]),
    updated_at: pickString(row, ["updated_at", "updatedAt"]),
    priority: typeof row.priority === "number" ? row.priority : null,
  };
}

function mapCampaign(
  row: CampaignDatabase["public"]["Tables"]["campaigns"]["Row"],
  targetRoles: AppRole[],
): Campaign {
  const targetSegments = Array.isArray(row.target_segments)
    ? row.target_segments.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    : row.target_segment
      ? [row.target_segment]
      : [];

  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    status: row.status,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    channels: parseChannels(row),
    targetRoles,
    targetSegments,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function isCampaignActiveNow(campaign: Campaign, now = new Date()) {
  if (normalizeStatus(campaign.status) !== "active") return false;
  const startOk = !campaign.startsAt || new Date(campaign.startsAt).getTime() <= now.getTime();
  const endOk = !campaign.endsAt || new Date(campaign.endsAt).getTime() >= now.getTime();
  return startOk && endOk;
}

function canSeeCampaignByRole(campaign: Campaign, userRoles: string[]) {
  if (campaign.targetRoles.length === 0) return true;
  const allowed = new Set(campaign.targetRoles.map((r) => normalizeRole(String(r))));
  return userRoles.some((role) => allowed.has(normalizeRole(role)));
}

function canSeeCampaignBySegment(campaign: Campaign, userSegments: string[]) {
  if (campaign.targetSegments.length === 0) return true;
  if (userSegments.length === 0) return true;
  const allowed = new Set(campaign.targetSegments.map((value) => value.trim().toLowerCase()));
  return userSegments.some((segment) => allowed.has(segment.trim().toLowerCase()));
}

function hasChannel(campaign: Campaign, channel: CampaignChannel) {
  return campaign.channels.includes(channel);
}

function getDeliveryMode(channels: CampaignChannel[]): CampaignDeliveryMode {
  const hasBell = channels.includes(BELL_CHANNEL);
  const hasPopup = channels.includes(POPUP_CHANNEL);
  if (hasBell && hasPopup) return "both";
  if (hasPopup) return "popup_only";
  return "bell_only";
}

function toIsoNow() {
  return new Date().toISOString();
}

type MembershipRow = {
  user_id: string;
  role: string | null;
  business_id: string | null;
};

async function listMembershipRows(
  client: CampaignClient,
  filters: { userId?: string; userIds?: string[] } = {},
): Promise<MembershipRow[]> {
  const { userId, userIds } = filters;
  let membershipsQuery = client.from("memberships").select("*");
  if (userId) membershipsQuery = membershipsQuery.eq("user_id", userId);
  if (userIds && userIds.length > 0) membershipsQuery = membershipsQuery.in("user_id", userIds);
  const membershipsResult = await membershipsQuery;
  if (!membershipsResult.error) {
    return (membershipsResult.data ?? []).map((row) => {
      const record = row as Record<string, unknown>;
      return {
        user_id: pickString(record, ["user_id"]) ?? "",
        role: pickString(record, ["role", "role_type", "user_role"]),
        business_id: pickString(record, ["business_id", "workspace_id", "org_id"]),
      };
    }).filter((row) => row.user_id);
  }
  if (!isMissingSchemaError(membershipsResult.error)) {
    throw membershipsResult.error;
  }

  let workspaceQuery = client.from("workspace_members").select("*");
  if (userId) workspaceQuery = workspaceQuery.eq("user_id", userId);
  if (userIds && userIds.length > 0) workspaceQuery = workspaceQuery.in("user_id", userIds);
  const workspaceResult = await workspaceQuery;
  if (workspaceResult.error) {
    if (isMissingSchemaError(workspaceResult.error)) return [];
    throw workspaceResult.error;
  }

  return (workspaceResult.data ?? [])
    .filter((row) => normalizeStatus((row as Record<string, unknown>).status as string | null | undefined) !== "inactive")
    .map((row) => {
      const record = row as Record<string, unknown>;
      return {
        user_id: pickString(record, ["user_id"]) ?? "",
        role: pickString(record, ["role", "role_type", "user_role"]),
        business_id: pickString(record, ["workspace_id", "business_id", "org_id"]),
      };
    })
    .filter((row) => row.user_id);
}

async function getUserRoles(client: CampaignClient, userId: string) {
  const [memberships, userRolesResult] = await Promise.all([
    listMembershipRows(client, { userId }),
    client.from("user_roles").select("*").eq("user_id", userId),
  ]);

  if (userRolesResult.error && !isMissingSchemaError(userRolesResult.error)) {
    throw userRolesResult.error;
  }

  const roles = new Set<string>();
  for (const row of memberships) {
    if (row.role) roles.add(normalizeRole(row.role));
  }
  for (const row of userRolesResult.error ? [] : userRolesResult.data ?? []) {
    const role = pickString(row as Record<string, unknown>, ["role", "role_type", "user_role"]);
    if (role) roles.add(normalizeRole(role));
  }

  return [...roles];
}

async function getUserSegments(client: CampaignClient, userId: string) {
  const memberships = await listMembershipRows(client, { userId });
  const businessIds = memberships
    .map((row) => row.business_id ?? "")
    .filter(Boolean);
  if (businessIds.length === 0) return [] as string[];

  const businessesResult = await client
    .from("businesses")
    .select("*")
    .in("id", businessIds);
  if (businessesResult.error) {
    if (isMissingSchemaError(businessesResult.error)) return [] as string[];
    throw businessesResult.error;
  }

  return Array.from(
    new Set(
      (businessesResult.data ?? [])
        .map((business) =>
          pickString(business as Record<string, unknown>, ["business_segment", "segment", "industry"]) ?? "",
        )
        .filter(Boolean),
    ),
  );
}

async function getCampaignRolesMap(client: CampaignClient, campaignIds: string[]) {
  if (campaignIds.length === 0) return new Map<string, AppRole[]>();
  const rolesResult = await client
    .from("campaign_target_roles")
    .select("*")
    .in("campaign_id", campaignIds);

  if (rolesResult.error) {
    if (isMissingSchemaError(rolesResult.error)) return new Map<string, AppRole[]>();
    throw rolesResult.error;
  }

  const map = new Map<string, AppRole[]>();
  for (const row of rolesResult.data ?? []) {
    const record = row as Record<string, unknown>;
    const campaignId = pickString(record, ["campaign_id", "campaignId"]);
    const role = pickString(record, ["role", "role_type", "user_role"]);
    if (!campaignId || !role) continue;
    const list = map.get(campaignId) ?? [];
    list.push(role);
    map.set(campaignId, list);
  }
  return map;
}

async function insertCampaignTargetRoles(client: CampaignClient, campaignId: string, roles: string[]) {
  if (roles.length === 0) return;

  const normalized = [...new Set(roles.map((role) => String(role).trim()).filter(Boolean))];
  const primaryInsert = await client
    .from("campaign_target_roles")
    .insert(normalized.map((role) => ({ campaign_id: campaignId, role })));

  if (!primaryInsert.error) return;
  if (!isInvalidEnumError(primaryInsert.error)) throw primaryInsert.error;

  const lowercaseInsert = await client
    .from("campaign_target_roles")
    .insert(normalized.map((role) => ({ campaign_id: campaignId, role: role.toLowerCase() })));
  if (lowercaseInsert.error) throw lowercaseInsert.error;
}

async function getUserCampaignStatesMap(client: CampaignClient, campaignIds: string[], userId: string) {
  if (campaignIds.length === 0) return new Map<string, UserCampaignState>();
  const safeCampaignIds = campaignIds.filter((campaignId) => isUuidLike(campaignId));
  if (safeCampaignIds.length === 0) return new Map<string, UserCampaignState>();
  const statesResult = await client
    .from("user_campaign_states")
    .select("*")
    .eq("user_id", userId)
    .in("campaign_id", safeCampaignIds);

  if (statesResult.error) {
    if (isInvalidInputSyntaxError(statesResult.error)) return new Map<string, UserCampaignState>();
    if (isMissingSchemaError(statesResult.error)) return new Map<string, UserCampaignState>();
    throw statesResult.error;
  }

  const map = new Map<string, UserCampaignState>();
  for (const row of statesResult.data ?? []) {
    const record = row as Record<string, unknown>;
    const campaignId = pickString(record, ["campaign_id", "campaignId"]);
    const userIdValue = pickString(record, ["user_id", "userId"]);
    if (!campaignId || !userIdValue) continue;
    map.set(campaignId, {
      campaignId,
      userId: userIdValue,
      deliveredAt: pickString(record, ["delivered_at", "deliveredAt"]),
      bellShownAt: pickString(record, ["bell_shown_at", "bellShownAt"]),
      popupShownAt: pickString(record, ["popup_shown_at", "popupShownAt"]),
      openedAt: pickString(record, ["opened_at", "openedAt"]),
      bellOpenedAt: pickString(record, ["bell_opened_at", "bellOpenedAt"]),
      popupOpenedAt: pickString(record, ["popup_opened_at", "popupOpenedAt"]),
      clickedAt: pickString(record, ["clicked_at", "clickedAt"]),
      bellClickedAt: pickString(record, ["bell_clicked_at", "bellClickedAt"]),
      popupClickedAt: pickString(record, ["popup_clicked_at", "popupClickedAt"]),
      readAt: pickString(record, ["read_at", "readAt"]),
      dismissedAt: pickString(record, ["dismissed_at", "dismissedAt"]),
      completedAt: pickString(record, ["survey_completed_at", "surveyCompletedAt"]),
    });
  }
  return map;
}

async function getUserCampaignStateFromEvents(
  client: CampaignClient,
  campaignIds: string[],
  userId: string,
) {
  const read = new Set<string>();
  const dismissed = new Set<string>();
  const completed = new Set<string>();
  if (campaignIds.length === 0 || !isUuidLike(userId)) {
    return { read, dismissed, completed };
  }

  const result = await client
    .from("event_log")
    .select("event_type, metadata, target_user_id")
    .eq("target_user_id", userId)
    .in("event_type", ["campaign_read", "campaign_dismissed", "campaign_completed"]);
  if (result.error) {
    if (isMissingSchemaError(result.error)) return { read, dismissed, completed };
    return { read, dismissed, completed };
  }

  const allowed = new Set(campaignIds);
  for (const row of result.data ?? []) {
    const record = row as Record<string, unknown>;
    const metadata = (record.metadata as Record<string, unknown> | null) ?? {};
    const campaignId = pickString(metadata, ["campaign_id", "campaignId"]);
    if (!campaignId || !allowed.has(campaignId)) continue;
    const eventType = String(record.event_type ?? "");
    if (eventType === "campaign_read") read.add(campaignId);
    if (eventType === "campaign_dismissed") dismissed.add(campaignId);
    if (eventType === "campaign_completed") {
      completed.add(campaignId);
      read.add(campaignId);
    }
  }

  return { read, dismissed, completed };
}

async function getUserCompletedSurveyCampaignIds(
  client: CampaignClient,
  campaignIds: string[],
  userId: string,
) {
  const completed = new Set<string>();
  if (campaignIds.length === 0) return completed;
  const safeCampaignIds = campaignIds.filter((campaignId) => isUuidLike(campaignId));

  if (safeCampaignIds.length > 0) {
    const primary = await client
      .from("survey_responses")
      .select("campaign_id")
      .eq("user_id", userId)
      .in("campaign_id", safeCampaignIds);
    if (!primary.error) {
      for (const row of primary.data ?? []) {
        const campaignId = pickString(row as Record<string, unknown>, ["campaign_id", "campaignId", "survey_id"]);
        if (campaignId) completed.add(campaignId);
      }
    } else if (!isMissingSchemaError(primary.error) && !isInvalidInputSyntaxError(primary.error)) {
      throw primary.error;
    }
  }

  for (const campaignId of campaignIds) {
    if (completed.has(campaignId)) continue;
    const answers = await loadSurveyResponsesByCampaignAndUser(client, campaignId, userId);
    if (answers.length > 0) completed.add(campaignId);
  }
  return completed;
}

async function listCampaigns(client: CampaignClient, statuses: CampaignStatus[]) {
  const runQuery = async (select: string) =>
    client
      .from("campaigns")
      .select(select)
      .order("starts_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });

  const extended = await runQuery(CAMPAIGN_SELECT_EXTENDED);
  if (!extended.error) {
    const allowed = new Set(statuses.map((status) => normalizeStatus(status)));
    return (extended.data ?? []).filter((row) => {
      const status = normalizeStatus((row as Record<string, unknown>).status as string | undefined);
      return allowed.has(status);
    });
  }
  if (isMissingSchemaError(extended.error)) throw buildCampaignSchemaError(extended.error);
  throw extended.error;
}

async function upsertCampaignState(
  client: CampaignClient,
  userId: string,
  campaignId: string,
  patch: Partial<CampaignDatabase["public"]["Tables"]["user_campaign_states"]["Update"]>,
) {
  const payload: Record<string, unknown> = {
    campaign_id: campaignId,
    user_id: userId,
    ...patch,
  };

  const triedMissingColumns = new Set<string>();
  while (true) {
    const result = await client
      .from("user_campaign_states")
      .upsert(payload as CampaignDatabase["public"]["Tables"]["user_campaign_states"]["Insert"], {
        onConflict: "campaign_id,user_id",
      });
    if (!result.error) return;
    if (isInvalidInputSyntaxError(result.error)) {
      throw new Error(
        `Invalid campaign state payload (campaign_id/user_id). campaignId=${campaignId} userId=${userId}`,
      );
    }

    const missingColumn = extractMissingColumnName(result.error, "user_campaign_states");
    if (missingColumn && missingColumn in payload && !triedMissingColumns.has(missingColumn)) {
      triedMissingColumns.add(missingColumn);
      delete payload[missingColumn];
      continue;
    }
    throw result.error;
  }
}

async function logCampaignEvent(
  client: CampaignClient,
  params: {
    eventType: string;
    campaignId: string;
    actorUserId?: string | null;
    targetUserId?: string | null;
    metadata?: Record<string, unknown>;
  },
) {
  const payload: CampaignDatabase["public"]["Tables"]["event_log"]["Insert"] = {
    event_type: params.eventType,
    actor_user_id: isUuidLike(params.actorUserId) ? params.actorUserId ?? null : null,
    target_user_id: isUuidLike(params.targetUserId) ? params.targetUserId ?? null : null,
    entity_type: "campaign",
    entity_id: isUuidLike(params.campaignId) ? params.campaignId : null,
    metadata: {
      campaign_id: params.campaignId,
      ...params.metadata,
    },
  };
  const result = await client.from("event_log").insert(payload);
  if (result.error && !isMissingSchemaError(result.error) && !isInvalidInputSyntaxError(result.error)) {
    throw result.error;
  }
}

async function getCampaignById(client: CampaignClient, campaignId: string): Promise<Campaign | null> {
  const primary = await client
    .from("campaigns")
    .select(CAMPAIGN_SELECT_EXTENDED)
    .eq("id", campaignId)
    .maybeSingle();

  const row = primary.data as Record<string, unknown> | null;
  if (primary.error) {
    if (isMissingSchemaError(primary.error)) throw buildCampaignSchemaError(primary.error);
    throw primary.error;
  }
  if (!row) return null;

  const rolesMap = await getCampaignRolesMap(client, [campaignId]);
  return mapCampaign(normalizeCampaignRow(row), rolesMap.get(campaignId) ?? []);
}

async function resolveCampaignRecipients(
  client: CampaignClient,
  campaign: Campaign,
): Promise<CampaignRecipientSnapshot[]> {
  const memberships = await listMembershipRows(client);
  if (memberships.length === 0) return [];

  const userIds = Array.from(new Set(memberships.map((row) => row.user_id).filter(Boolean)));
  const businessIds = Array.from(new Set(memberships.map((row) => row.business_id ?? "").filter(Boolean)));

  const businessesResult = businessIds.length > 0
    ? await client.from("businesses").select("*").in("id", businessIds)
    : { data: [], error: null };
  if (businessesResult.error && !isMissingSchemaError(businessesResult.error)) {
    throw businessesResult.error;
  }
  const segmentByBusinessId = new Map<string, string>();
  for (const row of businessesResult.error ? [] : businessesResult.data ?? []) {
    const record = row as Record<string, unknown>;
    const businessId = pickString(record, ["id"]);
    const segment = pickString(record, ["business_segment", "segment", "industry"]);
    if (businessId && segment) segmentByBusinessId.set(businessId, segment.trim().toLowerCase());
  }

  const profilesResult = userIds.length > 0
    ? await client.from("profiles").select("id, full_name, first_name, last_name, email").in("id", userIds)
    : { data: [], error: null };
  if (profilesResult.error && !isMissingSchemaError(profilesResult.error)) {
    throw profilesResult.error;
  }
  const profileByUserId = new Map<string, { label: string; email: string | null }>();
  for (const row of profilesResult.error ? [] : profilesResult.data ?? []) {
    const record = row as Record<string, unknown>;
    const id = pickString(record, ["id"]);
    if (!id) continue;
    const display = resolveUserDisplay({
      full_name: pickString(record, ["full_name"]),
      first_name: pickString(record, ["first_name"]),
      last_name: pickString(record, ["last_name"]),
      email: pickString(record, ["email"]),
    });
    profileByUserId.set(id, {
      label: display.primary || buildSafeUserFallback(id),
      email: display.email || null,
    });
  }

  const rolesAllowed =
    campaign.targetRoles.length > 0
      ? new Set(campaign.targetRoles.map((role) => normalizeRole(String(role))))
      : null;
  const segmentsAllowed =
    campaign.targetSegments.length > 0
      ? new Set(campaign.targetSegments.map((segment) => segment.trim().toLowerCase()))
      : null;

  const userRoles = new Map<string, Set<string>>();
  const userSegments = new Map<string, Set<string>>();
  for (const row of memberships) {
    const userId = row.user_id;
    if (!userId) continue;
    const roles = userRoles.get(userId) ?? new Set<string>();
    if (row.role) roles.add(normalizeRole(row.role));
    userRoles.set(userId, roles);

    const segmentSet = userSegments.get(userId) ?? new Set<string>();
    const segment = row.business_id ? segmentByBusinessId.get(row.business_id) : null;
    if (segment) segmentSet.add(segment);
    userSegments.set(userId, segmentSet);
  }

  const recipients: CampaignRecipientSnapshot[] = [];
  for (const userId of userIds) {
    const roles = userRoles.get(userId) ?? new Set<string>();
    const segments = userSegments.get(userId) ?? new Set<string>();
    if (rolesAllowed && roles.size > 0 && !Array.from(roles).some((role) => rolesAllowed.has(role))) continue;
    if (rolesAllowed && roles.size === 0) continue;
    if (segmentsAllowed && segments.size > 0 && !Array.from(segments).some((segment) => segmentsAllowed.has(segment))) continue;
    if (segmentsAllowed && segments.size === 0) continue;

    const firstRole = Array.from(roles)[0] ?? null;
    const firstSegment = Array.from(segments)[0] ?? null;
    const profile = profileByUserId.get(userId);
    recipients.push({
      userId,
      role: firstRole,
      segment: firstSegment,
      label: profile?.label ?? buildSafeUserFallback(userId),
      email: profile?.email ?? null,
    });
  }

  return recipients.sort((a, b) => a.label.localeCompare(b.label));
}

async function persistDispatchSnapshot(
  client: CampaignClient,
  campaign: Campaign,
  actorUserId: string | null,
  recipients: CampaignRecipientSnapshot[],
) {
  const nowIso = toIsoNow();
  const campaignIdIsUuid = isUuidLike(campaign.id);
  if (campaignIdIsUuid && recipients.length > 0) {
    const batchSize = 200;
    const validRecipientIds = recipients.filter((recipient) => isUuidLike(recipient.userId));
    for (let index = 0; index < validRecipientIds.length; index += batchSize) {
      const chunk = validRecipientIds.slice(index, index + batchSize).map((recipient) => ({
        campaign_id: campaign.id,
        user_id: recipient.userId,
        delivered_at: nowIso,
      }));
      if (chunk.length === 0) continue;
      const result = await client
        .from("user_campaign_states")
        .upsert(chunk, { onConflict: "campaign_id,user_id", ignoreDuplicates: true });
      if (result.error) {
        if (isInvalidInputSyntaxError(result.error)) {
          await logCampaignEvent(client, {
            eventType: "campaign_delivery_failed",
            campaignId: campaign.id,
            actorUserId,
            metadata: { reason: "invalid_input_syntax", channel_mode: getDeliveryMode(campaign.channels) },
          });
          break;
        }
        throw result.error;
      }
    }
  }

  await logCampaignEvent(client, {
    eventType: "campaign_sent",
    campaignId: campaign.id,
    actorUserId,
    metadata: {
      campaign_type: campaign.type,
      target_roles: campaign.targetRoles,
      target_segments: campaign.targetSegments,
      delivery_mode: getDeliveryMode(campaign.channels),
      channels: campaign.channels,
      recipient_count: recipients.length,
      sent_at: nowIso,
      recipient_preview: recipients.slice(0, 50).map((recipient) => ({
        user_id: recipient.userId,
        role: recipient.role,
        segment: recipient.segment,
        label: recipient.label,
        email: recipient.email,
      })),
    },
  });

  await logCampaignEvent(client, {
    eventType: "campaign_delivered",
    campaignId: campaign.id,
    actorUserId,
    metadata: {
      delivery_mode: getDeliveryMode(campaign.channels),
      channels: campaign.channels,
      recipient_count: recipients.length,
      delivered_at: nowIso,
    },
  });

  if (recipients.length === 0) {
    await logCampaignEvent(client, {
      eventType: "campaign_delivery_failed",
      campaignId: campaign.id,
      actorUserId,
      metadata: {
        reason: "no_matching_recipients",
        delivery_mode: getDeliveryMode(campaign.channels),
        channels: campaign.channels,
      },
    });
  }
}

export async function getBellItems(client: CampaignClient, userId: string): Promise<CampaignBellItem[]> {
  const [rawCampaigns, userRoles, userSegments] = await Promise.all([
    listCampaigns(client, ["active"]),
    getUserRoles(client, userId),
    getUserSegments(client, userId),
  ]);
  const campaignIds = rawCampaigns.map((row) => row.id);
  const [rolesMap, statesMap, completedSurveyCampaignIds, eventState] = await Promise.all([
    getCampaignRolesMap(client, campaignIds),
    getUserCampaignStatesMap(client, campaignIds, userId),
    getUserCompletedSurveyCampaignIds(client, campaignIds, userId),
    getUserCampaignStateFromEvents(client, campaignIds, userId),
  ]);

  const items = rawCampaigns
    .map((row) => {
      const normalized = normalizeCampaignRow(row as Record<string, unknown>);
      return mapCampaign(normalized, rolesMap.get(normalized.id) ?? []);
    })
    .filter((campaign) => isCampaignActiveNow(campaign))
    .filter((campaign) => hasChannel(campaign, BELL_CHANNEL))
    .filter((campaign) => canSeeCampaignByRole(campaign, userRoles))
    .filter((campaign) => canSeeCampaignBySegment(campaign, userSegments))
    .map((campaign) => {
      const state = statesMap.get(campaign.id);
      const isCompleted =
        Boolean(state?.completedAt) ||
        eventState.completed.has(campaign.id) ||
        (campaign.type === "survey" && completedSurveyCampaignIds.has(campaign.id));
      const isRead = Boolean(state?.readAt) || eventState.read.has(campaign.id) || isCompleted;
      return {
        ...campaign,
        deliveryMode: getDeliveryMode(campaign.channels),
        isRead,
        isDismissed: Boolean(state?.dismissedAt) || eventState.dismissed.has(campaign.id),
        isCompleted,
        surveyStateLabel: campaign.type === "survey" ? (isCompleted ? "Voted" : "Not answered") : null,
      };
    })
    .sort((a, b) => {
      if (a.isRead !== b.isRead) return a.isRead ? 1 : -1;
      return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();
    });

  return items;
}

export async function getPopupItem(client: CampaignClient, userId: string): Promise<CampaignBellItem | null> {
  const [rawCampaigns, userRoles, userSegments] = await Promise.all([
    listCampaigns(client, ["active"]),
    getUserRoles(client, userId),
    getUserSegments(client, userId),
  ]);
  const campaignIds = rawCampaigns.map((row) => row.id);
  const [rolesMap, statesMap, completedSurveyCampaignIds, eventState] = await Promise.all([
    getCampaignRolesMap(client, campaignIds),
    getUserCampaignStatesMap(client, campaignIds, userId),
    getUserCompletedSurveyCampaignIds(client, campaignIds, userId),
    getUserCampaignStateFromEvents(client, campaignIds, userId),
  ]);

  const visible = rawCampaigns
    .map((row) => {
      const normalized = normalizeCampaignRow(row as Record<string, unknown>);
      return mapCampaign(normalized, rolesMap.get(normalized.id) ?? []);
    })
    .filter((campaign) => isCampaignActiveNow(campaign))
    .filter((campaign) => hasChannel(campaign, POPUP_CHANNEL))
    .filter((campaign) => canSeeCampaignByRole(campaign, userRoles))
    .filter((campaign) => canSeeCampaignBySegment(campaign, userSegments))
    .map((campaign) => {
      const state = statesMap.get(campaign.id);
      const isCompleted =
        Boolean(state?.completedAt) ||
        eventState.completed.has(campaign.id) ||
        (campaign.type === "survey" && completedSurveyCampaignIds.has(campaign.id));
      const isRead = Boolean(state?.readAt) || eventState.read.has(campaign.id) || isCompleted;
      return {
        ...campaign,
        deliveryMode: getDeliveryMode(campaign.channels),
        isRead,
        isDismissed: Boolean(state?.dismissedAt) || eventState.dismissed.has(campaign.id),
        isCompleted,
        surveyStateLabel: campaign.type === "survey" ? (isCompleted ? "Voted" : "Not answered") : null,
      };
    })
    .filter((item) => !item.isDismissed)
    .filter((item) => !(item.type === "survey" && item.isCompleted));

  return visible[0] ?? null;
}

export async function markCampaignRead(client: CampaignClient, userId: string, campaignId: string) {
  const nowIso = toIsoNow();
  await upsertCampaignState(client, userId, campaignId, { read_at: nowIso, opened_at: nowIso });
  await logCampaignEvent(client, {
    eventType: "campaign_read",
    campaignId,
    targetUserId: userId,
    metadata: { read_at: nowIso },
  });
}

export async function markAllCampaignsRead(client: CampaignClient, userId: string) {
  const items = await getBellItems(client, userId);
  const unreadCampaignIds = items
    .filter((item) => !item.isRead)
    .map((item) => item.id)
    .filter(Boolean);

  for (const campaignId of unreadCampaignIds) {
    await markCampaignRead(client, userId, campaignId);
  }

  return { markedCount: unreadCampaignIds.length };
}

export async function dismissCampaign(client: CampaignClient, userId: string, campaignId: string) {
  const nowIso = toIsoNow();
  await upsertCampaignState(client, userId, campaignId, { dismissed_at: nowIso });
  await logCampaignEvent(client, {
    eventType: "campaign_dismissed",
    campaignId,
    targetUserId: userId,
    metadata: { dismissed_at: nowIso },
  });
}

export async function markCampaignOpened(
  client: CampaignClient,
  userId: string,
  campaignId: string,
  channel: CampaignChannel,
) {
  const statesMap = await getUserCampaignStatesMap(client, [campaignId], userId);
  const existing = statesMap.get(campaignId);
  const alreadyOpenedChannel = channel === "bell" ? Boolean(existing?.bellOpenedAt) : Boolean(existing?.popupOpenedAt);
  if (alreadyOpenedChannel) return;

  const nowIso = toIsoNow();
  const channelPatch =
    channel === "bell" ? { bell_opened_at: nowIso } : { popup_opened_at: nowIso };
  await upsertCampaignState(client, userId, campaignId, {
    opened_at: nowIso,
    ...channelPatch,
  });
  await logCampaignEvent(client, {
    eventType: channel === "bell" ? "campaign_bell_opened" : "campaign_popup_opened",
    campaignId,
    targetUserId: userId,
    metadata: { channel, opened_at: nowIso },
  });
}

export async function markCampaignClicked(
  client: CampaignClient,
  userId: string,
  campaignId: string,
  channel: CampaignChannel,
) {
  const statesMap = await getUserCampaignStatesMap(client, [campaignId], userId);
  const existing = statesMap.get(campaignId);
  const alreadyClickedChannel = channel === "bell" ? Boolean(existing?.bellClickedAt) : Boolean(existing?.popupClickedAt);
  if (alreadyClickedChannel) return;

  const nowIso = toIsoNow();
  const channelPatch =
    channel === "bell" ? { bell_clicked_at: nowIso } : { popup_clicked_at: nowIso };
  await upsertCampaignState(client, userId, campaignId, {
    clicked_at: nowIso,
    ...channelPatch,
  });
  await logCampaignEvent(client, {
    eventType: "campaign_notification_clicked",
    campaignId,
    targetUserId: userId,
    metadata: { channel, clicked_at: nowIso },
  });
}

export async function getSurveyByCampaignId(
  client: CampaignClient,
  campaignId: string,
): Promise<Survey | null> {
  const campaignResult = await client
    .from("campaigns")
    .select(CAMPAIGN_SELECT_EXTENDED)
    .eq("id", campaignId)
    .maybeSingle();

  const campaignRow = campaignResult.data;
  if (campaignResult.error) {
    if (isMissingSchemaError(campaignResult.error)) throw buildCampaignSchemaError(campaignResult.error);
    throw campaignResult.error;
  }

  if (!campaignRow) return null;
  if (normalizeType(campaignRow.type as string | undefined) !== "survey") return null;

  const [questionResultPrimary, rolesMap] = await Promise.all([
    client
      .from("survey_questions")
      .select(SURVEY_QUESTION_SELECT_PRIMARY)
      .eq("campaign_id", campaignId)
      .order("question_order", { ascending: true }),
    getCampaignRolesMap(client, [campaignId]),
  ]);

  let questionRows = questionResultPrimary.data as Record<string, unknown>[] | null;
  if (questionResultPrimary.error) {
    if (!isMissingSchemaError(questionResultPrimary.error)) throw questionResultPrimary.error;
    const fallbackQuestions = await client
      .from("survey_questions")
      .select(SURVEY_QUESTION_SELECT_FALLBACK)
      .eq("campaign_id", campaignId)
      .order("question_order", { ascending: true });
    if (fallbackQuestions.error) throw fallbackQuestions.error;
    questionRows = fallbackQuestions.data as Record<string, unknown>[] | null;
  }

  const questionIds = (questionRows ?? [])
    .map((row) => pickString(row, ["id"]) ?? "")
    .filter(Boolean);
  const optionResultPrimary = questionIds.length > 0
    ? await client
      .from("survey_options")
      .select(SURVEY_OPTION_SELECT_PRIMARY)
      .in("question_id", questionIds)
      .order("option_order", { ascending: true })
    : { data: [] as Record<string, unknown>[], error: null };

  let optionRows = optionResultPrimary.data as Record<string, unknown>[] | null;
  if (optionResultPrimary.error) {
    if (!isMissingSchemaError(optionResultPrimary.error)) throw optionResultPrimary.error;
    const fallbackOptions = await client
      .from("survey_options")
      .select(SURVEY_OPTION_SELECT_FALLBACK)
      .in("question_id", questionIds)
      .order("option_order", { ascending: true });
    if (fallbackOptions.error) throw fallbackOptions.error;
    optionRows = fallbackOptions.data as Record<string, unknown>[] | null;
  }

  const optionsByQuestion = new Map<string, SurveyOption[]>();
  for (const optionRow of optionRows ?? []) {
    const questionId = pickString(optionRow, ["question_id", "questionId"]);
    const optionId = pickString(optionRow, ["id"]);
    const optionOrderValue = optionRow.option_order;
    const optionOrder = typeof optionOrderValue === "number" ? optionOrderValue : Number(optionOrderValue);
    const label = pickString(optionRow, ["label", "text"]) ?? "";
    if (!questionId || !optionId || !Number.isFinite(optionOrder) || !label) continue;

    const list = optionsByQuestion.get(questionId) ?? [];
    list.push({
      id: optionId,
      questionId,
      optionOrder,
      label,
      value: pickString(optionRow, ["value"]),
    });
    optionsByQuestion.set(questionId, list);
  }

  const campaign = mapCampaign(normalizeCampaignRow(campaignRow as Record<string, unknown>), rolesMap.get(campaignId) ?? []);

  const questions: SurveyQuestion[] = (questionRows ?? []).flatMap((questionRow) => {
    const id = pickString(questionRow, ["id"]);
    const normalizedCampaignId = pickString(questionRow, ["campaign_id", "campaignId"]);
    const questionOrderValue = questionRow.question_order;
    const questionOrder =
      typeof questionOrderValue === "number" ? questionOrderValue : Number(questionOrderValue);
    const questionType = pickString(questionRow, ["question_type", "type"]) as SurveyQuestionType | null;
    const title = pickString(questionRow, ["title"]);
    if (!id || !normalizedCampaignId || !Number.isFinite(questionOrder) || !questionType || !title) return [];

    return [{
      id,
      campaignId: normalizedCampaignId,
      questionOrder,
      questionType,
      title,
      options: optionsByQuestion.get(id) ?? [],
    }];
  });

  return { campaign, questions };
}

function validateAnswerForQuestion(question: SurveyQuestion, optionIds: string[]) {
  const validOptionIds = new Set(question.options.map((option) => option.id));
  if (optionIds.some((optionId) => !validOptionIds.has(optionId))) {
    throw new Error(`Invalid option for question ${question.id}`);
  }

  if (question.questionType === "single_choice" || question.questionType === "yes_no" || question.questionType === "rating_1_5") {
    if (optionIds.length !== 1) {
      throw new Error(`Question ${question.id} expects exactly one option`);
    }
  }

  if (question.questionType === "multiple_choice" && optionIds.length < 1) {
    throw new Error(`Question ${question.id} expects at least one option`);
  }
}

async function loadSurveyResponsesByCampaignAndUser(
  client: CampaignClient,
  campaignId: string,
  userId: string,
) {
  const campaignColumns = ["campaign_id", "campaignId", "survey_id"];
  const userColumns = ["user_id", "userId"];
  let lastError: unknown = null;

  for (const campaignColumn of campaignColumns) {
    for (const userColumn of userColumns) {
      const result = await client
        .from("survey_responses")
        .select("*")
        .eq(campaignColumn, campaignId)
        .eq(userColumn, userId);
      if (!result.error) return (result.data ?? []) as Record<string, unknown>[];
      if (isMissingSchemaError(result.error) || isInvalidInputSyntaxError(result.error)) {
        lastError = result.error;
        continue;
      }
      throw result.error;
    }
  }

  if (lastError && !isMissingSchemaError(lastError) && !isInvalidInputSyntaxError(lastError)) throw lastError;

  const fullScan = await client.from("survey_responses").select("*").eq("user_id", userId);
  if (!fullScan.error) {
    return (fullScan.data ?? []).filter((row) => {
      const record = row as Record<string, unknown>;
      const candidateCampaignId = pickString(record, ["campaign_id", "campaignId", "survey_id"]);
      return candidateCampaignId === campaignId;
    }) as Record<string, unknown>[];
  }

  if (fullScan.error && !isMissingSchemaError(fullScan.error) && !isInvalidInputSyntaxError(fullScan.error)) {
    throw fullScan.error;
  }
  return [] as Record<string, unknown>[];
}

async function insertSurveyResponsesWithFallback(
  client: CampaignClient,
  rows: Array<{ campaignId: string; questionId: string; optionId: string; userId: string }>,
) {
  if (rows.length === 0) return;

  const payloadVariants = [
    rows.map((row) => ({
      campaign_id: row.campaignId,
      question_id: row.questionId,
      option_id: row.optionId,
      user_id: row.userId,
    })),
    rows.map((row) => ({
      campaign_id: row.campaignId,
      survey_question_id: row.questionId,
      survey_option_id: row.optionId,
      user_id: row.userId,
    })),
    rows.map((row) => ({
      survey_id: row.campaignId,
      question_id: row.questionId,
      selected_option_id: row.optionId,
      user_id: row.userId,
    })),
  ] as Record<string, unknown>[][];

  let lastError: unknown = null;
  for (const payload of payloadVariants) {
    const result = await client.from("survey_responses").insert(payload);
    if (!result.error) return;
    if (isMissingSchemaError(result.error)) {
      lastError = result.error;
      continue;
    }
    throw result.error;
  }

  if (lastError) throw lastError;
}

async function getSurveyResponderIdsForCampaign(client: CampaignClient, campaignId: string) {
  const responders = new Set<string>();

  const primary = await client
    .from("survey_responses")
    .select("user_id")
    .eq("campaign_id", campaignId);
  if (!primary.error) {
    for (const row of primary.data ?? []) {
      const userId = pickString(row as Record<string, unknown>, ["user_id", "userId"]);
      if (userId) responders.add(userId);
    }
    return responders;
  }

  if (!isMissingSchemaError(primary.error)) {
    throw primary.error;
  }

  const fallback = await client
    .from("survey_responses")
    .select("*")
    .eq("survey_id", campaignId);
  if (!fallback.error) {
    for (const row of fallback.data ?? []) {
      const userId = pickString(row as Record<string, unknown>, ["user_id", "userId"]);
      if (userId) responders.add(userId);
    }
    return responders;
  }

  if (!isMissingSchemaError(fallback.error)) {
    throw fallback.error;
  }

  const fullScan = await client.from("survey_responses").select("*");
  if (!fullScan.error) {
    for (const row of fullScan.data ?? []) {
      const record = row as Record<string, unknown>;
      const candidateCampaignId = pickString(record, ["campaign_id", "campaignId", "survey_id"]);
      if (candidateCampaignId !== campaignId) continue;
      const userId = pickString(record, ["user_id", "userId"]);
      if (userId) responders.add(userId);
    }
  }

  return responders;
}

function normalizeSurveyAnswersFromRows(rows: Record<string, unknown>[]) {
  const result: Record<string, string[]> = {};
  for (const row of rows) {
    const questionId = pickString(row, ["question_id", "survey_question_id", "questionId"]);
    const optionId = pickString(row, ["option_id", "survey_option_id", "selected_option_id", "optionId"]);
    if (!questionId || !optionId) continue;
    if (!result[questionId]) result[questionId] = [];
    if (!result[questionId].includes(optionId)) result[questionId].push(optionId);
  }
  return result;
}

export async function submitSurvey(
  client: CampaignClient,
  userId: string,
  campaignId: string,
  answers: SurveyAnswerPayload[],
) {
  const parsed = surveySubmitSchema.safeParse({ campaignId, answers });
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((issue) => issue.message).join(", "));
  }

  const survey = await getSurveyByCampaignId(client, campaignId);
  if (!survey) throw new Error("Survey not found");
  if (!isCampaignActiveNow(survey.campaign)) throw new Error("Survey is not active");

  const questionById = new Map<string, SurveyQuestion>(survey.questions.map((question) => [question.id, question]));
  const deduped = new Map<string, string[]>();

  for (const answer of answers) {
    const question = questionById.get(answer.questionId);
    if (!question) throw new Error(`Question ${answer.questionId} does not belong to campaign`);
    const optionIds = [...new Set(answer.optionIds)];
    validateAnswerForQuestion(question, optionIds);
    deduped.set(answer.questionId, optionIds);
  }

  for (const question of survey.questions) {
    if (!deduped.has(question.id)) {
      throw new Error(`Question ${question.id} has no answer`);
    }
  }

  const existingAnswers = await getSurveyAnswersForUser(client, userId, campaignId);
  const hasExistingAnswers = Object.values(existingAnswers).some((optionIds) => optionIds.length > 0);
  if (hasExistingAnswers) {
    throw new Error("Survey already answered");
  }

  const inserts: Array<{ campaignId: string; questionId: string; optionId: string; userId: string }> = [];
  for (const [questionId, optionIds] of deduped.entries()) {
    for (const optionId of optionIds) {
      inserts.push({
        campaignId,
        questionId,
        optionId,
        userId,
      });
    }
  }

  await insertSurveyResponsesWithFallback(client, inserts);

  const nowIso = new Date().toISOString();
  await upsertCampaignState(client, userId, campaignId, {
    survey_completed_at: nowIso,
    read_at: nowIso,
    opened_at: nowIso,
  });
  await logCampaignEvent(client, {
    eventType: "campaign_completed",
    campaignId,
    targetUserId: userId,
    metadata: { completed_at: nowIso, source: "survey_submit" },
  });
}

export async function getSurveyAnswersForUser(
  client: CampaignClient,
  userId: string,
  campaignId: string,
) {
  const rows = await loadSurveyResponsesByCampaignAndUser(client, campaignId, userId);
  return normalizeSurveyAnswersFromRows(rows);
}

export async function getAdminCampaigns(client: CampaignClient, filters: AdminCampaignFilters = {}) {
  const query = client
    .from("campaigns")
    .select(CAMPAIGN_SELECT_EXTENDED)
    .order("created_at", { ascending: false });

  // We filter locally to support different enum casing in existing DB.

  const campaignsResult = await query;
  if (campaignsResult.error) {
    if (isMissingSchemaError(campaignsResult.error)) throw buildCampaignSchemaError(campaignsResult.error);
    throw campaignsResult.error;
  }

  const campaignIds = (campaignsResult.data ?? []).map((row) => row.id);
  const rolesMap = await getCampaignRolesMap(client, campaignIds);

  return (campaignsResult.data ?? [])
    .map((row) => normalizeCampaignRow(row as Record<string, unknown>))
    .filter((row) => {
      if (filters.type && filters.type !== "all" && normalizeType(row.type) !== normalizeType(filters.type)) return false;
      if (filters.status && filters.status !== "all" && normalizeStatus(row.status) !== normalizeStatus(filters.status)) return false;
      return true;
    })
    .map((row) => mapCampaign(row, rolesMap.get(row.id) ?? []));
}

export async function getCampaignAnalyticsSummary(
  client: CampaignClient,
  campaignId: string,
): Promise<CampaignAnalyticsSummary> {
  const campaignIdIsUuid = isUuidLike(campaignId);
  if (!campaignIdIsUuid) {
    return {
      campaignId,
      recipientCount: 0,
      readCount: 0,
      unreadCount: 0,
      dismissedCount: 0,
      completedCount: 0,
      deliveredCount: 0,
      shownCount: 0,
      openedCount: 0,
      clickedCount: 0,
      bellShownCount: 0,
      popupShownCount: 0,
      bellOpenedCount: 0,
      popupOpenedCount: 0,
      bellClickedCount: 0,
      popupClickedCount: 0,
      failedDeliveryCount: 0,
    };
  }

  const statesResult = await client.from("user_campaign_states").select("*").eq("campaign_id", campaignId);
  if (statesResult.error && !isMissingSchemaError(statesResult.error)) {
    throw statesResult.error;
  }
  const states = (statesResult.error ? [] : statesResult.data ?? []) as Record<string, unknown>[];
  let recipientCount = states.length;
  let readCount = states.filter((row) => Boolean(pickString(row, ["read_at", "readAt"]))).length;
  const dismissedCount = states.filter((row) => Boolean(pickString(row, ["dismissed_at", "dismissedAt"]))).length;
  let completedCount = states.filter((row) => Boolean(pickString(row, ["survey_completed_at", "surveyCompletedAt"]))).length;
  let deliveredCount = states.filter((row) => Boolean(pickString(row, ["delivered_at", "deliveredAt"]))).length;
  let bellShownCount = states.filter((row) => Boolean(pickString(row, ["bell_shown_at", "bellShownAt"]))).length;
  let popupShownCount = states.filter((row) => Boolean(pickString(row, ["popup_shown_at", "popupShownAt"]))).length;
  let bellOpenedCount = states.filter((row) => Boolean(pickString(row, ["bell_opened_at", "bellOpenedAt"]))).length;
  let popupOpenedCount = states.filter((row) => Boolean(pickString(row, ["popup_opened_at", "popupOpenedAt"]))).length;
  let bellClickedCount = states.filter((row) => Boolean(pickString(row, ["bell_clicked_at", "bellClickedAt"]))).length;
  let popupClickedCount = states.filter((row) => Boolean(pickString(row, ["popup_clicked_at", "popupClickedAt"]))).length;
  let shownCount = states.filter((row) => {
    const bellShown = Boolean(pickString(row, ["bell_shown_at", "bellShownAt"]));
    const popupShown = Boolean(pickString(row, ["popup_shown_at", "popupShownAt"]));
    return bellShown || popupShown;
  }).length;
  let openedCount = states.filter((row) => Boolean(pickString(row, ["opened_at", "openedAt"]))).length;
  let clickedCount = states.filter((row) => Boolean(pickString(row, ["clicked_at", "clickedAt"]))).length;

  const responders = await getSurveyResponderIdsForCampaign(client, campaignId);
  completedCount = Math.max(completedCount, responders.size);
  readCount = Math.max(readCount, responders.size);
  openedCount = Math.max(openedCount, responders.size);

  const eventRowsResult = await client
    .from("event_log")
    .select("event_type, target_user_id, entity_id, metadata")
    .in("event_type", [
      "campaign_sent",
      "campaign_delivered",
      "campaign_bell_shown",
      "campaign_popup_shown",
      "campaign_completed",
      "campaign_read",
      "campaign_bell_opened",
      "campaign_popup_opened",
      "campaign_notification_clicked",
      "campaign_delivery_failed",
    ]);
  if (!eventRowsResult.error) {
    const campaignEvents = (eventRowsResult.data ?? []).filter((row) => {
      const record = row as Record<string, unknown>;
      const entityCampaignId = pickString(record, ["entity_id", "entityId"]);
      if (entityCampaignId === campaignId) return true;
      const metadata = (record.metadata as Record<string, unknown> | null) ?? {};
      const metadataCampaignId = pickString(metadata, ["campaign_id", "campaignId"]);
      return metadataCampaignId === campaignId;
    });

    const uniqueCountByEvent = (eventType: string) =>
      new Set(
        campaignEvents
          .filter((row) => String((row as Record<string, unknown>).event_type ?? "") === eventType)
          .map((row) => pickString(row as Record<string, unknown>, ["target_user_id", "targetUserId"]))
          .filter((value): value is string => Boolean(value)),
      ).size;

    const latestCampaignSent = campaignEvents
      .filter((row) => String((row as Record<string, unknown>).event_type ?? "") === "campaign_sent")
      .slice(-1)[0] as Record<string, unknown> | undefined;
    const metadata = (latestCampaignSent?.metadata as Record<string, unknown> | null) ?? {};
    const metadataRecipientCount = Number(metadata.recipient_count ?? 0);
    if (recipientCount === 0 && Number.isFinite(metadataRecipientCount) && metadataRecipientCount > 0) {
      recipientCount = metadataRecipientCount;
    }

    deliveredCount = Math.max(deliveredCount, uniqueCountByEvent("campaign_delivered"), recipientCount);
    bellShownCount = Math.max(bellShownCount, uniqueCountByEvent("campaign_bell_shown"));
    popupShownCount = Math.max(popupShownCount, uniqueCountByEvent("campaign_popup_shown"));
    shownCount = Math.max(shownCount, bellShownCount, popupShownCount);
    bellOpenedCount = Math.max(bellOpenedCount, uniqueCountByEvent("campaign_bell_opened"));
    popupOpenedCount = Math.max(popupOpenedCount, uniqueCountByEvent("campaign_popup_opened"));
    openedCount = Math.max(openedCount, bellOpenedCount, popupOpenedCount);
    clickedCount = Math.max(clickedCount, uniqueCountByEvent("campaign_notification_clicked"));
    bellClickedCount = Math.max(bellClickedCount, uniqueCountByEvent("campaign_notification_clicked"));
    popupClickedCount = Math.max(popupClickedCount, uniqueCountByEvent("campaign_notification_clicked"));
    completedCount = Math.max(completedCount, uniqueCountByEvent("campaign_completed"));
    readCount = Math.max(readCount, uniqueCountByEvent("campaign_read"));

    const failedDeliveryFromEvents = campaignEvents.filter(
      (row) => String((row as Record<string, unknown>).event_type ?? "") === "campaign_delivery_failed",
    ).length;

    return {
      campaignId,
      recipientCount,
      readCount,
      unreadCount: Math.max(recipientCount - readCount, 0),
      dismissedCount,
      completedCount,
      deliveredCount,
      shownCount,
      openedCount,
      clickedCount,
      bellShownCount,
      popupShownCount,
      bellOpenedCount,
      popupOpenedCount,
      bellClickedCount,
      popupClickedCount,
      failedDeliveryCount: failedDeliveryFromEvents,
    };
  }

  const failedDeliveryCount = 0;

  return {
    campaignId,
    recipientCount,
    readCount,
    unreadCount: Math.max(recipientCount - readCount, 0),
    dismissedCount,
    completedCount,
    deliveredCount,
    shownCount,
    openedCount,
    clickedCount,
    bellShownCount,
    popupShownCount,
    bellOpenedCount,
    popupOpenedCount,
    bellClickedCount,
    popupClickedCount,
    failedDeliveryCount,
  };
}

export async function getCampaignPreviewDetails(
  client: CampaignClient,
  campaignId: string,
): Promise<CampaignPreviewDetails | null> {
  const campaign = await getCampaignById(client, campaignId);
  if (!campaign) return null;
  const campaignIdIsUuid = isUuidLike(campaignId);

  const statesResult = campaignIdIsUuid
    ? await client
      .from("user_campaign_states")
      .select("user_id")
      .eq("campaign_id", campaignId)
    : { data: [], error: null };
  if (statesResult.error && !isMissingSchemaError(statesResult.error)) {
    throw statesResult.error;
  }

  const eventResult = campaignIdIsUuid
    ? await client
      .from("event_log")
      .select("actor_user_id, created_at, metadata")
      .eq("event_type", "campaign_sent")
      .eq("entity_type", "campaign")
      .eq("entity_id", campaignId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
    : { data: null, error: null };
  if (eventResult.error && !isMissingSchemaError(eventResult.error)) {
    throw eventResult.error;
  }

  const sentAt = pickString((eventResult.data as Record<string, unknown> | null) ?? {}, ["created_at"]);
  const sentByUserId = pickString((eventResult.data as Record<string, unknown> | null) ?? {}, ["actor_user_id"]);
  const metadata =
    (eventResult.data as { metadata?: Record<string, unknown> } | null)?.metadata ?? {};

  const stateUserIds = Array.from(
    new Set(
      (statesResult.error ? [] : statesResult.data ?? [])
        .map((row) => pickString(row as Record<string, unknown>, ["user_id"]))
        .filter((value): value is string => Boolean(value)),
    ),
  );

  const recipientRows = await resolveCampaignRecipients(client, campaign);
  const recipientByUserId = new Map(recipientRows.map((row) => [row.userId, row]));
  const recipientsPreview =
    stateUserIds.length > 0
      ? stateUserIds
        .map((userId) => recipientByUserId.get(userId))
        .filter((row): row is CampaignRecipientSnapshot => Boolean(row))
      : recipientRows;

  let sentByLabel: string | null = null;
  if (sentByUserId) {
    const senderResult = await client
      .from("profiles")
      .select("id, full_name, first_name, last_name, email")
      .eq("id", sentByUserId)
      .maybeSingle();
    if (!senderResult.error && senderResult.data) {
      const sender = senderResult.data as Record<string, unknown>;
      sentByLabel = resolveUserDisplay({
        full_name: pickString(sender, ["full_name"]),
        first_name: pickString(sender, ["first_name"]),
        last_name: pickString(sender, ["last_name"]),
        email: pickString(sender, ["email"]),
      }).primary;
    }
    if (!sentByLabel) {
      sentByLabel = buildSafeUserFallback(sentByUserId);
    }
  }

  const metadataCount = Number((metadata as Record<string, unknown>).recipient_count ?? 0);
  const analytics = await getCampaignAnalyticsSummary(client, campaignId);
  const sentRecipientCount =
    Number.isFinite(metadataCount) && metadataCount > 0
      ? metadataCount
      : stateUserIds.length > 0
        ? stateUserIds.length
        : recipientsPreview.length;

  return {
    campaign,
    status: campaign.status,
    sentAt,
    sentByUserId,
    sentByLabel,
    sentRecipientCount,
    targetRoles: campaign.targetRoles.map((role) => String(role)),
    targetSegments: campaign.targetSegments,
    recipientsPreview: recipientsPreview.slice(0, 50),
    analytics,
  };
}

export async function createCampaign(client: CampaignClient, payload: CreateCampaignPayload, actorUserId?: string) {
  const parsed = campaignPayloadSchema.parse(payload);

  const baseInsertPayload = {
    type: parsed.type,
    title: parsed.title,
    body: parsed.body,
    status: parsed.status,
    starts_at: parsed.startsAt,
    ends_at: parsed.endsAt,
  };
  const payloadVariants: Record<string, unknown>[] = [
    {
      ...baseInsertPayload,
      channels: parsed.channels,
      show_in_bell: parsed.channels.includes("bell"),
      show_in_popup_right: parsed.channels.includes("popup_right"),
      target_segments: parsed.targetSegments,
      target_segment: parsed.targetSegments[0] ?? null,
    },
    {
      ...baseInsertPayload,
      show_in_bell: parsed.channels.includes("bell"),
      show_in_popup_right: parsed.channels.includes("popup_right"),
      target_segments: parsed.targetSegments,
      target_segment: parsed.targetSegments[0] ?? null,
    },
    {
      ...baseInsertPayload,
      show_in_bell: parsed.channels.includes("bell"),
      show_in_popup_right: parsed.channels.includes("popup_right"),
    },
    {
      ...baseInsertPayload,
      target_segments: parsed.targetSegments,
      target_segment: parsed.targetSegments[0] ?? null,
    },
    {
      ...baseInsertPayload,
    },
  ];

  let campaign: Record<string, unknown> | null = null;
  let lastSchemaError: unknown = null;
  for (const variant of payloadVariants) {
    const insertResult = await client.from("campaigns").insert(variant).select(CAMPAIGN_SELECT_EXTENDED).single();
    if (!insertResult.error) {
      campaign = insertResult.data as Record<string, unknown>;
      break;
    }
    if (isMissingSchemaError(insertResult.error)) {
      lastSchemaError = insertResult.error;
      continue;
    }
    throw insertResult.error;
  }

  if (!campaign && lastSchemaError) throw buildCampaignSchemaError(lastSchemaError);
  if (!campaign) throw new Error("Failed to create campaign");

  if (parsed.targetRoles.length > 0) {
    await insertCampaignTargetRoles(client, String(campaign.id), parsed.targetRoles);
  }

  const mapped = mapCampaign(normalizeCampaignRow(campaign), parsed.targetRoles);
  await logCampaignEvent(client, {
    eventType: "campaign_created",
    campaignId: mapped.id,
    actorUserId: actorUserId ?? null,
    metadata: {
      campaign_type: mapped.type,
      status: mapped.status,
      delivery_mode: getDeliveryMode(mapped.channels),
      channels: mapped.channels,
      target_roles: mapped.targetRoles,
      target_segments: mapped.targetSegments,
    },
  });
  if (normalizeStatus(mapped.status) === "active") {
    const recipients = await resolveCampaignRecipients(client, mapped);
    await persistDispatchSnapshot(client, mapped, actorUserId ?? null, recipients);
  }

  return mapped;
}

export async function updateCampaign(client: CampaignClient, payload: UpdateCampaignPayload, actorUserId?: string) {
  const parsed = campaignPayloadSchema.parse(payload);
  const campaignId = payload.id;

  const existing = await getCampaignById(client, campaignId);
  if (!existing) throw new Error("Campaign not found");

  const existingStatus = normalizeStatus(existing.status);
  const requestedStatus = normalizeStatus(parsed.status);
  const isCurrentlySent = existingStatus === "active";
  if (isCurrentlySent && requestedStatus !== "archived") {
    throw new Error("Campaign is already sent and is read-only");
  }

  const baseUpdatePayload = {
    type: parsed.type,
    title: parsed.title,
    body: parsed.body,
    status: parsed.status,
    starts_at: parsed.startsAt,
    ends_at: parsed.endsAt,
  };
  const updateVariants: Record<string, unknown>[] = [
    {
      ...baseUpdatePayload,
      channels: parsed.channels,
      show_in_bell: parsed.channels.includes("bell"),
      show_in_popup_right: parsed.channels.includes("popup_right"),
      target_segments: parsed.targetSegments,
      target_segment: parsed.targetSegments[0] ?? null,
    },
    {
      ...baseUpdatePayload,
      show_in_bell: parsed.channels.includes("bell"),
      show_in_popup_right: parsed.channels.includes("popup_right"),
      target_segments: parsed.targetSegments,
      target_segment: parsed.targetSegments[0] ?? null,
    },
    {
      ...baseUpdatePayload,
      show_in_bell: parsed.channels.includes("bell"),
      show_in_popup_right: parsed.channels.includes("popup_right"),
    },
    {
      ...baseUpdatePayload,
      target_segments: parsed.targetSegments,
      target_segment: parsed.targetSegments[0] ?? null,
    },
    {
      ...baseUpdatePayload,
    },
  ];

  let updated: Record<string, unknown> | null = null;
  let lastSchemaError: unknown = null;
  for (const variant of updateVariants) {
    const updateResult = await client
      .from("campaigns")
      .update(variant)
      .eq("id", campaignId)
      .select(CAMPAIGN_SELECT_EXTENDED)
      .single();
    if (!updateResult.error) {
      updated = updateResult.data as Record<string, unknown>;
      break;
    }
    if (isMissingSchemaError(updateResult.error)) {
      lastSchemaError = updateResult.error;
      continue;
    }
    throw updateResult.error;
  }

  const removeRolesResult = await client
    .from("campaign_target_roles")
    .delete()
    .eq("campaign_id", campaignId);
  if (removeRolesResult.error) throw removeRolesResult.error;

  if (parsed.targetRoles.length > 0) {
    await insertCampaignTargetRoles(client, campaignId, parsed.targetRoles);
  }

  if (!updated && lastSchemaError) throw buildCampaignSchemaError(lastSchemaError);
  if (!updated) throw new Error("Failed to update campaign");
  const mapped = mapCampaign(normalizeCampaignRow(updated), parsed.targetRoles);
  await logCampaignEvent(client, {
    eventType: "campaign_updated",
    campaignId,
    actorUserId: actorUserId ?? null,
    metadata: {
      campaign_type: mapped.type,
      status: mapped.status,
      delivery_mode: getDeliveryMode(mapped.channels),
      channels: mapped.channels,
      target_roles: mapped.targetRoles,
      target_segments: mapped.targetSegments,
    },
  });
  const becameActive = existingStatus !== "active" && normalizeStatus(mapped.status) === "active";
  if (becameActive) {
    const recipients = await resolveCampaignRecipients(client, mapped);
    await persistDispatchSnapshot(client, mapped, actorUserId ?? null, recipients);
  }

  return mapped;
}

export async function createSurveyQuestion(client: CampaignClient, payload: CreateSurveyQuestionPayload) {
  const parsed = surveyQuestionPayloadSchema.parse(payload);
  const primary = await client
    .from("survey_questions")
    .insert({
      campaign_id: parsed.campaignId,
      question_order: parsed.questionOrder,
      question_type: parsed.questionType,
      title: parsed.title,
    })
    .select(SURVEY_QUESTION_SELECT_PRIMARY)
    .single();

  let row = primary.data as Record<string, unknown> | null;
  if (primary.error) {
    if (!isMissingSchemaError(primary.error)) throw primary.error;

    const fallback = await client
      .from("survey_questions")
      .insert({
        campaign_id: parsed.campaignId,
        question_order: parsed.questionOrder,
        type: parsed.questionType,
        title: parsed.title,
      })
      .select(SURVEY_QUESTION_SELECT_FALLBACK)
      .single();
    if (fallback.error) throw fallback.error;
    row = fallback.data as Record<string, unknown> | null;
  }
  if (!row) throw new Error("Failed to create survey question");

  const id = pickString(row, ["id"]);
  const campaignId = pickString(row, ["campaign_id", "campaignId"]);
  const questionOrderValue = row.question_order;
  const questionOrder = typeof questionOrderValue === "number" ? questionOrderValue : Number(questionOrderValue);
  const questionType = pickString(row, ["question_type", "type"]) as SurveyQuestionType | null;
  const title = pickString(row, ["title"]);
  if (!id || !campaignId || !Number.isFinite(questionOrder) || !questionType || !title) {
    throw new Error("Created survey question has invalid shape");
  }

  return {
    id,
    campaignId,
    questionOrder,
    questionType,
    title,
    options: [] as SurveyOption[],
  };
}

export async function createSurveyOption(client: CampaignClient, payload: CreateSurveyOptionPayload) {
  const parsed = surveyOptionPayloadSchema.parse(payload);
  const primary = await client
    .from("survey_options")
    .insert({
      question_id: parsed.questionId,
      option_order: parsed.optionOrder,
      label: parsed.label,
      value: parsed.value ?? null,
    })
    .select(SURVEY_OPTION_SELECT_PRIMARY)
    .single();

  let row = primary.data as Record<string, unknown> | null;
  if (primary.error) {
    if (!isMissingSchemaError(primary.error)) throw primary.error;

    const normalizedValue = parsed.value?.trim() ?? "";
    const numericValue =
      normalizedValue && /^-?\d+$/.test(normalizedValue) ? Number(normalizedValue) : null;

    const fallback = await client
      .from("survey_options")
      .insert({
        question_id: parsed.questionId,
        option_order: parsed.optionOrder,
        text: parsed.label,
        ...(numericValue !== null ? { value: numericValue } : {}),
      })
      .select(SURVEY_OPTION_SELECT_FALLBACK)
      .single();
    if (fallback.error) throw fallback.error;
    row = fallback.data as Record<string, unknown> | null;
  }
  if (!row) throw new Error("Failed to create survey option");

  const id = pickString(row, ["id"]);
  const questionId = pickString(row, ["question_id", "questionId"]);
  const optionOrderValue = row.option_order;
  const optionOrder = typeof optionOrderValue === "number" ? optionOrderValue : Number(optionOrderValue);
  const label = pickString(row, ["label", "text"]);
  if (!id || !questionId || !Number.isFinite(optionOrder) || !label) {
    throw new Error("Created survey option has invalid shape");
  }

  return {
    id,
    questionId,
    optionOrder,
    label,
    value: pickString(row, ["value"]),
  };
}

export async function updateSurveyQuestion(
  client: CampaignClient,
  payload: { questionId: string; title: string; questionType: SurveyQuestionType },
) {
  const primary = await client
    .from("survey_questions")
    .update({
      title: payload.title,
      question_type: payload.questionType,
    })
    .eq("id", payload.questionId)
    .select(SURVEY_QUESTION_SELECT_PRIMARY)
    .single();

  let row = primary.data as Record<string, unknown> | null;
  if (primary.error) {
    if (!isMissingSchemaError(primary.error)) throw primary.error;

    const fallback = await client
      .from("survey_questions")
      .update({
        title: payload.title,
        type: payload.questionType,
      })
      .eq("id", payload.questionId)
      .select(SURVEY_QUESTION_SELECT_FALLBACK)
      .single();
    if (fallback.error) throw fallback.error;
    row = fallback.data as Record<string, unknown> | null;
  }
  if (!row) throw new Error("Failed to update survey question");

  const id = pickString(row, ["id"]);
  const campaignId = pickString(row, ["campaign_id", "campaignId"]);
  const questionOrderValue = row.question_order;
  const questionOrder = typeof questionOrderValue === "number" ? questionOrderValue : Number(questionOrderValue);
  const questionType = pickString(row, ["question_type", "type"]) as SurveyQuestionType | null;
  const title = pickString(row, ["title"]);
  if (!id || !campaignId || !Number.isFinite(questionOrder) || !questionType || !title) {
    throw new Error("Updated survey question has invalid shape");
  }

  return {
    id,
    campaignId,
    questionOrder,
    questionType,
    title,
    options: [] as SurveyOption[],
  };
}

export async function deleteSurveyQuestion(client: CampaignClient, questionId: string) {
  const result = await client
    .from("survey_questions")
    .delete()
    .eq("id", questionId);
  if (result.error) throw result.error;
}

export async function updateSurveyOption(
  client: CampaignClient,
  payload: { optionId: string; label: string; value?: string | null },
) {
  const primary = await client
    .from("survey_options")
    .update({
      label: payload.label,
      value: payload.value ?? null,
    })
    .eq("id", payload.optionId)
    .select(SURVEY_OPTION_SELECT_PRIMARY)
    .single();

  let row = primary.data as Record<string, unknown> | null;
  if (primary.error) {
    if (!isMissingSchemaError(primary.error)) throw primary.error;

    const normalizedValue = payload.value?.trim() ?? "";
    const numericValue =
      normalizedValue && /^-?\d+$/.test(normalizedValue) ? Number(normalizedValue) : null;
    const fallback = await client
      .from("survey_options")
      .update({
        text: payload.label,
        ...(numericValue !== null ? { value: numericValue } : {}),
      })
      .eq("id", payload.optionId)
      .select(SURVEY_OPTION_SELECT_FALLBACK)
      .single();
    if (fallback.error) throw fallback.error;
    row = fallback.data as Record<string, unknown> | null;
  }
  if (!row) throw new Error("Failed to update survey option");

  const id = pickString(row, ["id"]);
  const questionId = pickString(row, ["question_id", "questionId"]);
  const optionOrderValue = row.option_order;
  const optionOrder = typeof optionOrderValue === "number" ? optionOrderValue : Number(optionOrderValue);
  const label = pickString(row, ["label", "text"]);
  if (!id || !questionId || !Number.isFinite(optionOrder) || !label) {
    throw new Error("Updated survey option has invalid shape");
  }

  return {
    id,
    questionId,
    optionOrder,
    label,
    value: pickString(row, ["value"]),
  };
}

export async function deleteSurveyOption(client: CampaignClient, optionId: string) {
  const result = await client
    .from("survey_options")
    .delete()
    .eq("id", optionId);
  if (result.error) throw result.error;
}

export async function getSurveyStats(client: CampaignClient, campaignId: string): Promise<SurveyStats | null> {
  const survey = await getSurveyByCampaignId(client, campaignId);
  if (!survey) return null;

  let responseRows = [] as Record<string, unknown>[];
  const primaryResponses = await client
    .from("survey_responses")
    .select("option_id")
    .eq("campaign_id", campaignId);
  if (!primaryResponses.error) {
    responseRows = (primaryResponses.data ?? []) as Record<string, unknown>[];
  } else if (isMissingSchemaError(primaryResponses.error)) {
    const fallbackResponses = await client.from("survey_responses").select("*");
    if (fallbackResponses.error) throw fallbackResponses.error;
    responseRows = (fallbackResponses.data ?? []).filter((row) => {
      const record = row as Record<string, unknown>;
      const candidateCampaignId = pickString(record, ["campaign_id", "campaignId", "survey_id"]);
      return candidateCampaignId === campaignId;
    }) as Record<string, unknown>[];
  } else {
    throw primaryResponses.error;
  }

  const optionCount = new Map<string, number>();
  for (const response of responseRows) {
    const optionId = pickString(response, ["option_id", "survey_option_id", "selected_option_id", "optionId"]);
    if (!optionId) continue;
    optionCount.set(optionId, (optionCount.get(optionId) ?? 0) + 1);
  }

  const questions: SurveyQuestionStats[] = survey.questions.map((question) => {
    const options: SurveyOptionStats[] = question.options.map((option) => ({
      ...option,
      responsesCount: optionCount.get(option.id) ?? 0,
    }));

    const totalResponses = options.reduce((sum, option) => sum + option.responsesCount, 0);
    return { ...question, options, totalResponses };
  });

  return {
    campaignId,
    title: survey.campaign.title,
    questions,
  };
}

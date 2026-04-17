import { supabaseAdmin } from "@/lib/supabase/admin";
import { buildSafeUserFallback, resolveUserDisplay } from "@/lib/user-display";

export type AdminAuthUser = {
  id: string;
  email: string | null;
  createdAt: string | null;
  createdAtMs: number;
  emailConfirmedAt: string | null;
  lastSignInAt: string | null;
  lastSignInAtMs: number;
  lastSeenAt: string | null;
  lastSeenAtMs: number;
  fullName: string | null;
  phone: string | null;
  memberships: {
    businessId: string;
    role: string;
    createdAt: string | null;
  }[];
  businesses: {
    id: string;
    slug: string | null;
    name: string | null;
    plan: string | null;
    role: string;
  }[];
  ownerPlans: string[];
  businessesCount: number;
  primaryRole: string;
  hasBusiness: boolean;
  hasSignIn: boolean;
  searchBlob: string;
};

export type AdminBusiness = {
  id: string;
  slug: string | null;
  name: string | null;
  plan: string | null;
  billingPlanCode: string | null;
  subscriptionStatus: string | null;
  createdAt: string | null;
  createdAtMs: number;
  updatedAt: string | null;
  updatedAtMs: number;
  ownerId: string | null;
  ownerLabel: string | null;
  createdBy: string | null;
  managersCount: number;
  membersCount: number;
  ordersCount: number;
  lastActivityAt: string | null;
  lastActivityAtMs: number;
  active: boolean;
  memberships: {
    userId: string;
    role: string;
    createdAt: string | null;
    userLabel: string;
    email: string | null;
  }[];
};

export type AdminInvite = {
  id: string;
  email: string;
  businessId: string;
  businessLabel: string;
  role: string;
  status: string;
  createdAt: string | null;
  createdAtMs: number;
  acceptedAt: string | null;
  revokedAt: string | null;
  expiresAt: string | null;
  invitedBy: string | null;
  invitedByLabel: string | null;
  acceptedBy: string | null;
  revokedBy: string | null;
};

export type AdminOrder = {
  id: string;
  businessId: string;
  businessLabel: string;
  orderNumber: string | number | null;
  clientName: string | null;
  amount: number | null;
  status: string | null;
  createdAt: string | null;
  createdAtMs: number;
  updatedAt: string | null;
  updatedAtMs: number;
  managerId: string | null;
};

export type AdminActivity = {
  id: string;
  kind: string;
  title: string;
  createdAt: string | null;
  createdAtMs: number;
  userId: string | null;
  userLabel: string | null;
  businessId: string | null;
  businessLabel: string | null;
  meta?: string | null;
};

export type AdminDataset = Awaited<ReturnType<typeof loadAdminDataset>>;

type RawProfile = {
  id: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
};

type RawMembership = {
  business_id: string | null;
  user_id: string | null;
  role: string | null;
  created_at: string | null;
};

type RawBusiness = {
  id: string;
  slug: string | null;
  owner_phone: string | null;
  manager_phone: string | null;
  plan: string | null;
  expires_at: string | null;
  created_at: string | null;
  created_by: string | null;
  owner_id: string | null;
  name: string | null;
  updated_at: string | null;
  last_activity_at?: string | null;
  status?: string | null;
  business_phone: string | null;
  business_address: string | null;
  business_segment: string | null;
  business_website: string | null;
};

type RawInvite = {
  id: string;
  business_id: string | null;
  email: string | null;
  role: string | null;
  status: string | null;
  created_at: string | null;
  accepted_at: string | null;
  invited_by?: string | null;
  accepted_by: string | null;
  revoked_at: string | null;
  expires_at: string | null;
  revoked_by: string | null;
};

type RawOrder = {
  id: string;
  business_id: string | null;
  amount: number | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
  client_name: string | null;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  order_number: string | number | null;
  manager_id: string | null;
};

type RawActivityEvent = {
  id: string;
  business_id: string | null;
  actor_id: string | null;
  event_type: string | null;
  entity_type: string | null;
  entity_id: string | null;
  created_at: string | null;
  payload: Record<string, unknown> | null;
};

type RawAuthUser = {
  id: string;
  email: string | null;
  created_at: string | null;
  email_confirmed_at: string | null;
  last_sign_in_at: string | null;
};

type RawAccountUser = {
  account_id: string | null;
  user_id: string | null;
};

type RawSubscription = {
  account_id: string | null;
  plan_price_id: string | null;
  status: string | null;
  updated_at: string | null;
  created_at: string | null;
};

type RawPlanPrice = {
  id: string;
  plan_id: string | null;
};

type RawPlan = {
  id: string;
  code: string | null;
};

type QueryErrorLike = {
  code?: string | null;
  message?: string | null;
};

function asTimeMs(value: string | null | undefined) {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function roleWeight(role: string) {
  if (role === "OWNER") return 3;
  if (role === "MANAGER") return 2;
  return 1;
}

function getPrimaryRole(roles: string[]) {
  const normalized = roles.map((role) => String(role || "").toUpperCase());
  if (normalized.includes("OWNER")) return "OWNER";
  if (normalized.includes("MANAGER")) return "MANAGER";
  return "USER";
}

function getActivityTitle(kind: string | null | undefined) {
  const normalized = String(kind ?? "").trim().toLowerCase();
  const titles: Record<string, string> = {
    "user.registered": "Новая регистрация",
    "user.email_confirmed": "Подтверждение почты",
    "user.signed_in": "Вход в продукт",
    "business.created": "Создание бизнеса",
    "invite.sent": "Отправка приглашения",
    "invite.accepted": "Принятие приглашения",
    "invite.revoked": "Отзыв приглашения",
    "order.created": "Создание заказа",
    "order.updated": "Обновление заказа",
    "membership.added": "Добавление участника",
    "membership.removed": "Удаление участника",
  };

  return titles[normalized] ?? (kind ? String(kind) : "Системное событие");
}

function subscriptionStatusPriority(status: string | null | undefined) {
  const normalized = String(status ?? "").trim().toLowerCase();
  if (normalized === "active") return 0;
  if (normalized === "trialing") return 1;
  if (normalized === "past_due") return 2;
  if (normalized === "paused") return 3;
  if (normalized === "canceled" || normalized === "cancelled") return 4;
  if (normalized === "expired") return 5;
  return 6;
}

function isIgnorableOptionalAdminQueryError(error: QueryErrorLike | null | undefined) {
  if (!error) return false;
  const code = String(error.code ?? "").trim();
  const message = String(error.message ?? "").toLowerCase();
  if (code === "42P01" || code === "42703" || code === "42501") return true;
  return (
    message.includes("does not exist")
    || message.includes("permission denied")
    || message.includes("could not find the table")
    || message.includes("schema cache")
  );
}

// TECH DEBT: this reads auth users page-by-page through Admin API. Good enough for MVP,
// but once auth user volume grows, move these metrics into a dedicated analytics table/view.
async function loadAllAuthUsers() {
  const admin = supabaseAdmin();
  const perPage = 200;
  const maxPages = 10;
  const users: RawAuthUser[] = [];

  for (let page = 1; page <= maxPages; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(error.message);

    const batch = (data?.users ?? []) as RawAuthUser[];
    users.push(...batch);
    if (batch.length < perPage) break;
  }

  return users;
}

export async function loadAdminDataset() {
  const admin = supabaseAdmin();

  const [authUsersRaw, profilesRes, membershipsRes, businessesRes, invitesRes, ordersRes, activityRes] =
    await Promise.all([
      loadAllAuthUsers(),
      admin.from("profiles").select("*"),
      admin.from("memberships").select("*"),
      admin.from("businesses").select("*"),
      admin.from("business_invites").select("*"),
      admin.from("orders").select("*"),
      admin.from("activity_events").select("*").order("created_at", { ascending: false }).limit(500),
    ]);

  if (profilesRes.error) throw new Error(profilesRes.error.message);
  if (membershipsRes.error) throw new Error(membershipsRes.error.message);
  if (businessesRes.error) throw new Error(businessesRes.error.message);
  if (invitesRes.error) throw new Error(invitesRes.error.message);
  if (ordersRes.error) throw new Error(ordersRes.error.message);
  if (activityRes.error) throw new Error(activityRes.error.message);

  const profiles = (profilesRes.data ?? []) as RawProfile[];
  const memberships = (membershipsRes.data ?? []) as RawMembership[];
  const businesses = (businessesRes.data ?? []) as RawBusiness[];
  const invites = (invitesRes.data ?? []) as RawInvite[];
  const orders = (ordersRes.data ?? []) as RawOrder[];
  const activityEvents = (activityRes.data ?? []) as RawActivityEvent[];
  let accountUsers: RawAccountUser[] = [];
  let subscriptions: RawSubscription[] = [];
  let planPrices: RawPlanPrice[] = [];
  let plans: RawPlan[] = [];

  try {
    const accountUsersRes = await admin.from("account_users").select("account_id,user_id");
    if (accountUsersRes.error) {
      if (!isIgnorableOptionalAdminQueryError(accountUsersRes.error)) {
        throw new Error(accountUsersRes.error.message);
      }
    } else {
      accountUsers = (accountUsersRes.data ?? []) as RawAccountUser[];
    }
  } catch (error: unknown) {
    const queryError = error as QueryErrorLike;
    if (!isIgnorableOptionalAdminQueryError(queryError)) throw error;
  }

  try {
    const subscriptionsRes = await admin
      .from("subscriptions")
      .select("account_id,plan_price_id,status,updated_at,created_at");
    if (subscriptionsRes.error) {
      if (!isIgnorableOptionalAdminQueryError(subscriptionsRes.error)) {
        throw new Error(subscriptionsRes.error.message);
      }
    } else {
      subscriptions = (subscriptionsRes.data ?? []) as RawSubscription[];
    }
  } catch (error: unknown) {
    const queryError = error as QueryErrorLike;
    if (!isIgnorableOptionalAdminQueryError(queryError)) throw error;
  }

  try {
    const planPricesRes = await admin.from("plan_prices").select("id,plan_id");
    if (planPricesRes.error) {
      if (!isIgnorableOptionalAdminQueryError(planPricesRes.error)) {
        throw new Error(planPricesRes.error.message);
      }
    } else {
      planPrices = (planPricesRes.data ?? []) as RawPlanPrice[];
    }
  } catch (error: unknown) {
    const queryError = error as QueryErrorLike;
    if (!isIgnorableOptionalAdminQueryError(queryError)) throw error;
  }

  try {
    const plansRes = await admin.from("plans").select("id,code");
    if (plansRes.error) {
      if (!isIgnorableOptionalAdminQueryError(plansRes.error)) {
        throw new Error(plansRes.error.message);
      }
    } else {
      plans = (plansRes.data ?? []) as RawPlan[];
    }
  } catch (error: unknown) {
    const queryError = error as QueryErrorLike;
    if (!isIgnorableOptionalAdminQueryError(queryError)) throw error;
  }

  const profilesById = new Map(profiles.map((profile) => [String(profile.id), profile]));
  const businessesById = new Map(businesses.map((business) => [String(business.id), business]));
  const membershipsByUserId = new Map<string, RawMembership[]>();
  const membershipsByBusinessId = new Map<string, RawMembership[]>();
  const ordersByBusinessId = new Map<string, RawOrder[]>();
  const invitesByBusinessId = new Map<string, RawInvite[]>();
  const activityByBusinessId = new Map<string, RawActivityEvent[]>();
  const userActivityMsById = new Map<string, number>();
  const accountIdsByUserId = new Map<string, Set<string>>();

  const markUserActivity = (userId: string | null | undefined, timestamp: string | null | undefined) => {
    const normalizedUserId = String(userId ?? "").trim();
    if (!normalizedUserId) return;
    const ts = asTimeMs(timestamp);
    if (!ts) return;
    const previous = userActivityMsById.get(normalizedUserId) ?? 0;
    if (ts > previous) userActivityMsById.set(normalizedUserId, ts);
  };

  for (const membership of memberships) {
    const userId = String(membership.user_id ?? "").trim();
    const businessId = String(membership.business_id ?? "").trim();
    if (userId) {
      const list = membershipsByUserId.get(userId) ?? [];
      list.push(membership);
      membershipsByUserId.set(userId, list);
      markUserActivity(userId, membership.created_at);
    }
    if (businessId) {
      const list = membershipsByBusinessId.get(businessId) ?? [];
      list.push(membership);
      membershipsByBusinessId.set(businessId, list);
    }
  }

  for (const order of orders) {
    const businessId = String(order.business_id ?? "").trim();
    if (!businessId) continue;
    const list = ordersByBusinessId.get(businessId) ?? [];
    list.push(order);
    ordersByBusinessId.set(businessId, list);
    markUserActivity(order.manager_id, order.updated_at ?? order.created_at);
  }

  for (const invite of invites) {
    const businessId = String(invite.business_id ?? "").trim();
    if (!businessId) continue;
    const list = invitesByBusinessId.get(businessId) ?? [];
    list.push(invite);
    invitesByBusinessId.set(businessId, list);
    markUserActivity(invite.invited_by, invite.created_at);
    markUserActivity(invite.accepted_by, invite.accepted_at);
    markUserActivity(invite.revoked_by, invite.revoked_at);
  }

  for (const event of activityEvents) {
    const businessId = String(event.business_id ?? "").trim();
    if (!businessId) continue;
    const list = activityByBusinessId.get(businessId) ?? [];
    list.push(event);
    activityByBusinessId.set(businessId, list);
    markUserActivity(event.actor_id, event.created_at);
  }

  for (const business of businesses) {
    markUserActivity(business.created_by, business.created_at);
  }

  for (const accountUser of accountUsers) {
    const userId = String(accountUser.user_id ?? "").trim();
    const accountId = String(accountUser.account_id ?? "").trim();
    if (!userId || !accountId) continue;
    const set = accountIdsByUserId.get(userId) ?? new Set<string>();
    set.add(accountId);
    accountIdsByUserId.set(userId, set);
  }

  const planIdByPriceId = new Map(planPrices.map((item) => [String(item.id), String(item.plan_id ?? "").trim()]));
  const planCodeByPlanId = new Map(plans.map((item) => [String(item.id), String(item.code ?? "").trim().toUpperCase()]));
  const subscriptionsByAccountId = new Map<string, RawSubscription[]>();

  for (const subscription of subscriptions) {
    const accountId = String(subscription.account_id ?? "").trim();
    if (!accountId) continue;
    const list = subscriptionsByAccountId.get(accountId) ?? [];
    list.push(subscription);
    subscriptionsByAccountId.set(accountId, list);
  }

  const planCodesByAccountId = new Map<string, string>();
  for (const [accountId, rows] of subscriptionsByAccountId.entries()) {
    const sorted = [...rows].sort((left, right) => {
      const statusDelta = subscriptionStatusPriority(left.status) - subscriptionStatusPriority(right.status);
      if (statusDelta !== 0) return statusDelta;
      const leftTs = asTimeMs(left.updated_at) || asTimeMs(left.created_at);
      const rightTs = asTimeMs(right.updated_at) || asTimeMs(right.created_at);
      return rightTs - leftTs;
    });
    const selected = sorted[0];
    if (!selected) continue;
    const planPriceId = String(selected.plan_price_id ?? "").trim();
    const planId = planIdByPriceId.get(planPriceId) ?? "";
    const planCode = planCodeByPlanId.get(planId) ?? "";
    if (planCode) planCodesByAccountId.set(accountId, planCode);
  }

  const authUsers: AdminAuthUser[] = authUsersRaw.map((user) => {
    const id = String(user.id);
    const profile = profilesById.get(id) ?? null;
    const display = resolveUserDisplay({
      full_name: profile?.full_name ?? null,
      first_name: profile?.first_name ?? null,
      last_name: profile?.last_name ?? null,
      email: profile?.email ?? user.email ?? null,
      phone: profile?.phone ?? null,
    });

    const userMemberships = (membershipsByUserId.get(id) ?? [])
      .filter((membership) => membership.business_id && membership.user_id)
      .map((membership) => ({
        businessId: String(membership.business_id),
        role: String(membership.role ?? "").toUpperCase() || "USER",
        createdAt: membership.created_at ?? null,
      }))
      .sort((a, b) => roleWeight(b.role) - roleWeight(a.role));

    const userBusinesses = userMemberships.map((membership) => {
      const business = businessesById.get(membership.businessId) ?? null;
      return {
        id: membership.businessId,
        slug: business?.slug ?? null,
        name: business?.name ?? null,
        plan: business?.plan ?? null,
        role: membership.role,
      };
    });

    const ownerPlansFromBusinesses = Array.from(
      new Set(
        userBusinesses
          .filter((business) => business.role === "OWNER")
          .map((business) => String(business.plan ?? "").trim().toUpperCase())
          .filter(Boolean),
      ),
    );
    const ownerPlansFromBilling = Array.from(accountIdsByUserId.get(id) ?? [])
      .map((accountId) => planCodesByAccountId.get(accountId) ?? "")
      .filter(Boolean);
    const ownerPlans = Array.from(new Set([...ownerPlansFromBusinesses, ...ownerPlansFromBilling]));
    const authLastSignInAtMs = asTimeMs(user.last_sign_in_at ?? null);
    const derivedLastSeenAtMs = userActivityMsById.get(id) ?? 0;
    const lastSeenAtMs = Math.max(authLastSignInAtMs, derivedLastSeenAtMs);

    return {
      id,
      email: user.email ?? profile?.email ?? null,
      createdAt: user.created_at ?? null,
      createdAtMs: asTimeMs(user.created_at ?? null),
      emailConfirmedAt: user.email_confirmed_at ?? null,
      lastSignInAt: user.last_sign_in_at ?? null,
      lastSignInAtMs: authLastSignInAtMs,
      lastSeenAt: lastSeenAtMs ? new Date(lastSeenAtMs).toISOString() : null,
      lastSeenAtMs,
      fullName: display.fullName || display.fromParts || display.email || buildSafeUserFallback(id),
      phone: display.phone || null,
      memberships: userMemberships,
      businesses: userBusinesses,
      ownerPlans,
      businessesCount: userBusinesses.length,
      primaryRole: getPrimaryRole(userMemberships.map((membership) => membership.role)),
      hasBusiness: userBusinesses.length > 0,
      hasSignIn: lastSeenAtMs > 0,
      searchBlob: [
        id,
        user.email ?? "",
        display.fullName,
        display.fromParts,
        display.phone,
        ...userBusinesses.map((business) => `${business.slug || ""} ${business.name || ""}`),
      ]
        .join(" ")
        .toLowerCase(),
    };
  });

  const authUsersById = new Map(authUsers.map((user) => [user.id, user]));

  const adminBusinesses: AdminBusiness[] = businesses.map((business) => {
    const businessId = String(business.id);
    const businessMemberships = (membershipsByBusinessId.get(businessId) ?? [])
      .filter((membership) => membership.user_id)
      .map((membership) => {
        const user = authUsersById.get(String(membership.user_id)) ?? null;
        return {
          userId: String(membership.user_id),
          role: String(membership.role ?? "").toUpperCase() || "USER",
          createdAt: membership.created_at ?? null,
          userLabel: user?.fullName || user?.email || buildSafeUserFallback(String(membership.user_id)),
          email: user?.email || null,
        };
      })
      .sort((a, b) => roleWeight(b.role) - roleWeight(a.role));

    const businessOrders = ordersByBusinessId.get(businessId) ?? [];
    const businessInvites = invitesByBusinessId.get(businessId) ?? [];
    const businessActivity = activityByBusinessId.get(businessId) ?? [];

    const orderActivityMs = Math.max(
      0,
      ...businessOrders.map((order) => Math.max(asTimeMs(order.updated_at), asTimeMs(order.created_at))),
    );
    const inviteActivityMs = Math.max(
      0,
      ...businessInvites.map((invite) =>
        Math.max(asTimeMs(invite.created_at), asTimeMs(invite.accepted_at), asTimeMs(invite.revoked_at)),
      ),
    );
    const eventActivityMs = Math.max(0, ...businessActivity.map((event) => asTimeMs(event.created_at)));
    const lastActivityAtMs = Math.max(
      asTimeMs(business.last_activity_at ?? null),
      orderActivityMs,
      inviteActivityMs,
      eventActivityMs,
      asTimeMs(business.updated_at),
    );
    const owner = businessMemberships.find((membership) => membership.role === "OWNER") ?? null;

    // Resolve billing plan & subscription status via owner → account → subscription
    const ownerId = business.owner_id ?? owner?.userId ?? null;
    let billingPlanCode: string | null = null;
    let subscriptionStatus: string | null = null;

    if (ownerId) {
      const ownerAccountIds = accountIdsByUserId.get(ownerId);
      if (ownerAccountIds) {
        for (const accountId of ownerAccountIds) {
          const accountSubs = subscriptionsByAccountId.get(accountId);
          if (!accountSubs?.length) continue;
          const sorted = [...accountSubs].sort((left, right) => {
            const statusDelta = subscriptionStatusPriority(left.status) - subscriptionStatusPriority(right.status);
            if (statusDelta !== 0) return statusDelta;
            const leftTs = asTimeMs(left.updated_at) || asTimeMs(left.created_at);
            const rightTs = asTimeMs(right.updated_at) || asTimeMs(right.created_at);
            return rightTs - leftTs;
          });
          const best = sorted[0];
          if (best) {
            subscriptionStatus = best.status ?? null;
            const priceId = String(best.plan_price_id ?? "").trim();
            const planId = planIdByPriceId.get(priceId) ?? "";
            billingPlanCode = planCodeByPlanId.get(planId) ?? null;
            break;
          }
        }
      }
    }

    return {
      id: businessId,
      slug: business.slug ?? null,
      name: business.name ?? null,
      plan: business.plan ?? null,
      billingPlanCode,
      subscriptionStatus,
      createdAt: business.created_at ?? null,
      createdAtMs: asTimeMs(business.created_at),
      updatedAt: business.updated_at ?? null,
      updatedAtMs: asTimeMs(business.updated_at),
      ownerId: business.owner_id ?? owner?.userId ?? null,
      ownerLabel: owner?.userLabel ?? null,
      createdBy: business.created_by ?? null,
      managersCount: businessMemberships.filter((membership) => membership.role === "MANAGER").length,
      membersCount: businessMemberships.length,
      ordersCount: businessOrders.length,
      lastActivityAt: lastActivityAtMs ? new Date(lastActivityAtMs).toISOString() : null,
      lastActivityAtMs,
      active: Date.now() - lastActivityAtMs <= 1000 * 60 * 60 * 24 * 30,
      memberships: businessMemberships,
    };
  });

  const adminInvites: AdminInvite[] = invites.map((invite) => {
    const businessId = String(invite.business_id ?? "");
    const business = businessesById.get(businessId) ?? null;
    return {
      id: String(invite.id),
      email: String(invite.email ?? ""),
      businessId,
      businessLabel: business?.slug || business?.name || businessId,
      role: String(invite.role ?? "").toUpperCase() || "USER",
      status: String(invite.status ?? "").toUpperCase() || "UNKNOWN",
      createdAt: invite.created_at ?? null,
      createdAtMs: asTimeMs(invite.created_at),
      acceptedAt: invite.accepted_at ?? null,
      revokedAt: invite.revoked_at ?? null,
      expiresAt: invite.expires_at ?? null,
      invitedBy: invite.invited_by ?? null,
      invitedByLabel: authUsersById.get(String(invite.invited_by ?? ""))?.fullName
        ?? authUsersById.get(String(invite.invited_by ?? ""))?.email
        ?? null,
      acceptedBy: invite.accepted_by ?? null,
      revokedBy: invite.revoked_by ?? null,
    };
  });

  const adminOrders: AdminOrder[] = orders.map((order) => {
    const businessId = String(order.business_id ?? "");
    const business = businessesById.get(businessId) ?? null;
    const clientName =
      String(order.full_name ?? "").trim() ||
      [String(order.first_name ?? "").trim(), String(order.last_name ?? "").trim()].filter(Boolean).join(" ") ||
      String(order.client_name ?? "").trim() ||
      null;

    return {
      id: String(order.id),
      businessId,
      businessLabel: business?.slug || business?.name || businessId,
      orderNumber: order.order_number ?? null,
      clientName,
      amount: typeof order.amount === "number" ? order.amount : Number(order.amount ?? 0),
      status: order.status ?? null,
      createdAt: order.created_at ?? null,
      createdAtMs: asTimeMs(order.created_at),
      updatedAt: order.updated_at ?? null,
      updatedAtMs: asTimeMs(order.updated_at),
      managerId: order.manager_id ?? null,
    };
  });

  const syntheticActivity: AdminActivity[] = [];

  for (const user of authUsers) {
    if (user.createdAt) {
      syntheticActivity.push({
        id: `user-registered-${user.id}`,
        kind: "user.registered",
        title: "Новая регистрация",
        createdAt: user.createdAt,
        createdAtMs: user.createdAtMs,
        userId: user.id,
        userLabel: user.fullName || user.email,
        businessId: null,
        businessLabel: null,
        meta: user.email,
      });
    }

    if (user.emailConfirmedAt) {
      syntheticActivity.push({
        id: `user-confirmed-${user.id}`,
        kind: "user.email_confirmed",
        title: "Email подтверждён",
        createdAt: user.emailConfirmedAt,
        createdAtMs: asTimeMs(user.emailConfirmedAt),
        userId: user.id,
        userLabel: user.fullName || user.email,
        businessId: null,
        businessLabel: null,
        meta: user.email,
      });
    }

    if (user.lastSeenAt) {
      syntheticActivity.push({
        id: `user-signin-${user.id}`,
        kind: "user.signed_in",
        title: "Вход в продукт",
        createdAt: user.lastSeenAt,
        createdAtMs: user.lastSeenAtMs,
        userId: user.id,
        userLabel: user.fullName || user.email,
        businessId: user.businesses[0]?.id ?? null,
        businessLabel: user.businesses[0]?.slug || user.businesses[0]?.name || null,
        meta: user.email,
      });
    }
  }

  for (const business of adminBusinesses) {
    syntheticActivity.push({
      id: `business-created-${business.id}`,
      kind: "business.created",
      title: "Бизнес создан",
      createdAt: business.createdAt,
      createdAtMs: business.createdAtMs,
      userId: business.createdBy,
      userLabel: authUsersById.get(String(business.createdBy ?? ""))?.fullName ?? null,
      businessId: business.id,
      businessLabel: business.slug || business.name || business.id,
      meta: business.ownerLabel,
    });
  }

  for (const invite of adminInvites) {
    if (invite.createdAt) {
      syntheticActivity.push({
        id: `invite-created-${invite.id}`,
        kind: "invite.sent",
        title: "Отправка приглашения",
        createdAt: invite.createdAt,
        createdAtMs: invite.createdAtMs,
        userId: invite.invitedBy,
        userLabel: null,
        businessId: invite.businessId,
        businessLabel: invite.businessLabel,
        meta: invite.email,
      });
    }
    if (invite.acceptedAt) {
      syntheticActivity.push({
        id: `invite-accepted-${invite.id}`,
        kind: "invite.accepted",
        title: "Принятие приглашения",
        createdAt: invite.acceptedAt,
        createdAtMs: asTimeMs(invite.acceptedAt),
        userId: invite.acceptedBy,
        userLabel: authUsersById.get(String(invite.acceptedBy ?? ""))?.fullName ?? invite.email,
        businessId: invite.businessId,
        businessLabel: invite.businessLabel,
        meta: invite.email,
      });
    }
    if (invite.revokedAt) {
      syntheticActivity.push({
        id: `invite-revoked-${invite.id}`,
        kind: "invite.revoked",
        title: "Отзыв приглашения",
        createdAt: invite.revokedAt,
        createdAtMs: asTimeMs(invite.revokedAt),
        userId: invite.revokedBy,
        userLabel: authUsersById.get(String(invite.revokedBy ?? ""))?.fullName ?? null,
        businessId: invite.businessId,
        businessLabel: invite.businessLabel,
        meta: invite.email,
      });
    }
  }

  for (const order of adminOrders) {
    syntheticActivity.push({
      id: `order-created-${order.id}`,
      kind: "order.created",
      title: "Заказ создан",
      createdAt: order.createdAt,
      createdAtMs: order.createdAtMs,
      userId: null,
      userLabel: null,
      businessId: order.businessId,
      businessLabel: order.businessLabel,
      meta: order.clientName || `#${order.orderNumber ?? ""}`,
    });
  }

  const eventActivities: AdminActivity[] = activityEvents.map((event) => ({
    id: String(event.id),
    kind: String(event.event_type ?? "activity.event"),
    title: getActivityTitle(event.event_type),
    createdAt: event.created_at ?? null,
    createdAtMs: asTimeMs(event.created_at),
    userId: event.actor_id ?? null,
    userLabel: authUsersById.get(String(event.actor_id ?? ""))?.fullName ?? null,
    businessId: event.business_id ?? null,
    businessLabel: businessesById.get(String(event.business_id ?? ""))?.slug ?? null,
    meta: event.entity_type ? `${event.entity_type}` : null,
  }));

  const activities = [...syntheticActivity, ...eventActivities]
    .filter((activity) => activity.createdAtMs > 0)
    .sort((a, b) => b.createdAtMs - a.createdAtMs);

  return {
    authUsers,
    businesses: adminBusinesses,
    invites: adminInvites,
    orders: adminOrders,
    activities,
  };
}

export async function loadAdminSummary() {
  const dataset = await loadAdminDataset();
  const now = Date.now();
  const dayMs = 1000 * 60 * 60 * 24;

  const users = dataset.authUsers;
  const businesses = dataset.businesses;
  const invites = dataset.invites;
  const orders = dataset.orders;

  const totalUsers = users.length;
  const registeredToday = users.filter((user) => now - user.createdAtMs <= dayMs).length;
  const registeredLast7Days = users.filter((user) => now - user.createdAtMs <= dayMs * 7).length;
  const confirmedEmail = users.filter((user) => Boolean(user.emailConfirmedAt)).length;
  const unconfirmedEmail = totalUsers - confirmedEmail;
  const usersWithSignIn = users.filter((user) => user.hasSignIn).length;
  const usersNeverSignedIn = totalUsers - usersWithSignIn;
  const usersWithBusiness = users.filter((user) => user.hasBusiness).length;
  const usersWithoutBusiness = totalUsers - usersWithBusiness;
  const totalBusinesses = businesses.length;
  const businessesCreatedLast7Days = businesses.filter((business) => now - business.createdAtMs <= dayMs * 7).length;
  const activeBusinesses = businesses.filter((business) => business.active).length;
  const invitesPending = invites.filter((invite) => invite.status === "PENDING").length;
  const invitesAccepted = invites.filter((invite) => invite.status === "ACCEPTED").length;
  const invitesRevoked = invites.filter((invite) => invite.status === "REVOKED").length;
  const totalOrders = orders.length;

  return {
    totalUsers,
    registeredToday,
    registeredLast7Days,
    confirmedEmail,
    unconfirmedEmail,
    usersWithSignIn,
    usersNeverSignedIn,
    usersWithBusiness,
    usersWithoutBusiness,
    totalBusinesses,
    businessesCreatedLast7Days,
    activeBusinesses,
    invitesPending,
    invitesAccepted,
    invitesRevoked,
    totalOrders,
  };
}

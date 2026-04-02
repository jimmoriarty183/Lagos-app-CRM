export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "expired"
  | "paused";

export type BillingInterval = "month" | "year";

export type FeatureValueType = "boolean" | "integer" | "text";

export type OverrideType = "grant" | "revoke" | "set_limit";

export type FeatureValue = boolean | number | string | null;

export type AccountRow = {
  id: string;
  name: string;
  owner_user_id: string | null;
  created_at: string;
  updated_at: string;
};

export type PlanRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type PlanPriceRow = {
  id: string;
  plan_id: string;
  billing_interval: BillingInterval;
  currency_code: string;
  unit_amount_cents: number;
  paddle_product_id: string | null;
  paddle_price_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type FeatureRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  value_type: FeatureValueType;
  created_at: string;
  updated_at: string;
};

export type PlanFeatureRow = {
  id: string;
  plan_id: string;
  feature_id: string;
  value_bool: boolean | null;
  value_int: number | null;
  value_text: string | null;
  created_at: string;
  updated_at: string;
};

export type SubscriptionRow = {
  id: string;
  account_id: string;
  plan_price_id: string;
  status: SubscriptionStatus;
  source: string;
  external_subscription_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  trial_start: string | null;
  trial_end: string | null;
  started_at: string | null;
  ended_at: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export type ManualEntitlementOverrideRow = {
  id: string;
  account_id: string;
  feature_id: string;
  override_type: OverrideType;
  value_bool: boolean | null;
  value_int: number | null;
  value_text: string | null;
  is_active: boolean;
  reason: string | null;
  created_by: string | null;
  expires_at: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export type PaddleCustomerRow = {
  id: string;
  account_id: string;
  paddle_customer_id: string;
  email: string | null;
  status: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export type PaddleSubscriptionRow = {
  id: string;
  subscription_id: string;
  paddle_subscription_id: string;
  paddle_customer_id: string | null;
  paddle_price_id: string | null;
  paddle_product_id: string | null;
  status: string | null;
  next_billed_at: string | null;
  raw_payload: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export type BillingWebhookEventRow = {
  id: string;
  provider: string;
  external_event_id: string;
  event_type: string;
  processing_status: "pending" | "processing" | "processed" | "failed" | "ignored";
  payload: Record<string, unknown>;
  received_at: string;
  processed_at: string | null;
  error_message: string | null;
  retry_count: number;
  related_account_id: string | null;
  related_subscription_id: string | null;
  created_at: string;
  updated_at: string;
};

export type AuditLogRow = {
  id: string;
  actor_id: string | null;
  entity_type: string;
  entity_id: string;
  action: string;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export type EffectiveEntitlement = {
  featureId: string;
  featureCode: string;
  valueType: FeatureValueType;
  value: FeatureValue;
  source: "plan" | "override";
};

export type SubscriptionSnapshot = {
  subscriptionId: string | null;
  accountId: string;
  status: SubscriptionStatus | null;
  plan: {
    id: string;
    code: string;
    name: string;
  } | null;
  billingInterval: BillingInterval | null;
  nextBillingAt: string | null;
  trial: {
    start: string | null;
    end: string | null;
  };
  cancelAtPeriodEnd: boolean;
  externalSubscriptionId: string | null;
};

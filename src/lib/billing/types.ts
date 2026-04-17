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
  slug: string;
  name: string;
  status: string;
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

/** Raw row from the `features` table. Production uses `key`; local seed uses `code`. */
export type FeatureRowRaw = {
  id: string;
  key?: string;
  code?: string;
  name: string;
  description: string | null;
  value_type: FeatureValueType;
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
  value_type: FeatureValueType;
  bool_value: boolean | null;
  int_value: number | null;
  text_value: string | null;
  created_at: string;
  updated_at: string;
};

export type SubscriptionRow = {
  id: string;
  account_id: string;
  plan_price_id: string;
  status: SubscriptionStatus;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  trial_start: string | null;
  trial_end: string | null;
  ended_at: string | null;
  last_billing_sync_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ManualEntitlementOverrideRow = {
  id: string;
  account_id: string;
  feature_id: string;
  override_type: OverrideType;
  value_type: FeatureValueType;
  bool_value: boolean | null;
  int_value: number | null;
  text_value: string | null;
  reason: string | null;
  actor_id: string | null;
  actor_email: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  revoked_by: string | null;
  created_at: string;
};

export type PaddleCustomerRow = {
  id: string;
  account_id: string;
  paddle_customer_id: string;
  email: string | null;
  full_name: string | null;
  status: string | null;
  raw_payload: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export type PaddleSubscriptionRow = {
  id: string;
  subscription_id: string;
  account_id: string;
  paddle_subscription_id: string;
  paddle_customer_id: string | null;
  status: string | null;
  next_billed_at: string | null;
  paused_at: string | null;
  canceled_at: string | null;
  raw_payload: Record<string, unknown> | null;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
};

export type BillingWebhookEventRow = {
  id: string;
  provider: string;
  provider_event_id: string;
  event_type: string;
  processing_status: "received" | "processing" | "processed" | "failed" | "ignored";
  occurred_at: string | null;
  signature_valid: boolean;
  payload: Record<string, unknown>;
  received_at: string;
  processed_at: string | null;
  error_message: string | null;
  processing_attempts: number;
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

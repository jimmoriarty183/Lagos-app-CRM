"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminSectionCard } from "@/app/admin/_components/AdminCards";
import {
  AdminCell,
  AdminHeadCell,
  AdminTable,
  AdminTableHeaderRow,
  AdminTableRow,
} from "@/app/admin/_components/AdminShared";

type FeatureOption = {
  id: string;
  code: string;
  name: string;
  value_type: "boolean" | "integer" | "text";
};

type SubscriptionPayload = {
  plan: { code: string; name: string } | null;
  status: string | null;
  billingInterval: string | null;
  nextBillingAt: string | null;
  trial: { start: string | null; end: string | null };
  cancelAtPeriodEnd: boolean;
  externalSubscriptionId: string | null;
  paddle?: {
    customer_id: string | null;
    subscription_id: string | null;
    price_id: string | null;
    product_id: string | null;
  };
};

type OverrideRow = {
  id: string;
  feature_id: string;
  override_type: "grant" | "revoke" | "set_limit";
  value_bool: boolean | null;
  value_int: number | null;
  value_text: string | null;
  is_active: boolean;
  expires_at: string | null;
  created_by: string | null;
  reason: string | null;
  created_at: string;
};

type EntitlementRow = {
  featureCode: string;
  valueType: "boolean" | "integer" | "text";
  value: string;
  source: "plan" | "override" | "none";
};

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatOverrideValue(row: OverrideRow) {
  if (row.value_bool !== null) return String(row.value_bool);
  if (row.value_int !== null) return String(row.value_int);
  if (row.value_text !== null && row.value_text !== "") return row.value_text;
  return "-";
}

function isOverrideActive(row: OverrideRow) {
  if (!row.is_active) return false;
  if (!row.expires_at) return true;
  return row.expires_at > new Date().toISOString();
}

export default function BillingAccountAdminClient({
  accountId,
  accountName,
  features,
}: {
  accountId: string;
  accountName: string;
  features: FeatureOption[];
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionPayload | null>(null);
  const [overrides, setOverrides] = useState<OverrideRow[]>([]);
  const [entitlements, setEntitlements] = useState<EntitlementRow[]>([]);

  const [featureCode, setFeatureCode] = useState(features[0]?.code ?? "");
  const [overrideType, setOverrideType] = useState<"grant" | "revoke" | "set_limit">("grant");
  const [valueBool, setValueBool] = useState(true);
  const [valueInt, setValueInt] = useState(1);
  const [valueText, setValueText] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [reason, setReason] = useState("");

  const featureByCode = useMemo(
    () => new Map(features.map((feature) => [feature.code, feature])),
    [features],
  );
  const featureById = useMemo(
    () => new Map(features.map((feature) => [feature.id, feature])),
    [features],
  );
  const selectedFeature = featureByCode.get(featureCode) ?? null;

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [subscriptionRes, overridesRes] = await Promise.all([
        fetch(`/api/billing/subscription?account_id=${encodeURIComponent(accountId)}`, {
          cache: "no-store",
        }),
        fetch(`/api/billing/overrides?account_id=${encodeURIComponent(accountId)}`, {
          cache: "no-store",
        }),
      ]);

      if (!subscriptionRes.ok) {
        const payload = (await subscriptionRes.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error || "Failed to load subscription");
      }
      if (!overridesRes.ok) {
        const payload = (await overridesRes.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error || "Failed to load overrides");
      }

      const subscriptionPayload = (await subscriptionRes.json()) as SubscriptionPayload;
      const overridePayload = (await overridesRes.json()) as { overrides: OverrideRow[] };
      const nextOverrides = overridePayload.overrides ?? [];

      setSubscription(subscriptionPayload);
      setOverrides(nextOverrides);

      const activeOverrideByFeatureCode = new Set(
        nextOverrides
          .filter((row) => isOverrideActive(row))
          .map((row) => featureById.get(row.feature_id)?.code)
          .filter(Boolean) as string[],
      );

      const entitlementResponses = await Promise.all(
        features.map(async (feature) => {
          const res = await fetch(
            `/api/billing/access/check?account_id=${encodeURIComponent(accountId)}&feature_code=${encodeURIComponent(feature.code)}&current_usage=0`,
            { cache: "no-store" },
          );
          if (!res.ok) {
            const payload = (await res.json().catch(() => ({}))) as { error?: string };
            throw new Error(payload.error || `Failed to check entitlement: ${feature.code}`);
          }
          const payload = (await res.json()) as {
            source: "plan" | "override" | null;
            value_type: "boolean" | "integer" | "text" | null;
            value: boolean | number | string | null;
            enabled: boolean;
            limit: number | null;
          };

          const valueType = payload.value_type ?? feature.value_type;
          let valueDisplay = "-";
          if (valueType === "boolean") {
            valueDisplay = String(Boolean(payload.value ?? payload.enabled));
          } else if (valueType === "integer") {
            valueDisplay = String(
              Number.isFinite(payload.limit ?? NaN)
                ? payload.limit
                : Number(payload.value ?? 0),
            );
          } else if (valueType === "text") {
            const text = String(payload.value ?? "").trim();
            valueDisplay = text || "-";
          }

          const source =
            payload.source ??
            (activeOverrideByFeatureCode.has(feature.code) ? "override" : "plan");

          return {
            featureCode: feature.code,
            valueType,
            value: valueDisplay,
            source: source ?? "none",
          } satisfies EntitlementRow;
        }),
      );

      setEntitlements(entitlementResponses);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [accountId, featureById, features]);

  const onCreateOverride = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!selectedFeature) return;

      setLoading(true);
      setError(null);
      try {
        const body: Record<string, unknown> = {
          account_id: accountId,
          feature_code: selectedFeature.code,
          override_type: overrideType,
          reason: reason.trim() || null,
          expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
        };

        if (selectedFeature.value_type === "boolean") {
          body.value_bool = overrideType === "grant" ? true : overrideType === "revoke" ? false : valueBool;
        } else if (selectedFeature.value_type === "integer") {
          body.value_int = Number(valueInt);
        } else {
          body.value_text = valueText;
        }

        const response = await fetch("/api/billing/overrides", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(payload.error || "Failed to create override");
        }

        await loadData();
      } catch (submitError) {
        setError(submitError instanceof Error ? submitError.message : "Failed to create override");
      } finally {
        setLoading(false);
      }
    },
    [accountId, expiresAt, loadData, overrideType, reason, selectedFeature, valueBool, valueInt, valueText],
  );

  const onDeactivateOverride = useCallback(
    async (overrideId: string) => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/billing/overrides", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            account_id: accountId,
            override_id: overrideId,
            is_active: false,
          }),
        });
        if (!response.ok) {
          const payload = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(payload.error || "Failed to deactivate override");
        }
        await loadData();
      } catch (deactivateError) {
        setError(
          deactivateError instanceof Error
            ? deactivateError.message
            : "Failed to deactivate override",
        );
      } finally {
        setLoading(false);
      }
    },
    [accountId, loadData],
  );

  useEffect(() => {
    void loadData();
  }, [loadData]);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
        Account: <span className="font-semibold">{accountName}</span>{" "}
        <span className="font-mono text-xs text-slate-500">({accountId})</span>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={loadData}
          disabled={loading}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
        {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      </div>

      <AdminSectionCard title="Subscription Info">
        <AdminTable
          head={
            <AdminTableHeaderRow>
              <AdminHeadCell>Plan</AdminHeadCell>
              <AdminHeadCell>Status</AdminHeadCell>
              <AdminHeadCell>Interval</AdminHeadCell>
              <AdminHeadCell>Next Billing</AdminHeadCell>
              <AdminHeadCell>Trial</AdminHeadCell>
              <AdminHeadCell>Cancel At Period End</AdminHeadCell>
              <AdminHeadCell>Paddle IDs</AdminHeadCell>
            </AdminTableHeaderRow>
          }
        >
          <AdminTableRow>
            <AdminCell>{subscription?.plan?.code ?? "-"}</AdminCell>
            <AdminCell>{subscription?.status ?? "-"}</AdminCell>
            <AdminCell>{subscription?.billingInterval ?? "-"}</AdminCell>
            <AdminCell>{formatDate(subscription?.nextBillingAt)}</AdminCell>
            <AdminCell>
              <div className="space-y-1">
                <div>start: {formatDate(subscription?.trial?.start)}</div>
                <div>end: {formatDate(subscription?.trial?.end)}</div>
              </div>
            </AdminCell>
            <AdminCell>{String(Boolean(subscription?.cancelAtPeriodEnd))}</AdminCell>
            <AdminCell>
              <div className="space-y-1 font-mono text-xs">
                <div>customer: {subscription?.paddle?.customer_id ?? "-"}</div>
                <div>subscription: {subscription?.paddle?.subscription_id ?? "-"}</div>
                <div>price: {subscription?.paddle?.price_id ?? "-"}</div>
                <div>product: {subscription?.paddle?.product_id ?? "-"}</div>
              </div>
            </AdminCell>
          </AdminTableRow>
        </AdminTable>
      </AdminSectionCard>

      <AdminSectionCard title="Entitlements">
        <AdminTable
          head={
            <AdminTableHeaderRow>
              <AdminHeadCell>Feature Code</AdminHeadCell>
              <AdminHeadCell>Value</AdminHeadCell>
              <AdminHeadCell>Source</AdminHeadCell>
            </AdminTableHeaderRow>
          }
        >
          {entitlements.map((row) => (
            <AdminTableRow key={row.featureCode}>
              <AdminCell>
                <span className="font-mono text-xs">{row.featureCode}</span>
              </AdminCell>
              <AdminCell>{row.value}</AdminCell>
              <AdminCell>{row.source}</AdminCell>
            </AdminTableRow>
          ))}
        </AdminTable>
        {entitlements.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No entitlements loaded.</p>
        ) : null}
      </AdminSectionCard>

      <AdminSectionCard title="Overrides">
        <form onSubmit={onCreateOverride} className="mb-4 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-2 xl:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-600">Feature</span>
            <select
              value={featureCode}
              onChange={(event) => setFeatureCode(event.target.value)}
              className="rounded-md border border-slate-300 bg-white px-2 py-2"
            >
              {features.map((feature) => (
                <option key={feature.id} value={feature.code}>
                  {feature.code}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-600">Override Type</span>
            <select
              value={overrideType}
              onChange={(event) =>
                setOverrideType(event.target.value as "grant" | "revoke" | "set_limit")
              }
              className="rounded-md border border-slate-300 bg-white px-2 py-2"
            >
              <option value="grant">grant</option>
              <option value="revoke">revoke</option>
              <option value="set_limit">set_limit</option>
            </select>
          </label>

          {selectedFeature?.value_type === "boolean" ? (
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-slate-600">Value (boolean)</span>
              <select
                value={String(valueBool)}
                onChange={(event) => setValueBool(event.target.value === "true")}
                className="rounded-md border border-slate-300 bg-white px-2 py-2"
              >
                <option value="true">true</option>
                <option value="false">false</option>
              </select>
            </label>
          ) : null}

          {selectedFeature?.value_type === "integer" ? (
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-slate-600">Value (integer)</span>
              <input
                type="number"
                value={valueInt}
                onChange={(event) => setValueInt(Number(event.target.value))}
                className="rounded-md border border-slate-300 bg-white px-2 py-2"
              />
            </label>
          ) : null}

          {selectedFeature?.value_type === "text" ? (
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-slate-600">Value (text)</span>
              <input
                type="text"
                value={valueText}
                onChange={(event) => setValueText(event.target.value)}
                className="rounded-md border border-slate-300 bg-white px-2 py-2"
              />
            </label>
          ) : null}

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-600">Expires At</span>
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={(event) => setExpiresAt(event.target.value)}
              className="rounded-md border border-slate-300 bg-white px-2 py-2"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-600">Reason</span>
            <input
              type="text"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="rounded-md border border-slate-300 bg-white px-2 py-2"
            />
          </label>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={loading || !selectedFeature}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Create Override
            </button>
          </div>
        </form>

        <AdminTable
          head={
            <AdminTableHeaderRow>
              <AdminHeadCell>Feature</AdminHeadCell>
              <AdminHeadCell>Type</AdminHeadCell>
              <AdminHeadCell>Value</AdminHeadCell>
              <AdminHeadCell>Expires At</AdminHeadCell>
              <AdminHeadCell>Created By</AdminHeadCell>
              <AdminHeadCell>Active</AdminHeadCell>
              <AdminHeadCell>Action</AdminHeadCell>
            </AdminTableHeaderRow>
          }
        >
          {overrides.map((row) => {
            const feature = featureById.get(row.feature_id);
            return (
              <AdminTableRow key={row.id}>
                <AdminCell>{feature?.code ?? row.feature_id}</AdminCell>
                <AdminCell>{row.override_type}</AdminCell>
                <AdminCell>{formatOverrideValue(row)}</AdminCell>
                <AdminCell>{formatDate(row.expires_at)}</AdminCell>
                <AdminCell className="font-mono text-xs">{row.created_by ?? "-"}</AdminCell>
                <AdminCell>{String(row.is_active)}</AdminCell>
                <AdminCell>
                  {row.is_active ? (
                    <button
                      type="button"
                      onClick={() => onDeactivateOverride(row.id)}
                      disabled={loading}
                      className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Deactivate
                    </button>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </AdminCell>
              </AdminTableRow>
            );
          })}
        </AdminTable>
        {overrides.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No overrides.</p>
        ) : null}
      </AdminSectionCard>
    </div>
  );
}

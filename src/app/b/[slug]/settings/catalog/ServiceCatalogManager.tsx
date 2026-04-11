"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createCatalogService, setCatalogServiceStatus } from "./actions";

const CURRENCY_OPTIONS = ["GBP", "USD", "EUR"];
const TAX_RATE_OPTIONS = [
  { value: "0", label: "0%" },
  { value: "7", label: "7%" },
  { value: "20", label: "20%" },
  { value: "custom", label: "Custom" },
] as const;
const SLA_MINUTE_OPTIONS = [15, 30, 45, 60, 90, 120];
const DURATION_MINUTE_OPTIONS = [15, 30, 45, 60, 90, 120, 180];

function percentToDecimalString(value: string) {
  const normalized = value.trim();
  if (!normalized) return "";
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return "";
  return String(parsed / 100);
}

function decimalToPercentString(value: string) {
  const normalized = value.trim();
  if (!normalized) return "";
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return "";
  return String(parsed * 100);
}

type ServiceRow = {
  id: string;
  service_code: string;
  name: string;
  description: string | null;
  default_unit_price: number | string;
  default_tax_rate: number | string;
  currency_code: string;
  default_sla_minutes: number | null;
  default_duration_minutes: number | null;
  requires_assignee: boolean;
  status: "ACTIVE" | "INACTIVE";
  updated_at: string;
};

function fmtNumber(value: number | string | null) {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num.toFixed(2) : "0.00";
}

export default function ServiceCatalogManager({
  businessSlug,
  rows,
  schemaWarning,
}: {
  businessSlug: string;
  rows: ServiceRow[];
  schemaWarning?: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorText, setErrorText] = useState<string | null>(null);
  const [form, setForm] = useState({
    serviceCode: "",
    name: "",
    description: "",
    defaultUnitPrice: "",
    defaultTaxRate: "",
    currencyCode: "GBP",
    defaultSlaMinutes: "",
    defaultDurationMinutes: "",
    requiresAssignee: true,
  });
  const [taxRateMode, setTaxRateMode] = useState<"" | "0" | "7" | "20" | "custom">("");
  const [customTaxRatePercent, setCustomTaxRatePercent] = useState("");
  const [slaModeIsCustom, setSlaModeIsCustom] = useState(false);
  const [durationModeIsCustom, setDurationModeIsCustom] = useState(false);

  function submit() {
    setErrorText(null);
    startTransition(async () => {
      const result = await createCatalogService({
        businessSlug,
        serviceCode: form.serviceCode,
        name: form.name,
        description: form.description,
        defaultUnitPrice: form.defaultUnitPrice,
        defaultTaxRate: form.defaultTaxRate,
        currencyCode: form.currencyCode,
        defaultSlaMinutes: form.defaultSlaMinutes
          ? Number(form.defaultSlaMinutes)
          : null,
        defaultDurationMinutes: form.defaultDurationMinutes
          ? Number(form.defaultDurationMinutes)
          : null,
        requiresAssignee: form.requiresAssignee,
      });

      if (!result.ok) {
        setErrorText(result.error);
        return;
      }

      setForm({
        serviceCode: "",
        name: "",
        description: "",
        defaultUnitPrice: "",
        defaultTaxRate: "",
        currencyCode: "GBP",
        defaultSlaMinutes: "",
        defaultDurationMinutes: "",
        requiresAssignee: true,
      });
      setTaxRateMode("");
      setCustomTaxRatePercent("");
      setSlaModeIsCustom(false);
      setDurationModeIsCustom(false);
      router.refresh();
    });
  }

  function toggleStatus(id: string, currentStatus: "ACTIVE" | "INACTIVE") {
    setErrorText(null);
    startTransition(async () => {
      const result = await setCatalogServiceStatus({
        businessSlug,
        serviceId: id,
        status: currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE",
      });
      if (!result.ok) {
        setErrorText(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <section className="rounded-[20px] border border-[#E5E7EB] bg-[#FCFCFD] p-4 sm:p-5">
        {schemaWarning ? (
          <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {schemaWarning}
          </div>
        ) : null}
        <div className="mb-4">
          <div className="product-section-label text-[#6B7280]">Catalog</div>
          <h2 className="product-section-title mt-1.5">Create service</h2>
          <p className="product-page-subtitle mt-1.5">
            Visible catalog entry for services you want to use in requests and
            orders later.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="svc-code" className="text-sm font-medium text-[#344054]">
              Service code
            </Label>
            <Input
              id="svc-code"
              value={form.serviceCode}
              onChange={(e) =>
                setForm((s) => ({ ...s, serviceCode: e.target.value }))
              }
              placeholder="e.g. SVC-001"
              className="h-11 rounded-xl border-[#E5E7EB] px-3.5 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="svc-name" className="text-sm font-medium text-[#344054]">
              Name
            </Label>
            <Input
              id="svc-name"
              value={form.name}
              onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
              placeholder="e.g. Consulting hour"
              className="h-11 rounded-xl border-[#E5E7EB] px-3.5 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="svc-currency" className="text-sm font-medium text-[#344054]">
              Currency
            </Label>
            <Select
              value={form.currencyCode}
              onValueChange={(value) =>
                setForm((s) => ({ ...s, currencyCode: value }))
              }
            >
              <SelectTrigger id="svc-currency" className="h-11 rounded-xl border-[#E5E7EB] px-3.5 text-sm">
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                {CURRENCY_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="svc-unit-price" className="text-sm font-medium text-[#344054]">
              Unit price
            </Label>
            <Input
              id="svc-unit-price"
              value={form.defaultUnitPrice}
              onChange={(e) =>
                setForm((s) => ({ ...s, defaultUnitPrice: e.target.value }))
              }
              placeholder="0.00"
              type="number"
              min="0"
              step="0.01"
              className="h-11 rounded-xl border-[#E5E7EB] px-3.5 text-sm"
            />
          </div>

          <div className="space-y-1.5 xl:col-span-2">
            <Label htmlFor="svc-tax-rate" className="text-sm font-medium text-[#344054]">
              Tax rate
            </Label>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,220px)_minmax(0,1fr)]">
              <Select
                value={taxRateMode}
                onValueChange={(value: "0" | "7" | "20" | "custom") => {
                  setTaxRateMode(value);
                  if (value === "custom") {
                    setCustomTaxRatePercent(
                      (current) =>
                        current || decimalToPercentString(form.defaultTaxRate),
                    );
                    return;
                  }
                  setCustomTaxRatePercent("");
                  setForm((s) => ({
                    ...s,
                    defaultTaxRate:
                      value === "0" ? "0" : value === "7" ? "0.07" : "0.20",
                  }));
                }}
              >
                <SelectTrigger id="svc-tax-rate" className="h-11 rounded-xl border-[#E5E7EB] px-3.5 text-sm">
                  <SelectValue placeholder="Select tax rate" />
                </SelectTrigger>
                <SelectContent>
                  {TAX_RATE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {taxRateMode === "custom" ? (
                <Input
                  id="svc-tax-rate-custom"
                  value={customTaxRatePercent}
                  onChange={(e) => {
                    const percentValue = e.target.value;
                    setCustomTaxRatePercent(percentValue);
                    setForm((s) => ({
                      ...s,
                      defaultTaxRate: percentToDecimalString(percentValue),
                    }));
                  }}
                  placeholder="e.g. 12.5"
                  type="number"
                  min="0"
                  step="0.01"
                  className="h-11 rounded-xl border-[#E5E7EB] px-3.5 text-sm"
                />
              ) : (
                <div className="hidden sm:block" aria-hidden="true" />
              )}
            </div>
          </div>

          <div className="space-y-1.5 xl:col-span-2">
            <Label htmlFor="svc-sla" className="text-sm font-medium text-[#344054]">
              SLA minutes
            </Label>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,220px)_minmax(0,1fr)]">
              <Select
                value={slaModeIsCustom ? "custom" : (form.defaultSlaMinutes || "")}
                onValueChange={(value) => {
                  if (value === "custom") {
                    setSlaModeIsCustom(true);
                    setForm((s) => ({ ...s, defaultSlaMinutes: "" }));
                    return;
                  }
                  setSlaModeIsCustom(false);
                  setForm((s) => ({ ...s, defaultSlaMinutes: value }));
                }}
              >
                <SelectTrigger id="svc-sla" className="h-11 rounded-xl border-[#E5E7EB] px-3.5 text-sm">
                  <SelectValue placeholder="Select SLA" />
                </SelectTrigger>
                <SelectContent>
                  {SLA_MINUTE_OPTIONS.map((min) => (
                    <SelectItem key={min} value={String(min)}>
                      {min} min
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>

              {slaModeIsCustom ? (
                <Input
                  id="svc-sla-custom"
                  value={form.defaultSlaMinutes}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, defaultSlaMinutes: e.target.value }))
                  }
                  placeholder="e.g. 75"
                  type="number"
                  min="1"
                  step="1"
                  className="h-11 rounded-xl border-[#E5E7EB] px-3.5 text-sm"
                />
              ) : (
                <div className="hidden sm:block" aria-hidden="true" />
              )}
            </div>
          </div>

          <div className="space-y-1.5 xl:col-span-2">
            <Label htmlFor="svc-duration" className="text-sm font-medium text-[#344054]">
              Duration minutes
            </Label>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,220px)_minmax(0,1fr)]">
              <Select
                value={durationModeIsCustom ? "custom" : (form.defaultDurationMinutes || "")}
                onValueChange={(value) => {
                  if (value === "custom") {
                    setDurationModeIsCustom(true);
                    setForm((s) => ({ ...s, defaultDurationMinutes: "" }));
                    return;
                  }
                  setDurationModeIsCustom(false);
                  setForm((s) => ({ ...s, defaultDurationMinutes: value }));
                }}
              >
                <SelectTrigger id="svc-duration" className="h-11 rounded-xl border-[#E5E7EB] px-3.5 text-sm">
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_MINUTE_OPTIONS.map((min) => (
                    <SelectItem key={min} value={String(min)}>
                      {min} min
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>

              {durationModeIsCustom ? (
                <Input
                  id="svc-duration-custom"
                  value={form.defaultDurationMinutes}
                  onChange={(e) =>
                    setForm((s) => ({
                      ...s,
                      defaultDurationMinutes: e.target.value,
                    }))
                  }
                  placeholder="e.g. 150"
                  type="number"
                  min="1"
                  step="1"
                  className="h-11 rounded-xl border-[#E5E7EB] px-3.5 text-sm"
                />
              ) : (
                <div className="hidden sm:block" aria-hidden="true" />
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="svc-requires-assignee" className="text-sm font-medium text-[#344054]">
              Assignee
            </Label>
            <label className="inline-flex h-11 w-full items-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-3.5 text-sm text-[#344054]">
              <input
                id="svc-requires-assignee"
                checked={form.requiresAssignee}
                onChange={(e) =>
                  setForm((s) => ({ ...s, requiresAssignee: e.target.checked }))
                }
                type="checkbox"
              />
              Requires assignee
            </label>
          </div>
        </div>

        <div className="mt-4 space-y-1.5">
          <Label htmlFor="svc-description" className="text-sm font-medium text-[#344054]">
            Description
          </Label>
          <Textarea
            id="svc-description"
            value={form.description}
            onChange={(e) =>
              setForm((s) => ({ ...s, description: e.target.value }))
            }
            placeholder="e.g. Service notes or scope details"
            className="min-h-[92px] rounded-xl border-[#E5E7EB] px-3.5 py-3 text-sm"
          />
        </div>
        <div className="mt-3 flex justify-start xl:justify-end">
          <button
            type="button"
            onClick={submit}
            disabled={isPending || Boolean(schemaWarning)}
            className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-[var(--brand-600)] px-4 text-sm font-semibold text-white disabled:opacity-60 sm:w-auto sm:min-w-[240px]"
          >
            {isPending ? "Saving..." : "Create service"}
          </button>
        </div>
        {errorText ? (
          <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {errorText}
          </div>
        ) : null}
      </section>

      <section className="rounded-[20px] border border-[#E5E7EB] bg-white p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <div className="product-section-label text-[#6B7280]">Catalog</div>
            <h2 className="product-section-title mt-1.5">Services</h2>
          </div>
          <div className="text-sm text-[#667085]">{rows.length} items</div>
        </div>

        <div className="space-y-3">
          {rows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#E5E7EB] bg-[#F9FAFB] px-4 py-6 text-sm text-[#667085]">
              No services yet.
            </div>
          ) : (
            rows.map((row) => (
              <article
                key={row.id}
                className="rounded-2xl border border-[#E5E7EB] bg-[#FCFCFD] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-[#101828]">
                      {row.name}
                    </div>
                    <div className="mt-1 text-xs text-[#667085]">
                      {row.service_code} • {row.currency_code}
                    </div>
                    {row.description ? (
                      <div className="mt-2 text-sm text-[#475467]">
                        {row.description}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={[
                        "inline-flex h-8 items-center rounded-full px-3 text-xs font-semibold",
                        row.status === "ACTIVE"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-600",
                      ].join(" ")}
                    >
                      {row.status}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleStatus(row.id, row.status)}
                      disabled={isPending || Boolean(schemaWarning)}
                      className="inline-flex h-8 items-center rounded-full border border-[#D0D5DD] px-3 text-xs font-semibold text-[#344054] disabled:opacity-60"
                    >
                      {row.status === "ACTIVE" ? "Set inactive" : "Set active"}
                    </button>
                  </div>
                </div>
                <div className="mt-3 grid gap-2 text-sm text-[#475467] md:grid-cols-5">
                  <div>Price: {fmtNumber(row.default_unit_price)}</div>
                  <div>
                    Tax: {fmtNumber(Number(row.default_tax_rate) * 100)}%
                  </div>
                  <div>SLA: {row.default_sla_minutes ?? "-"}</div>
                  <div>Duration: {row.default_duration_minutes ?? "-"}</div>
                  <div>
                    Assignee: {row.requires_assignee ? "Required" : "Optional"}
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

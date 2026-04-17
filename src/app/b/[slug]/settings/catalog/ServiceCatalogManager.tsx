"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
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
  });
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "price" | "updated">("updated");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = q
      ? rows.filter(
          (r) =>
            r.name.toLowerCase().includes(q) ||
            r.service_code.toLowerCase().includes(q),
        )
      : [...rows];

    list.sort((a, b) => {
      let cmp = 0;
      if (sortBy === "name") cmp = a.name.localeCompare(b.name);
      else if (sortBy === "price")
        cmp = Number(a.default_unit_price) - Number(b.default_unit_price);
      else cmp = a.updated_at.localeCompare(b.updated_at);
      return sortDir === "asc" ? cmp : -cmp;
    });

    return list;
  }, [rows, search, sortBy, sortDir]);

  const [taxRateMode, setTaxRateMode] = useState<
    "" | "0" | "7" | "20" | "custom"
  >("");
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
        requiresAssignee: true,
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

  const filledCustomTaxPct =
    taxRateMode === "custom" &&
    customTaxRatePercent.trim() &&
    Number.isFinite(Number(customTaxRatePercent.trim()))
      ? customTaxRatePercent.trim()
      : null;
  const taxSelectValue = filledCustomTaxPct
    ? `custom:${filledCustomTaxPct}`
    : taxRateMode;

  const filledCustomSlaMins =
    slaModeIsCustom &&
    form.defaultSlaMinutes.trim() &&
    Number.isFinite(Number(form.defaultSlaMinutes.trim()))
      ? form.defaultSlaMinutes.trim()
      : null;
  const slaSelectValue = filledCustomSlaMins
    ? `custom:${filledCustomSlaMins}`
    : slaModeIsCustom
      ? "custom"
      : form.defaultSlaMinutes || "";

  const filledCustomDurationMins =
    durationModeIsCustom &&
    form.defaultDurationMinutes.trim() &&
    Number.isFinite(Number(form.defaultDurationMinutes.trim()))
      ? form.defaultDurationMinutes.trim()
      : null;
  const durationSelectValue = filledCustomDurationMins
    ? `custom:${filledCustomDurationMins}`
    : durationModeIsCustom
      ? "custom"
      : form.defaultDurationMinutes || "";

  return (
    <div className="space-y-4">
      <section className="rounded-[16px] border border-[#E5E7EB] bg-[#FCFCFD] p-3 sm:p-4">
        {schemaWarning ? (
          <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {schemaWarning}
          </div>
        ) : null}
        <div className="mb-4">
          <div className="product-section-label text-[#6B7280]">Catalog</div>
          <h2 className="product-section-title mt-1">Create service</h2>
          <p className="product-page-subtitle mt-1">
            Visible catalog entry for services you want to use in requests and
            orders later.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-1.5">
            <Label
              htmlFor="svc-code"
              className="text-sm font-medium text-[#344054]"
            >
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
            <Label
              htmlFor="svc-name"
              className="text-sm font-medium text-[#344054]"
            >
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
            <Label
              htmlFor="svc-currency"
              className="text-sm font-medium text-[#344054]"
            >
              Currency
            </Label>
            <Select
              value={form.currencyCode}
              onValueChange={(value) =>
                setForm((s) => ({ ...s, currencyCode: value }))
              }
            >
              <SelectTrigger
                id="svc-currency"
                className="h-11 rounded-xl border-[#E5E7EB] px-3.5 text-sm"
              >
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
            <Label
              htmlFor="svc-unit-price"
              className="text-sm font-medium text-[#344054]"
            >
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
              className="h-11 rounded-xl border-[#E5E7EB] px-3.5 text-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
          </div>

          <div className="space-y-1.5 xl:col-span-2">
            <Label
              htmlFor="svc-tax-rate"
              className="text-sm font-medium text-[#344054]"
            >
              Tax rate
            </Label>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,220px)_minmax(0,1fr)]">
              <Select
                value={taxSelectValue}
                onValueChange={(value) => {
                  if (value.startsWith("custom:")) return;
                  const v = value as "0" | "7" | "20" | "custom";
                  setTaxRateMode(v);
                  if (v === "custom") {
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
                      v === "0" ? "0" : v === "7" ? "0.07" : "0.20",
                  }));
                }}
              >
                <SelectTrigger
                  id="svc-tax-rate"
                  className="h-11 rounded-xl border-[#E5E7EB] px-3.5 text-sm"
                >
                  <SelectValue placeholder="Select tax rate" />
                </SelectTrigger>
                <SelectContent>
                  {filledCustomTaxPct ? (
                    <SelectItem value={`custom:${filledCustomTaxPct}`}>
                      {filledCustomTaxPct}% (custom)
                    </SelectItem>
                  ) : null}
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
            <Label
              htmlFor="svc-sla"
              className="text-sm font-medium text-[#344054]"
            >
              SLA minutes
            </Label>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,220px)_minmax(0,1fr)]">
              <Select
                value={slaSelectValue}
                onValueChange={(value) => {
                  if (value.startsWith("custom:")) return;
                  if (value === "custom") {
                    setSlaModeIsCustom(true);
                    setForm((s) => ({ ...s, defaultSlaMinutes: "" }));
                    return;
                  }
                  setSlaModeIsCustom(false);
                  setForm((s) => ({ ...s, defaultSlaMinutes: value }));
                }}
              >
                <SelectTrigger
                  id="svc-sla"
                  className="h-11 rounded-xl border-[#E5E7EB] px-3.5 text-sm"
                >
                  <SelectValue placeholder="Select SLA" />
                </SelectTrigger>
                <SelectContent>
                  {filledCustomSlaMins ? (
                    <SelectItem value={`custom:${filledCustomSlaMins}`}>
                      {filledCustomSlaMins} min (custom)
                    </SelectItem>
                  ) : null}
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
                    setForm((s) => ({
                      ...s,
                      defaultSlaMinutes: e.target.value,
                    }))
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
            <Label
              htmlFor="svc-duration"
              className="text-sm font-medium text-[#344054]"
            >
              Duration minutes
            </Label>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,220px)_minmax(0,1fr)]">
              <Select
                value={durationSelectValue}
                onValueChange={(value) => {
                  if (value.startsWith("custom:")) return;
                  if (value === "custom") {
                    setDurationModeIsCustom(true);
                    setForm((s) => ({ ...s, defaultDurationMinutes: "" }));
                    return;
                  }
                  setDurationModeIsCustom(false);
                  setForm((s) => ({ ...s, defaultDurationMinutes: value }));
                }}
              >
                <SelectTrigger
                  id="svc-duration"
                  className="h-11 rounded-xl border-[#E5E7EB] px-3.5 text-sm"
                >
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  {filledCustomDurationMins ? (
                    <SelectItem value={`custom:${filledCustomDurationMins}`}>
                      {filledCustomDurationMins} min (custom)
                    </SelectItem>
                  ) : null}
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
        </div>

        <div className="mt-4 space-y-1.5">
          <Label
            htmlFor="svc-description"
            className="text-sm font-medium text-[#344054]"
          >
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

      <section className="rounded-[16px] border border-[#E5E7EB] bg-white p-3 sm:p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <div className="product-section-label text-[#6B7280]">Catalog</div>
            <h2 className="product-section-title mt-1">Services</h2>
          </div>
          <div className="text-sm text-[#667085]">
            {search.trim()
              ? `${filtered.length} of ${rows.length}`
              : `${rows.length} items`}
          </div>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder="Search by name or code..."
            className="h-9 min-w-0 flex-1 rounded-lg border border-[#E5E7EB] bg-white px-3 text-sm text-[#344054] placeholder:text-[#9CA3AF] focus:border-[var(--brand-600)] focus:outline-none"
          />
          <select
            value={`${sortBy}:${sortDir}`}
            onChange={(e) => {
              const [field, dir] = e.target.value.split(":") as [typeof sortBy, typeof sortDir];
              setSortBy(field);
              setSortDir(dir);
              setPage(0);
            }}
            className="h-9 shrink-0 rounded-lg border border-[#E5E7EB] bg-white px-2.5 text-xs text-[#344054] focus:border-[var(--brand-600)] focus:outline-none"
          >
            <option value="updated:desc">Newest first</option>
            <option value="updated:asc">Oldest first</option>
            <option value="name:asc">Name A-Z</option>
            <option value="name:desc">Name Z-A</option>
            <option value="price:asc">Price low-high</option>
            <option value="price:desc">Price high-low</option>
          </select>
        </div>

        {(() => {
          const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
          const safeP = Math.min(page, totalPages - 1);
          const start = safeP * PAGE_SIZE;
          const pageRows = filtered.slice(start, start + PAGE_SIZE);

          return (
            <>
              <div className="space-y-1.5">
                {filtered.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#E5E7EB] bg-[#F9FAFB] px-4 py-6 text-sm text-[#667085]">
                    {rows.length === 0 ? "No services yet." : "No services match your search."}
                  </div>
                ) : (
                  pageRows.map((row, i) => (
                    <article
                      key={row.id}
                      className="flex items-center gap-3 rounded-xl border border-[#E5E7EB] bg-[#FCFCFD] px-3.5 py-2.5"
                    >
                      <span className="w-6 shrink-0 text-xs font-medium text-[#9CA3AF] text-right">
                        {start + i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2">
                          <span className="truncate text-sm font-semibold text-[#101828]">
                            {row.name}
                          </span>
                          <span className="shrink-0 text-xs text-[#667085]">
                            {row.service_code}
                          </span>
                        </div>
                        <div className="mt-0.5 text-xs text-[#667085]">
                          {fmtNumber(row.default_unit_price)} {row.currency_code}
                        </div>
                      </div>
                      <span
                        className={[
                          "inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
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
                        className="inline-flex shrink-0 items-center rounded-full border border-[#D0D5DD] px-2.5 py-1 text-xs font-medium text-[#344054] disabled:opacity-60"
                      >
                        {row.status === "ACTIVE" ? "Set inactive" : "Set active"}
                      </button>
                    </article>
                  ))
                )}
              </div>

              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    disabled={safeP === 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    className="inline-flex h-8 items-center rounded-lg border border-[#D0D5DD] px-3 text-xs font-medium text-[#344054] disabled:opacity-40"
                  >
                    Prev
                  </button>
                  <span className="text-xs text-[#667085]">
                    {safeP + 1} / {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={safeP >= totalPages - 1}
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    className="inline-flex h-8 items-center rounded-lg border border-[#D0D5DD] px-3 text-xs font-medium text-[#344054] disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          );
        })()}
      </section>
    </div>
  );
}

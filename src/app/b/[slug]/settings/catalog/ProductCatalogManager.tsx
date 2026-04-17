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
import { createCatalogProduct, setCatalogProductStatus } from "./actions";

type ProductRow = {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  uom_code: string;
  is_stock_managed: boolean;
  default_unit_price: number | string;
  default_tax_rate: number | string;
  currency_code: string;
  status: "ACTIVE" | "INACTIVE";
  updated_at: string;
};

function fmtNumber(value: number | string) {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num.toFixed(2) : "0.00";
}

const UOM_OPTIONS = ["EA", "PCS", "KG", "G", "L", "ML", "PACK", "BOX"];
const CURRENCY_OPTIONS = ["GBP", "USD", "EUR"];
const TAX_RATE_OPTIONS = [
  { value: "0", label: "0%" },
  { value: "7", label: "7%" },
  { value: "20", label: "20%" },
  { value: "custom", label: "Custom" },
] as const;

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

export default function ProductCatalogManager({
  businessSlug,
  rows,
  schemaWarning,
}: {
  businessSlug: string;
  rows: ProductRow[];
  schemaWarning?: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorText, setErrorText] = useState<string | null>(null);
  const [form, setForm] = useState({
    sku: "",
    name: "",
    description: "",
    uomCode: "",
    isStockManaged: true,
    initialStockQty: "",
    defaultUnitPrice: "",
    defaultTaxRate: "",
    currencyCode: "GBP",
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
            r.sku.toLowerCase().includes(q),
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

  function submit() {
    setErrorText(null);
    startTransition(async () => {
      const result = await createCatalogProduct({
        businessSlug,
        sku: form.sku,
        name: form.name,
        description: form.description,
        uomCode: form.uomCode,
        isStockManaged: form.isStockManaged,
        initialStockQty: form.initialStockQty,
        defaultUnitPrice: form.defaultUnitPrice,
        defaultTaxRate: form.defaultTaxRate,
        currencyCode: form.currencyCode,
      });

      if (!result.ok) {
        setErrorText(result.error);
        return;
      }

      setForm({
        sku: "",
        name: "",
        description: "",
        uomCode: "",
        isStockManaged: true,
        initialStockQty: "",
        defaultUnitPrice: "",
        defaultTaxRate: "",
        currencyCode: "GBP",
      });
      setTaxRateMode("");
      setCustomTaxRatePercent("");
      router.refresh();
    });
  }

  function toggleStatus(id: string, currentStatus: "ACTIVE" | "INACTIVE") {
    setErrorText(null);
    startTransition(async () => {
      const result = await setCatalogProductStatus({
        businessSlug,
        productId: id,
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
          <h2 className="product-section-title mt-1.5">Create product</h2>
          <p className="product-page-subtitle mt-1.5">
            Visible catalog entry for goods you want to use in orders later.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-1.5">
            <Label
              htmlFor="product-sku"
              className="text-sm font-medium text-[#344054]"
            >
              SKU
            </Label>
            <Input
              id="product-sku"
              value={form.sku}
              onChange={(e) => setForm((s) => ({ ...s, sku: e.target.value }))}
              placeholder="e.g. SKU-001"
              className="h-11 rounded-xl border-[#E5E7EB] px-3.5 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="product-name"
              className="text-sm font-medium text-[#344054]"
            >
              Name
            </Label>
            <Input
              id="product-name"
              value={form.name}
              onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
              placeholder="e.g. Premium detergent"
              className="h-11 rounded-xl border-[#E5E7EB] px-3.5 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="product-uom"
              className="text-sm font-medium text-[#344054]"
            >
              UOM
            </Label>
            <Select
              value={form.uomCode}
              onValueChange={(value) =>
                setForm((s) => ({ ...s, uomCode: value }))
              }
            >
              <SelectTrigger
                id="product-uom"
                className="h-11 rounded-xl border-[#E5E7EB] px-3.5 text-sm"
              >
                <SelectValue placeholder="Select UOM" />
              </SelectTrigger>
              <SelectContent>
                {UOM_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="product-currency"
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
                id="product-currency"
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
              htmlFor="product-stock-managed"
              className="text-sm font-medium text-[#344054]"
            >
              Stock management
            </Label>
            <label className="inline-flex h-11 w-full items-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-3.5 text-sm text-[#344054]">
              <input
                id="product-stock-managed"
                checked={form.isStockManaged}
                onChange={(e) =>
                  setForm((s) => ({ ...s, isStockManaged: e.target.checked }))
                }
                type="checkbox"
              />
              Stock managed
            </label>
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="product-quantity"
              className="text-sm font-medium text-[#344054]"
            >
              Quantity (stock)
            </Label>
            <Input
              id="product-quantity"
              value={form.initialStockQty}
              onChange={(e) =>
                setForm((s) => ({ ...s, initialStockQty: e.target.value }))
              }
              placeholder="e.g. 10"
              type="number"
              step="0.0001"
              min="0"
              disabled={!form.isStockManaged}
              className="h-11 rounded-xl border-[#E5E7EB] px-3.5 text-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="product-unit-price"
              className="text-sm font-medium text-[#344054]"
            >
              Unit price
            </Label>
            <Input
              id="product-unit-price"
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
              htmlFor="product-tax-rate"
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
                  id="product-tax-rate"
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
                  id="product-tax-rate-custom"
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
        </div>

        <div className="mt-4 space-y-1.5">
          <Label
            htmlFor="product-description"
            className="text-sm font-medium text-[#344054]"
          >
            Description
          </Label>
          <Textarea
            id="product-description"
            value={form.description}
            onChange={(e) =>
              setForm((s) => ({ ...s, description: e.target.value }))
            }
            placeholder="e.g. Product notes or selling details"
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
            {isPending ? "Saving..." : "Create product"}
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
            <h2 className="product-section-title mt-1.5">Products</h2>
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
            placeholder="Search by name or SKU..."
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
            className="h-9 rounded-lg border border-[#E5E7EB] bg-white px-2.5 text-xs text-[#344054] focus:border-[var(--brand-600)] focus:outline-none"
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
                    {rows.length === 0 ? "No products yet." : "No products match your search."}
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
                            {row.sku}
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

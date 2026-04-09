"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createCatalogService, setCatalogServiceStatus } from "./actions";

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
    defaultUnitPrice: "0",
    defaultTaxRate: "0.20",
    currencyCode: "GBP",
    defaultSlaMinutes: "",
    defaultDurationMinutes: "",
    requiresAssignee: true,
  });

  function submit() {
    setErrorText(null);
    startTransition(async () => {
      const result = await createCatalogService({
        businessSlug,
        serviceCode: form.serviceCode,
        name: form.name,
        description: form.description,
        defaultUnitPrice: Number(form.defaultUnitPrice),
        defaultTaxRate: Number(form.defaultTaxRate),
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
        defaultUnitPrice: "0",
        defaultTaxRate: "0.20",
        currencyCode: "GBP",
        defaultSlaMinutes: "",
        defaultDurationMinutes: "",
        requiresAssignee: true,
      });
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

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <input
            value={form.serviceCode}
            onChange={(e) =>
              setForm((s) => ({ ...s, serviceCode: e.target.value }))
            }
            placeholder="Service code"
            className="h-11 rounded-xl border border-[#E5E7EB] px-3 text-sm"
          />
          <input
            value={form.name}
            onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
            placeholder="Name"
            className="h-11 rounded-xl border border-[#E5E7EB] px-3 text-sm"
          />
          <input
            value={form.currencyCode}
            onChange={(e) =>
              setForm((s) => ({ ...s, currencyCode: e.target.value }))
            }
            placeholder="Currency"
            className="h-11 rounded-xl border border-[#E5E7EB] px-3 text-sm"
          />
          <input
            value={form.defaultUnitPrice}
            onChange={(e) =>
              setForm((s) => ({ ...s, defaultUnitPrice: e.target.value }))
            }
            placeholder="Unit price"
            type="number"
            step="0.0001"
            className="h-11 rounded-xl border border-[#E5E7EB] px-3 text-sm"
          />
          <input
            value={form.defaultTaxRate}
            onChange={(e) =>
              setForm((s) => ({ ...s, defaultTaxRate: e.target.value }))
            }
            placeholder="Tax rate (0..1)"
            type="number"
            step="0.0001"
            className="h-11 rounded-xl border border-[#E5E7EB] px-3 text-sm"
          />
          <input
            value={form.defaultSlaMinutes}
            onChange={(e) =>
              setForm((s) => ({ ...s, defaultSlaMinutes: e.target.value }))
            }
            placeholder="SLA minutes"
            type="number"
            step="1"
            className="h-11 rounded-xl border border-[#E5E7EB] px-3 text-sm"
          />
          <input
            value={form.defaultDurationMinutes}
            onChange={(e) =>
              setForm((s) => ({ ...s, defaultDurationMinutes: e.target.value }))
            }
            placeholder="Duration minutes"
            type="number"
            step="1"
            className="h-11 rounded-xl border border-[#E5E7EB] px-3 text-sm"
          />
          <label className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#E5E7EB] px-3 text-sm text-[#344054]">
            <input
              checked={form.requiresAssignee}
              onChange={(e) =>
                setForm((s) => ({ ...s, requiresAssignee: e.target.checked }))
              }
              type="checkbox"
            />
            Requires assignee
          </label>
        </div>

        <textarea
          value={form.description}
          onChange={(e) =>
            setForm((s) => ({ ...s, description: e.target.value }))
          }
          placeholder="Description"
          className="mt-3 min-h-[92px] w-full rounded-xl border border-[#E5E7EB] px-3 py-3 text-sm"
        />
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={submit}
            disabled={isPending || Boolean(schemaWarning)}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--brand-600)] px-4 text-sm font-semibold text-white disabled:opacity-60"
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

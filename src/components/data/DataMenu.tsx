"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Download, FileDown, FileUp, Loader2, X } from "lucide-react";

type DataType = "clients" | "products" | "orders";

type Props = {
  businessSlug: string;
  type: DataType;
  // Whether the current account has the export_csv entitlement.
  canExport: boolean;
  // Whether the current account has the import_csv entitlement.
  canImport: boolean;
  // Whether the current user is the owner (only owners can import).
  isOwner?: boolean;
};

export default function DataMenu({
  businessSlug,
  type,
  canExport,
  canImport,
  isOwner = true,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showPaywall, setShowPaywall] = useState<null | "export" | "import">(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  // Export and import are owner-only operations. Hide the menu entirely for
  // managers — keeps the surface clean and matches the API-side restriction.
  // Conditional return MUST come after all hooks to satisfy Rules of Hooks.
  if (!isOwner) return null;

  function downloadUrl(extra: Record<string, string>) {
    const url = new URL(`/api/b/${encodeURIComponent(businessSlug)}/export`, window.location.origin);
    url.searchParams.set("type", type);
    for (const [k, v] of Object.entries(extra)) url.searchParams.set(k, v);
    return url.toString();
  }

  const onExport = (format: "csv" | "xlsx") => {
    setOpen(false);
    if (!canExport) {
      setShowPaywall("export");
      return;
    }
    window.location.href = downloadUrl({ format });
  };

  const onTemplate = (format: "csv" | "xlsx") => {
    setOpen(false);
    window.location.href = downloadUrl({ template: "1", format });
  };

  const onImport = () => {
    setOpen(false);
    if (!canImport || !isOwner) {
      setShowPaywall("import");
      return;
    }
    setShowImport(true);
  };

  const importDisabledReason = !isOwner
    ? "Only the business owner can import data."
    : !canImport
      ? "Import requires the Business plan."
      : null;

  return (
    <>
      <div ref={wrapperRef} className="relative inline-block">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--brand-200)] bg-white px-4 text-sm font-medium text-[var(--brand-700)] transition hover:border-[#A5B4FC] hover:bg-[var(--brand-50)]"
        >
          <Download className="h-4 w-4" />
          Data
          <ChevronDown className="h-4 w-4 text-[var(--brand-600)]" />
        </button>

        {open ? (
          <div className="absolute right-0 z-30 mt-1 w-[260px] overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_12px_32px_rgba(15,23,42,0.10)]">
            <div className="border-b border-[#F3F4F6] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9CA3AF]">
              Export {type}
            </div>
            <button
              type="button"
              onClick={() => onExport("xlsx")}
              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm font-semibold text-[#1F2937] hover:bg-[#F9FAFB]"
            >
              <span className="inline-flex items-center gap-2">
                <FileDown className="h-3.5 w-3.5 text-[#4F46E5]" />
                Excel (.xlsx)
              </span>
              {!canExport ? <span className="text-[10px] uppercase tracking-wide text-[#9CA3AF]">Pro</span> : null}
            </button>
            <button
              type="button"
              onClick={() => onExport("csv")}
              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm font-semibold text-[#1F2937] hover:bg-[#F9FAFB]"
            >
              <span className="inline-flex items-center gap-2">
                <FileDown className="h-3.5 w-3.5 text-[#4F46E5]" />
                CSV (.csv)
              </span>
              {!canExport ? <span className="text-[10px] uppercase tracking-wide text-[#9CA3AF]">Pro</span> : null}
            </button>

            <div className="border-t border-[#F3F4F6] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9CA3AF]">
              Template (free)
            </div>
            <button
              type="button"
              onClick={() => onTemplate("xlsx")}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-[#1F2937] hover:bg-[#F9FAFB]"
            >
              <FileDown className="h-3.5 w-3.5 text-[#9CA3AF]" />
              Download Excel template
            </button>
            <button
              type="button"
              onClick={() => onTemplate("csv")}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-[#1F2937] hover:bg-[#F9FAFB]"
            >
              <FileDown className="h-3.5 w-3.5 text-[#9CA3AF]" />
              Download CSV template
            </button>

            {type !== "orders" ? (
              <>
                <div className="border-t border-[#F3F4F6] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9CA3AF]">
                  Import {type}
                </div>
                <button
                  type="button"
                  onClick={onImport}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm font-semibold text-[#1F2937] hover:bg-[#F9FAFB]"
                >
                  <span className="inline-flex items-center gap-2">
                    <FileUp className="h-3.5 w-3.5 text-[#10B981]" />
                    Upload CSV / Excel
                  </span>
                  {importDisabledReason ? (
                    <span className="text-[10px] uppercase tracking-wide text-[#9CA3AF]">Business</span>
                  ) : null}
                </button>
              </>
            ) : null}
          </div>
        ) : null}
      </div>

      {showImport ? (
        <ImportModal
          businessSlug={businessSlug}
          type={type as "clients" | "products"}
          onClose={() => setShowImport(false)}
          onImported={() => {
            setShowImport(false);
            router.refresh();
          }}
        />
      ) : null}

      {showPaywall ? (
        <PaywallModal
          mode={showPaywall}
          onClose={() => setShowPaywall(null)}
          onUpgrade={() => {
            setShowPaywall(null);
            router.push("/app/settings/billing");
          }}
        />
      ) : null}
    </>
  );
}

function ImportModal({
  businessSlug,
  type,
  onClose,
  onImported,
}: {
  businessSlug: string;
  type: "clients" | "products";
  onClose: () => void;
  onImported: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<null | {
    inserted: number;
    skipped: number;
    total: number;
    errors: Array<{ row: number; message: string }>;
  }>(null);

  async function submit() {
    if (!file) {
      setError("Choose a file first.");
      return;
    }
    setSubmitting(true);
    setError(null);
    setResult(null);
    try {
      const isXlsx = /\.xlsx$/i.test(file.name) ||
        file.type.includes("spreadsheetml") ||
        file.type.includes("ms-excel");
      const body = isXlsx ? await file.arrayBuffer() : await file.text();
      const res = await fetch(
        `/api/b/${encodeURIComponent(businessSlug)}/import?type=${encodeURIComponent(type)}`,
        {
          method: "POST",
          headers: {
            "content-type": isXlsx
              ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              : "text/csv; charset=utf-8",
          },
          body: body as BodyInit,
        },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        setError(String(json?.error || "Import failed"));
        return;
      }
      setResult({
        inserted: Number(json.inserted ?? 0),
        skipped: Number(json.skipped ?? 0),
        total: Number(json.total ?? 0),
        errors: Array.isArray(json.errors) ? json.errors : [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/30 p-4 pt-16" onClick={onClose}>
      <div
        className="w-full max-w-[480px] rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#111827]">Import {type}</h2>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 text-[#6B7280] hover:bg-[#F3F4F6]">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-1 text-[13px] leading-5 text-[#6B7280]">
          Upload a CSV or Excel file matching the Ordo template. Use the
          <strong> Download template</strong> option in the Data menu first if
          you&apos;re unsure of the format.
        </p>

        <div className="mt-3">
          <input
            type="file"
            accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
              setError(null);
              setResult(null);
            }}
            className="block w-full text-sm text-[#374151] file:mr-3 file:rounded-full file:border file:border-[#E5E7EB] file:bg-white file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[#374151] hover:file:bg-[#F9FAFB]"
          />
        </div>

        {error ? (
          <div className="mt-3 rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-2.5 text-[13px] leading-5 text-[#991B1B]">
            {error}
          </div>
        ) : null}

        {result ? (
          <div className="mt-3 rounded-xl border border-[#D1FAE5] bg-[#ECFDF5] p-3 text-[13px] leading-5 text-[#065F46]">
            <div className="font-semibold">Imported {result.inserted} of {result.total} rows.</div>
            {result.skipped > 0 ? (
              <div className="mt-1 text-[#92400E]">{result.skipped} rows skipped.</div>
            ) : null}
            {result.errors.length > 0 ? (
              <details className="mt-2 text-xs text-[#1F2937]">
                <summary className="cursor-pointer font-semibold">{result.errors.length} errors</summary>
                <ul className="mt-1 max-h-[120px] list-disc overflow-auto pl-5">
                  {result.errors.slice(0, 50).map((er, i) => (
                    <li key={i}>row {er.row}: {er.message}</li>
                  ))}
                </ul>
              </details>
            ) : null}
          </div>
        ) : null}

        <div className="mt-4 flex items-center justify-end gap-2">
          {result ? (
            <button
              type="button"
              onClick={onImported}
              className="inline-flex items-center gap-2 rounded-full bg-[#111827] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1F2937]"
            >
              Done
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-semibold text-[#374151] hover:bg-[#FCFCFD]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={submitting || !file}
                className="inline-flex items-center gap-2 rounded-full bg-[#111827] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#1F2937] disabled:opacity-50"
              >
                {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileUp className="h-3.5 w-3.5" />}
                Upload
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function PaywallModal({
  mode,
  onClose,
  onUpgrade,
}: {
  mode: "export" | "import";
  onClose: () => void;
  onUpgrade: () => void;
}) {
  const isImport = mode === "import";
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/30 p-4 pt-16" onClick={onClose}>
      <div
        className="w-full max-w-[420px] rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#111827]">
            {isImport ? "Upgrade to Business" : "Upgrade to Pro"}
          </h2>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 text-[#6B7280] hover:bg-[#F3F4F6]">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-2 text-[13px] leading-5 text-[#6B7280]">
          {isImport
            ? "Importing CSV / Excel files requires the Business plan."
            : "Exporting your data to CSV / Excel requires the Pro plan or higher."}
        </p>
        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-semibold text-[#374151] hover:bg-[#FCFCFD]"
          >
            Not now
          </button>
          <button
            type="button"
            onClick={onUpgrade}
            className="inline-flex items-center gap-2 rounded-full bg-[#4F46E5] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#4338CA]"
          >
            See plans
          </button>
        </div>
      </div>
    </div>
  );
}

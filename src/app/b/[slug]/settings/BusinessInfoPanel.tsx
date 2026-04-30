"use client";

import type { ReactNode } from "react";
import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import {
  Building2,
  Globe,
  Hash,
  MapPin,
  PencilLine,
  Phone,
  Tags,
} from "lucide-react";
import { BUSINESS_SEGMENTS } from "@/lib/business-segments";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  businessId: string;
  slug: string;
  name: string | null;
  plan: string | null;
  businessPhone: string | null;
  businessAddress: string | null;
  businessSegment: string | null;
  businessWebsite: string | null;
};

type SaveState = "idle" | "saving" | "saved" | "error";
type EditableField = "phone" | "address" | "segment" | "website";
type BusinessDraft = {
  phone: string;
  address: string;
  segment: string;
  website: string;
};

function normalizeDraftFromProps({
  businessPhone,
  businessAddress,
  businessSegment,
  businessWebsite,
}: Pick<
  Props,
  "businessPhone" | "businessAddress" | "businessSegment" | "businessWebsite"
>): BusinessDraft {
  return {
    phone: businessPhone?.trim() || "",
    address: businessAddress?.trim() || "",
    segment: businessSegment?.trim() || "",
    website: businessWebsite?.trim() || "",
  };
}

function ReadonlyCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-[18px] border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.03] p-4 shadow-[0_4px_14px_rgba(15,23,42,0.04)]">
      <div className="product-section-label flex items-center gap-2 text-[#6B7280] dark:text-white/55">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-[#E5E7EB] dark:border-white/10 bg-[#F9FAFB] dark:bg-white/[0.04] text-[#6B7280] dark:text-white/55">
          {icon}
        </span>
        {label}
      </div>
      <div className="mt-3 break-all text-sm font-semibold text-[#1F2937] dark:text-white/90">
        {value}
      </div>
      {hint ? (
        <div className="mt-1 text-xs leading-5 text-[#6B7280] dark:text-white/55">{hint}</div>
      ) : null}
    </div>
  );
}

function EditableCard({
  icon,
  label,
  hint,
  editing,
  displayValue,
  placeholder,
  onEdit,
  children,
}: {
  icon: ReactNode;
  label: string;
  hint?: string;
  editing: boolean;
  displayValue: string;
  placeholder: string;
  onEdit: () => void;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[18px] border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.03] p-4 shadow-[0_4px_14px_rgba(15,23,42,0.04)]">
      <div className="flex items-center justify-between gap-3">
        <div className="product-section-label flex items-center gap-2 text-[#6B7280] dark:text-white/55">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-[#E5E7EB] dark:border-white/10 bg-[#F9FAFB] dark:bg-white/[0.04] text-[#6B7280] dark:text-white/55">
            {icon}
          </span>
          {label}
        </div>
        <button
          type="button"
          onMouseDown={(event) => {
            event.preventDefault();
          }}
          onClick={onEdit}
          className={[
            "inline-flex h-9 w-9 items-center justify-center rounded-xl border transition",
            editing
              ? "border-[var(--brand-600)] bg-[var(--brand-50)] text-[var(--brand-600)] shadow-[0_0_0_3px_rgba(91,91,179,0.12)]"
              : "border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.03] text-[#4B5563] dark:text-white/70 hover:border-[#C7D2FE] dark:hover:border-[var(--brand-500)]/40 hover:bg-[#F9FAFB] dark:hover:bg-white/[0.06]",
          ].join(" ")}
          aria-label={editing ? `Close ${label} editing` : `Edit ${label}`}
        >
          <PencilLine className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mt-3">
        {editing ? (
          children
        ) : (
          <div
            className={[
              "min-h-11 rounded-xl border border-[#E5E7EB] dark:border-white/10 bg-[#F9FAFB] dark:bg-white/[0.04] px-3.5 py-3 text-sm",
              displayValue
                ? "border-[#E5E7EB] dark:border-white/10 bg-[#F9FAFB] dark:bg-white/[0.04] text-[#1F2937] dark:text-white/90"
                : "border-[#E5E7EB] dark:border-white/10 bg-[#F9FAFB] dark:bg-white/[0.04] text-[#9CA3AF] dark:text-white/40",
            ].join(" ")}
          >
            {displayValue || placeholder}
          </div>
        )}
      </div>

      {hint ? (
        <div className="mt-2 text-xs leading-5 text-[#6B7280] dark:text-white/55">{hint}</div>
      ) : null}
    </div>
  );
}

const inputClassName =
  "h-11 w-full rounded-xl border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.03] px-3.5 text-sm text-[#1F2937] dark:text-white/90 outline-none transition placeholder:text-[#9CA3AF] hover:border-[var(--brand-200)] focus:border-[var(--brand-600)] focus:ring-4 focus:ring-[var(--brand-600)]/15";

export default function BusinessInfoPanel({
  businessId,
  slug,
  name,
  plan,
  businessPhone,
  businessAddress,
  businessSegment,
  businessWebsite,
}: Props) {
  const initialDraft = useMemo(
    () =>
      normalizeDraftFromProps({
        businessPhone,
        businessAddress,
        businessSegment,
        businessWebsite,
      }),
    [businessAddress, businessPhone, businessSegment, businessWebsite],
  );
  const [savedDraft, setSavedDraft] = useState<BusinessDraft>(initialDraft);
  const [draft, setDraft] = useState<BusinessDraft>(initialDraft);
  const [editingField, setEditingField] = useState<EditableField | null>(null);
  const [status, setStatus] = useState<SaveState>("idle");
  const [message, setMessage] = useState("");
  const saveInProgressRef = useRef(false);

  const isDirty = useMemo(
    () =>
      draft.phone !== savedDraft.phone ||
      draft.address !== savedDraft.address ||
      draft.segment !== savedDraft.segment ||
      draft.website !== savedDraft.website,
    [draft, savedDraft],
  );

  useEffect(() => {
    if (isDirty) return;
    setSavedDraft(initialDraft);
    setDraft(initialDraft);
  }, [initialDraft, isDirty]);

  useEffect(() => {
    if (!isDirty) return;

    window.history.pushState({ businessDraft: true }, "", window.location.href);

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    const handleDocumentClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || anchor.target === "_blank") return;
      if (saveInProgressRef.current) return;

      const nextUrl = new URL(anchor.href, window.location.href);
      const currentUrl = new URL(window.location.href);
      if (nextUrl.href === currentUrl.href) return;

      const shouldLeave = window.confirm(
        "You have unsaved business changes. Leave this page without saving?",
      );
      if (!shouldLeave) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    const handlePopState = () => {
      if (saveInProgressRef.current) return;
      const shouldLeave = window.confirm(
        "You have unsaved business changes. Leave this page without saving?",
      );
      if (!shouldLeave) {
        window.history.pushState(
          { businessDraft: true },
          "",
          window.location.href,
        );
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("popstate", handlePopState);
    document.addEventListener("click", handleDocumentClick, true);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
      document.removeEventListener("click", handleDocumentClick, true);
    };
  }, [isDirty]);

  const updateDraft = (field: EditableField, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setStatus("idle");
    setMessage("");
  };

  const closeEditor = () => {
    setEditingField(null);
  };

  const toggleEditor = (field: EditableField) => {
    setEditingField((current) => (current === field ? null : field));
  };

  const discardChanges = () => {
    setDraft(savedDraft);
    setEditingField(null);
    setStatus("idle");
    setMessage("");
  };

  const onSave = async () => {
    setStatus("saving");
    setMessage("");
    saveInProgressRef.current = true;

    try {
      const response = await fetch("/api/business/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId,
          businessPhone: draft.phone,
          businessAddress: draft.address,
          businessSegment: draft.segment,
          businessWebsite: draft.website,
        }),
      });

      const json = await response.json().catch(() => ({}));

      if (!response.ok || !json?.ok) {
        setStatus("error");
        setMessage(String(json?.error || "Failed to save business profile"));
        return;
      }

      const nextSaved = normalizeDraftFromProps({
        businessPhone: String(json.business?.business_phone || ""),
        businessAddress: String(json.business?.business_address || ""),
        businessSegment: String(json.business?.business_segment || ""),
        businessWebsite: String(json.business?.business_website || ""),
      });

      setSavedDraft(nextSaved);
      setDraft(nextSaved);
      setEditingField(null);
      setStatus("saved");
      setMessage("Business info updated");
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to save business profile",
      );
    } finally {
      saveInProgressRef.current = false;
    }
  };

  return (
    <section className="mt-5 rounded-[20px] border border-[#E5E7EB] dark:border-white/10 bg-[#F9FAFB] dark:bg-white/[0.04] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="product-section-label text-[#6B7280] dark:text-white/55">Business</div>
          <h2 className="product-section-title mt-1.5">Business info</h2>
          <p className="product-page-subtitle mt-1.5 max-w-[700px]">
            Keep the business card editable here: contact phone, address,
            website or shop, and segment. User phone stays in the user profile.
          </p>
        </div>

        {isDirty ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={discardChanges}
              disabled={status === "saving"}
              className="inline-flex h-11 items-center rounded-full border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.03] px-5 text-sm font-semibold text-[#4B5563] dark:text-white/70 transition hover:border-[#C7D2FE] dark:hover:border-[var(--brand-500)]/40 hover:bg-[#F9FAFB] dark:hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Discard changes
            </button>
            <button
              type="button"
              onClick={() => {
                startTransition(() => {
                  void onSave();
                });
              }}
              disabled={status === "saving"}
              className="inline-flex h-11 items-center rounded-full bg-[var(--brand-600)] px-5 text-sm font-semibold !text-white transition hover:bg-[var(--brand-700)] disabled:cursor-not-allowed disabled:!text-white disabled:opacity-60"
            >
              {status === "saving" ? "Saving..." : "Save changes"}
            </button>
          </div>
        ) : null}
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <ReadonlyCard
          icon={<Building2 className="h-4 w-4" />}
          label="Workspace"
          value={name?.trim() || slug}
        />
        <ReadonlyCard
          icon={<Tags className="h-4 w-4" />}
          label="Plan"
          value={plan?.trim() || "beta"}
          hint="Billing stays on beta for now."
        />
        <ReadonlyCard
          icon={<Hash className="h-4 w-4" />}
          label="Business ID"
          value={businessId}
          hint="Unique business identifier in the workspace."
        />
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-4">
        <EditableCard
          icon={<Phone className="h-4 w-4" />}
          label="Business phone"
          hint="Business contact number for calls to the store, office, or manager desk."
          editing={editingField === "phone"}
          displayValue={draft.phone}
          placeholder="Add business contact phone"
          onEdit={() => toggleEditor("phone")}
        >
          <input
            autoFocus
            value={draft.phone}
            onChange={(event) => updateDraft("phone", event.target.value)}
            onBlur={closeEditor}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                closeEditor();
              }
            }}
            placeholder="Add business contact phone"
            className={inputClassName}
          />
        </EditableCard>

        <EditableCard
          icon={<MapPin className="h-4 w-4" />}
          label="Business address"
          hint="Street, city, region, landmark, ZIP, or anything useful for local delivery."
          editing={editingField === "address"}
          displayValue={draft.address}
          placeholder="Add business address"
          onEdit={() => toggleEditor("address")}
        >
          <input
            autoFocus
            value={draft.address}
            onChange={(event) => updateDraft("address", event.target.value)}
            onBlur={closeEditor}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                closeEditor();
              }
            }}
            placeholder="Add business address"
            className={inputClassName}
          />
        </EditableCard>

        <EditableCard
          icon={<Tags className="h-4 w-4" />}
          label="Business segment"
          hint="Focused on common Nigeria-ready segments like cleaning, retail, online shops, beauty, and repairs."
          editing={editingField === "segment"}
          displayValue={draft.segment}
          placeholder="Select business segment"
          onEdit={() => toggleEditor("segment")}
        >
          <Select
            value={draft.segment}
            onValueChange={(value) => {
              updateDraft("segment", value);
              closeEditor();
            }}
          >
            <SelectTrigger className="h-11 w-full rounded-xl border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.03] px-3.5 text-sm text-[#1F2937] dark:text-white/90 outline-none transition hover:border-[var(--brand-200)] focus:border-[var(--brand-600)] focus:ring-4 focus:ring-[var(--brand-600)]/15 data-[placeholder]:text-[#9CA3AF]">
              <SelectValue placeholder="Select business segment" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.03] p-1 shadow-[0_12px_30px_rgba(15,23,42,0.12)]">
              {BUSINESS_SEGMENTS.map((option) => (
                <SelectItem
                  key={option}
                  value={option}
                  className="rounded-lg px-3 py-2 text-sm text-[#4B5563] dark:text-white/70 focus:bg-[var(--brand-50)] focus:text-[var(--brand-600)]"
                >
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </EditableCard>

        <EditableCard
          icon={<Globe className="h-4 w-4" />}
          label="Website or shop"
          hint="Website, Instagram shop, marketplace page, storefront URL, or WhatsApp catalog link."
          editing={editingField === "website"}
          displayValue={draft.website}
          placeholder="Add website or shop link"
          onEdit={() => toggleEditor("website")}
        >
          <input
            autoFocus
            value={draft.website}
            onChange={(event) => updateDraft("website", event.target.value)}
            onBlur={closeEditor}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                closeEditor();
              }
            }}
            placeholder="Add website or shop link"
            className={inputClassName}
          />
        </EditableCard>
      </div>

      {message ? (
        <div
          className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
            status === "error"
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          {message}
        </div>
      ) : null}
    </section>
  );
}

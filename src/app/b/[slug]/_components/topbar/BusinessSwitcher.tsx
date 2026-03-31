"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, ShieldCheck } from "lucide-react";

type Role = "OWNER" | "MANAGER" | "GUEST";

export type BusinessOption = {
  id: string;
  slug: string;
  name: string;
  role: Role;
  isAdmin?: boolean;
};

type Props = {
  businesses: BusinessOption[];
  currentSlug: string;
  onSelect: (slug: string) => void;
  disabledAdd?: boolean;
  widthClassName?: string;
  variant?: "toolbar" | "toolbar-compact" | "card";
  hintText?: string;
};

function roleLabel(role: Role) {
  if (role === "OWNER") return "Owner";
  if (role === "MANAGER") return "Manager";
  return "Guest";
}

function roleBadgeClass(role: Role) {
  if (role === "OWNER") return "border-[#C7D2FE] bg-[#EEF2FF] text-[#3645A0]";
  if (role === "MANAGER") return "border-[#E5E7EB] bg-[#F9FAFB] text-[#475467]";
  return "border-[#E5E7EB] bg-white text-[#98A2B3]";
}

function RoleBadge({
  role,
  compact = false,
}: {
  role: Role;
  compact?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border font-semibold ${roleBadgeClass(role)} ${
        compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]"
      }`}
    >
      {roleLabel(role)}
    </span>
  );
}

function AdminBadge({ compact = false }: { compact?: boolean }) {
  return (
    <span
      title="Admin"
      aria-label="Admin"
      className={`inline-flex items-center justify-center rounded-full border border-[var(--brand-200)] bg-white text-[var(--brand-600)] shadow-sm ${
        compact ? "h-5 w-5" : "h-7 w-7"
      }`}
    >
      <ShieldCheck className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
    </span>
  );
}

export default function BusinessSwitcher({
  businesses,
  currentSlug,
  onSelect,
  disabledAdd = true,
  widthClassName = "w-[220px] sm:w-[248px]",
  variant = "toolbar",
  hintText = "Switch workspace",
}: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement | null>(null);

  const current = useMemo(
    () =>
      businesses.find((business) => business.slug === currentSlug) ||
      businesses[0],
    [businesses, currentSlug],
  );

  const filtered = useMemo(() => {
    const search = q.trim().toLowerCase();
    if (!search) return businesses;

    return businesses.filter((business) => {
      return (
        business.name.toLowerCase().includes(search) ||
        business.slug.toLowerCase().includes(search) ||
        roleLabel(business.role).toLowerCase().includes(search)
      );
    });
  }, [businesses, q]);

  useEffect(() => {
    const onDown = (event: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(event.target as Node)) setOpen(false);
    };

    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  if (!current) return null;

  const compact = variant === "toolbar-compact";

  const triggerClass =
    variant === "toolbar-compact"
      ? "inline-flex h-8 w-full items-center justify-between gap-2 rounded-lg border border-transparent bg-transparent px-2.5 transition hover:border-[#E5E7EB] hover:bg-[#F8FAFC]"
      : variant === "toolbar"
        ? "inline-flex h-10 w-full items-center justify-between gap-2 rounded-xl border border-[#E5E7EB] bg-white px-3.5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition hover:border-[#D1D5DB] hover:bg-[#F9FAFB]"
        : "inline-flex h-11 w-full items-center justify-between gap-3 rounded-2xl border border-[#E5E7EB] bg-white px-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition hover:bg-[#F9FAFB]";

  return (
    <div className={`relative z-50 ${widthClassName}`} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={triggerClass}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <div className="min-w-0 flex flex-1 items-center gap-2">
          <div className="min-w-0 flex-1 text-left leading-tight">
            <div className="flex min-w-0 items-center gap-2">
              <div
                className={`truncate font-semibold text-slate-900 ${compact ? "text-[12px]" : "text-sm"}`}
              >
                {current.name}
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <RoleBadge role={current.role} compact />
                {current.isAdmin ? <AdminBadge compact /> : null}
              </div>
            </div>
            {!compact ? (
              <p className="truncate pt-0.5 text-[11px] text-slate-500">
                {hintText}
              </p>
            ) : null}
          </div>
        </div>

        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-500 transition ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-[280px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_28px_rgba(16,24,40,0.12)]"
        >
          {!compact ? (
            <div className="border-b border-gray-100 p-3">
              <input
                value={q}
                onChange={(event) => setQ(event.target.value)}
                placeholder="Search workspace..."
                className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-[#1F2937] outline-none transition focus:border-[#C7D2FE] focus:ring-4 focus:ring-[rgba(99,102,241,0.12)]"
              />
            </div>
          ) : null}

          <div className="max-h-[320px] overflow-auto p-2">
            {(compact ? businesses : filtered).map((business) => {
              const isCurrent = business.slug === currentSlug;
              return (
                <button
                  key={business.id}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    onSelect(business.slug);
                  }}
                  className={`w-full rounded-xl px-3 py-2 text-left transition hover:bg-[#F9FAFB] ${isCurrent ? "bg-[#EEF2FF]" : ""}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-gray-900">
                        {business.name}
                      </div>
                      <div className="truncate pt-0.5 text-[11px] text-gray-500">
                        {business.slug}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isCurrent ? (
                        <Check className="h-4 w-4 shrink-0 text-[#4F46E5]" />
                      ) : null}
                      <RoleBadge role={business.role} />
                      {business.isAdmin ? <AdminBadge /> : null}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="border-t border-gray-100 p-2">
            <button
              type="button"
              disabled={disabledAdd}
              className={`w-full rounded-xl px-3 py-2 text-left text-sm font-semibold transition ${disabledAdd ? "cursor-not-allowed text-gray-400" : "text-[#1F2937] hover:bg-[#F9FAFB]"}`}
            >
              + Create workspace{" "}
              <span className="ml-2 text-[11px]">(soon)</span>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

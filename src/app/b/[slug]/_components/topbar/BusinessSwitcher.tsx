"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

type Role = "OWNER" | "MANAGER" | "GUEST";

export type BusinessOption = {
  id: string;
  slug: string;
  name: string;
  role: Role;
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
  if (role === "OWNER") return "bg-gray-900 text-white";
  if (role === "MANAGER") return "bg-blue-600 text-white";
  return "bg-gray-200 text-gray-800";
}

export default function BusinessSwitcher({
  businesses,
  currentSlug,
  onSelect,
  disabledAdd = true,
  widthClassName = "w-[220px] sm:w-[260px]",
  variant = "toolbar",
  hintText = "Tap to switch",
}: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement | null>(null);

  const current = useMemo(
    () => businesses.find((b) => b.slug === currentSlug) || businesses[0],
    [businesses, currentSlug]
  );

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return businesses;
    return businesses.filter((b) => {
      return (
        b.name.toLowerCase().includes(s) ||
        b.slug.toLowerCase().includes(s) ||
        roleLabel(b.role).toLowerCase().includes(s)
      );
    });
  }, [businesses, q]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  if (!current) return null;

  const compact = variant === "toolbar-compact";

  const triggerClass = compact
    ? "w-full inline-flex h-10 items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 shadow-sm transition hover:bg-slate-50"
    : variant === "toolbar"
    ? "w-full inline-flex h-11 items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 shadow-sm transition hover:bg-slate-50"
    : "w-full inline-flex h-12 items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white/80 px-4 shadow-sm backdrop-blur hover:bg-white transition";

  return (
    <div className={`relative ${widthClassName} z-50`} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={triggerClass}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <div className="min-w-0 flex flex-1 items-center gap-2">
          <div className="min-w-0 flex-1 text-left leading-tight">
            <div className="flex min-w-0 items-center gap-2">
              <div className="truncate text-sm font-semibold text-slate-900">
                {current.name}
              </div>

              {!compact && (
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${roleBadgeClass(
                    current.role
                  )}`}
                >
                  {roleLabel(current.role)}
                </span>
              )}
            </div>

            {!compact && (
              <p className="truncate text-[11px] text-slate-500">{hintText}</p>
            )}
          </div>
        </div>

        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-500 transition ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-[300px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg"
        >
          {!compact && (
            <div className="border-b border-gray-100 p-3">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search business…"
                className="h-10 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-gray-300"
              />
            </div>
          )}

          <div className="max-h-[320px] overflow-auto p-2">
            {(compact ? businesses : filtered).map((b) => {
              const isCurrent = b.slug === currentSlug;
              return (
                <button
                  key={b.id}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    onSelect(b.slug);
                  }}
                  className={`w-full rounded-xl px-3 py-2 text-left transition hover:bg-gray-50 ${
                    isCurrent ? "bg-blue-50/60" : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-gray-900">
                        {b.name}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isCurrent && (
                        <Check className="h-4 w-4 shrink-0 text-blue-700" />
                      )}
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${roleBadgeClass(
                          b.role
                        )}`}
                      >
                        {roleLabel(b.role)}
                      </span>
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
              className={`w-full rounded-xl px-3 py-2 text-left text-sm font-semibold transition ${
                disabledAdd
                  ? "cursor-not-allowed text-gray-400"
                  : "text-gray-900 hover:bg-gray-50"
              }`}
            >
              + Create business <span className="ml-2 text-[11px]">(soon)</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

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
  variant?: "toolbar" | "card";
  hintText?: string;
};

function roleLabel(role: Role) {
  if (role === "OWNER") return "Owner";
  if (role === "MANAGER") return "Manager";
  return "Guest";
}

function roleBadgeClass(role: Role) {
  if (role === "OWNER") return "bg-gray-900 text-white";
  if (role === "MANAGER") return "border border-blue-200 bg-blue-100 text-blue-700";
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

  const triggerClass =
    variant === "toolbar"
      ? "w-full inline-flex h-11 items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 shadow-sm transition hover:bg-slate-50"
      : "w-full inline-flex h-12 items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white/80 px-4 shadow-sm backdrop-blur hover:bg-white transition";

  return (
    <div className={`relative ${widthClassName} z-50`} ref={ref}>
      {/* Trigger */}
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

              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${roleBadgeClass(
                  current.role
                )}`}
              >
                {roleLabel(current.role)}
              </span>
            </div>
            <p className="truncate text-[11px] text-slate-500 lg:hidden">{hintText}</p>
          </div>
        </div>

        <svg
          className={`h-4 w-4 shrink-0 text-slate-500 transition ${
            open ? "rotate-180" : ""
          }`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {/* Menu */}
      {open && (
        <div
          role="menu"
          className="absolute left-0 right-0 sm:left-auto sm:right-0 z-50 mt-2 w-[calc(100vw-2rem)] sm:w-[360px] max-w-[360px] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg"
        >
          <div className="p-3 border-b border-gray-100">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search business…"
              className="h-10 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-gray-300"
            />
          </div>

          <div className="max-h-[320px] overflow-auto p-2">
            {filtered.map((b) => {
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
                        <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                          current
                        </span>
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
              + Add business <span className="ml-2 text-[11px]">(soon)</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

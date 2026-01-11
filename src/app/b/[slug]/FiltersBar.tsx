"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export type Filters = {
  q: string;
  status: "ALL" | "NEW" | "IN_PROGRESS" | "DONE" | "CANCELED" | "DUPLICATE";
  paid: "ALL" | "1" | "0";
  range: "ALL" | "today" | "week" | "month" | "year";
};

type Props = {
  basePath: string; // например `/b/test`
  isMobile: boolean;
  initial: Filters;
  keepU?: string; // чтобы не потерять доступ (?u=...)
};

function buildUrl(basePath: string, f: Filters, keepU?: string) {
  const p = new URLSearchParams();

  if (keepU) p.set("u", keepU);

  // сохраняем только НЕ-дефолтные, чтобы URL был чистым
  const q = (f.q || "").trim();
  if (q) p.set("q", q);

  if (f.status !== "ALL") p.set("status", f.status);
  if (f.paid !== "ALL") p.set("paid", f.paid);
  if (f.range !== "ALL") p.set("range", f.range);

  const qs = p.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export default function FiltersBar({
  basePath,
  isMobile,
  initial,
  keepU,
}: Props) {
  const router = useRouter();
  const sp = useSearchParams();

  const [draft, setDraft] = useState<Filters>(initial);

  // если пользователь открыл ссылку с уже готовыми параметрами — синхронизируем
  useEffect(() => {
    setDraft(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial.q, initial.status, initial.paid, initial.range]);

  const isDefault = useMemo(() => {
    return (
      (draft.q || "").trim() === "" &&
      draft.status === "ALL" &&
      draft.paid === "ALL" &&
      draft.range === "ALL"
    );
  }, [draft]);

  const applyNow = (next: Filters) => {
    const url = buildUrl(basePath, next, keepU);
    router.replace(url);
  };

  // ПК: авто-apply (по изменению селектов) + debounce для поиска
  const searchTimer = useRef<number | null>(null);
  useEffect(() => {
    if (isMobile) return;

    // debounce только для q
    if (searchTimer.current) window.clearTimeout(searchTimer.current);

    searchTimer.current = window.setTimeout(() => {
      applyNow(draft);
    }, 300);

    return () => {
      if (searchTimer.current) window.clearTimeout(searchTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.q, draft.status, draft.paid, draft.range, isMobile]);

  const onReset = () => {
    const next: Filters = { q: "", status: "ALL", paid: "ALL", range: "ALL" };
    setDraft(next);
    applyNow(next);
  };

  const onApplyMobile = () => applyNow(draft);

  return (
    <div
      style={{
        border: "1px solid #eee",
        borderRadius: 16,
        padding: 12,
        background: "white",
        display: "grid",
        gap: 10,
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile
            ? "1fr"
            : "1.4fr 0.5fr 0.5fr 0.6fr auto auto",
          gap: 10,
          alignItems: "end",
        }}
      >
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 600 }}>Search</span>
          <input
            value={draft.q}
            onChange={(e) => setDraft((s) => ({ ...s, q: e.target.value }))}
            placeholder="Name, phone, amount..."
            style={{
              height: 40,
              borderRadius: 10,
              border: "1px solid #ddd",
              padding: "0 12px",
            }}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 600 }}>Status</span>
          <select
            value={draft.status}
            onChange={(e) =>
              setDraft((s) => ({
                ...s,
                status: e.target.value as Filters["status"],
              }))
            }
            style={{
              height: 40,
              borderRadius: 10,
              border: "1px solid #ddd",
              padding: "0 10px",
              background: "white",
            }}
          >
            <option value="ALL">All</option>
            <option value="NEW">NEW</option>
            <option value="DONE">DONE</option>
          </select>
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 600 }}>Paid</span>
          <select
            value={draft.paid}
            onChange={(e) =>
              setDraft((s) => ({
                ...s,
                paid: e.target.value as Filters["paid"],
              }))
            }
            style={{
              height: 40,
              borderRadius: 10,
              border: "1px solid #ddd",
              padding: "0 10px",
              background: "white",
            }}
          >
            <option value="ALL">All</option>
            <option value="1">Paid</option>
            <option value="0">Unpaid</option>
          </select>
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 600 }}>Period</span>
          <select
            value={draft.range}
            onChange={(e) =>
              setDraft((s) => ({
                ...s,
                range: e.target.value as Filters["range"],
              }))
            }
            style={{
              height: 40,
              borderRadius: 10,
              border: "1px solid #ddd",
              padding: "0 10px",
              background: "white",
            }}
          >
            <option value="ALL">All time</option>
            <option value="today">Today</option>
            <option value="week">Last 7 days</option>
            <option value="month">Last month</option>
          </select>
        </label>

        {/* Mobile: кнопка Apply */}
        {isMobile ? (
          <button
            onClick={onApplyMobile}
            style={{
              height: 40,
              borderRadius: 10,
              border: "1px solid #111",
              background: "#111",
              color: "white",
              padding: "0 14px",
              cursor: "pointer",
              fontWeight: 700,
              justifySelf: "start",
            }}
          >
            Apply
          </button>
        ) : (
          // Desktop: вместо Apply показываем подсказку (по желанию можешь убрать)
          <div style={{ fontSize: 12, opacity: 0.6, paddingBottom: 6 }}>
            Auto-apply ✓
          </div>
        )}

        {/* Reset — всегда */}
        <button
          type="button"
          onClick={onReset}
          disabled={isDefault}
          style={{
            height: 40,
            borderRadius: 10,
            border: "1px solid #ddd",
            background: isDefault ? "#f7f7f7" : "white",
            color: isDefault ? "#999" : "#111",
            padding: "0 14px",
            cursor: isDefault ? "not-allowed" : "pointer",
            fontWeight: 700,
          }}
          title="Reset filters"
        >
          Reset
        </button>
      </div>

      {/* маленькая строка статуса */}
      <div style={{ fontSize: 12, opacity: 0.65 }}>
        {isMobile
          ? "Mobile: set filters → Apply"
          : "Desktop: changes apply automatically"}
      </div>
    </div>
  );
}

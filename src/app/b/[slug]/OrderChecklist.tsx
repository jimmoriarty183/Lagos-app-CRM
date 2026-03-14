"use client";

import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

type ChecklistItem = {
  id: string;
  business_id: string;
  order_id: string;
  title: string;
  is_done: boolean;
  created_at: string;
  done_at: string | null;
};

export function OrderChecklist({
  order,
  supabase,
}: {
  order: { id: string; business_id: string };
  supabase: SupabaseClient;
}) {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data, error } = await supabase
        .from("order_checklist_items")
        .select("*")
        .eq("order_id", order.id)
        .order("created_at", { ascending: true });

      if (!cancelled) setItems((data as ChecklistItem[]) || []);
      if (error) console.error(error);
    })();

    return () => {
      cancelled = true;
    };
  }, [order.id, supabase]);

  const add = async () => {
    const t = title.trim();
    if (!t || loading) return;

    setLoading(true);
    const { data, error } = await supabase
      .from("order_checklist_items")
      .insert({
        order_id: order.id,
        business_id: order.business_id,
        title: t,
      })
      .select("*")
      .single();

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    setItems((prev) => [...prev, data as ChecklistItem]);
    setTitle("");
    setLoading(false);
  };

  const toggle = async (item: ChecklistItem) => {
    if (loading) return;

    const nextDone = !item.is_done;
    const patch = {
      is_done: nextDone,
      done_at: nextDone ? new Date().toISOString() : null,
    };

    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, ...patch } : i)));

    const { error } = await supabase
      .from("order_checklist_items")
      .update(patch)
      .eq("id", item.id);

    if (error) {
      console.error(error);
      setItems((prev) => prev.map((i) => (i.id === item.id ? item : i)));
    }
  };

  const remove = async (item: ChecklistItem) => {
    if (loading) return;

    const ok = confirm("Delete this checklist item?");
    if (!ok) return;

    setLoading(true);

    const prevItems = items;
    setItems((prev) => prev.filter((i) => i.id !== item.id));

    const { error } = await supabase
      .from("order_checklist_items")
      .delete()
      .eq("id", item.id);

    if (error) {
      console.error(error);
      setItems(prevItems);
    }

    setLoading(false);
  };

  return (
    <div className="rounded-2xl border border-[#eef2f7] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-[#111827]">
          Checklist <span className="text-xs font-semibold text-[#98a2b3]">({items.length})</span>
        </div>

        <div className="text-xs text-[#98a2b3]">{loading ? "Saving..." : ""}</div>
      </div>

      <div className="space-y-2.5">
        {items.map((i) => (
          <div
            key={i.id}
            className="group flex items-start justify-between gap-3 rounded-2xl border border-[#f2f4f7] bg-[#fbfcfe] px-3 py-2.5 text-sm"
          >
            <label className="flex items-start gap-2 text-[#111827]">
              <input
                type="checkbox"
                checked={!!i.is_done}
                onChange={() => toggle(i)}
                className="mt-0.5 h-4 w-4 rounded border-[#cfd8e6] text-[#111827] focus:ring-0"
              />
              <span className={i.is_done ? "text-[#98a2b3] line-through" : "text-[#344054]"}>
                {i.title}
              </span>
            </label>

            <button
              type="button"
              onClick={() => remove(i)}
              className="text-[#c0c7d2] opacity-0 transition group-hover:opacity-100 hover:text-[#d92d20]"
              title="Delete"
              aria-label="Delete checklist item"
            >
              ×
            </button>
          </div>
        ))}

        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#d8dee8] bg-[#fbfcfe] px-4 py-6 text-center text-xs text-[#98a2b3]">
            No checklist items yet.
          </div>
        ) : null}
      </div>

      <div className="mt-3 flex gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add checklist item..."
          className="h-10 flex-1 rounded-xl border border-[#dde3ee] bg-[#fbfcfe] px-3 text-sm outline-none transition focus:border-[#111827] focus:bg-white"
          onKeyDown={(e) => {
            if (e.key === "Enter") add();
          }}
        />

        <button
          type="button"
          onClick={add}
          disabled={loading || !title.trim()}
          aria-disabled={loading || !title.trim()}
          className={[
            "h-10 min-w-[92px] shrink-0 rounded-xl px-4 text-sm font-semibold transition",
            !title.trim()
              ? "cursor-not-allowed bg-[#111827] text-white"
              : loading
                ? "cursor-not-allowed bg-[#d0d5dd] text-[#667085]"
                : "bg-[#eef2f7] text-[#111827] hover:bg-[#e4e7ec]",
          ].join(" ")}
        >
          + Add
        </button>
      </div>
    </div>
  );
}

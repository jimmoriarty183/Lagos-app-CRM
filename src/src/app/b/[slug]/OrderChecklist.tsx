"use client";

import { useEffect, useState } from "react";

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
  supabase: any;
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

    // optimistic UI
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, ...patch } : i))
    );

    const { error } = await supabase
      .from("order_checklist_items")
      .update(patch)
      .eq("id", item.id);

    if (error) {
      console.error(error);
      // rollback
      setItems((prev) => prev.map((i) => (i.id === item.id ? item : i)));
    }
  };

  const remove = async (item: ChecklistItem) => {
    if (loading) return;

    const ok = confirm("Delete this checklist item?");
    if (!ok) return;

    setLoading(true);

    // optimistic
    const prevItems = items;
    setItems((prev) => prev.filter((i) => i.id !== item.id));

    const { error } = await supabase
      .from("order_checklist_items")
      .delete()
      .eq("id", item.id);

    if (error) {
      console.error(error);
      // rollback
      setItems(prevItems);
    }

    setLoading(false);
  };

  return (
    <div className="mt-5 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm font-semibold text-gray-900">
          Checklist{" "}
          <span className="text-xs font-semibold text-gray-500">
            ({items.length})
          </span>
        </div>

        <div className="text-xs text-gray-400">{loading ? "Saving…" : ""}</div>
      </div>

      <div className="space-y-2">
        {items.map((i) => (
          <div
            key={i.id}
            className="group flex items-start justify-between gap-2 text-sm"
          >
            <label className="flex items-start gap-2 text-gray-900">
              <input
                type="checkbox"
                checked={!!i.is_done}
                onChange={() => toggle(i)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-0"
              />
              <span className={i.is_done ? "text-gray-400 line-through" : ""}>
                {i.title}
              </span>
            </label>

            {/* delete (hover) */}
            <button
              type="button"
              onClick={() => remove(i)}
              className="
                text-gray-300 hover:text-red-500
                opacity-0 group-hover:opacity-100
                transition
              "
              title="Delete"
              aria-label="Delete checklist item"
            >
              ✕
            </button>
          </div>
        ))}

        {items.length === 0 && (
          <div className="text-xs text-gray-500">No checklist items yet.</div>
        )}
      </div>

      <div className="mt-3 flex gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add checklist item…"
          className="h-10 flex-1 rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-gray-300"
          onKeyDown={(e) => {
            if (e.key === "Enter") add();
          }}
        />

        <button
          type="button"
          onClick={add}
          disabled={loading || !title.trim()}
          aria-disabled={loading || !title.trim()}
          className={`
    h-10 shrink-0 min-w-[92px]
    !px-4 !text-sm !font-semibold
    !rounded-lg transition
    ${
      !title.trim()
        ? "!bg-gray-900 !text-white cursor-not-allowed"
        : loading
        ? "!bg-gray-300 !text-gray-600 cursor-not-allowed"
        : "!bg-gray-200 !text-gray-900 hover:!bg-gray-300"
    }
  `}
        >
          + Add
        </button>
      </div>
    </div>
  );
}

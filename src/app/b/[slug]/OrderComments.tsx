"use client";

import { useEffect, useMemo, useState } from "react";

type CommentRow = {
  id: string;
  business_id: string;
  order_id: string;
  body: string;
  author_phone: string | null;
  author_role: string | null;
  created_at: string;
};

function formatDateTime(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function OrderComments({
  order,
  supabase,
  author,
}: {
  order: { id: string; business_id: string };
  supabase: any;
  author: { phone: string; role: "OWNER" | "MANAGER" | "GUEST" };
}) {
  const [list, setList] = useState<CommentRow[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  const canWrite = author.role === "OWNER" || author.role === "MANAGER";
  const count = list.length;

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data, error } = await supabase
        .from("order_comments")
        .select("*")
        .eq("order_id", order.id)
        .order("created_at", { ascending: true });

      if (error) console.error(error);
      if (!cancelled) setList((data as CommentRow[]) || []);
    })();

    return () => {
      cancelled = true;
    };
  }, [order.id, supabase]);

  const add = async () => {
    const body = text.trim();
    if (!body || loading || !canWrite) return;

    setLoading(true);

    const payload = {
      business_id: order.business_id,
      order_id: order.id,
      body,
      author_phone: author.phone || null,
      author_role: author.role,
    };

    const { data, error } = await supabase
      .from("order_comments")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    setList((prev) => [...prev, data as CommentRow]);
    setText("");
    setLoading(false);
  };

  const headerRight = useMemo(() => (loading ? "Saving…" : ""), [loading]);

  return (
    <div className="mt-5 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm font-semibold text-gray-900">
          Comments{" "}
          <span className="text-xs font-semibold text-gray-500">({count})</span>
        </div>
        <div className="text-xs text-gray-400">{headerRight}</div>
      </div>

      <div className="space-y-3">
        {list.map((c) => (
          <div
            key={c.id}
            className="rounded-lg border border-gray-100 bg-gray-50 p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-semibold text-gray-700">
                {(c.author_role || "USER").toUpperCase()}
                {c.author_phone ? (
                  <span className="font-medium text-gray-400">
                    {" "}
                    • {c.author_phone}
                  </span>
                ) : null}
              </div>
              <div className="text-xs text-gray-400">
                {formatDateTime(c.created_at)}
              </div>
            </div>

            <div className="mt-1 whitespace-pre-wrap text-sm text-gray-900">
              {c.body}
            </div>
          </div>
        ))}

        {list.length === 0 ? (
          <div className="text-xs text-gray-500">No comments yet.</div>
        ) : null}
      </div>

      {canWrite ? (
        <div className="mt-3 flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add comment…"
            className="h-10 flex-1 rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-gray-300"
            onKeyDown={(e) => {
              if (e.key === "Enter") add();
            }}
          />
          <button
            type="button"
            onClick={add}
            disabled={loading || !text.trim()}
            className="
              h-10 flex items-center gap-2 rounded-lg
              bg-gray-900 px-3 text-sm font-semibold text-white
              disabled:bg-gray-300 disabled:text-gray-600
            "
          >
            + Add
          </button>
        </div>
      ) : (
        <div className="mt-3 text-xs text-gray-400">
          Only Owner/Manager can add comments.
        </div>
      )}
    </div>
  );
}

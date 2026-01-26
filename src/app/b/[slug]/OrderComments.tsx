"use client";

import { useEffect, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

type Props = {
  order: { id: string; business_id: string };
  supabase: SupabaseClient;
  author: { phone: string; role: "OWNER" | "MANAGER" | "GUEST" };
};

type CommentRow = {
  id: string;
  body: string;
  author_phone: string | null;
  author_role: string | null;
  created_at: string;
};

function fmtDate(ts: string) {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}

export function OrderComments({ order, supabase, author }: Props) {
  const [list, setList] = useState<CommentRow[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  const canWrite = author.role === "OWNER" || author.role === "MANAGER";
  const hasText = useMemo(() => text.trim().length > 0, [text]);

  // ===== load comments =====
  useEffect(() => {
    let alive = true;

    (async () => {
      const { data, error } = await supabase
        .from("order_comments")
        .select("id, body, author_phone, author_role, created_at")
        .eq("order_id", order.id)
        .order("created_at", { ascending: true });

      if (!alive) return;

      if (error) {
        // Supabase иногда в dev показывает {} — это норм, но не ломаем UI
        console.error("load comments error:", error);
        setList([]);
        return;
      }

      setList((data ?? []) as CommentRow[]);
    })();

    return () => {
      alive = false;
    };
  }, [order.id, supabase]);

  // ===== add comment =====
  async function send() {
    const body = text.trim();
    if (!body || loading || !canWrite) return;

    setLoading(true);

    const payload = {
      order_id: order.id,
      business_id: order.business_id,
      body,
      author_phone: author.phone || null,
      author_role: author.role, // ✅ фикс роли (OWNER/MANAGER)
    };

    const { data, error } = await supabase
      .from("order_comments")
      .insert(payload)
      .select("id, body, author_phone, author_role, created_at")
      .single();

    if (error) {
      console.error("insert comment error:", error);
      setLoading(false);
      return;
    }

    if (data) {
      setList((prev) => [...prev, data as CommentRow]);
      setText("");
    }

    setLoading(false);
  }

  return (
    <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4">
      {/* header */}
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-gray-900">
          Comments ({list.length})
        </div>
      </div>

      {/* list */}
      <div className="mt-3 space-y-3">
        {list.length === 0 ? (
          <div className="text-sm text-gray-500">No comments yet.</div>
        ) : (
          list.map((c) => (
            <div key={c.id} className="rounded-lg bg-gray-50 p-3">
              <div className="mb-1 text-xs text-gray-500">
                {c.author_phone ?? "—"}
                {c.author_role ? ` · ${c.author_role}` : ""} ·{" "}
                {fmtDate(c.created_at)}
              </div>
              <div className="whitespace-pre-wrap text-sm text-gray-900">
                {c.body}
              </div>
            </div>
          ))
        )}
      </div>

      {/* input */}
      {canWrite ? (
        <div className="mt-4 flex items-center gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") send();
            }}
            placeholder="Write a comment..."
            className="h-10 flex-1 rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-blue-500"
          />

          {/* Логика как ты хотел:
              - пусто => ЧЁРНАЯ
              - есть текст => СЕРАЯ
          */}
          <button
            type="button"
            onClick={send}
            disabled={loading || !hasText}
            aria-disabled={loading || !hasText}
            className={[
              "h-10 shrink-0 min-w-[96px] rounded-lg px-4 text-sm font-semibold transition",
              "disabled:opacity-100", // ✅ чтобы текст не исчезал
              !hasText
                ? "!bg-gray-900 !text-white cursor-not-allowed"
                : loading
                ? "!bg-gray-300 !text-gray-600 cursor-not-allowed"
                : "!bg-gray-200 !text-gray-900 hover:!bg-gray-300",
            ].join(" ")}
          >
            {loading ? "Sending..." : "Send"}
          </button>
        </div>
      ) : (
        <div className="mt-3 text-xs text-gray-400">
          Only Owner / Manager can add comments.
        </div>
      )}
    </div>
  );
}

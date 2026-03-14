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

  async function send() {
    const body = text.trim();
    if (!body || loading || !canWrite) return;

    setLoading(true);

    const payload = {
      order_id: order.id,
      business_id: order.business_id,
      body,
      author_phone: author.phone || null,
      author_role: author.role,
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
    <div className="rounded-2xl border border-[#eef2f7] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-[#111827]">Comments ({list.length})</div>
        <div className="text-xs text-[#98a2b3]">{loading ? "Sending..." : ""}</div>
      </div>

      <div className="mt-3 max-h-[420px] space-y-3 overflow-y-auto pr-1">
        {list.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#d8dee8] bg-[#fbfcfe] px-4 py-6 text-center text-sm text-[#98a2b3]">
            No comments yet.
          </div>
        ) : (
          list.map((c) => (
            <div key={c.id} className="rounded-2xl border border-[#f2f4f7] bg-[#fbfcfe] p-3">
              <div className="mb-1 text-xs text-[#98a2b3]">
                {c.author_phone ?? "—"}
                {c.author_role ? ` • ${c.author_role}` : ""} • {fmtDate(c.created_at)}
              </div>
              <div className="whitespace-pre-wrap text-sm leading-6 text-[#111827]">{c.body}</div>
            </div>
          ))
        )}
      </div>

      {canWrite ? (
        <div className="mt-4 flex items-center gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") send();
            }}
            placeholder="Write a comment..."
            className="h-10 flex-1 rounded-xl border border-[#dde3ee] bg-[#fbfcfe] px-3 text-sm outline-none transition focus:border-[#111827] focus:bg-white"
          />

          <button
            type="button"
            onClick={send}
            disabled={loading || !hasText}
            aria-disabled={loading || !hasText}
            className={[
              "h-10 min-w-[96px] shrink-0 rounded-xl px-4 text-sm font-semibold transition",
              !hasText
                ? "cursor-not-allowed bg-[#111827] text-white"
                : loading
                  ? "cursor-not-allowed bg-[#d0d5dd] text-[#667085]"
                  : "bg-[#eef2f7] text-[#111827] hover:bg-[#e4e7ec]",
            ].join(" ")}
          >
            {loading ? "Sending..." : "Send"}
          </button>
        </div>
      ) : (
        <div className="mt-3 text-xs text-[#98a2b3]">Only Owner / Manager can add comments.</div>
      )}
    </div>
  );
}

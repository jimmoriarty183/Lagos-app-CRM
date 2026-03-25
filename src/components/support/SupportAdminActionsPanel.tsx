"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  requestId: string;
  initialStatus: string;
  initialPriority: string;
};

const STATUS_OPTIONS = [
  { value: "new", label: "New" },
  { value: "in_progress", label: "In progress" },
  { value: "waiting_for_customer", label: "Waiting for customer" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
] as const;

export function SupportAdminActionsPanel({
  requestId,
  initialStatus,
  initialPriority,
}: Props) {
  const router = useRouter();
  const [status, setStatus] = useState(
    STATUS_OPTIONS.some((entry) => entry.value === String(initialStatus).toLowerCase())
      ? String(initialStatus).toLowerCase()
      : STATUS_OPTIONS[0].value,
  );
  const [customerReply, setCustomerReply] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function updateRequest() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(`/api/support/admin/requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: status.trim(),
          customerReply: customerReply.trim() || null,
        }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Failed to update request");
      }
      setCustomerReply("");
      setSuccess("Request updated.");
      router.refresh();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  async function addInternalNote() {
    if (!note.trim()) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(`/api/support/admin/requests/${requestId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: note.trim() }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Failed to add note");
      }
      setNote("");
      setSuccess("Internal note added.");
      router.refresh();
    } catch (noteError) {
      setError(noteError instanceof Error ? noteError.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">Actions</h3>

      <div className="mt-3 space-y-3">
        <label className="space-y-1.5 text-sm">
          <span className="font-medium text-slate-700">Status</span>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1.5 text-sm">
          <span className="font-medium text-slate-700">Priority (fixed after creation)</span>
          <input
            value={initialPriority || "-"}
            readOnly
            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-600 outline-none"
          />
        </label>
        <label className="space-y-1.5 text-sm">
          <span className="font-medium text-slate-700">Customer reply (visible to requester)</span>
          <textarea
            value={customerReply}
            onChange={(event) => setCustomerReply(event.target.value)}
            placeholder="Type reply that requester should see..."
            className="min-h-[84px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
          />
        </label>

        <button
          type="button"
          onClick={updateRequest}
          disabled={saving}
          className="inline-flex h-10 items-center rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {saving ? "Saving..." : "Update request"}
        </button>
      </div>

      <div className="mt-4 border-t border-slate-200 pt-4">
        <label className="space-y-1.5 text-sm">
          <span className="font-medium text-slate-700">Add internal note (team only)</span>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className="min-h-[100px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
          />
        </label>
        <button
          type="button"
          onClick={addInternalNote}
          disabled={saving || !note.trim()}
          className="mt-3 inline-flex h-10 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Add note
        </button>
      </div>

      {error ? <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div> : null}
      {success ? <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</div> : null}
    </section>
  );
}

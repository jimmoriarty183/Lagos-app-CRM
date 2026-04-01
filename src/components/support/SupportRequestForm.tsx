"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type FormState = {
  type: string;
  subject: string;
  message: string;
  priority: string;
  contactEmail: string;
  file: File | null;
};

const TYPE_SUGGESTIONS = [
  { value: "bug", label: "BUG" },
  { value: "billing", label: "BILLING" },
  { value: "feature_request", label: "FEATURE REQUEST" },
  { value: "integration", label: "INTEGRATION" },
  { value: "account_access", label: "ACCOUNT ACCESS" },
] as const;

const PRIORITY_SUGGESTIONS = [
  { value: "low", label: "LOW" },
  { value: "normal", label: "NORMAL" },
  { value: "high", label: "HIGH" },
  { value: "urgent", label: "URGENT" },
] as const;

export function SupportRequestForm({ businessSlug }: { businessSlug: string }) {
  const router = useRouter();
  const [state, setState] = useState<FormState>({
    type: TYPE_SUGGESTIONS[0].value,
    subject: "",
    message: "",
    priority: PRIORITY_SUGGESTIONS[1].value,
    contactEmail: "",
    file: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdRequestId, setCreatedRequestId] = useState<string | null>(null);
  const [uploadWarning, setUploadWarning] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return (
      state.type.trim().length > 0 &&
      state.subject.trim().length >= 3 &&
      state.message.trim().length >= 3 &&
      state.priority.trim().length > 0
    );
  }, [state]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit || loading) return;
    setLoading(true);
    setError(null);
    setUploadWarning(null);
    setCreatedRequestId(null);

    try {
      const payload = new FormData();
      payload.set("businessSlug", businessSlug);
      payload.set("type", state.type.trim());
      payload.set("subject", state.subject.trim());
      payload.set("message", state.message.trim());
      payload.set("priority", state.priority.trim());
      payload.set("contact_email", state.contactEmail.trim());
      payload.set("contact_phone", "");
      if (state.file) {
        payload.set("attachment", state.file);
      }

      const response = await fetch("/api/support/requests", {
        method: "POST",
        body: payload,
      });
      const data = (await response.json()) as {
        ok?: boolean;
        error?: string;
        requestId?: string;
        uploadWarning?: string;
      };

      if (!response.ok || !data.ok || !data.requestId) {
        throw new Error(data.error || "Failed to create request");
      }

      setCreatedRequestId(data.requestId);
      setUploadWarning(data.uploadWarning || null);
      setState((prev) => ({ ...prev, subject: "", message: "", file: null }));
      router.refresh();
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Unknown error";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <h2 className="text-lg font-semibold text-slate-900">New support request</h2>
      <p className="mt-1 text-sm text-slate-500">Fill in the issue details. Business and submitter are derived from your session.</p>

      <form className="mt-4 space-y-4" onSubmit={onSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1.5 text-sm">
            <span className="font-medium text-slate-700">Type</span>
            <select
              value={state.type}
              onChange={(event) =>
                setState((prev) => ({ ...prev, type: event.target.value }))
              }
              required
              className="h-10 w-full rounded-[var(--radius)] border border-[var(--neutral-200)] bg-white px-4 text-[0.9375rem] text-[var(--neutral-900)] outline-none transition focus:border-[var(--brand-600)] focus:ring-0"
            >
              {TYPE_SUGGESTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5 text-sm">
            <span className="font-medium text-slate-700">Priority</span>
            <select
              value={state.priority}
              onChange={(event) =>
                setState((prev) => ({ ...prev, priority: event.target.value }))
              }
              required
              className="h-10 w-full rounded-[var(--radius)] border border-[var(--neutral-200)] bg-white px-4 text-[0.9375rem] text-[var(--neutral-900)] outline-none transition focus:border-[var(--brand-600)] focus:ring-0"
            >
              {PRIORITY_SUGGESTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="space-y-1.5 text-sm">
          <span className="font-medium text-slate-700">Subject</span>
          <input
            value={state.subject}
            onChange={(event) => setState((prev) => ({ ...prev, subject: event.target.value }))}
            className="h-10 w-full rounded-[var(--radius)] border border-[var(--neutral-200)] bg-white px-4 text-[0.9375rem] text-[var(--neutral-900)] outline-none transition focus:border-[var(--brand-600)] focus:ring-0"
            minLength={3}
            required
          />
        </label>

        <label className="space-y-1.5 text-sm">
          <span className="font-medium text-slate-700">Message</span>
          <textarea
            value={state.message}
            onChange={(event) => setState((prev) => ({ ...prev, message: event.target.value }))}
            className="min-h-[100px] w-full rounded-[var(--radius)] border border-[var(--neutral-200)] bg-white px-4 py-3 text-[0.9375rem] text-[var(--neutral-900)] outline-none transition resize-y focus:border-[var(--brand-600)] focus:ring-0"
            minLength={3}
            required
          />
          <span className="text-xs text-slate-500">Minimum 3 characters.</span>
        </label>

        <div className="grid gap-4 sm:grid-cols-1">
          <label className="space-y-1.5 text-sm">
            <span className="font-medium text-slate-700">Contact email</span>
          <input
            type="email"
            value={state.contactEmail}
            onChange={(event) => setState((prev) => ({ ...prev, contactEmail: event.target.value }))}
            className="h-10 w-full rounded-[var(--radius)] border border-[var(--neutral-200)] bg-white px-4 text-[0.9375rem] text-[var(--neutral-900)] outline-none transition focus:border-[var(--brand-600)] focus:ring-0"
            placeholder="you@company.com"
          />
          </label>
        </div>

        <label className="space-y-1.5 text-sm">
          <span className="font-medium text-slate-700">Attachment (optional)</span>
          <input
            type="file"
            onChange={(event) => setState((prev) => ({ ...prev, file: event.target.files?.[0] ?? null }))}
            className="block w-full cursor-pointer rounded-[var(--radius)] border border-[var(--neutral-200)] bg-white px-4 py-2 text-[0.9375rem] text-[var(--neutral-900)] outline-none transition file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--neutral-100)] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[var(--neutral-700)] focus:border-[var(--brand-600)] focus:ring-0"
          />
        </label>

        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>
        ) : null}
        {createdRequestId ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Request created: #{createdRequestId.slice(0, 8)}
            {uploadWarning ? <div className="mt-1 text-amber-700">{uploadWarning}</div> : null}
          </div>
        ) : null}

        <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-2">
          <button
            type="button"
            onClick={() => router.push(`/b/${businessSlug}/support`)}
            className="inline-flex h-10 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
          >
            Back
          </button>
          <button
            type="submit"
            disabled={!canSubmit || loading}
            className="inline-flex h-10 items-center rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {loading ? "Creating..." : "Create request"}
          </button>
        </div>
      </form>
    </section>
  );
}

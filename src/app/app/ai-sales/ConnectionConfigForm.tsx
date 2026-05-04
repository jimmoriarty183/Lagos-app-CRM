"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Props = {
  connectionId: string;
  initialSheetId: string;
  initialSheetGid: string;
  initialSystemPrompt: string;
  initialShopName: string;
  initialShopAbout: string;
  initialShopAddress: string;
  initialShopContact: string;
  initialEnabled: boolean;
  basePromptPlaceholder: string;
};

export default function ConnectionConfigForm({
  connectionId,
  initialSheetId,
  initialSheetGid,
  initialSystemPrompt,
  initialShopName,
  initialShopAbout,
  initialShopAddress,
  initialShopContact,
  initialEnabled,
  basePromptPlaceholder,
}: Props) {
  const router = useRouter();
  const [sheetId, setSheetId] = useState(initialSheetId);
  const [sheetGid, setSheetGid] = useState(initialSheetGid || "0");
  const [systemPrompt, setSystemPrompt] = useState(initialSystemPrompt);
  const [shopName, setShopName] = useState(initialShopName);
  const [shopAbout, setShopAbout] = useState(initialShopAbout);
  const [shopAddress, setShopAddress] = useState(initialShopAddress);
  const [shopContact, setShopContact] = useState(initialShopContact);
  const [enabled, setEnabled] = useState(initialEnabled);
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<
    { type: "success" | "error"; message: string } | null
  >(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const res = await fetch(
      `/api/instagram/connections/${encodeURIComponent(connectionId)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          catalog_sheet_id: sheetId.trim() || null,
          catalog_sheet_gid: sheetGid.trim() || "0",
          system_prompt: systemPrompt.trim() || null,
          shop_name: shopName.trim() || null,
          shop_about: shopAbout.trim() || null,
          shop_address: shopAddress.trim() || null,
          shop_contact: shopContact.trim() || null,
          enabled,
        }),
      },
    );

    const json = (await res.json().catch(() => ({}))) as {
      error?: string;
    };

    if (!res.ok) {
      setFeedback({
        type: "error",
        message: json.error ?? `Request failed (${res.status})`,
      });
      return;
    }

    setFeedback({ type: "success", message: "Saved." });
    startTransition(() => {
      router.refresh();
    });
  };

  const onDisconnect = async () => {
    if (
      !confirm(
        "Disconnect this Instagram account? The bot will stop replying to DMs until you reconnect.",
      )
    ) {
      return;
    }
    setFeedback(null);
    const res = await fetch(
      `/api/instagram/connections/${encodeURIComponent(connectionId)}`,
      { method: "DELETE" },
    );
    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      setFeedback({
        type: "error",
        message: json.error ?? `Disconnect failed (${res.status})`,
      });
      return;
    }
    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-8">
      {/* ─── Shop info ──────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--neutral-700)] dark:text-white/80">
          Shop info
        </h2>
        <p className="text-xs text-[var(--neutral-500)] dark:text-white/50">
          The AI uses these to answer questions like &quot;где вы
          находитесь?&quot; or &quot;как с вами связаться?&quot;. All fields
          optional.
        </p>

        <div>
          <label
            htmlFor="shop-name"
            className="block text-sm font-medium text-[var(--neutral-800)] dark:text-white/90"
          >
            Shop name
          </label>
          <input
            id="shop-name"
            type="text"
            value={shopName}
            onChange={(e) => setShopName(e.target.value)}
            placeholder="e.g. Ordo Audio"
            maxLength={500}
            className="mt-2 w-full rounded-lg border border-[var(--neutral-300)] bg-white px-3 py-2 text-sm text-[var(--neutral-900)] focus:border-[var(--brand-600)] focus:outline-none dark:border-white/15 dark:bg-white/5 dark:text-white"
          />
        </div>

        <div>
          <label
            htmlFor="shop-about"
            className="block text-sm font-medium text-[var(--neutral-800)] dark:text-white/90"
          >
            About / positioning
          </label>
          <p className="mt-1 text-xs text-[var(--neutral-500)] dark:text-white/50">
            What you sell, brand vibe, working hours, delivery, return
            policy — anything the AI should know.
          </p>
          <textarea
            id="shop-about"
            value={shopAbout}
            onChange={(e) => setShopAbout(e.target.value)}
            placeholder="e.g. We sell premium audio gear in Kyiv since 2019. Free delivery within Ukraine on orders over 2000 UAH. Returns within 14 days."
            rows={4}
            maxLength={2000}
            className="mt-2 w-full rounded-lg border border-[var(--neutral-300)] bg-white px-3 py-2 text-sm text-[var(--neutral-900)] focus:border-[var(--brand-600)] focus:outline-none dark:border-white/15 dark:bg-white/5 dark:text-white"
          />
          <p className="mt-1 text-right text-[10px] text-[var(--neutral-400)]">
            {shopAbout.length} / 2000
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="shop-address"
              className="block text-sm font-medium text-[var(--neutral-800)] dark:text-white/90"
            >
              Address
            </label>
            <input
              id="shop-address"
              type="text"
              value={shopAddress}
              onChange={(e) => setShopAddress(e.target.value)}
              placeholder="e.g. Kyiv, Khreshchatyk 22, online only"
              maxLength={500}
              className="mt-2 w-full rounded-lg border border-[var(--neutral-300)] bg-white px-3 py-2 text-sm text-[var(--neutral-900)] focus:border-[var(--brand-600)] focus:outline-none dark:border-white/15 dark:bg-white/5 dark:text-white"
            />
          </div>
          <div>
            <label
              htmlFor="shop-contact"
              className="block text-sm font-medium text-[var(--neutral-800)] dark:text-white/90"
            >
              Contact (phone / email / website)
            </label>
            <input
              id="shop-contact"
              type="text"
              value={shopContact}
              onChange={(e) => setShopContact(e.target.value)}
              placeholder="e.g. +380 67 000 00 00, hello@shop.uno"
              maxLength={500}
              className="mt-2 w-full rounded-lg border border-[var(--neutral-300)] bg-white px-3 py-2 text-sm text-[var(--neutral-900)] focus:border-[var(--brand-600)] focus:outline-none dark:border-white/15 dark:bg-white/5 dark:text-white"
            />
          </div>
        </div>
      </section>

      {/* ─── Catalog Sheet ──────────────────────────────────── */}
      <section className="space-y-4 border-t border-[var(--neutral-200)] pt-6 dark:border-white/10">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--neutral-700)] dark:text-white/80">
          Product catalog
        </h2>

        <div>
          <label
            htmlFor="sheet-id"
            className="block text-sm font-medium text-[var(--neutral-800)] dark:text-white/90"
          >
            Google Sheet ID
          </label>
          <p className="mt-1 text-xs text-[var(--neutral-500)] dark:text-white/50">
            Share the Sheet so anyone with the link can view, then paste only
            the long ID from the URL between <code>/d/</code> and{" "}
            <code>/edit</code>.
          </p>
          <input
            id="sheet-id"
            type="text"
            value={sheetId}
            onChange={(e) => setSheetId(e.target.value)}
            placeholder="1AbC...xyz"
            className="mt-2 w-full rounded-lg border border-[var(--neutral-300)] bg-white px-3 py-2 text-sm text-[var(--neutral-900)] focus:border-[var(--brand-600)] focus:outline-none dark:border-white/15 dark:bg-white/5 dark:text-white"
          />
        </div>

        <div>
          <label
            htmlFor="sheet-gid"
            className="block text-sm font-medium text-[var(--neutral-800)] dark:text-white/90"
          >
            Sheet tab GID
          </label>
          <p className="mt-1 text-xs text-[var(--neutral-500)] dark:text-white/50">
            Defaults to <code>0</code> (the first tab). Find a different
            tab&apos;s GID at the end of the URL (<code>#gid=…</code>).
          </p>
          <input
            id="sheet-gid"
            type="text"
            value={sheetGid}
            onChange={(e) => setSheetGid(e.target.value)}
            placeholder="0"
            className="mt-2 w-32 rounded-lg border border-[var(--neutral-300)] bg-white px-3 py-2 text-sm text-[var(--neutral-900)] focus:border-[var(--brand-600)] focus:outline-none dark:border-white/15 dark:bg-white/5 dark:text-white"
          />
        </div>
      </section>

      {/* ─── Custom system prompt ──────────────────────────── */}
      <section className="space-y-4 border-t border-[var(--neutral-200)] pt-6 dark:border-white/10">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--neutral-700)] dark:text-white/80">
              Custom system prompt (optional)
            </h2>
            <p className="mt-1 text-xs text-[var(--neutral-500)] dark:text-white/50">
              Leave empty to use Ordo&apos;s default sales-bot prompt.
              Override if you want a specific tone, language, or rules — your
              prompt fully replaces the default.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSystemPrompt(basePromptPlaceholder)}
            className="shrink-0 rounded-lg border border-[var(--neutral-300)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--neutral-700)] hover:bg-[var(--neutral-50)] dark:border-white/15 dark:bg-transparent dark:text-white/80 dark:hover:bg-white/5"
          >
            Use default
          </button>
        </div>

        <div>
          <textarea
            id="system-prompt"
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder={basePromptPlaceholder}
            rows={8}
            maxLength={4000}
            className="w-full rounded-lg border border-[var(--neutral-300)] bg-white px-3 py-2 font-mono text-xs leading-relaxed text-[var(--neutral-900)] focus:border-[var(--brand-600)] focus:outline-none dark:border-white/15 dark:bg-white/5 dark:text-white"
          />
          <p className="mt-1 text-right text-[10px] text-[var(--neutral-400)]">
            {systemPrompt.length} / 4000
          </p>
        </div>
      </section>

      {/* ─── Toggles + actions ─────────────────────────────── */}
      <section className="space-y-4 border-t border-[var(--neutral-200)] pt-6 dark:border-white/10">
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="h-4 w-4 rounded border-[var(--neutral-300)]"
          />
          <span className="text-sm text-[var(--neutral-800)] dark:text-white/90">
            Bot enabled (uncheck to pause replies without disconnecting)
          </span>
        </label>

        {feedback && (
          <div
            className={`rounded-lg px-3 py-2 text-sm ${
              feedback.type === "success"
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                : "bg-rose-500/10 text-rose-700 dark:text-rose-300"
            }`}
          >
            {feedback.message}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--brand-600)] px-5 text-sm font-medium text-white hover:bg-[var(--brand-700)] disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save changes"}
          </button>
          <button
            type="button"
            onClick={onDisconnect}
            disabled={pending}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-rose-500/40 bg-transparent px-4 text-sm font-medium text-rose-600 hover:bg-rose-500/10 disabled:opacity-60 dark:text-rose-400"
          >
            Disconnect Instagram
          </button>
        </div>
      </section>
    </form>
  );
}

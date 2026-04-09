"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { CalendarDays, ChevronLeft, Mail, Phone, UserCircle2 } from "lucide-react";

type Props = {
  initial: {
    displayName: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string;
    birthDate: string;
    bio: string;
    avatarUrl: string;
  };
  workspace: {
    name: string;
    slug: string;
  };
};

export default function ProfileEditor({ initial, workspace }: Props) {
  const [firstName, setFirstName] = useState(initial.firstName);
  const [lastName, setLastName] = useState(initial.lastName);
  const [phone, setPhone] = useState(initial.phone);
  const [birthDate, setBirthDate] = useState(initial.birthDate);
  const [bio, setBio] = useState(initial.bio);
  const [avatarUrl, setAvatarUrl] = useState(initial.avatarUrl);
  const [displayName, setDisplayName] = useState(initial.displayName);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  async function handleSave() {
    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          phone,
          birthDate,
          bio,
        }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json?.ok) {
        setMessage({ type: "error", text: String(json?.error ?? "Failed to save profile") });
        return;
      }

      const nextDisplay = String(
        json?.profile?.full_name ||
          [json?.profile?.first_name, json?.profile?.last_name].filter(Boolean).join(" ").trim() ||
          json?.profile?.email ||
          "User",
      );
      setDisplayName(nextDisplay);
      setMessage({ type: "ok", text: "Profile saved." });
    } catch (error) {
      const text = error instanceof Error ? error.message : "Failed to save profile";
      setMessage({ type: "error", text });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUpload(file: File) {
    setIsUploading(true);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const response = await fetch("/api/profile/avatar", { method: "POST", body: formData });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json?.ok) {
        setMessage({ type: "error", text: String(json?.error ?? "Failed to upload image") });
        return;
      }
      const nextAvatar = String(json.avatarUrl ?? "").trim();
      if (nextAvatar) setAvatarUrl(nextAvatar);
      setMessage({ type: "ok", text: "Photo updated." });
    } catch (error) {
      const text = error instanceof Error ? error.message : "Failed to upload image";
      setMessage({ type: "error", text });
    } finally {
      setIsUploading(false);
    }
  }

  const fallbackInitial = displayName?.trim()?.[0]?.toUpperCase() || "U";

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#F8FAFC_0%,#EEF2FF_100%)] text-[#111827]">
      <div className="mx-auto max-w-[980px] px-4 pb-10 pt-10 sm:px-6">
        <div className="rounded-[28px] border border-[#E5E7EB] bg-white/92 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
          <Link
            href="/app/settings"
            className="inline-flex items-center gap-2 rounded-full border border-[#E5E7EB] bg-white px-3 py-2 text-[12px] font-semibold text-[#374151] shadow-sm transition hover:border-[#D6DAE1] hover:bg-[#FCFCFD]"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to settings
          </Link>

          <div className="mt-6 flex flex-wrap items-start gap-4">
            <div className="relative">
              {avatarUrl ? (
                <button
                  type="button"
                  onClick={() => setIsPreviewOpen(true)}
                  className="group relative block overflow-hidden rounded-2xl border border-[#E5E7EB] focus:outline-none focus:ring-2 focus:ring-[#A4BCFD]"
                  title="View photo"
                >
                  <img
                    src={avatarUrl}
                    alt="Profile photo"
                    className="h-16 w-16 object-cover transition group-hover:brightness-90"
                  />
                  <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/20">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white opacity-0 drop-shadow transition group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-4.553M15 10H9m6 0V4M9 14l-4.553 4.553M9 14H3m6 0v6" /></svg>
                  </span>
                </button>
              ) : (
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-[#111827] text-lg font-semibold text-white">
                  {fallbackInitial}
                </div>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0];
                  if (file) void handleUpload(file);
                  event.currentTarget.value = "";
                }}
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9CA3AF]">
                Account profile
              </div>
              <h1 className="mt-2 text-[30px] font-semibold tracking-[-0.03em] text-[#111827]">
                {displayName}
              </h1>
              <p className="mt-2 text-sm leading-6 text-[#6B7280]">
                Manage personal identity data for owner/manager analytics and team operations.
              </p>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={isUploading}
                className="mt-3 inline-flex items-center rounded-full border border-[#D0D5DD] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#344054] transition hover:border-[#98A2B3] hover:bg-[#F9FAFB] disabled:opacity-60"
              >
                {isUploading ? "Uploading..." : "Upload photo"}
              </button>
            </div>

            {/* Large avatar preview — top-right of header */}
            {avatarUrl && (
              <button
                type="button"
                onClick={() => setIsPreviewOpen(true)}
                className="group relative ml-auto hidden overflow-hidden rounded-3xl border border-[#E5E7EB] shadow-md focus:outline-none focus:ring-2 focus:ring-[#A4BCFD] sm:block"
                title="View photo"
              >
                <img
                  src={avatarUrl}
                  alt="Profile photo large"
                  className="h-[110px] w-[110px] object-cover transition group-hover:brightness-90"
                />
                <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/25">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-white opacity-0 drop-shadow-lg transition group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><circle cx="11" cy="11" r="8"/><path strokeLinecap="round" d="M21 21l-4.35-4.35"/><path strokeLinecap="round" strokeLinejoin="round" d="M11 8v6M8 11h6"/></svg>
                </span>
              </button>
            )}
          </div>

          {/* Lightbox */}
          {isPreviewOpen && avatarUrl && (
            <div
              role="dialog"
              aria-modal="true"
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
              onClick={() => setIsPreviewOpen(false)}
            >
              <div
                className="relative max-h-[90vh] max-w-[90vw] overflow-hidden rounded-2xl shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <img
                  src={avatarUrl}
                  alt="Profile photo preview"
                  className="max-h-[80vh] max-w-[80vw] object-contain"
                />
                <button
                  type="button"
                  onClick={() => setIsPreviewOpen(false)}
                  className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
                  aria-label="Close preview"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
            </div>
          )}

          {message ? (
            <div
              className={[
                "mt-4 rounded-xl border px-3 py-2 text-sm",
                message.type === "ok"
                  ? "border-[#ABEFC6] bg-[#ECFDF3] text-[#067647]"
                  : "border-[#FECDCA] bg-[#FEF3F2] text-[#B42318]",
              ].join(" ")}
            >
              {message.text}
            </div>
          ) : null}

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="rounded-[22px] border border-[#E5E7EB] bg-white p-5">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9CA3AF]">
                First name
              </div>
              <input
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                className="mt-2 w-full rounded-lg border border-[#D0D5DD] px-3 py-2 text-sm text-[#111827] outline-none focus:border-[#A4BCFD] focus:ring-2 focus:ring-[#EEF4FF]"
                placeholder="First name"
              />
            </label>

            <label className="rounded-[22px] border border-[#E5E7EB] bg-white p-5">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9CA3AF]">
                Last name
              </div>
              <input
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                className="mt-2 w-full rounded-lg border border-[#D0D5DD] px-3 py-2 text-sm text-[#111827] outline-none focus:border-[#A4BCFD] focus:ring-2 focus:ring-[#EEF4FF]"
                placeholder="Last name"
              />
            </label>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-[22px] border border-[#E5E7EB] bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F3F4F6] text-[#4B5563]">
                <Mail className="h-5 w-5" />
              </div>
              <div className="mt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9CA3AF]">
                Email
              </div>
              <div className="mt-2 text-sm font-semibold text-[#111827]">
                {initial.email || "Not provided"}
              </div>
            </div>

            <label className="rounded-[22px] border border-[#E5E7EB] bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F3F4F6] text-[#4B5563]">
                <Phone className="h-5 w-5" />
              </div>
              <div className="mt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9CA3AF]">
                Phone
              </div>
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className="mt-2 w-full rounded-lg border border-[#D0D5DD] px-3 py-2 text-sm text-[#111827] outline-none focus:border-[#A4BCFD] focus:ring-2 focus:ring-[#EEF4FF]"
                placeholder="Phone number"
              />
            </label>

            <label className="rounded-[22px] border border-[#E5E7EB] bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F3F4F6] text-[#4B5563]">
                <CalendarDays className="h-5 w-5" />
              </div>
              <div className="mt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9CA3AF]">
                Date of birth
              </div>
              <input
                type="date"
                value={birthDate}
                onChange={(event) => setBirthDate(event.target.value)}
                className="mt-2 w-full rounded-lg border border-[#D0D5DD] px-3 py-2 text-sm text-[#111827] outline-none focus:border-[#A4BCFD] focus:ring-2 focus:ring-[#EEF4FF]"
              />
            </label>
          </div>

          <label className="mt-6 block rounded-[22px] border border-[#E5E7EB] bg-white p-5">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F3F4F6] text-[#4B5563]">
              <UserCircle2 className="h-5 w-5" />
            </div>
            <div className="mt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9CA3AF]">
              About
            </div>
            <textarea
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              rows={4}
              className="mt-2 w-full resize-y rounded-lg border border-[#D0D5DD] px-3 py-2 text-sm text-[#111827] outline-none focus:border-[#A4BCFD] focus:ring-2 focus:ring-[#EEF4FF]"
              placeholder="Short note about manager/owner"
            />
          </label>

          <div className="mt-6 flex items-center justify-between gap-3">
            <div className="text-xs text-[#6B7280]">
              Your profile is used in manager analytics, assignments, and owner dashboards.
            </div>
            <button
              type="button"
              disabled={isSaving}
              onClick={() => void handleSave()}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-[#111827] bg-[#111827] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1F2937] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Save profile"}
            </button>
          </div>

          <div className="mt-6 rounded-[22px] border border-[#E5E7EB] bg-[#F9FAFB] p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9CA3AF]">
              Current workspace
            </div>
            <div className="mt-2 text-sm font-semibold text-[#111827]">
              {workspace.name}
            </div>
            <div className="mt-1 text-sm text-[#6B7280]">
              Workspace-level controls stay in workspace settings.
            </div>
            <Link
              href={`/b/${workspace.slug}/settings`}
              className="mt-4 inline-flex items-center rounded-full border border-[#E5E7EB] bg-white px-3 py-2 text-[12px] font-semibold text-[#374151] shadow-sm transition hover:border-[#D6DAE1] hover:bg-[#FCFCFD]"
            >
              Open workspace settings
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

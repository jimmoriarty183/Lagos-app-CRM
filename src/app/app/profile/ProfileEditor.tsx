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
    id: string;
    name: string;
    slug: string;
  };
  identities: {
    userId: string;
    businessId: string;
  };
};

export default function ProfileEditor({ initial, workspace, identities }: Props) {
  const [firstName, setFirstName] = useState(initial.firstName);
  const [lastName, setLastName] = useState(initial.lastName);
  const [phone, setPhone] = useState(initial.phone);
  const [birthDate, setBirthDate] = useState(initial.birthDate);
  const [bio, setBio] = useState(initial.bio);
  const [avatarUrl, setAvatarUrl] = useState(initial.avatarUrl);
  const [displayName, setDisplayName] = useState(initial.displayName);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
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

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#F8FAFC_0%,#EEF2FF_100%)] text-[#111827]">
      <div className="mx-auto max-w-[980px] px-4 pb-10 pt-10 sm:px-6">
        <div className="rounded-[20px] border border-[#E5E7EB] bg-white/92 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
          <Link
            href="/app/settings"
            className="inline-flex items-center gap-2 rounded-full border border-[#E5E7EB] bg-white px-3 py-2 text-[12px] font-semibold text-[#374151] shadow-sm transition hover:border-[#D6DAE1] hover:bg-[#FCFCFD]"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to settings
          </Link>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9CA3AF]">
                Account profile
              </div>
              <h1 className="mt-1 text-[22px] font-semibold tracking-[-0.03em] text-[#111827]">
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

            {/* Large avatar preview — top-right of header */}
            {avatarUrl && (
              <div className="hidden self-center overflow-hidden rounded-3xl border border-[#E5E7EB] shadow-md sm:block">
                <img
                  src={avatarUrl}
                  alt="Profile photo large"
                  className="h-[110px] w-[110px] object-cover"
                />
              </div>
            )}
          </div>

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

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="rounded-[16px] border border-[#E5E7EB] bg-white p-3">
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

            <label className="rounded-[16px] border border-[#E5E7EB] bg-white p-3">
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

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[16px] border border-[#E5E7EB] bg-white p-3 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F3F4F6] text-[#4B5563]">
                <Mail className="h-5 w-5" />
              </div>
              <div className="mt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9CA3AF]">
                Email
              </div>
              <div className="mt-2 text-sm font-semibold text-[#111827]">
                {initial.email || "Not provided"}
              </div>
            </div>

            <label className="rounded-[16px] border border-[#E5E7EB] bg-white p-3 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F3F4F6] text-[#4B5563]">
                <Phone className="h-5 w-5" />
              </div>
              <div className="mt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9CA3AF]">
                Phone
              </div>
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className="mt-2 w-full rounded-lg border border-[#D0D5DD] px-3 py-2 text-sm text-[#111827] outline-none focus:border-[#A4BCFD] focus:ring-2 focus:ring-[#EEF4FF]"
                placeholder="Phone number"
              />
            </label>

            <label className="rounded-[16px] border border-[#E5E7EB] bg-white p-3 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F3F4F6] text-[#4B5563]">
                <CalendarDays className="h-5 w-5" />
              </div>
              <div className="mt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9CA3AF]">
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

          <label className="mt-4 block rounded-[16px] border border-[#E5E7EB] bg-white p-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F3F4F6] text-[#4B5563]">
              <UserCircle2 className="h-5 w-5" />
            </div>
            <div className="mt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9CA3AF]">
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

          <div className="mt-4 flex items-center justify-between gap-3">
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

          <div className="mt-4 rounded-[16px] border border-[#E5E7EB] bg-[#F9FAFB] p-3">
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
              className="mt-3 inline-flex items-center rounded-full border border-[#E5E7EB] bg-white px-3 py-2 text-[12px] font-semibold text-[#374151] shadow-sm transition hover:border-[#D6DAE1] hover:bg-[#FCFCFD]"
            >
              Open workspace settings
            </Link>
          </div>

          <div className="mt-3 rounded-[16px] border border-[#E5E7EB] bg-[#F9FAFB] p-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9CA3AF]">
              Account identifiers
            </div>
            <div className="mt-2 text-sm text-[#6B7280]">business_id</div>
            <div className="mt-1 break-all rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 font-mono text-xs text-[#111827]">
              {identities.businessId}
            </div>
            <div className="mt-3 text-sm text-[#6B7280]">user_id</div>
            <div className="mt-1 break-all rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 font-mono text-xs text-[#111827]">
              {identities.userId}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

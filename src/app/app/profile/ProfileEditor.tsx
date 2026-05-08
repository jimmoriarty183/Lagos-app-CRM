"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { CalendarDays, ChevronLeft, Mail, Phone, UserCircle2 } from "lucide-react";
import { StyledDateInput } from "@/components/ui/styled-date-input";

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
    <main className="min-h-screen text-[var(--text-primary)]">
      <div className="mx-auto max-w-[980px] px-4 pb-10 pt-10 sm:px-6">
        <div className="rounded-[20px] border border-[var(--border-default)] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow-md)] backdrop-blur">
          <Link
            href="/app/settings"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 py-2 text-[12px] font-semibold text-[var(--text-secondary)] shadow-sm transition hover:border-[var(--border-strong)] hover:bg-[var(--bg-elevated-strong)]"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to settings
          </Link>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                Account profile
              </div>
              <h1 className="mt-1 text-[22px] font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
                {displayName}
              </h1>
              <p className="mt-2 text-sm leading-6 text-[var(--text-tertiary)]">
                Manage personal identity data for owner/manager analytics and team operations.
              </p>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={isUploading}
                className="mt-3 inline-flex items-center rounded-full border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 py-1.5 text-[12px] font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:bg-[var(--bg-elevated-strong)] disabled:opacity-60"
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
              <div className="hidden self-center overflow-hidden rounded-3xl border border-[var(--border-default)] shadow-md sm:block">
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
                  ? "border-[color:var(--success-500)]/40 bg-[color:var(--success-500)]/10 text-[var(--success-500)]"
                  : "border-[color:var(--error-500)]/40 bg-[color:var(--error-500)]/10 text-[var(--error-500)]",
              ].join(" ")}
            >
              {message.text}
            </div>
          ) : null}

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="rounded-[16px] border border-[var(--border-default)] bg-[var(--bg-elevated)] p-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                First name
              </div>
              <input
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                className="mt-2 w-full rounded-lg px-3 py-2 text-sm outline-none"
                placeholder="First name"
              />
            </label>

            <label className="rounded-[16px] border border-[var(--border-default)] bg-[var(--bg-elevated)] p-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                Last name
              </div>
              <input
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                className="mt-2 w-full rounded-lg px-3 py-2 text-sm outline-none"
                placeholder="Last name"
              />
            </label>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[16px] border border-[var(--border-default)] bg-[var(--bg-elevated)] p-3 shadow-[var(--shadow)]">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--bg-elevated-strong)] text-[var(--text-tertiary)]">
                <Mail className="h-5 w-5" />
              </div>
              <div className="mt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                Email
              </div>
              <div className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
                {initial.email || "Not provided"}
              </div>
            </div>

            <label className="rounded-[16px] border border-[var(--border-default)] bg-[var(--bg-elevated)] p-3 shadow-[var(--shadow)]">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--bg-elevated-strong)] text-[var(--text-tertiary)]">
                <Phone className="h-5 w-5" />
              </div>
              <div className="mt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                Phone
              </div>
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className="mt-2 w-full rounded-lg px-3 py-2 text-sm outline-none"
                placeholder="Phone number"
              />
            </label>

            <label className="rounded-[16px] border border-[var(--border-default)] bg-[var(--bg-elevated)] p-3 shadow-[var(--shadow)]">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--bg-elevated-strong)] text-[var(--text-tertiary)]">
                <CalendarDays className="h-5 w-5" />
              </div>
              <div className="mt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                Date of birth
              </div>
              <StyledDateInput
                value={birthDate}
                onChange={setBirthDate}
                placeholder="Pick date"
                ariaLabel="Date of birth"
                className="mt-2 w-full"
              />
            </label>
          </div>

          <label className="mt-4 block rounded-[16px] border border-[var(--border-default)] bg-[var(--bg-elevated)] p-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--bg-elevated-strong)] text-[var(--text-tertiary)]">
              <UserCircle2 className="h-5 w-5" />
            </div>
            <div className="mt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
              About
            </div>
            <textarea
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              rows={4}
              className="mt-2 w-full resize-y rounded-lg px-3 py-2 text-sm outline-none"
              placeholder="Short note about manager/owner"
            />
          </label>

          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="text-xs text-[var(--text-tertiary)]">
              Your profile is used in manager analytics, assignments, and owner dashboards.
            </div>
            <button
              type="button"
              disabled={isSaving}
              onClick={() => void handleSave()}
              className="inline-flex h-10 items-center justify-center rounded-xl bg-[var(--brand-600)] px-4 text-sm font-semibold text-[var(--text-on-brand)] shadow-[0_4px_12px_rgba(91,91,179,0.25)] transition hover:bg-[var(--brand-700)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Save profile"}
            </button>
          </div>

          <div className="mt-4 rounded-[16px] border border-[var(--border-default)] bg-[var(--bg-elevated-strong)] p-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
              Current workspace
            </div>
            <div className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
              {workspace.name}
            </div>
            <div className="mt-1 text-sm text-[var(--text-tertiary)]">
              Workspace-level controls stay in workspace settings.
            </div>
            <Link
              href={`/b/${workspace.slug}/settings`}
              className="mt-3 inline-flex items-center rounded-full border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 py-2 text-[12px] font-semibold text-[var(--text-secondary)] shadow-sm transition hover:border-[var(--border-strong)] hover:bg-[var(--bg-elevated-strong)]"
            >
              Open workspace settings
            </Link>
          </div>

          <div className="mt-3 rounded-[16px] border border-[var(--border-default)] bg-[var(--bg-elevated-strong)] p-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
              Account identifiers
            </div>
            <div className="mt-2 text-sm text-[var(--text-tertiary)]">business_id</div>
            <div className="mt-1 break-all rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 py-2 font-mono text-xs text-[var(--text-primary)]">
              {identities.businessId}
            </div>
            <div className="mt-3 text-sm text-[var(--text-tertiary)]">user_id</div>
            <div className="mt-1 break-all rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 py-2 font-mono text-xs text-[var(--text-primary)]">
              {identities.userId}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

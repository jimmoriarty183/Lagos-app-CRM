import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, Mail, Phone, UserCircle2 } from "lucide-react";

import { resolveCurrentWorkspace } from "@/lib/platform/workspace";
import { supabaseServerReadOnly } from "@/lib/supabase/server";

type ProfileRow = {
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
};

function pickDisplayName(profile: ProfileRow | null, fallback: string) {
  const fullName = String(profile?.full_name ?? "").trim();
  if (fullName) return fullName;

  const firstName = String(profile?.first_name ?? "").trim();
  const lastName = String(profile?.last_name ?? "").trim();
  const next = `${firstName} ${lastName}`.trim();
  return next || fallback;
}

export default async function ProfilePage() {
  const [{ user, workspace }, supabase] = await Promise.all([
    resolveCurrentWorkspace(),
    supabaseServerReadOnly(),
  ]);

  if (!user) {
    redirect("/login?next=%2Fapp%2Fprofile");
  }

  if (!workspace) {
    redirect("/select-business");
  }

  const { data: profileRaw } = await supabase
    .from("profiles")
    .select("full_name, first_name, last_name, email")
    .eq("id", user.id)
    .maybeSingle();

  const profile = (profileRaw ?? null) as ProfileRow | null;
  const displayName = pickDisplayName(profile, user.email || user.phone || "User");
  const email = String(profile?.email ?? user.email ?? "").trim();
  const phone = String(user.phone ?? "").trim();

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#F8FAFC_0%,#EEF2FF_100%)] text-[#111827]">
      <div className="mx-auto max-w-[920px] px-4 pb-10 pt-10 sm:px-6">
        <div className="rounded-[28px] border border-[#E5E7EB] bg-white/92 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
          <Link
            href="/app/settings"
            className="inline-flex items-center gap-2 rounded-full border border-[#E5E7EB] bg-white px-3 py-2 text-[12px] font-semibold text-[#374151] shadow-sm transition hover:border-[#D6DAE1] hover:bg-[#FCFCFD]"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to settings
          </Link>

          <div className="mt-6 flex items-start gap-4">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#111827] text-white">
              <UserCircle2 className="h-7 w-7" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9CA3AF]">
                Account profile
              </div>
              <h1 className="mt-2 text-[30px] font-semibold tracking-[-0.03em] text-[#111827]">
                {displayName}
              </h1>
              <p className="mt-2 text-sm leading-6 text-[#6B7280]">
                This area is reserved for user-level identity and contact information.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-[22px] border border-[#E5E7EB] bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F3F4F6] text-[#4B5563]">
                <Mail className="h-5 w-5" />
              </div>
              <div className="mt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9CA3AF]">
                Email
              </div>
              <div className="mt-2 text-sm font-semibold text-[#111827]">
                {email || "Not provided"}
              </div>
            </div>

            <div className="rounded-[22px] border border-[#E5E7EB] bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F3F4F6] text-[#4B5563]">
                <Phone className="h-5 w-5" />
              </div>
              <div className="mt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9CA3AF]">
                Phone
              </div>
              <div className="mt-2 text-sm font-semibold text-[#111827]">
                {phone || "Not provided"}
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-[22px] border border-[#E5E7EB] bg-[#F9FAFB] p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9CA3AF]">
              Current workspace
            </div>
            <div className="mt-2 text-sm font-semibold text-[#111827]">
              {workspace.name || workspace.slug}
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

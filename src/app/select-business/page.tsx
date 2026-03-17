import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import { supabaseServerReadOnly } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Select Business | Ordero",
  description: "Choose a business workspace.",
  robots: {
    index: false,
    follow: false,
  },
};

type MembershipRow = {
  business_id: string;
  created_at: string | null;
  role: string | null;
};

type BusinessRow = {
  id: string;
  slug: string | null;
  name: string | null;
};

function normalizeRole(role: string | null) {
  const value = String(role ?? "").toUpperCase();
  if (value === "OWNER") return "Owner";
  if (value === "MANAGER") return "Manager";
  return "Member";
}

export default async function SelectBusinessPage() {
  const supabase = await supabaseServerReadOnly();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user) redirect("/login");

  const { data: membershipRows, error: membershipError } = await supabase
    .from("memberships")
    .select("business_id, role, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (membershipError) throw membershipError;

  const memberships = (membershipRows ?? []) as MembershipRow[];
  if (memberships.length === 0) redirect("/login?no_business=1");

  const businessIds = memberships.map((membership) => membership.business_id);
  const { data: businessRows, error: businessError } = await supabase
    .from("businesses")
    .select("id, slug, name")
    .in("id", businessIds);

  if (businessError) throw businessError;

  const businessMap = new Map(
    ((businessRows ?? []) as BusinessRow[]).map((business) => [business.id, business]),
  );

  const options = memberships
    .map((membership) => {
      const business = businessMap.get(membership.business_id);
      if (!business?.slug) return null;

      return {
        id: business.id,
        slug: business.slug,
        name: business.name?.trim() || business.slug,
        roleLabel: normalizeRole(membership.role),
      };
    })
    .filter((option): option is NonNullable<typeof option> => Boolean(option));

  if (options.length === 0) redirect("/login?no_business=1");
  if (options.length === 1) redirect(`/b/${options[0].slug}`);

  return (
    <main className="min-h-screen bg-[#f6f8fb] px-4 py-8 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_20px_60px_-42px_rgba(15,23,42,0.35)]">
          <div className="border-b border-slate-200 bg-[linear-gradient(135deg,rgba(219,234,254,0.78),rgba(236,253,245,0.72))] px-6 py-8 sm:px-8">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/70 bg-white/80 shadow-sm">
                <Logo size={24} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Workspace access
                </p>
                <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">
                  Select a business
                </h1>
              </div>
            </div>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
              Your account is connected to more than one business. Choose the workspace you want to open.
            </p>
          </div>

          <div className="space-y-3 px-6 py-6 sm:px-8 sm:py-8">
            {options.map((option) => (
              <Link
                key={option.id}
                href={`/b/${option.slug}`}
                className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 transition hover:border-slate-300 hover:bg-white"
              >
                <div className="min-w-0">
                  <div className="truncate text-base font-semibold text-slate-900">
                    {option.name}
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    /b/{option.slug}
                  </div>
                </div>
                <span className="shrink-0 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                  {option.roleLabel}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

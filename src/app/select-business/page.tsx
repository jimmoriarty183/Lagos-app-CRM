import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandIcon, BrandWordmark } from "@/components/Brand";
import { supabaseServerReadOnly } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Select Workspace | Ordo",
  description: "Choose an Ordo workspace.",
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
          <div className="border-b border-slate-200 bg-white px-6 py-8 sm:px-8">
            <div className="flex items-center gap-3">
              <BrandIcon size={24} />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Ordo access
                </p>
                <BrandWordmark variant="gradient" height={22} className="mt-1 h-[22px] w-auto" />
                <h1 className="mt-1 text-[1.85rem] font-semibold tracking-tight text-slate-900 sm:text-[2rem]">
                  Select a workspace
                </h1>
              </div>
            </div>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
              You have access to multiple workspaces. Choose where you want to continue working in Ordo.
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
                <span className="shrink-0 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-900">
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


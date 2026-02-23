import { redirect } from "next/navigation";
import { supabaseServerReadOnly } from "@/lib/supabase/server";
import BusinessPeoplePanel from "@/app/b/[slug]/_components/BusinessPeoplePanel";

type Role = "OWNER" | "MANAGER" | "GUEST";

export default async function TeamPage({
  params,
  searchParams,
}: {
  // Next 16: params/searchParams могут быть Promise
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const sp = searchParams ? await searchParams : undefined;

  const supabase = await supabaseServerReadOnly();

  // 0) user must be logged in
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const nextPath = `/b/${slug}/settings/team`;
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  // 1) load business by slug
  const { data: business, error: bizErr } = await supabase
    .from("businesses")
    .select("id,slug,owner_phone,manager_phone")
    .eq("slug", slug)
    .single();

  if (bizErr || !business) {
    redirect("/login?no_business=1");
  }

  // 2) role by memberships (НЕ по phone)
  const { data: mem, error: memErr } = await supabase
    .from("memberships")
    .select("role")
    .eq("business_id", business.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (memErr) {
    // если RLS/ошибка - безопасно отправим на логин
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  const role: Role =
    mem?.role === "owner"
      ? "OWNER"
      : mem?.role === "manager"
        ? "MANAGER"
        : "GUEST";

  // если гость — тоже на логин (или можешь показать read-only, но сейчас так)
  if (role === "GUEST") {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  // owner=manager legacy (если у тебя где-то так хранится)
  const isOwnerManager =
    !!business.owner_phone &&
    !!business.manager_phone &&
    String(business.owner_phone) === String(business.manager_phone);

  // 3) pending invites — ВАЖНО: у тебя таблица называется business_invites (судя по скрину)
  const { data: pendingInvites } = await supabase
    .from("business_invites")
    .select("id,business_id,email,role,status,created_at")
    .eq("business_id", business.id)
    .eq("status", "PENDING")
    .eq("role", "MANAGER")
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-3xl px-4 py-6">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-1 text-[11px] font-semibold tracking-wide text-gray-500">
            SETTINGS
          </div>

          <div className="text-xl font-semibold text-gray-900">
            Team & Access
          </div>

          <div className="mt-1 text-sm text-gray-500">
            Manage who can access{" "}
            <span className="font-semibold">{business.slug}</span>
          </div>

          <div className="mt-5">
            <BusinessPeoplePanel
              businessId={business.id}
              businessSlug={business.slug}
              ownerPhone={business.owner_phone}
              legacyManagerPhone={business.manager_phone}
              role={role}
              isOwnerManager={isOwnerManager}
              pendingInvites={(pendingInvites as any) ?? []}
              mode="manage"
            />
          </div>

          <div className="mt-5">
            <a
              href={`/b/${encodeURIComponent(business.slug)}`}
              className="text-sm font-semibold text-gray-900 hover:underline"
            >
              ← Back to orders
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

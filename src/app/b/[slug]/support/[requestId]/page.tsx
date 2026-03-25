import Link from "next/link";
import { notFound } from "next/navigation";
import type { BusinessOption } from "@/app/b/[slug]/_components/topbar/BusinessSwitcher";
import TopBar from "@/app/b/[slug]/_components/topbar/TopBar";
import DesktopLeftRail from "@/app/b/[slug]/_components/Desktop/DesktopLeftRail";
import { getAdminUsersPath, isAdminEmail } from "@/lib/admin-access";
import { getBusinessSupportContext } from "@/lib/support/business-context";
import { supabaseServerReadOnly } from "@/lib/supabase/server";
import {
  fetchBusinessSupportRequestById,
  fetchSupportAttachments,
  fetchSupportStatusHistory,
} from "@/lib/support/server";
import { SupportAttachmentsPanel } from "@/components/support/SupportAttachmentsPanel";
import { SupportRequestDetailsCard } from "@/components/support/SupportRequestDetailsCard";
import { SupportTimeline } from "@/components/support/SupportTimeline";

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

export default async function BusinessSupportRequestDetailsPage({
  params,
}: {
  params: Promise<{ slug: string; requestId: string }>;
}) {
  const { slug, requestId } = await params;
  const context = await getBusinessSupportContext(slug);
  const supabase = await supabaseServerReadOnly();

  const request = await fetchBusinessSupportRequestById(supabase, requestId);
  if (!request) notFound();
  if (request.businessId && request.businessId !== context.business.id) notFound();

  const [attachments, history] = await Promise.all([
    fetchSupportAttachments(supabase, requestId),
    fetchSupportStatusHistory(supabase, requestId),
  ]);

  const businessOptions: BusinessOption[] = context.businesses
    .filter((entry) => cleanText(entry.slug))
    .map((entry) => ({
      id: entry.id,
      slug: entry.slug,
      name: cleanText(entry.name) || entry.slug,
      role: entry.id === context.business.id ? context.role : "MANAGER",
      isAdmin: isAdminEmail(context.user.email),
    }));

  const businessHref = "/app/crm";
  const todayHref = `/b/${slug}/today`;
  const settingsHref = `/b/${slug}/settings`;
  const supportHref = `/b/${slug}/support`;
  const adminHref = isAdminEmail(context.user.email) ? getAdminUsersPath() : undefined;

  return (
    <div className="min-h-screen overflow-x-hidden bg-transparent text-slate-900">
      <TopBar
        businessSlug={slug}
        role={context.role}
        currentUserName={context.user.email || "User"}
        businesses={businessOptions}
        businessId={context.business.id}
        businessHref={businessHref}
        todayHref={todayHref}
        settingsHref={settingsHref}
        adminHref={adminHref}
        clearHref={supportHref}
        hasActiveFilters={false}
        supportHref={supportHref}
      />

      <main className="mx-auto max-w-[1220px] overflow-x-hidden px-4 pb-8 pt-20 sm:px-6">
        <div className="hidden items-start gap-5 lg:grid lg:grid-cols-[auto_minmax(0,1fr)]">
          <div className="relative shrink-0">
            <DesktopLeftRail
              businessId={context.business.id}
              phoneRaw=""
              q=""
              statuses={[]}
              statusMode="default"
              range="ALL"
              summaryRange="today"
              startDate={null}
              endDate={null}
              actor="ALL"
              sort="default"
              actors={[]}
              currentUserId={context.user.id}
              hasActiveFilters={false}
              activeFiltersCount={0}
              clearHref={supportHref}
              businessHref={businessHref}
              analyticsHref={`/b/${slug}/analytics`}
              todayHref={todayHref}
              settingsHref={settingsHref}
              supportHref={supportHref}
              adminHref={adminHref}
              canSeeAnalytics={context.role === "OWNER"}
              showFilters={false}
              activeSection="support"
            />
          </div>
          <div className="min-w-0 space-y-4">
            <div className="flex justify-end">
              <Link href={supportHref} className="inline-flex h-9 items-center rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900">
                Back to list
              </Link>
            </div>
            <SupportRequestDetailsCard request={request} />
            <div className="grid gap-4 xl:grid-cols-2">
              <SupportTimeline items={history} />
              <SupportAttachmentsPanel
                items={attachments}
                downloadHrefBuilder={(attachmentId) => `/api/support/attachments/${attachmentId}?download=1`}
              />
            </div>
          </div>
        </div>

        <div className="space-y-4 lg:hidden">
          <div className="flex justify-end">
            <Link href={supportHref} className="inline-flex h-9 items-center rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900">
              Back to list
            </Link>
          </div>
          <SupportRequestDetailsCard request={request} />
          <SupportTimeline items={history} />
          <SupportAttachmentsPanel
            items={attachments}
            downloadHrefBuilder={(attachmentId) => `/api/support/attachments/${attachmentId}?download=1`}
          />
        </div>
      </main>
    </div>
  );
}

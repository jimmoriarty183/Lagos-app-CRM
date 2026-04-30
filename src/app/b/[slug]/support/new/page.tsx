import type { BusinessOption } from "@/app/b/[slug]/_components/topbar/BusinessSwitcher";
import TopBar from "@/app/b/[slug]/_components/topbar/TopBar";
import DesktopLeftRail from "@/app/b/[slug]/_components/Desktop/DesktopLeftRail";
import { getAdminUsersPath, isAdminEmail } from "@/lib/admin-access";
import { getBusinessSupportContext } from "@/lib/support/business-context";
import { SupportRequestForm } from "@/components/support/SupportRequestForm";

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

export default async function NewBusinessSupportRequestPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const context = await getBusinessSupportContext(slug);

  const businessOptions: BusinessOption[] = context.businesses
    .filter((entry) => cleanText(entry.slug))
    .map((entry) => ({
      id: entry.id,
      slug: entry.slug,
      name: cleanText(entry.name) || entry.slug,
      role: entry.id === context.business.id ? context.role : "MANAGER",
      isAdmin: isAdminEmail(context.user.email),
    }));

  const businessHref = `/b/${slug}`;
  const todayHref = `/b/${slug}/today`;
  const settingsHref = `/b/${slug}/settings`;
  const supportHref = `/b/${slug}/support`;
  const adminHref = isAdminEmail(context.user.email) ? getAdminUsersPath() : undefined;

  return (
    <div className="min-h-screen overflow-x-hidden bg-transparent text-slate-900 dark:text-white">
      <TopBar
        businessSlug={slug}
        role={context.role}
        currentUserName={context.user.email || "User"}
        currentPlan={context.business.plan}
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

      <main className="mx-auto max-w-[1220px] overflow-x-hidden px-4 pb-8 pt-16 sm:px-6">
        <div className="hidden items-start gap-3 lg:grid lg:grid-cols-[auto_minmax(0,1fr)]">
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
              clientsHref={`/b/${slug}/clients`}
              catalogHref={`/b/${slug}/catalog/products`}
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
          <div className="min-w-0 max-w-[940px]">
            <SupportRequestForm businessSlug={slug} />
          </div>
        </div>

        <div className="mx-auto max-w-[940px] lg:hidden">
          <SupportRequestForm businessSlug={slug} />
        </div>
      </main>
    </div>
  );
}

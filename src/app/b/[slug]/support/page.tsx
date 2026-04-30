import Link from "next/link";
import { Button } from "@/components/ui/button";
import { supabaseServerReadOnly } from "@/lib/supabase/server";
import { fetchBusinessSupportRequests } from "@/lib/support/server";
import { getBusinessSupportContext } from "@/lib/support/business-context";
import type { BusinessOption } from "@/app/b/[slug]/_components/topbar/BusinessSwitcher";
import TopBar from "@/app/b/[slug]/_components/topbar/TopBar";
import DesktopLeftRail from "@/app/b/[slug]/_components/Desktop/DesktopLeftRail";
import { SupportRequestsListView } from "@/components/support/SupportRequestsListView";
import { getAdminUsersPath, isAdminEmail } from "@/lib/admin-access";

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

export default async function BusinessSupportPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ q?: string }>;
}) {
  const [{ slug }, sp] = await Promise.all([
    params,
    searchParams ?? Promise.resolve({ q: "" }),
  ]);
  const query = cleanText(sp?.q);
  const context = await getBusinessSupportContext(slug);
  const supabase = await supabaseServerReadOnly();

  const requests = await fetchBusinessSupportRequests(supabase, {
    search: query,
    businessId: context.business.id,
    limit: 300,
  });

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
        hasActiveFilters={Boolean(query)}
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

          <section className="min-w-0 rounded-[16px] border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-3 shadow-sm sm:p-4">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 dark:border-white/10 pb-4">
              <div>
                <div className="product-page-kicker">Support</div>
                <h1 className="product-page-title mt-1">Support requests</h1>
                <p className="product-page-subtitle mt-1">Requests for your current business workspace.</p>
              </div>
              <Button asChild className="h-10 px-4 text-sm font-semibold">
                <Link href={`/b/${slug}/support/new`}>New request</Link>
              </Button>
            </div>

            <form action={`/b/${slug}/support`} className="mt-4 flex gap-3">
              <input
                name="q"
                defaultValue={query}
                placeholder="Search subject or message"
                className="h-10 min-w-0 flex-1 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] px-3 text-sm outline-none transition hover:border-slate-300 dark:hover:border-white/20 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
              />
              <Button
                type="submit"
                variant="outline"
                className="h-10 px-4 text-sm font-semibold text-slate-700 dark:text-white/80 hover:border-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                Search
              </Button>
            </form>

            <div className="mt-4">
              <SupportRequestsListView
                items={requests}
                hrefBuilder={(requestId) => `/b/${slug}/support/${requestId}`}
                emptyTitle="No support requests yet"
                emptyDescription="Create your first request to contact platform support."
              />
            </div>
          </section>
        </div>

        <div className="space-y-4 lg:hidden">
          <section className="rounded-[16px] border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-3 shadow-sm">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 dark:border-white/10 pb-4">
              <div>
                <div className="product-page-kicker">Support</div>
                <h1 className="product-page-title mt-1">Support requests</h1>
              </div>
              <Button asChild className="h-10 px-4 text-sm font-semibold">
                <Link href={`/b/${slug}/support/new`}>New request</Link>
              </Button>
            </div>
            <form action={`/b/${slug}/support`} className="mt-4 flex gap-3">
              <input
                name="q"
                defaultValue={query}
                placeholder="Search subject or message"
                className="h-10 min-w-0 flex-1 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] px-3 text-sm outline-none transition hover:border-slate-300 dark:hover:border-white/20 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
              />
              <Button
                type="submit"
                variant="outline"
                className="h-10 px-4 text-sm font-semibold text-slate-700 dark:text-white/80 hover:border-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                Search
              </Button>
            </form>
            <div className="mt-4">
              <SupportRequestsListView
                items={requests}
                hrefBuilder={(requestId) => `/b/${slug}/support/${requestId}`}
                emptyTitle="No support requests yet"
                emptyDescription="Create your first request to contact platform support."
              />
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

type SupportAdminFiltersValue = {
  business: string;
  type: string;
  status: string;
  priority: string;
  search: string;
  fromDate: string;
  toDate: string;
};

export function SupportAdminFilters({
  pathname,
  value,
}: {
  pathname: string;
  value: SupportAdminFiltersValue;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Filters</h2>
      <form action={pathname} className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_170px_150px_150px_150px_150px_130px]">
        <input
          name="search"
          defaultValue={value.search}
          placeholder="Search by id, subject, message, business, submitter"
          className="h-11 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] px-3.5 text-sm text-slate-900 dark:text-white outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
        />
        <input
          name="business"
          defaultValue={value.business}
          placeholder="Business"
          className="h-11 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] px-3.5 text-sm text-slate-900 dark:text-white outline-none transition hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
        />
        <input
          name="type"
          defaultValue={value.type}
          placeholder="Type"
          className="h-11 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] px-3.5 text-sm text-slate-900 dark:text-white outline-none transition hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
        />
        <input
          name="status"
          defaultValue={value.status}
          placeholder="Status"
          className="h-11 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] px-3.5 text-sm text-slate-900 dark:text-white outline-none transition hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
        />
        <input
          name="priority"
          defaultValue={value.priority}
          placeholder="Priority"
          className="h-11 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] px-3.5 text-sm text-slate-900 dark:text-white outline-none transition hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
        />
        <input
          type="date"
          name="fromDate"
          defaultValue={value.fromDate}
          className="h-11 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] px-3.5 text-sm text-slate-900 dark:text-white outline-none transition hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
        />
        <div className="flex gap-3">
          <input
            type="date"
            name="toDate"
            defaultValue={value.toDate}
            className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] px-3.5 text-sm text-slate-900 dark:text-white outline-none transition hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
          />
          <button type="submit" className="inline-flex h-11 items-center justify-center rounded-xl bg-[#1d4ed8] px-5 text-sm font-semibold text-white transition hover:bg-[#1e40af]">
            Apply
          </button>
        </div>
      </form>
    </section>
  );
}


import Link from "next/link";

export function AdminStatCard({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: string | number;
  hint: string;
  href?: string;
}) {
  const body = (
    <>
      <div className="product-section-label">
        {label}
      </div>
      <div className="product-stat-value mt-1">{value}</div>
      <div className="product-body-xs mt-0.5">{hint}</div>
    </>
  );

  const className =
    "rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-3 shadow-sm transition hover:border-slate-300 dark:hover:border-white/20";

  return href ? (
    <Link href={href} className={className}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

export function AdminSectionCard({
  title,
  actions,
  children,
}: {
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-3 shadow-sm">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 className="product-section-title">{title}</h2>
        {actions}
      </div>
      {children}
    </section>
  );
}

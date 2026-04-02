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
      <div className="product-stat-value mt-1.5">{value}</div>
      <div className="product-body-xs mt-1">{hint}</div>
    </>
  );

  const className =
    "rounded-[16px] border border-slate-200 bg-white p-3.5 shadow-sm transition hover:border-slate-300";

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
    <section className="rounded-[18px] border border-slate-200 bg-white p-3.5 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2.5">
        <h2 className="product-section-title">{title}</h2>
        {actions}
      </div>
      {children}
    </section>
  );
}

import Link from "next/link";
import { EmptyState as UiEmptyState } from "@/components/ui/empty-state";

export type AdminSearchParams = Record<string, string | string[] | undefined>;

const LABELS: Record<string, string> = {
  CONFIRMED: "Подтвержден",
  UNCONFIRMED: "Не подтвержден",
  ACCEPTED: "Принят",
  PENDING: "Ожидает",
  REVOKED: "Отозван",
  EXPIRED: "Истек",
  ACTIVE: "Активен",
  INACTIVE: "Неактивен",
  HAS_SIGN_IN: "Был вход",
  NEVER_SIGNED_IN: "Без входа",
  HAS_BUSINESS: "Есть бизнес",
  NO_BUSINESS: "Без бизнеса",
  OWNER: "Владелец",
  MANAGER: "Менеджер",
  USER: "Пользователь",
  GUEST: "Гость",
  FREE: "Бесплатный",
  PRO: "Платный",
  BETA: "Бета",
  UNKNOWN: "Неизвестно",
  SOLO: "Solo",
  STARTER: "Starter",
  BUSINESS: "Business",
  TRIALING: "Триал",
  CANCELED: "Отменён",
  PAST_DUE: "Просрочен",
  PAUSED: "Приостановлен",
};

export function getSingleParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return String(value[0] ?? "");
  return String(value ?? "");
}

export function getIntParam(
  value: string | string[] | undefined,
  fallback: number,
  allowed?: readonly number[],
) {
  const parsed = Number.parseInt(getSingleParam(value), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  if (allowed && !allowed.includes(parsed)) return fallback;
  return parsed;
}

export function getEnumParam<T extends string>(
  value: string | string[] | undefined,
  fallback: T,
  allowed: readonly T[],
) {
  const normalized = getSingleParam(value) as T;
  return allowed.includes(normalized) ? normalized : fallback;
}

export function buildAdminHref(
  pathname: string,
  current: AdminSearchParams,
  updates: Record<string, string | number | null | undefined>,
) {
  const params = new URLSearchParams();

  for (const [key, rawValue] of Object.entries(current)) {
    const value = getSingleParam(rawValue);
    if (value) params.set(key, value);
  }

  for (const [key, rawValue] of Object.entries(updates)) {
    if (rawValue === null || rawValue === undefined || rawValue === "") {
      params.delete(key);
    } else {
      params.set(key, String(rawValue));
    }
  }

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function getPaginationItems(currentPage: number, totalPages: number) {
  if (totalPages <= 1) return [1];

  const pages = new Set<number>([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
  return Array.from(pages)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "Никогда";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatRelativeLabel(valueMs: number) {
  if (!valueMs) return "Нет данных";

  const diff = Date.now() - valueMs;
  const dayMs = 1000 * 60 * 60 * 24;
  const days = Math.floor(diff / dayMs);

  if (days <= 0) return "сегодня";
  if (days === 1) return "1 день назад";
  if (days < 30) return `${days} дн. назад`;

  const months = Math.floor(days / 30);
  if (months <= 1) return "около месяца назад";
  return `${months} мес. назад`;
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("ru-RU").format(value);
}

export function translateLabel(value: string | null | undefined) {
  const normalized = String(value ?? "").trim().toUpperCase();
  return LABELS[normalized] ?? value ?? "Не указано";
}

export function statusTone(status: string) {
  switch (String(status).toUpperCase()) {
    case "CONFIRMED":
    case "ACCEPTED":
    case "ACTIVE":
      return "bg-emerald-100 text-emerald-700";
    case "PENDING":
    case "UNCONFIRMED":
    case "EXPIRED":
      return "bg-amber-100 text-amber-700";
    case "REVOKED":
    case "INACTIVE":
      return "bg-rose-100 text-rose-700";
    default:
      return "bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-white/80";
  }
}

export function AdminBadge({ label, tone }: { label: string; tone?: string }) {
  return (
    <span
      className={[
        "inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-semibold",
        tone ?? statusTone(label),
      ].join(" ")}
    >
      {translateLabel(label)}
    </span>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <UiEmptyState
      title={title}
      description={description}
      className="rounded-xl border-dashed border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-white/[0.04] px-3 py-5"
    />
  );
}

export function AdminTable({
  head,
  children,
}: {
  head: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] shadow-sm">
      <table className="min-w-[700px] w-full table-auto border-collapse md:table-fixed">
        <thead className="bg-slate-50/80">{head}</thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function AdminTableHeaderRow({ children }: { children: React.ReactNode }) {
  return <tr className="border-b border-slate-200 dark:border-white/10">{children}</tr>;
}

export function AdminTableRow({
  children,
  href,
}: {
  children: React.ReactNode;
  href?: string;
}) {
  if (!href) {
    return <tr className="border-b border-slate-100 dark:border-white/[0.06] transition-colors hover:bg-slate-50/70">{children}</tr>;
  }

  return (
    <tr className="group border-b border-slate-100 dark:border-white/[0.06] transition-colors hover:bg-[#f7faff]">
      {children}
    </tr>
  );
}

export function RowPrimaryLink({
  href,
  children,
  meta,
}: {
  href: string;
  children: React.ReactNode;
  meta?: React.ReactNode;
}) {
  return (
    <Link href={href} className="block rounded-xl px-1 py-0.5 transition hover:text-blue-700">
      <div className="font-semibold text-slate-900 dark:text-white">{children}</div>
      {meta ? <div className="mt-0.5 hidden text-xs text-slate-500 dark:text-white/55 group-hover:text-slate-600 sm:block">{meta}</div> : null}
    </Link>
  );
}

export function AdminHeadCell({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={`px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-white/55 ${className}`}
    >
      {children}
    </th>
  );
}

export function AdminCell({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={`px-3 py-2.5 align-top text-xs text-slate-700 dark:text-white/80 whitespace-nowrap sm:text-sm ${className}`}>{children}</td>;
}

export function PaginationBar({
  pathname,
  currentParams,
  currentPage,
  totalPages,
}: {
  pathname: string;
  currentParams: AdminSearchParams;
  currentPage: number;
  totalPages: number;
}) {
  if (totalPages <= 1) return null;

  const pageItems = getPaginationItems(currentPage, totalPages);

  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
      <div className="text-sm text-slate-500 dark:text-white/55">
        Страница {currentPage} из {totalPages}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={buildAdminHref(pathname, currentParams, { page: Math.max(1, currentPage - 1) })}
          aria-disabled={currentPage === 1}
          className={[
            "inline-flex h-8 items-center rounded-lg border px-2.5 text-sm font-medium",
            currentPage === 1
              ? "pointer-events-none border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/[0.06] text-slate-400 dark:text-white/45"
              : "border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] text-slate-700 dark:text-white/80 hover:border-slate-300 hover:text-slate-900",
          ].join(" ")}
        >
          Назад
        </Link>

        {pageItems.map((page, index) => {
          const previous = pageItems[index - 1];
          const needsEllipsis = previous && page - previous > 1;

          return (
            <div key={page} className="flex items-center gap-2">
              {needsEllipsis ? <span className="px-1 text-slate-400 dark:text-white/45">…</span> : null}
              <Link
                href={buildAdminHref(pathname, currentParams, { page })}
                className={[
                  "inline-flex h-8 min-w-8 items-center justify-center rounded-lg border px-2.5 text-sm font-medium",
                  page === currentPage
                    ? "border-[#bfd0ea] dark:border-white/15 bg-[#eef5ff] dark:bg-[var(--brand-600)]/15 text-slate-900 dark:text-white"
                    : "border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] text-slate-700 dark:text-white/80 hover:border-slate-300 hover:text-slate-900",
                ].join(" ")}
              >
                {page}
              </Link>
            </div>
          );
        })}

        <Link
          href={buildAdminHref(pathname, currentParams, { page: Math.min(totalPages, currentPage + 1) })}
          aria-disabled={currentPage === totalPages}
          className={[
            "inline-flex h-8 items-center rounded-lg border px-2.5 text-sm font-medium",
            currentPage === totalPages
              ? "pointer-events-none border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/[0.06] text-slate-400 dark:text-white/45"
              : "border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] text-slate-700 dark:text-white/80 hover:border-slate-300 hover:text-slate-900",
          ].join(" ")}
        >
          Вперед
        </Link>
      </div>
    </div>
  );
}

export function InlineKeyValue({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.04] p-2.5">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-white/55">{label}</div>
      <div className="mt-1 text-sm text-slate-700 dark:text-white/80">{value}</div>
    </div>
  );
}

export function SectionList({
  items,
  emptyTitle,
  emptyDescription,
}: {
  items: { title: React.ReactNode; meta?: React.ReactNode; href?: string }[];
  emptyTitle: string;
  emptyDescription: string;
}) {
  if (!items.length) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="space-y-2">
      {items.map((item, index) => {
        const body = (
          <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] px-3 py-2.5 transition hover:border-slate-300">
            <div className="text-sm font-semibold text-slate-900 dark:text-white">{item.title}</div>
            {item.meta ? <div className="mt-1 text-sm text-slate-500 dark:text-white/55">{item.meta}</div> : null}
          </div>
        );

        return item.href ? (
          <Link key={`${index}-${String(item.href)}`} href={item.href}>
            {body}
          </Link>
        ) : (
          <div key={index}>{body}</div>
        );
      })}
    </div>
  );
}


import { Button } from "@/components/ui/button";

import { createOrderFromForm } from "../../actions";

type Props = {
  businessId: string;
  businessSlug: string;
  compact?: boolean;
  submitLabel?: string;
  stacked?: boolean;
};

export default function DesktopCreateOrder({
  businessId,
  businessSlug,
  compact = false,
  submitLabel = "Create order",
  stacked = false,
}: Props) {
  const createOrderAction = createOrderFromForm.bind(null, businessId, businessSlug);
  const inputCls =
    "h-10 w-full min-w-0 rounded-[var(--radius)] border border-[var(--neutral-200)] bg-white px-4 text-[0.9375rem] text-[var(--neutral-900)] outline-none transition " +
    "focus:border-[var(--brand-600)] focus:ring-0 disabled:bg-[var(--neutral-100)] disabled:text-[var(--neutral-500)]";

  const labelCls = "text-[11px] font-semibold uppercase tracking-[0.08em] text-[#98a2b3]";
  const textareaCls =
    "min-h-[100px] w-full rounded-[var(--radius)] border border-[var(--neutral-200)] bg-white px-4 py-3 text-[0.9375rem] text-[var(--neutral-900)] outline-none transition resize-y " +
    "focus:border-[var(--brand-600)] focus:ring-0 disabled:bg-[var(--neutral-100)] disabled:text-[var(--neutral-500)]";

  return (
    <form
      action={createOrderAction}
      className={[
        "grid gap-4",
        stacked ? "grid-cols-1 sm:grid-cols-2" : compact ? "xl:grid-cols-8" : "xl:grid-cols-12",
      ].join(" ")}
    >
      <label
        className={
          stacked
            ? "grid gap-1.5"
            : compact
              ? "grid gap-1.5 xl:col-span-2"
              : "grid gap-1.5 xl:col-span-3"
        }
      >
        <span className={labelCls}>First Name *</span>
        <input
          name="first_name"
          placeholder="Naruto"
          className={inputCls}
          required
        />
      </label>

      <label
        className={
          stacked
            ? "grid gap-1.5"
            : compact
              ? "grid gap-1.5 xl:col-span-2"
              : "grid gap-1.5 xl:col-span-3"
        }
      >
        <span className={labelCls}>Last Name</span>
        <input
          name="last_name"
          placeholder="Uzumaki"
          className={inputCls}
        />
      </label>

      <label
        className={
          stacked
            ? "grid gap-1.5"
            : compact
              ? "grid gap-1.5 xl:col-span-2"
              : "grid gap-1.5 xl:col-span-3"
        }
      >
        <span className={labelCls}>Client phone</span>
        <input
          name="client_phone"
          placeholder="+234 801 234 5678"
          className={inputCls}
        />
      </label>

      <label
        className={
          stacked
            ? "grid gap-1.5"
            : compact
              ? "grid gap-1.5 xl:col-span-1"
              : "grid gap-1.5 xl:col-span-2"
        }
      >
        <span className={labelCls}>Amount *</span>
        <input
          name="amount"
          placeholder="15000"
          inputMode="decimal"
          className={inputCls}
          required
        />
      </label>

      <label
        className={
          stacked
            ? "grid gap-1.5"
            : compact
              ? "grid gap-1.5 xl:col-span-1"
              : "grid gap-1.5 xl:col-span-2"
        }
      >
        <span className={labelCls}>Due date</span>
        <input name="due_date" type="date" className={inputCls} />
      </label>

      <div
        className={
          stacked
            ? "flex items-end sm:col-span-2"
            : compact
              ? "flex items-end xl:col-span-8"
              : "flex items-end xl:col-span-2"
        }
      >
        <Button
          type="submit"
          size="sm"
          className={[
            "h-11 justify-center rounded-2xl bg-[#111827] text-sm font-semibold text-white hover:bg-[#0b1220]",
            stacked ? "w-full" : compact ? "w-full xl:ml-auto xl:w-[220px]" : "w-full",
          ].join(" ")}
        >
          {submitLabel}
        </Button>
      </div>

      <label
        className={
          stacked
            ? "grid gap-1.5 sm:col-span-2"
            : compact
              ? "grid gap-1.5 xl:col-span-8"
              : "grid gap-1.5 xl:col-span-12"
        }
      >
        <span className={labelCls}>Description</span>
        <textarea
          name="description"
          rows={2}
          placeholder="Delivery address, comment..."
          className={textareaCls}
        />
      </label>
    </form>
  );
}

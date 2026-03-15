import Button from "../../Button";

import { createOrderFromForm } from "../../actions";

type Props = {
  businessId: string;
  businessSlug: string;
};

export default function DesktopCreateOrder({
  businessId,
  businessSlug,
}: Props) {
  const createOrderAction = createOrderFromForm.bind(null, businessId, businessSlug);
  const inputCls =
    "h-11 w-full min-w-0 rounded-xl border border-gray-200 bg-white px-3 outline-none " +
    "focus:border-gray-900 focus:ring-2 focus:ring-gray-900";

  const labelCls = "text-xs font-semibold text-gray-600";

  return (
    <form
      action={createOrderAction}
      className="grid gap-4 xl:grid-cols-12"
    >
      <label className="grid gap-1 xl:col-span-3">
        <span className={labelCls}>First Name *</span>
        <input
          name="first_name"
          placeholder="Naruto"
          className={inputCls}
          required
        />
      </label>

      <label className="grid gap-1 xl:col-span-3">
        <span className={labelCls}>Last Name</span>
        <input
          name="last_name"
          placeholder="Uzumaki"
          className={inputCls}
        />
      </label>

      <label className="grid gap-1 xl:col-span-3">
        <span className={labelCls}>Client phone</span>
        <input
          name="client_phone"
          placeholder="+234 801 234 5678"
          className={inputCls}
        />
      </label>

      <label className="grid gap-1 xl:col-span-2">
        <span className={labelCls}>Amount *</span>
        <input
          name="amount"
          placeholder="15000"
          inputMode="decimal"
          className={inputCls}
          required
        />
      </label>

      <label className="grid gap-1 xl:col-span-2">
        <span className={labelCls}>Due date</span>
        <input name="due_date" type="date" className={inputCls} />
      </label>

      <div className="flex items-end xl:col-span-2">
        <Button type="submit" size="sm" className="h-11 w-full justify-center">
          Create order
        </Button>
      </div>

      <label className="grid gap-1 xl:col-span-12">
        <span className={labelCls}>Description</span>
        <textarea
          name="description"
          rows={2}
          placeholder="Delivery address, comment..."
          className="min-h-[84px] w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 outline-none resize-y focus:border-gray-900 focus:ring-2 focus:ring-gray-900"
        />
      </label>
    </form>
  );
}

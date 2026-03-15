import { Plus } from "lucide-react";

import MobileAccordion from "./MobileAccordion";
import Button from "../../Button";
import { createOrderFromForm } from "../../actions";

type Props = {
  businessId: string;
  businessSlug: string;
};

export default function MobileCreateOrderAccordion({
  businessId,
  businessSlug,
}: Props) {
  const createOrderAction = createOrderFromForm.bind(null, businessId, businessSlug);
  const inputCls =
    "w-full max-w-full min-w-0 h-11 rounded-xl border border-gray-200 px-3 outline-none " +
    "focus:ring-2 focus:ring-gray-900 focus:border-gray-900 bg-white";

  const labelCls = "text-xs font-semibold text-gray-600";

  return (
    <div id="mobile-create-order">
      <MobileAccordion
        title={
          <span className="inline-flex items-center gap-2">
            <Plus className="h-4 w-4 text-gray-400" />
            New order
          </span>
        }
        defaultOpen={false}
      >
        <form
          action={createOrderAction}
          className="mt-1 grid gap-3"
          style={{ overflowX: "hidden" }}
        >
          <label className="grid gap-1">
            <span className={labelCls}>First Name *</span>
            <input
              name="first_name"
              placeholder="Naruto"
              autoComplete="given-name"
              className={inputCls}
              required
            />
          </label>

          <label className="grid gap-1">
            <span className={labelCls}>Last Name</span>
            <input
              name="last_name"
              placeholder="Uzumaki"
              autoComplete="family-name"
              className={inputCls}
            />
          </label>

          <label className="grid gap-1">
            <span className={labelCls}>Client phone</span>
            <input
              name="client_phone"
              placeholder="+234 801 234 5678"
              inputMode="tel"
              autoComplete="tel"
              className={inputCls}
            />
          </label>

          <label className="grid gap-1">
            <span className={labelCls}>Description</span>
            <textarea
              name="description"
              placeholder="Delivery address, comment..."
              rows={3}
              className={`${inputCls} h-auto resize-y py-2.5`}
            />
          </label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="grid min-w-0 gap-1">
              <span className={labelCls}>Amount *</span>
              <input
                name="amount"
                placeholder="15000"
                inputMode="decimal"
                autoComplete="off"
                className={inputCls}
                required
              />
            </label>

            <label className="grid min-w-0 gap-1">
              <span className={labelCls}>Due date</span>
              <input name="due_date" type="date" className={inputCls} />
            </label>
          </div>

          <Button type="submit" size="sm" style={{ width: "100%" }}>
            Create
          </Button>

          <div className="text-[11px] text-gray-500">
            Tip: amount is required. Due date helps track overdue orders.
          </div>
        </form>
      </MobileAccordion>
    </div>
  );
}

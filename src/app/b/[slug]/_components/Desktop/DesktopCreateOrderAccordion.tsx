import DesktopCreateOrder from "./DesktopCreateOrder";

export default function DesktopCreateOrderAccordion({
  businessId,
  businessSlug,
}: {
  businessId: string;
  businessSlug: string;
}) {
  return (
    <details className="group rounded-xl border border-gray-200 bg-white shadow-sm">
      <summary className="list-none cursor-pointer select-none">
        <div className="flex items-center justify-between gap-3 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-900 text-xl text-white">
              +
            </div>
            <div>
              <div className="text-base font-semibold text-gray-900">New order</div>
              <div className="text-xs text-gray-500">
                Quick capture for incoming work
              </div>
            </div>
          </div>

          <div className="rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition group-open:border-gray-900 group-open:text-gray-900">
            <span className="group-open:hidden">Open form</span>
            <span className="hidden group-open:inline">Hide form</span>
          </div>
        </div>
      </summary>

      <div className="border-t border-gray-100 px-5 py-5">
        <DesktopCreateOrder
          businessId={businessId}
          businessSlug={businessSlug}
        />
      </div>
    </details>
  );
}

import DesktopCreateOrder from "./DesktopCreateOrder";

export default function DesktopCreateOrderAccordion({
  businessId,
  businessSlug,
}: {
  businessId: string;
  businessSlug: string;
}) {
  return (
    <details className="group bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      <summary className="list-none cursor-pointer select-none">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gray-900 text-white flex items-center justify-center text-xl">
              +
            </div>
            <div>
              <div className="text-base font-semibold text-gray-900">
                Add order
              </div>
              <div className="text-xs text-gray-500">Click to open / close</div>
            </div>
          </div>

          <div className="text-gray-400 transition-transform group-open:rotate-180">
            ▾
          </div>
        </div>
      </summary>

      <div className="mt-4 border-t border-gray-200 pt-4">
        {/* ✅ прокидываем slug ниже */}
        <DesktopCreateOrder
          businessId={businessId}
          businessSlug={businessSlug}
        />
      </div>
    </details>
  );
}

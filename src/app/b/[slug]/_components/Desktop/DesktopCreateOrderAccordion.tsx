import DesktopCreateOrder from "./DesktopCreateOrder";

export default function DesktopCreateOrderAccordion({
  businessId,
  businessSlug,
}: {
  businessId: string;
  businessSlug: string;
}) {
  return (
    <details
      id="desktop-create-order"
      className="group rounded-2xl border border-[#dde3ee] bg-white dark:bg-white/[0.03] shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
    >
      <summary className="list-none cursor-pointer select-none">
        <div className="flex items-center justify-between gap-3 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#111827] text-lg font-semibold text-white">
              +
            </div>
            <div>
              <div className="text-sm font-semibold text-[#111827]">New Order</div>
              <div className="text-xs text-[#98a2b3] dark:text-white/45">Fill the form for incoming work</div>
            </div>
          </div>

          <div className="rounded-full border border-[#dde3ee] px-3 py-1.5 text-[11px] font-semibold text-[#667085] transition group-open:border-[#111827] group-open:text-[#111827]">
            <span className="group-open:hidden">Open form</span>
            <span className="hidden group-open:inline">Hide form</span>
          </div>
        </div>
      </summary>

      <div className="border-t border-[#eef2f7] px-5 py-5">
        <DesktopCreateOrder businessId={businessId} businessSlug={businessSlug} />
      </div>
    </details>
  );
}

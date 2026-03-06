import { LayoutDashboard, ShoppingBag, Settings } from "lucide-react";

type Props = {
  clearHref: string;
  totalCount: number;
  canSeeAnalytics: boolean;
};

export default function DesktopSidebar({
  clearHref,
  totalCount,
  canSeeAnalytics,
}: Props) {
  const itemBase =
    "w-full flex items-center justify-between gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors";

  const itemActive =
    "bg-[#071433] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:bg-[#071433]/95";

  const itemIdle = "text-[#0B2347] hover:bg-[#F2F5FA]";

  const metaIdle = "text-xs text-gray-500 tabular-nums font-semibold";
  const metaActive =
    "text-xs tabular-nums rounded-full bg-white/14 px-2 py-0.5 font-bold";

  return (
    <aside className="desktopOnly">
      <div className="rounded-2xl border border-[#D7DFEA] bg-white p-4 shadow-sm">
        <nav className="space-y-2">
          <a className={`${itemBase} ${itemActive}`} href={clearHref}>
            <span className="flex items-center gap-2.5">
              <ShoppingBag className="h-4 w-4" />
              Orders
            </span>
            <span className={metaActive}>{totalCount}</span>
          </a>

          {canSeeAnalytics ? (
            <a className={`${itemBase} ${itemIdle}`} href="#analytics">
              <span className="flex items-center gap-2.5">
                <LayoutDashboard className="h-4 w-4 text-[#334155]" />
                Analytics
              </span>
              <span className={metaIdle}>Owner</span>
            </a>
          ) : (
            <div className={`${itemBase} text-gray-400 opacity-60`}>
              <span className="flex items-center gap-2.5">
                <LayoutDashboard className="h-4 w-4" />
                Analytics
              </span>
              <span className={metaIdle}>Owner</span>
            </div>
          )}

          <div className={`${itemBase} text-gray-400 opacity-70`}>
            <span className="flex items-center gap-2.5">
              <Settings className="h-4 w-4" />
              Settings
            </span>
            <span className={metaIdle}>soon</span>
          </div>
        </nav>
      </div>
    </aside>
  );
}

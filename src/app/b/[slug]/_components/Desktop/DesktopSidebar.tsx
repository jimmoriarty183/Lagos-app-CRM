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
    "w-full flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition-colors";

  const itemActive = "bg-gray-900 text-white shadow-sm hover:bg-gray-900/95";

  const itemIdle = "text-gray-700 hover:bg-gray-50";

  const metaIdle = "text-xs text-gray-500 tabular-nums";
  const metaActive =
    "text-xs tabular-nums rounded-full bg-white/10 px-2 py-0.5";

  return (
    <aside className="desktopOnly">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 sm:p-4">
        <nav className="space-y-2">
          <a className={`${itemBase} ${itemActive}`} href={clearHref}>
            <span className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4" />
              Orders
            </span>
            <span className={metaActive}>{totalCount}</span>
          </a>

          {canSeeAnalytics ? (
            <a className={`${itemBase} ${itemIdle}`} href="#analytics">
              <span className="flex items-center gap-2">
                <LayoutDashboard className="h-4 w-4" />
                Analytics
              </span>
              <span className={metaIdle}>Owner</span>
            </a>
          ) : (
            <div className={`${itemBase} text-gray-400 opacity-60`}>
              <span className="flex items-center gap-2">
                <LayoutDashboard className="h-4 w-4" />
                Analytics
              </span>
              <span className={metaIdle}>Owner</span>
            </div>
          )}

          <div className={`${itemBase} text-gray-400 opacity-60`}>
            <span className="flex items-center gap-2">
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

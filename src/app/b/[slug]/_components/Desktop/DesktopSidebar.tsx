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
  const itemHover = "hover:bg-gray-50";
  const itemActive = "bg-blue-50 text-gray-900 border border-blue-100";
  const itemIdle = "text-gray-700";

  const meta = "text-xs text-gray-500 tabular-nums";

  return (
    <aside className="desktopOnly">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 sm:p-4">
        <nav className="space-y-2">
          <a className={`${itemBase} ${itemActive}`} href={clearHref}>
            <span className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4" />
              Orders
            </span>
            <span className={meta}>{totalCount}</span>
          </a>

          {canSeeAnalytics ? (
            <a
              className={`${itemBase} ${itemIdle} ${itemHover}`}
              href="#analytics"
            >
              <span className="flex items-center gap-2">
                <LayoutDashboard className="h-4 w-4" />
                Analytics
              </span>
              <span className={meta}>Owner</span>
            </a>
          ) : (
            <div className={`${itemBase} ${itemIdle} opacity-50`}>
              <span className="flex items-center gap-2">
                <LayoutDashboard className="h-4 w-4" />
                Analytics
              </span>
              <span className={meta}>Owner</span>
            </div>
          )}

          <div className={`${itemBase} ${itemIdle} opacity-70`}>
            <span className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </span>
            <span className={meta}>soon</span>
          </div>
        </nav>
      </div>
    </aside>
  );
}

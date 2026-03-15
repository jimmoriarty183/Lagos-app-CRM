import { Building2, Settings } from "lucide-react";

type Props = {
  clearHref: string;
  totalCount: number;
  businessHref: string;
};

export default function DesktopSidebar({
  businessHref,
}: Props) {
  const itemBase =
    "flex w-full items-start justify-between gap-3 rounded-lg px-3 py-3 text-sm transition-colors";
  const itemIdle = "text-gray-700 hover:bg-gray-50";
  const metaIdle = "text-xs text-gray-500 tabular-nums";

  return (
    <aside className="desktopOnly">
      <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm sm:p-4">
        <nav className="space-y-2">
          <a className={`${itemBase} ${itemIdle}`} href={businessHref}>
            <span className="flex min-w-0 items-start gap-2">
              <Building2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                <span className="block font-semibold">Business</span>
                <span className="mt-0.5 block text-xs text-gray-500">
                  Manage access and add managers
                </span>
              </span>
            </span>
            <span className={metaIdle}>Open</span>
          </a>

          <div className={`${itemBase} cursor-default text-gray-400 opacity-70`}>
            <span className="flex min-w-0 items-start gap-2">
              <Settings className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                <span className="block font-semibold">Settings</span>
              </span>
            </span>
            <span className={metaIdle}>soon</span>
          </div>
        </nav>
      </div>
    </aside>
  );
}

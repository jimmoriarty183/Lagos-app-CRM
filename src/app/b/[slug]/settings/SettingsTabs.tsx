"use client";

import Link from "next/link";

type Tab = {
  href: string;
  label: string;
  active: boolean;
};

export default function SettingsTabs({ tabs }: { tabs: Tab[] }) {
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={[
            "inline-flex h-9 items-center rounded-full border px-3.5 text-[13px] font-semibold transition",
            tab.active
              ? "border-[#6366F1] bg-[#6366F1] text-white shadow-[0_8px_18px_rgba(99,102,241,0.18)]"
              : "border-[#E5E7EB] bg-white text-[#4B5563] hover:border-[#C7D2FE] hover:bg-[#F9FAFB] hover:text-[#1F2937]",
          ].join(" ")}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}

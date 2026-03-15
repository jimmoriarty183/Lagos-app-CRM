"use client";

import Link from "next/link";

type Tab = {
  href: string;
  label: string;
  active: boolean;
};

export default function SettingsTabs({ tabs }: { tabs: Tab[] }) {
  return (
    <div className="mb-5 flex flex-wrap gap-2">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={[
            "inline-flex h-10 items-center rounded-full border px-4 text-sm font-semibold transition",
            tab.active
              ? "border-slate-900 bg-slate-900 text-white"
              : "border-[#dde3ee] bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900",
          ].join(" ")}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}

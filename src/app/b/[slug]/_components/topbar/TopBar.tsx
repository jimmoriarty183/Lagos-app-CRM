import React from "react";
import LogoutButton from "../LogoutButton";
import { BadgeCheck, Shield } from "lucide-react";

type Props = {
  businessSlug: string;
  plan: string;
  role: string;

  // оставляю для совместимости (старый prop), но не используем
  pill: React.CSSProperties;
};

function Pill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "blue";
}) {
  const cls =
    tone === "blue"
      ? "bg-blue-50 text-blue-700 border-blue-100"
      : "bg-gray-100 text-gray-700 border-gray-200";

  return (
    <span
      className={[
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5",
        "text-xs sm:text-sm font-extrabold",
        cls,
      ].join(" ")}
    >
      {children}
    </span>
  );
}

export default function TopBar({ businessSlug, plan, role }: Props) {
  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/70 backdrop-blur-md">
      <div className="topPad mx-auto max-w-7xl h-14 px-4 sm:px-6 flex items-center justify-between gap-3">
        {/* LEFT */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 rounded-xl bg-gray-900 text-white flex items-center justify-center font-extrabold">
            O
          </div>

          <div className="min-w-0">
            <div className="font-extrabold text-base sm:text-lg text-gray-900 leading-5">
              Ordero
            </div>
            <div className="text-xs text-gray-500 truncate">
              / {businessSlug}
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Pill tone="blue">
            <BadgeCheck className="h-4 w-4 opacity-80" />
            {plan}
          </Pill>

          <Pill>
            <Shield className="h-4 w-4 opacity-80" />
            {role}
          </Pill>

          <LogoutButton />
        </div>
      </div>
    </header>
  );
}

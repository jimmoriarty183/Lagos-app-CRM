import React from "react";
import LogoutButton from "../LogoutButton";
import { BadgeCheck, Shield } from "lucide-react";
import { Logo } from "@/components/Logo";

type Props = {
  businessSlug: string;
  plan: string;
  role: string;

  // чтобы не ломать текущий вызов из page.tsx
  pill?: React.CSSProperties;
};

const chipBase =
  "inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-semibold leading-none whitespace-nowrap";

function Chip({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: "default" | "primary";
}) {
  const variants = {
    default: "bg-gray-100 text-gray-700 border-gray-200",
    primary: "bg-blue-50 text-blue-700 border-blue-200",
  };

  return (
    <span className={`${chipBase} ${variants[variant]} transition-colors`}>
      {children}
    </span>
  );
}

export default function TopBar({ businessSlug, plan, role }: Props) {
  return (
    <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between gap-4">
          {/* LEFT */}
          <div className="flex items-center gap-3 min-w-0">
            <Logo size={36} />
            <div className="min-w-0">
              <div className="font-semibold text-gray-900">Ordero</div>
              <div className="text-xs text-gray-500 truncate">
                / {businessSlug}
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Chip variant="primary">
              <BadgeCheck size={16} className="opacity-80" />
              <span className="hidden sm:inline">{plan}</span>
              <span className="sm:hidden">{plan.slice(0, 4)}</span>
            </Chip>

            <Chip>
              <Shield size={16} className="opacity-80" />
              <span className="hidden sm:inline">{role}</span>
              <span className="sm:hidden">{role.slice(0, 3)}</span>
            </Chip>

            <LogoutButton />
          </div>
        </div>
      </div>
    </header>
  );
}

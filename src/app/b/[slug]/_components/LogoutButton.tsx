"use client";

import { LogOut } from "lucide-react";

type Props = {
  onClick?: () => void;
  className?: string;
};

export default function LogoutButton({ onClick, className }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        inline-flex items-center gap-1.5
        px-3 py-1.5 sm:py-2
        rounded-lg
        border
        text-xs sm:text-sm
        font-semibold
        leading-none
        bg-red-50
        text-red-700
        border-red-200
        hover:bg-red-100
        transition-colors
        ${className ?? ""}
      `}
    >
      <LogOut size={16} className="opacity-80" />
      <span>Logout</span>
    </button>
  );
}

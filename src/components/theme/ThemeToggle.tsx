"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

type ThemeToggleProps = {
  className?: string;
  /**
   * Visual style:
   * - "ghost" — transparent, hover surface (default; works in both themes)
   * - "outline" — bordered button
   */
  variant?: "ghost" | "outline";
  size?: "sm" | "md";
};

/**
 * Click cycles dark ↔ light. Renders a placeholder until mount to avoid
 * hydration mismatches (resolvedTheme is undefined on first render).
 */
export function ThemeToggle({
  className,
  variant = "ghost",
  size = "md",
}: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // SSR-safe mount check: React renders the placeholder on the server (where
  // resolvedTheme is undefined) and the real button after hydration. This
  // setState-in-effect pattern is the documented next-themes recipe.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const isDark = mounted ? resolvedTheme === "dark" : true;
  const next = isDark ? "light" : "dark";

  const sizeClass = size === "sm" ? "h-8 w-8" : "h-10 w-10";
  const variantClass =
    variant === "outline"
      ? "border border-[var(--border-default)] bg-[var(--bg-elevated)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-elevated-strong)]"
      : "hover:bg-[var(--bg-elevated-strong)]";

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
      suppressHydrationWarning
      className={[
        "inline-flex shrink-0 items-center justify-center rounded-xl text-[var(--text-secondary)] transition",
        sizeClass,
        variantClass,
        className ?? "",
      ].join(" ")}
    >
      {mounted ? (
        isDark ? (
          <Sun className="h-4 w-4" aria-hidden />
        ) : (
          <Moon className="h-4 w-4" aria-hidden />
        )
      ) : (
        <span className="block h-4 w-4" aria-hidden />
      )}
    </button>
  );
}

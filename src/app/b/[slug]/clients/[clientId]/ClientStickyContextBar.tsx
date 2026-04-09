"use client";

import * as React from "react";

type ClientStickyContextBarProps = {
  targetId: string;
  containerId?: string;
  minContainerWidth?: number;
  clientName: string;
  clientType: string;
  managerName: string;
  revenueValue: string;
  ordersValue: string;
  averageValue: string;
  lastOrderValue: string;
};

export function ClientStickyContextBar({
  targetId,
  containerId,
  minContainerWidth = 1080,
  clientName,
  clientType,
  managerName,
  revenueValue,
  ordersValue,
  averageValue,
  lastOrderValue,
}: ClientStickyContextBarProps) {
  const [isVisible, setIsVisible] = React.useState(false);
  const [isWideEnough, setIsWideEnough] = React.useState(false);

  React.useEffect(() => {
    const target = document.getElementById(targetId);
    if (!target) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(!entry.isIntersecting);
      },
      {
        root: null,
        threshold: 0.15,
      },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [targetId]);

  React.useEffect(() => {
    const container =
      (containerId ? document.getElementById(containerId) : null) ||
      document.body;

    if (!container) {
      setIsWideEnough(false);
      return;
    }

    const applyWidth = (width: number) => {
      setIsWideEnough(width >= minContainerWidth);
    };

    applyWidth(container.getBoundingClientRect().width);

    if (typeof ResizeObserver === "undefined") {
      const onResize = () =>
        applyWidth(container.getBoundingClientRect().width);
      window.addEventListener("resize", onResize);
      return () => window.removeEventListener("resize", onResize);
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      applyWidth(entry.contentRect.width);
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [containerId, minContainerWidth]);

  if (!isVisible || !isWideEnough) {
    return null;
  }

  return (
    <div
      className="sticky top-[78px] z-20 rounded-2xl border border-slate-200/80 bg-white/90 p-3 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.35)] backdrop-blur supports-[backdrop-filter]:bg-white/75"
      aria-hidden={false}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-slate-900">
            {clientName}
          </div>
          <div className="mt-1 flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
              {clientType}
            </span>
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
              {managerName}
            </span>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-2 text-right sm:grid-cols-4">
          <StickyKpi label="Revenue" value={revenueValue} />
          <StickyKpi label="Orders" value={ordersValue} />
          <StickyKpi label="Avg" value={averageValue} />
          <StickyKpi label="Last" value={lastOrderValue} />
        </dl>
      </div>
    </div>
  );
}

function StickyKpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[84px] rounded-lg bg-slate-50 px-2 py-1.5">
      <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">
        {label}
      </div>
      <div className="mt-0.5 text-xs font-semibold text-slate-900">{value}</div>
    </div>
  );
}

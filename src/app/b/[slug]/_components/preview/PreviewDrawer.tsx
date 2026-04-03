"use client";

import * as React from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string | null;
  children: React.ReactNode;
  footerHref?: string;
  footerLabel?: string;
};

export function PreviewDrawer({ open, onClose, title, subtitle, children, footerHref, footerLabel }: Props) {
  return (
    <Sheet open={open} onOpenChange={(next) => (!next ? onClose() : null)}>
      <SheetContent
        side="right"
        className="top-3 bottom-3 right-3 h-auto w-[min(94vw,760px)] rounded-[28px] border border-[#E5E7EB] bg-white p-0 shadow-[0_24px_64px_rgba(15,23,42,0.18)]"
      >
        <SheetTitle className="sr-only">{title}</SheetTitle>
        <SheetDescription className="sr-only">{subtitle || title}</SheetDescription>
        <div className="sticky top-0 z-20 border-b border-[#E5E7EB] bg-white/95 backdrop-blur">
          <div className="flex items-start justify-between gap-3 px-5 py-4">
            <div className="min-w-0">
              <div className="text-base font-semibold text-[#111827]">{title}</div>
              {subtitle ? <div className="mt-1 text-sm text-[#667085]">{subtitle}</div> : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-[16px] border border-[#E5E7EB] bg-white text-[#374151] transition hover:border-[#C7D2FE] hover:bg-[#F9FAFB]"
              aria-label="Close preview"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <ScrollArea className="h-full min-h-0">
          <div className="space-y-3 px-5 py-5">{children}</div>
        </ScrollArea>

        {footerHref && footerLabel ? (
          <div className="border-t border-[#E5E7EB] bg-white px-5 py-3">
            <Link
              href={footerHref}
              className="inline-flex h-9 items-center rounded-xl border border-[#E5E7EB] bg-white px-3 text-sm font-semibold text-[#374151] transition hover:border-[#C7D2FE] hover:bg-[#F9FAFB]"
            >
              {footerLabel}
            </Link>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}


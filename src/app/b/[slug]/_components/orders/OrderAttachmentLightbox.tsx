"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Eye, X } from "lucide-react";

type Props = {
  fileName: string;
  src: string;
  triggerClassName?: string;
};

export function OrderAttachmentLightbox({
  fileName,
  src,
  triggerClassName = "inline-flex h-8 items-center gap-1 rounded-full border border-[#d9e2ec] bg-white dark:bg-white/[0.03] px-3 text-xs font-semibold text-[#344054] transition hover:border-[#c7d1dd] hover:bg-[#f8fafc]",
}: Props) {
  return (
    <DialogPrimitive.Root>
      <DialogPrimitive.Trigger asChild>
        <button type="button" className={triggerClassName}>
          <Eye className="h-3.5 w-3.5" />
          Open
        </button>
      </DialogPrimitive.Trigger>

      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className="fixed inset-0 z-[120] bg-[rgba(12,18,28,0.82)] backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
        />

        <DialogPrimitive.Content
          className="fixed inset-0 z-[121] flex items-center justify-center overflow-hidden p-4 outline-none sm:p-6"
        >
          <DialogPrimitive.Title className="sr-only">{fileName}</DialogPrimitive.Title>

          <DialogPrimitive.Close className="absolute right-4 top-4 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white transition hover:bg-black/60 focus:outline-none focus:ring-2 focus:ring-white/60 sm:right-5 sm:top-5">
            <X className="h-5 w-5" />
            <span className="sr-only">Close image preview</span>
          </DialogPrimitive.Close>

          <div className="flex max-h-[85vh] max-w-[90vw] items-center justify-center overflow-hidden rounded-[20px]">
            <img
              src={src}
              alt={fileName}
              className="block max-h-[85vh] max-w-[90vw] object-contain shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
            />
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

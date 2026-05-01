"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "./utils";
import { buttonVariants } from "./button";

function Calendar({
  className,
  classNames,
  components,
  formatters,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      {...props}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col gap-3",
        month: "space-y-3",
        caption: "relative mb-2 flex items-center justify-center pt-1",
        caption_label: "text-sm font-semibold text-[#1F2937] dark:text-white/90",
        nav: "flex items-center gap-1",
        button_previous: cn(
          buttonVariants({ variant: "outline" }),
          "absolute left-1 size-7 rounded-md border-[#E5E7EB] dark:border-white/10 p-0 hover:bg-[#F3F4F6] dark:hover:bg-white/[0.08]",
        ),
        button_next: cn(
          buttonVariants({ variant: "outline" }),
          "absolute right-1 size-7 rounded-md border-[#E5E7EB] dark:border-white/10 p-0 hover:bg-[#F3F4F6] dark:hover:bg-white/[0.08]",
        ),
        month_grid: "w-full border-collapse",
        weekdays: "flex w-full",
        weekday:
          "w-9 text-center text-[0.625rem] font-medium uppercase tracking-wider text-[#6B7280] dark:text-white/55",
        week: "mt-1.5 flex w-full",
        day: "relative h-9 w-9 p-0 text-center text-sm transition-colors [&.rdp-today.rdp-selected>button]:bg-[#4338CA] [&.rdp-today.rdp-selected>button]:text-white [&.rdp-today.rdp-selected>button]:shadow-[inset_0_0_0_1px_#312E81]",
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "size-9 rounded-md p-0 font-normal text-[#1F2937] dark:text-white/85 hover:bg-[#F3F4F6] dark:hover:bg-white/[0.08] hover:text-[#1F2937] dark:hover:text-white aria-selected:opacity-100",
        ),
        selected:
          "rdp-selected [&>button]:bg-[#5558E3] [&>button]:font-semibold [&>button]:text-white [&>button]:shadow-[inset_0_0_0_1px_#4338CA]",
        today:
          "rdp-today [&>button]:bg-[#EEF2FF] dark:[&>button]:bg-[var(--brand-600)]/20 [&>button]:font-semibold [&>button]:text-[#4338CA] dark:[&>button]:text-[var(--brand-300)] [&>button]:shadow-[inset_0_0_0_1px_#C7D2FE] dark:[&>button]:shadow-[inset_0_0_0_1px_var(--brand-500)]/40",
        outside: "[&>button]:text-[#9CA3AF] dark:[&>button]:text-white/40 [&>button]:opacity-50",
        disabled: "[&>button]:text-[#9CA3AF] dark:[&>button]:text-white/40 [&>button]:opacity-40",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ className, orientation, ...props }) =>
          orientation === "left" ? (
            <ChevronLeft className={cn("size-4", className)} {...props} />
          ) : (
            <ChevronRight className={cn("size-4", className)} {...props} />
          ),
        ...components,
      }}
      formatters={{
        formatWeekdayName: (date) =>
          date.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 2),
        ...formatters,
      }}
    />
  );
}

export { Calendar };

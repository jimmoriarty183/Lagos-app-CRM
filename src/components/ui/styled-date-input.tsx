"use client";

import * as React from "react";
import { CalendarDays, X } from "lucide-react";

import { Calendar } from "./calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

type StyledDateInputProps = {
  /** Form field name, mirrors a hidden <input> for native form submission. */
  name?: string;
  /** Controlled value as YYYY-MM-DD. */
  value?: string | null;
  /** Uncontrolled initial value as YYYY-MM-DD. */
  defaultValue?: string | null;
  onChange?: (next: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  clearable?: boolean;
  /** Format the visible label; defaults to "MMM D, YYYY". */
  formatLabel?: (date: Date) => string;
};

const DEFAULT_FORMATTER = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

function defaultFormat(date: Date) {
  return DEFAULT_FORMATTER.format(date);
}

function parseDateOnlyValue(raw: string | null | undefined): Date | undefined {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return undefined;
  const direct = new Date(`${trimmed}T00:00:00`);
  if (!Number.isNaN(direct.getTime())) return direct;
  const fallback = new Date(trimmed);
  return Number.isNaN(fallback.getTime()) ? undefined : fallback;
}

function toDateOnlyString(date: Date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function StyledDateInput({
  name,
  value: controlledValue,
  defaultValue,
  onChange,
  placeholder = "Pick date",
  ariaLabel,
  className,
  disabled,
  required,
  clearable = true,
  formatLabel = defaultFormat,
}: StyledDateInputProps) {
  const isControlled = controlledValue !== undefined;
  const [internalValue, setInternalValue] = React.useState<string>(
    () => defaultValue ?? "",
  );
  const value = isControlled ? (controlledValue ?? "") : internalValue;
  const [open, setOpen] = React.useState(false);

  const selectedDate = React.useMemo(
    () => parseDateOnlyValue(value),
    [value],
  );

  const setValue = (next: string) => {
    if (!isControlled) setInternalValue(next);
    onChange?.(next);
  };

  return (
    <div className={["relative inline-flex", className ?? ""].join(" ")}>
      {name ? (
        <input type="hidden" name={name} value={value} required={required} />
      ) : null}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            aria-label={ariaLabel ?? placeholder}
            className="inline-flex h-11 w-full min-w-0 items-center gap-2 rounded-xl border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.04] px-3.5 text-sm font-medium text-[#1F2937] dark:text-white/90 outline-none transition hover:border-[#C7D2FE] dark:hover:border-[var(--brand-500)]/40 hover:bg-[#F9FAFB] dark:hover:bg-white/[0.07] focus:border-[var(--brand-600)] focus:ring-2 focus:ring-[var(--brand-600)]/15 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CalendarDays className="h-4 w-4 shrink-0 text-[#6B7280] dark:text-white/55" />
            <span
              className={
                selectedDate
                  ? "min-w-0 flex-1 truncate text-left"
                  : "min-w-0 flex-1 truncate text-left text-[#9CA3AF] dark:text-white/40"
              }
            >
              {selectedDate ? formatLabel(selectedDate) : placeholder}
            </span>
            {clearable && selectedDate && !disabled ? (
              <span
                role="button"
                tabIndex={0}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setValue("");
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    event.stopPropagation();
                    setValue("");
                  }
                }}
                className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[#9CA3AF] dark:text-white/40 hover:bg-[#F3F4F6] dark:hover:bg-white/10 hover:text-[#1F2937] dark:hover:text-white"
                aria-label="Clear date"
              >
                <X className="h-3 w-3" />
              </span>
            ) : null}
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-auto rounded-xl border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-[#0E0E1B] p-0 shadow-lg dark:shadow-[0_16px_36px_rgba(0,0,0,0.55)]"
        >
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => {
              if (!date) {
                setValue("");
                return;
              }
              setValue(toDateOnlyString(date));
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

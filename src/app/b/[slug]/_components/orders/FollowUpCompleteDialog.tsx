"use client";

import * as React from "react";

import type { FollowUpRow } from "@/lib/follow-ups";
import { getTomorrowDateOnly } from "@/lib/follow-ups";
import {
  formatDateTimeLocalInput,
  parseDateTimeLocalInput,
} from "@/lib/follow-ups";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StyledDateInput } from "@/components/ui/styled-date-input";
import { Textarea } from "@/components/ui/textarea";

export type FollowUpCompletionValue = {
  completionNote: string | null;
  nextFollowUp: {
    title: string;
    dueDate: string;
    dueAt?: string | null;
    note?: string | null;
  } | null;
};

type Props = {
  item: FollowUpRow | null;
  open: boolean;
  submitting?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (value: FollowUpCompletionValue) => void;
};

export function FollowUpCompleteDialog({
  item,
  open,
  submitting = false,
  onOpenChange,
  onSubmit,
}: Props) {
  const [completionNote, setCompletionNote] = React.useState("");
  const [createNext, setCreateNext] = React.useState(false);
  const [nextTitle, setNextTitle] = React.useState("");
  const [nextDueDate, setNextDueDate] = React.useState(getTomorrowDateOnly());
  const [nextDueAt, setNextDueAt] = React.useState<string | null>(null);
  const [nextNote, setNextNote] = React.useState("");

  React.useEffect(() => {
    if (!open || !item) return;
    setCompletionNote("");
    setCreateNext(false);
    setNextTitle("");
    setNextDueDate(
      item.due_date >= getTomorrowDateOnly()
        ? item.due_date
        : getTomorrowDateOnly(),
    );
    setNextDueAt(item.due_at || null);
    setNextNote("");
  }, [item, open]);

  const nextTitleMissing = createNext && !nextTitle.trim();
  const nextDateMissing = createNext && !nextDueDate.trim();

  function submit(createNextFollowUp: boolean) {
    onSubmit({
      completionNote: completionNote.trim() || null,
      nextFollowUp:
        createNextFollowUp && nextTitle.trim() && nextDueDate
          ? {
              title: nextTitle.trim(),
              dueDate: nextDueDate,
              dueAt: nextDueAt,
              note: nextNote.trim() || null,
            }
          : null,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[calc(100vh-2rem)] max-w-[560px] flex-col overflow-hidden rounded-[24px] border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-[#0E0E1B] p-0 shadow-[0_24px_64px_rgba(15,23,42,0.18)] dark:shadow-[0_24px_64px_rgba(0,0,0,0.55)]">
        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="text-[18px] font-semibold text-[#111827] dark:text-white/90">
              Complete follow-up
            </DialogTitle>
            <DialogDescription className="text-sm leading-6 text-[#6B7280] dark:text-white/55">
              Close{" "}
              <span className="font-medium text-[#374151] dark:text-white/85">
                {item?.title ?? "this follow-up"}
              </span>{" "}
              or turn it into the next scheduled step.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label
              htmlFor="follow-up-completion-note"
              className="text-xs font-semibold uppercase tracking-[0.06em] text-[#9CA3AF] dark:text-white/40"
            >
              Completion note
            </Label>
            <Textarea
              id="follow-up-completion-note"
              value={completionNote}
              onChange={(event) => setCompletionNote(event.currentTarget.value)}
              placeholder="Optional outcome or result"
              className="min-h-[92px] rounded-[18px] border-[#E5E7EB] dark:border-white/10 bg-[#F9FAFB] dark:bg-white/[0.04] text-sm leading-6 text-[#111827] dark:text-white/90 placeholder:text-[#9CA3AF] dark:placeholder:text-white/40 shadow-none focus-visible:border-[var(--brand-600)] focus-visible:ring-[var(--brand-600)]/15"
            />
          </div>

          <div className="rounded-[20px] border border-[#E5E7EB] dark:border-white/10 bg-[#FBFCFE] dark:bg-white/[0.04] p-4">
            <label className="flex items-start gap-3">
              <Checkbox
                checked={createNext}
                onCheckedChange={(checked) => setCreateNext(Boolean(checked))}
                className="mt-0.5"
              />
              <span className="space-y-1">
                <span className="block text-sm font-semibold text-[#1F2937] dark:text-white/90">
                  Create next follow-up
                </span>
                <span className="block text-xs leading-5 text-[#6B7280] dark:text-white/55">
                  Use this when the current task is done but the workflow needs
                  another scheduled step.
                </span>
              </span>
            </label>

            {createNext ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_168px]">
                <div className="space-y-2 sm:col-span-2">
                  <Label
                    htmlFor="next-follow-up-title"
                    className="text-xs font-semibold uppercase tracking-[0.06em] text-[#9CA3AF] dark:text-white/40"
                  >
                    Next follow-up title
                  </Label>
                  <Input
                    id="next-follow-up-title"
                    value={nextTitle}
                    onChange={(event) =>
                      setNextTitle(event.currentTarget.value)
                    }
                    placeholder="For example: send proposal"
                    className="h-11 rounded-[16px] border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.05] text-sm text-[#111827] dark:text-white/90 placeholder:text-[#9CA3AF] dark:placeholder:text-white/40 shadow-none focus-visible:border-[var(--brand-600)] focus-visible:ring-[var(--brand-600)]/15 [color-scheme:light] dark:[color-scheme:dark]"
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="next-follow-up-date"
                    className="text-xs font-semibold uppercase tracking-[0.06em] text-[#9CA3AF] dark:text-white/40"
                  >
                    Due date
                  </Label>
                  <StyledDateInput
                    value={nextDueDate}
                    onChange={setNextDueDate}
                    placeholder="Pick due date"
                    ariaLabel="Next follow-up due date"
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="next-follow-up-time"
                    className="text-xs font-semibold uppercase tracking-[0.06em] text-[#9CA3AF] dark:text-white/40"
                  >
                    Time (optional)
                  </Label>
                  <Input
                    id="next-follow-up-time"
                    type="time"
                    value={
                      nextDueAt
                        ? formatDateTimeLocalInput(new Date(nextDueAt)).slice(
                            11,
                            16,
                          )
                        : ""
                    }
                    onChange={(event) => {
                      const timeValue = event.currentTarget.value;
                      if (!timeValue) {
                        setNextDueAt(null);
                      } else {
                        const dateValue = nextDueDate || getTomorrowDateOnly();
                        const combined = `${dateValue}T${timeValue}`;
                        setNextDueAt(parseDateTimeLocalInput(combined));
                      }
                    }}
                    className="h-11 rounded-[16px] border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.05] text-sm text-[#111827] dark:text-white/90 placeholder:text-[#9CA3AF] dark:placeholder:text-white/40 shadow-none focus-visible:border-[var(--brand-600)] focus-visible:ring-[var(--brand-600)]/15 [color-scheme:light] dark:[color-scheme:dark]"
                  />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label
                    htmlFor="next-follow-up-note"
                    className="text-xs font-semibold uppercase tracking-[0.06em] text-[#9CA3AF] dark:text-white/40"
                  >
                    Next follow-up note
                  </Label>
                  <Textarea
                    id="next-follow-up-note"
                    value={nextNote}
                    onChange={(event) => setNextNote(event.currentTarget.value)}
                    placeholder="Optional context for the next step"
                    className="min-h-[84px] rounded-[16px] border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.05] text-sm leading-6 text-[#111827] dark:text-white/90 placeholder:text-[#9CA3AF] dark:placeholder:text-white/40 shadow-none focus-visible:border-[var(--brand-600)] focus-visible:ring-[var(--brand-600)]/15"
                  />
                </div>
              </div>
            ) : null}
          </div>

          {nextTitleMissing || nextDateMissing ? (
            <div className="rounded-[16px] border border-[#FDE68A] dark:border-amber-500/30 bg-[#FFFBEB] dark:bg-amber-500/10 px-3 py-2.5 text-sm text-[#92400E] dark:text-amber-200">
              {nextTitleMissing
                ? "Next follow-up title is required."
                : "Next follow-up due date is required."}
            </div>
          ) : null}
        </div>

        <DialogFooter className="shrink-0 gap-2 border-t border-[#F3F4F6] dark:border-white/10 bg-white dark:bg-[#0E0E1B] px-5 py-4 sm:px-6 sm:justify-between">
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-[16px] px-4 dark:bg-white/[0.04] dark:text-white/85 dark:border-white/10 dark:hover:bg-white/[0.08] dark:hover:text-white"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            {createNext ? (
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-[16px] px-4 dark:bg-white/[0.04] dark:text-white/85 dark:border-white/10 dark:hover:bg-white/[0.08] dark:hover:text-white"
                onClick={() => submit(false)}
                disabled={submitting}
              >
                Complete only
              </Button>
            ) : null}
            <Button
              type="button"
              className="h-10 rounded-[16px] bg-[var(--brand-600)] px-4 !text-white shadow-[0_6px_18px_rgba(91,91,179,0.26)] hover:bg-[var(--brand-700)] hover:!text-white disabled:opacity-50"
              onClick={() => submit(createNext)}
              disabled={submitting || nextTitleMissing || nextDateMissing}
            >
              {createNext ? "Complete and create next" : "Complete"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

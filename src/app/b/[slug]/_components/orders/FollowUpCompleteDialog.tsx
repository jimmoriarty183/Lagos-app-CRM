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
      <DialogContent className="max-w-[560px] rounded-[24px] border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.03] p-0 shadow-[0_24px_64px_rgba(15,23,42,0.18)]">
        <div className="space-y-5 px-5 py-5 sm:px-6 sm:py-6">
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="text-[18px] font-semibold text-[#111827]">
              Complete follow-up
            </DialogTitle>
            <DialogDescription className="text-sm leading-6 text-[#6B7280] dark:text-white/55">
              Close{" "}
              <span className="font-medium text-[#374151]">
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
              className="min-h-[92px] rounded-[18px] border-[#E5E7EB] dark:border-white/10 bg-[#F9FAFB] dark:bg-white/[0.04] text-sm leading-6 text-[#111827] shadow-none focus-visible:border-[var(--brand-600)] focus-visible:ring-[var(--brand-600)]/15"
            />
          </div>

          <div className="rounded-[20px] border border-[#E5E7EB] dark:border-white/10 bg-[#FBFCFE] p-4">
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
                    className="h-11 rounded-[16px] border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.03] text-sm shadow-none focus-visible:border-[var(--brand-600)] focus-visible:ring-[var(--brand-600)]/15"
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="next-follow-up-date"
                    className="text-xs font-semibold uppercase tracking-[0.06em] text-[#9CA3AF] dark:text-white/40"
                  >
                    Due date
                  </Label>
                  <Input
                    id="next-follow-up-date"
                    type="date"
                    value={nextDueDate}
                    onChange={(event) =>
                      setNextDueDate(event.currentTarget.value)
                    }
                    className="h-11 rounded-[16px] border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.03] text-sm shadow-none focus-visible:border-[var(--brand-600)] focus-visible:ring-[var(--brand-600)]/15"
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
                    className="h-11 rounded-[16px] border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.03] text-sm shadow-none focus-visible:border-[var(--brand-600)] focus-visible:ring-[var(--brand-600)]/15"
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
                    className="min-h-[84px] rounded-[16px] border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.03] text-sm leading-6 shadow-none focus-visible:border-[var(--brand-600)] focus-visible:ring-[var(--brand-600)]/15"
                  />
                </div>
              </div>
            ) : null}
          </div>

          {nextTitleMissing || nextDateMissing ? (
            <div className="rounded-[16px] border border-[#FDE68A] bg-[#FFFBEB] px-3 py-2.5 text-sm text-[#92400E]">
              {nextTitleMissing
                ? "Next follow-up title is required."
                : "Next follow-up due date is required."}
            </div>
          ) : null}

          <DialogFooter className="gap-2 border-t border-[#F3F4F6] pt-4 sm:justify-between">
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-[16px] px-4"
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
                  className="h-10 rounded-[16px] px-4"
                  onClick={() => submit(false)}
                  disabled={submitting}
                >
                  Complete only
                </Button>
              ) : null}
              <Button
                type="button"
                className="h-10 rounded-[16px] px-4"
                onClick={() => submit(createNext)}
                disabled={submitting || nextTitleMissing || nextDateMissing}
              >
                {createNext ? "Complete and create next" : "Complete"}
              </Button>
            </div>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

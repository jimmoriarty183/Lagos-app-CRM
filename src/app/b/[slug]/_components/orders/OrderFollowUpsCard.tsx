"use client";

import * as React from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  CalendarDays,
  Check,
  ChevronDown,
  CirclePlus,
  Loader2,
  RotateCcw,
  Bell,
  CheckSquare,
  Mail,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  completeFollowUp,
  createFollowUp,
  updateFollowUpStatus,
} from "@/app/b/[slug]/actions";
import { emitOrderActivityRefresh } from "@/app/b/[slug]/_components/orders/order-activity";
import {
  FollowUpCompleteDialog,
  type FollowUpCompletionValue,
} from "@/app/b/[slug]/_components/orders/FollowUpCompleteDialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TimeChip } from "@/components/TimeChip";
import { cn } from "@/components/ui/utils";
import {
  formatDateOnlyForStorage,
  formatDateTimeLocalInput,
  formatFollowUpDate,
  formatFollowUpDateTime,
  getRelativeFollowUpLabel,
  getTodayDateOnly,
  getTomorrowDateOnly,
  isOverdueDateOnly,
  sortFollowUpItems,
  type FollowUpRow,
} from "@/lib/follow-ups";

type QuickActionType = "meeting" | "reminder" | "task" | "message" | null;

type Props = {
  businessId: string;
  businessSlug: string;
  orderId: string;
  canManage: boolean;
  supabase: SupabaseClient;
  currentUserName?: string;
  userRole?: "OWNER" | "MANAGER" | "GUEST";
};

type FollowUpListItem = FollowUpRow;

// sortItems function removed - use sortFollowUpItems from @/lib/follow-ups instead

function getTimeChipStatus(
  item: FollowUpListItem,
): "normal" | "upcoming" | "overdue" {
  const today = getTodayDateOnly();
  if (isOverdueDateOnly(item.due_date, today)) {
    return "overdue";
  }

  if (item.due_at) {
    const now = new Date();
    const dueTime = new Date(item.due_at);
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    if (dueTime > now && dueTime <= twoHoursFromNow) {
      return "upcoming";
    }
  }

  return "normal";
}

function ActionButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-1 rounded-xl border-2 p-3 transition-all",
        active
          ? "border-[var(--brand-600)] bg-[var(--brand-600)]/10"
          : "border-[#E5E7EB] bg-white hover:border-[var(--brand-200)] hover:bg-[var(--brand-50)]",
      )}
    >
      <Icon
        className={cn(
          "h-5 w-5",
          active ? "text-[var(--brand-600)]" : "text-[#6B7280]",
        )}
      />
      <span
        className={cn(
          "text-xs font-medium",
          active ? "text-[var(--brand-600)]" : "text-[#374151]",
        )}
      >
        {label}
      </span>
    </button>
  );
}

function formatTimeWithAmPm(time24h: string): string {
  const [hours, minutes] = time24h.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const hours12 = hours % 12 || 12;
  return `${hours12}:${String(minutes).padStart(2, "0")} ${period}`;
}

const MEETING_DURATION_CUSTOM = "custom";
const MIN_MEETING_DURATION_MINUTES = 5;
const MAX_MEETING_DURATION_MINUTES = 24 * 60;

function parseMeetingDurationMinutes(data: {
  duration?: string;
  customDuration?: string;
}): number | null {
  const raw =
    data.duration === MEETING_DURATION_CUSTOM
      ? data.customDuration
      : (data.duration ?? "30");
  if (!raw) return null;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return null;
  if (
    parsed < MIN_MEETING_DURATION_MINUTES ||
    parsed > MAX_MEETING_DURATION_MINUTES
  ) {
    return null;
  }
  return parsed;
}

function MeetingQuickForm({
  data,
  onChange,
}: {
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
}) {
  const timeSlots = [
    "08:00",
    "08:30",
    "09:00",
    "09:30",
    "10:00",
    "10:30",
    "11:00",
    "11:30",
    "12:00",
    "12:30",
    "13:00",
    "13:30",
    "14:00",
    "14:30",
    "15:00",
    "15:30",
    "16:00",
    "16:30",
    "17:00",
    "17:30",
    "18:00",
    "18:30",
    "19:00",
    "19:30",
    "20:00",
    "20:30",
    "21:00",
    "21:30",
    "22:00",
    "22:30",
    "23:00",
    "23:30",
    "00:00",
    "00:30",
    "01:00",
    "01:30",
    "02:00",
    "02:30",
    "03:00",
    "03:30",
    "04:00",
    "04:30",
    "05:00",
    "05:30",
    "06:00",
    "06:30",
    "07:00",
    "07:30",
  ];

  const durationOptions = [
    { value: "15", label: "15 min" },
    { value: "30", label: "30 min" },
    { value: "45", label: "45 min" },
    { value: "60", label: "1 hour" },
    { value: "90", label: "1.5 hours" },
    { value: "120", label: "2 hours" },
  ];
  const rawDuration = String(data.duration || "30");
  const hasPresetDuration = durationOptions.some(
    (option) => option.value === rawDuration,
  );
  const selectedDuration =
    rawDuration === MEETING_DURATION_CUSTOM || !hasPresetDuration
      ? MEETING_DURATION_CUSTOM
      : rawDuration;
  const customDurationValue = String(
    data.customDuration ||
      (selectedDuration === MEETING_DURATION_CUSTOM &&
      rawDuration !== MEETING_DURATION_CUSTOM
        ? rawDuration
        : ""),
  );

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label
            htmlFor="meeting-date"
            className="text-xs font-medium text-[#374151]"
          >
            Date
          </Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="h-9 w-full justify-start rounded-full border-[#E5E7EB] bg-white text-sm font-normal"
              >
                <CalendarDays className="mr-2 h-3.5 w-3.5" />
                {data.date ? (
                  data.time ? (
                    <span className="truncate">
                      {formatFollowUpDate(String(data.date))} • {data.time} (
                      {formatTimeWithAmPm(String(data.time))})
                    </span>
                  ) : (
                    formatFollowUpDate(String(data.date))
                  )
                ) : (
                  <span className="text-[#9CA3AF]">Pick date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-auto rounded-xl border border-[#E5E7EB] bg-white p-0 shadow-lg"
              align="start"
            >
              <Calendar
                mode="single"
                selected={data.date ? new Date(String(data.date)) : undefined}
                onSelect={(date) => {
                  if (!date) return;
                  onChange({ ...data, date: formatDateOnlyForStorage(date) });
                }}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor="meeting-time"
            className="text-xs font-medium text-[#374151]"
          >
            Time
          </Label>
          <Select
            value={String(data.time || "")}
            onValueChange={(value) => onChange({ ...data, time: value })}
          >
            <SelectTrigger className="h-9 rounded-full border-[#E5E7EB] bg-white text-sm">
              {data.time ? (
                <span>
                  {data.time} ({formatTimeWithAmPm(String(data.time))})
                </span>
              ) : (
                <SelectValue placeholder="Select time" />
              )}
            </SelectTrigger>
            <SelectContent>
              {timeSlots.map((time) => (
                <SelectItem key={time} value={time}>
                  {time} ({formatTimeWithAmPm(time)})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label
          htmlFor="meeting-duration"
          className="text-xs font-medium text-[#374151]"
        >
          Duration
        </Label>
        <Select
          value={selectedDuration}
          onValueChange={(value) =>
            onChange({
              ...data,
              duration: value,
              customDuration:
                value === MEETING_DURATION_CUSTOM
                  ? String(data.customDuration || "")
                  : "",
            })
          }
        >
          <SelectTrigger className="h-9 rounded-full border-[#E5E7EB] bg-white text-sm">
            <SelectValue placeholder="Select duration" />
          </SelectTrigger>
          <SelectContent>
            {durationOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
            <SelectItem value={MEETING_DURATION_CUSTOM}>
              Custom duration
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {selectedDuration === MEETING_DURATION_CUSTOM ? (
        <div className="space-y-1.5">
          <Label
            htmlFor="meeting-custom-duration"
            className="text-xs font-medium text-[#374151]"
          >
            Custom duration (minutes)
          </Label>
          <Input
            id="meeting-custom-duration"
            type="number"
            min={MIN_MEETING_DURATION_MINUTES}
            max={MAX_MEETING_DURATION_MINUTES}
            step={5}
            value={customDurationValue}
            onChange={(e) =>
              onChange({
                ...data,
                duration: MEETING_DURATION_CUSTOM,
                customDuration: e.target.value,
              })
            }
            placeholder="e.g. 150"
            className="h-9 rounded-full border-[#E5E7EB] bg-white text-sm"
          />
        </div>
      ) : null}

      <div className="space-y-1.5">
        <Label
          htmlFor="meeting-description"
          className="text-xs font-medium text-[#374151]"
        >
          Description
        </Label>
        <Textarea
          id="meeting-description"
          value={String(data.description || "")}
          onChange={(e) => onChange({ ...data, description: e.target.value })}
          placeholder="Meeting description..."
          className="min-h-[60px] rounded-[16px] border-[#E5E7EB] bg-white text-sm"
          rows={2}
        />
      </div>
    </>
  );
}

function ReminderQuickForm({
  data,
  onChange,
}: {
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
}) {
  const timeSlots = [
    "08:00",
    "08:30",
    "09:00",
    "09:30",
    "10:00",
    "10:30",
    "11:00",
    "11:30",
    "12:00",
    "12:30",
    "13:00",
    "13:30",
    "14:00",
    "14:30",
    "15:00",
    "15:30",
    "16:00",
    "16:30",
    "17:00",
    "17:30",
    "18:00",
    "18:30",
    "19:00",
    "19:30",
    "20:00",
    "20:30",
    "21:00",
    "21:30",
    "22:00",
    "22:30",
    "23:00",
    "23:30",
    "00:00",
    "00:30",
    "01:00",
    "01:30",
    "02:00",
    "02:30",
    "03:00",
    "03:30",
    "04:00",
    "04:30",
    "05:00",
    "05:30",
    "06:00",
    "06:30",
    "07:00",
    "07:30",
  ];

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label
            htmlFor="reminder-date"
            className="text-xs font-medium text-[#374151]"
          >
            Date
          </Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="h-9 w-full justify-start rounded-full border-[#E5E7EB] bg-white text-sm font-normal"
              >
                <Bell className="mr-2 h-3.5 w-3.5" />
                {data.dateTime ? (
                  (() => {
                    const dateStr = formatFollowUpDate(String(data.dateTime));
                    const timeStr = formatDateTimeLocalInput(
                      new Date(String(data.dateTime)),
                    ).slice(11, 16);
                    return (
                      <span className="truncate">
                        {dateStr} • {timeStr} ({formatTimeWithAmPm(timeStr)})
                      </span>
                    );
                  })()
                ) : (
                  <span className="text-[#9CA3AF]">Pick date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-auto rounded-xl border border-[#E5E7EB] bg-white p-0 shadow-lg"
              align="start"
            >
              <Calendar
                mode="single"
                selected={
                  data.dateTime ? new Date(String(data.dateTime)) : undefined
                }
                onSelect={(date) => {
                  if (!date) return;
                  const current = data.dateTime
                    ? new Date(String(data.dateTime))
                    : new Date();
                  current.setFullYear(
                    date.getFullYear(),
                    date.getMonth(),
                    date.getDate(),
                  );
                  onChange({ ...data, dateTime: current.toISOString() });
                }}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor="reminder-time"
            className="text-xs font-medium text-[#374151]"
          >
            Time
          </Label>
          <Select
            value={
              data.dateTime
                ? formatDateTimeLocalInput(
                    new Date(String(data.dateTime)),
                  ).slice(11, 16)
                : ""
            }
            onValueChange={(value) => {
              const current = data.dateTime
                ? new Date(String(data.dateTime))
                : new Date();
              const [hours, minutes] = value.split(":").map(Number);
              current.setHours(hours, minutes);
              onChange({ ...data, dateTime: current.toISOString() });
            }}
          >
            <SelectTrigger className="h-9 rounded-full border-[#E5E7EB] bg-white text-sm">
              {data.dateTime ? (
                (() => {
                  const timeValue = formatDateTimeLocalInput(
                    new Date(String(data.dateTime)),
                  ).slice(11, 16);
                  return (
                    <span>
                      {timeValue} ({formatTimeWithAmPm(timeValue)})
                    </span>
                  );
                })()
              ) : (
                <SelectValue placeholder="Select time" />
              )}
            </SelectTrigger>
            <SelectContent>
              {timeSlots.map((time) => (
                <SelectItem key={time} value={time}>
                  {time} ({formatTimeWithAmPm(time)})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label
          htmlFor="reminder-note"
          className="text-xs font-medium text-[#374151]"
        >
          Note
        </Label>
        <Input
          id="reminder-note"
          value={String(data.note || "")}
          onChange={(e) => onChange({ ...data, note: e.target.value })}
          placeholder="Reminder note..."
          className="h-9 rounded-full border-[#E5E7EB] bg-white text-sm"
        />
      </div>
    </>
  );
}

function TaskQuickForm({
  data,
  onChange,
}: {
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
}) {
  const timeSlots = [
    "08:00",
    "08:30",
    "09:00",
    "09:30",
    "10:00",
    "10:30",
    "11:00",
    "11:30",
    "12:00",
    "12:30",
    "13:00",
    "13:30",
    "14:00",
    "14:30",
    "15:00",
    "15:30",
    "16:00",
    "16:30",
    "17:00",
    "17:30",
    "18:00",
    "18:30",
    "19:00",
    "19:30",
    "20:00",
    "20:30",
    "21:00",
    "21:30",
    "22:00",
    "22:30",
    "23:00",
    "23:30",
    "00:00",
    "00:30",
    "01:00",
    "01:30",
    "02:00",
    "02:30",
    "03:00",
    "03:30",
    "04:00",
    "04:30",
    "05:00",
    "05:30",
    "06:00",
    "06:30",
    "07:00",
    "07:30",
  ];

  return (
    <>
      <div className="space-y-1.5">
        <Label
          htmlFor="task-title"
          className="text-xs font-medium text-[#374151]"
        >
          Title
        </Label>
        <Input
          id="task-title"
          value={String(data.title || "")}
          onChange={(e) => onChange({ ...data, title: e.target.value })}
          placeholder="Task title..."
          className="h-9 rounded-full border-[#E5E7EB] bg-white text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label
            htmlFor="task-deadline"
            className="text-xs font-medium text-[#374151]"
          >
            Deadline
          </Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="h-9 w-full justify-start rounded-full border-[#E5E7EB] bg-white text-sm font-normal"
              >
                <CheckSquare className="mr-2 h-3.5 w-3.5" />
                {data.deadline ? (
                  data.time ? (
                    <span className="truncate">
                      {formatFollowUpDate(String(data.deadline))} • {data.time}{" "}
                      ({formatTimeWithAmPm(String(data.time))})
                    </span>
                  ) : (
                    formatFollowUpDate(String(data.deadline))
                  )
                ) : (
                  <span className="text-[#9CA3AF]">Pick deadline</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-auto rounded-xl border border-[#E5E7EB] bg-white p-0 shadow-lg"
              align="start"
            >
              <Calendar
                mode="single"
                selected={
                  data.deadline ? new Date(String(data.deadline)) : undefined
                }
                onSelect={(date) => {
                  if (!date) return;
                  onChange({
                    ...data,
                    deadline: formatDateOnlyForStorage(date),
                  });
                }}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor="task-time"
            className="text-xs font-medium text-[#374151]"
          >
            Time <span className="text-[#9CA3AF] font-normal">(optional)</span>
          </Label>
          <Select
            value={String(data.time || "")}
            onValueChange={(value) => onChange({ ...data, time: value })}
          >
            <SelectTrigger className="h-9 rounded-full border-[#E5E7EB] bg-white text-sm">
              {data.time ? (
                <span>
                  {data.time} ({formatTimeWithAmPm(String(data.time))})
                </span>
              ) : (
                <SelectValue placeholder="Select time" />
              )}
            </SelectTrigger>
            <SelectContent>
              {timeSlots.map((time) => (
                <SelectItem key={time} value={time}>
                  {time} ({formatTimeWithAmPm(time)})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label
          htmlFor="task-description"
          className="text-xs font-medium text-[#374151]"
        >
          Description
        </Label>
        <Textarea
          id="task-description"
          value={String(data.description || "")}
          onChange={(e) => onChange({ ...data, description: e.target.value })}
          placeholder="Task description..."
          className="min-h-[60px] rounded-[16px] border-[#E5E7EB] bg-white text-sm"
          rows={2}
        />
      </div>
    </>
  );
}

function MessageQuickForm({
  data,
  onChange,
}: {
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
}) {
  return (
    <>
      <div className="space-y-1.5">
        <Label
          htmlFor="message-recipient"
          className="text-xs font-medium text-[#374151]"
        >
          Recipient
        </Label>
        <Input
          id="message-recipient"
          type="email"
          value={String(data.recipient || "")}
          onChange={(e) => onChange({ ...data, recipient: e.target.value })}
          placeholder="email@example.com"
          className="h-9 rounded-full border-[#E5E7EB] bg-white text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <Label
          htmlFor="message-subject"
          className="text-xs font-medium text-[#374151]"
        >
          Subject
        </Label>
        <Input
          id="message-subject"
          value={String(data.subject || "")}
          onChange={(e) => onChange({ ...data, subject: e.target.value })}
          placeholder="Email subject..."
          className="h-9 rounded-full border-[#E5E7EB] bg-white text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <Label
          htmlFor="message-body"
          className="text-xs font-medium text-[#374151]"
        >
          Message
        </Label>
        <Textarea
          id="message-body"
          value={String(data.body || "")}
          onChange={(e) => onChange({ ...data, body: e.target.value })}
          placeholder="Write your message..."
          className="min-h-[80px] rounded-[16px] border-[#E5E7EB] bg-white text-sm"
          rows={3}
        />
      </div>
    </>
  );
}

function DueBadge({ dueDate }: { dueDate: string }) {
  const today = getTodayDateOnly();
  const overdue = isOverdueDateOnly(dueDate, today);
  const label = getRelativeFollowUpLabel(dueDate, today);

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold",
        overdue
          ? "border-[#FECACA] bg-[#FEF2F2] text-[#B42318]"
          : dueDate === today
            ? "border-[#C7D2FE] bg-[#EEF2FF] text-[#3645A0]"
            : "border-[#E5E7EB] bg-[#F9FAFB] text-[#4B5563]",
      )}
      title={formatFollowUpDate(dueDate)}
    >
      {label}
    </span>
  );
}

function FollowUpItemRow({
  item,
  canManage,
  onToggleDone,
  onReopen,
}: {
  item: FollowUpListItem;
  canManage: boolean;
  onToggleDone: (item: FollowUpListItem, done: boolean) => void;
  onReopen: (item: FollowUpListItem) => void;
}) {
  const completed = item.status === "done";
  const timeLabel = item.due_at ? formatFollowUpDateTime(item.due_at) : null;

  return (
    <div
      className={cn(
        "rounded-[18px] border px-3.5 py-3 transition",
        completed
          ? "border-[#E5E7EB] bg-[#FBFBFC]"
          : "border-[#E8ECF3] bg-white shadow-[0_4px_14px_rgba(15,23,42,0.04)]",
      )}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          disabled={!canManage}
          onClick={() => onToggleDone(item, !completed)}
          className={cn(
            "mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition",
            completed
              ? "border-[#D1FADF] bg-[#ECFDF3] text-[#067647]"
              : "border-[#D9E2EC] bg-[#F9FAFB] text-[#9CA3AF] hover:border-[var(--brand-200)] hover:text-[var(--brand-700)]",
          )}
          aria-label={completed ? "Reopen follow-up" : "Mark follow-up as done"}
        >
          {completed ? (
            <RotateCcw className="h-4 w-4" />
          ) : (
            <Check className="h-4 w-4" />
          )}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "text-sm font-semibold",
                  completed ? "text-[#6B7280] line-through" : "text-[#1F2937]",
                )}
              >
                {item.title}
              </div>
              {timeLabel ? (
                <TimeChip time={timeLabel} status={getTimeChipStatus(item)} />
              ) : null}
            </div>
            <DueBadge dueDate={item.due_date} />
            {item.status === "cancelled" ? (
              <span className="inline-flex items-center rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-2.5 py-1 text-[11px] font-semibold text-[#6B7280]">
                Cancelled
              </span>
            ) : null}
          </div>
          {item.note?.trim() ? (
            <p className="mt-1.5 whitespace-pre-wrap text-xs leading-5 text-[#6B7280]">
              {item.note.trim()}
            </p>
          ) : null}
          {item.completion_note?.trim() ? (
            <p className="mt-1.5 whitespace-pre-wrap text-xs leading-5 text-[#475467]">
              Completed note: {item.completion_note.trim()}
            </p>
          ) : null}
          {completed && canManage ? (
            <button
              type="button"
              onClick={() => onReopen(item)}
              className="mt-2 text-xs font-semibold text-[var(--brand-700)] transition hover:text-[var(--brand-800)]"
            >
              Reopen
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function OrderFollowUpsCard({
  businessId,
  businessSlug,
  orderId,
  canManage,
  supabase,
}: Props) {
  const router = useRouter();
  const [items, setItems] = React.useState<FollowUpListItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [completedOpen, setCompletedOpen] = React.useState(false);
  const [completeDialogItem, setCompleteDialogItem] =
    React.useState<FollowUpListItem | null>(null);
  const [quickActionType, setQuickActionType] =
    React.useState<QuickActionType>(null);
  const [quickActionData, setQuickActionData] = React.useState<
    Record<string, unknown>
  >({});

  const loadItems = React.useCallback(async () => {
    setLoading(true);

    // Try with due_at first
    let { data, error } = await supabase
      .from("follow_ups")
      .select(
        "id, business_id, workspace_id, order_id, title, due_date, due_at, status, completed_at, created_at, updated_at, created_by, completed_by, next_follow_up_id, note, completion_note, source, action_type, action_payload",
      )
      .eq("business_id", businessId)
      .eq("order_id", orderId)
      .order("due_date", { ascending: true })
      .order("created_at", { ascending: false });

    // Fallback without due_at if schema cache is stale or column doesn't exist
    if (error) {
      const msg = String(error.message ?? "").toLowerCase();
      if (
        (msg.includes("due_at") && msg.includes("schema cache")) ||
        (msg.includes("action_type") && msg.includes("schema cache")) ||
        (msg.includes("action_payload") && msg.includes("schema cache")) ||
        (msg.includes("column") && msg.includes("does not exist"))
      ) {
        const { data: fallbackData, error: fallbackError } = await supabase
          .from("follow_ups")
          .select(
            "id, business_id, workspace_id, order_id, title, due_date, status, completed_at, created_at, updated_at, created_by, completed_by, next_follow_up_id, note, completion_note, source",
          )
          .eq("business_id", businessId)
          .eq("order_id", orderId)
          .order("due_date", { ascending: true })
          .order("created_at", { ascending: false });

        data = fallbackData;
        error = fallbackError;
      }
    }

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    setItems(sortFollowUpItems((data ?? []) as FollowUpListItem[]));
    setErrorMessage(null);
    setLoading(false);
  }, [businessId, orderId, supabase]);

  React.useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const openItems = items.filter((item) => item.status === "open");
  const completedItems = items.filter((item) => item.status !== "open");

  async function patchStatus(
    item: FollowUpListItem,
    status: FollowUpListItem["status"],
  ) {
    setSaving(true);
    setErrorMessage(null);
    const previous = items;
    const optimistic: FollowUpListItem = {
      ...item,
      status,
      completed_at: status === "done" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    };

    setItems((current) =>
      sortFollowUpItems(
        current.map((entry) => (entry.id === item.id ? optimistic : entry)),
      ),
    );

    try {
      const updated = (await updateFollowUpStatus({
        followUpId: item.id,
        businessSlug,
        status,
      })) as FollowUpListItem;

      setItems((current) =>
        sortFollowUpItems(
          current.map((entry) => (entry.id === item.id ? updated : entry)),
        ),
      );
      emitOrderActivityRefresh(businessId, orderId);
      router.refresh();
    } catch (error) {
      setItems(previous);
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to update follow-up",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleComplete(value: FollowUpCompletionValue) {
    if (!completeDialogItem) return;

    setSaving(true);
    setErrorMessage(null);
    const currentItem = completeDialogItem;
    const previous = items;
    const optimisticCompleted: FollowUpListItem = {
      ...currentItem,
      status: "done",
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      completion_note: value.completionNote,
      next_follow_up_id: null,
    };

    setItems((current) =>
      sortFollowUpItems(
        current.map((entry) =>
          entry.id === currentItem.id ? optimisticCompleted : entry,
        ),
      ),
    );

    try {
      const result = (await completeFollowUp({
        followUpId: currentItem.id,
        businessSlug,
        completionNote: value.completionNote,
        nextFollowUp: value.nextFollowUp,
      })) as { completed: FollowUpListItem; next: FollowUpListItem | null };

      setItems((current) =>
        sortFollowUpItems([
          ...(result.next ? [result.next] : []),
          ...current
            .filter(
              (entry) =>
                entry.id !== currentItem.id && entry.id !== result.next?.id,
            )
            .map((entry) => entry),
          result.completed,
        ]),
      );
      setCompleteDialogItem(null);
      emitOrderActivityRefresh(businessId, orderId);
      router.refresh();
    } catch (error) {
      setItems(previous);
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to complete follow-up",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleQuickActionSubmit() {
    if (!quickActionType) return;

    setSaving(true);
    setErrorMessage(null);

    try {
      let title = "";
      let dueDateValue = "";
      let dueAtValue: string | null = null;
      let noteValue: string | null = null;
      let actionPayload: Record<string, unknown> = {};

      switch (quickActionType) {
        case "meeting": {
          const meetingData = quickActionData as {
            date?: string;
            time?: string;
            duration?: string;
            customDuration?: string;
            description?: string;
          };
          const meetingDurationMinutes =
            parseMeetingDurationMinutes(meetingData);
          if (!meetingDurationMinutes) {
            setErrorMessage(
              `Meeting duration must be between ${MIN_MEETING_DURATION_MINUTES} and ${MAX_MEETING_DURATION_MINUTES} minutes`,
            );
            setSaving(false);
            return;
          }
          title = `Meeting: ${meetingData.description || "Follow-up meeting"}`;
          dueDateValue = meetingData.date || getTodayDateOnly();
          if (meetingData.date && meetingData.time) {
            dueAtValue = new Date(
              `${dueDateValue}T${meetingData.time}`,
            ).toISOString();
          }
          noteValue = `Meeting scheduled for ${meetingDurationMinutes} minutes`;
          actionPayload = {
            duration: String(meetingDurationMinutes),
            description: meetingData.description?.trim() ?? "",
          };
          break;
        }
        case "reminder": {
          const reminderData = quickActionData as {
            dateTime?: string;
            note?: string;
          };
          title = `Reminder: ${reminderData.note || "Follow-up reminder"}`;
          if (reminderData.dateTime) {
            dueDateValue = formatDateOnlyForStorage(
              new Date(reminderData.dateTime),
            );
            dueAtValue = new Date(reminderData.dateTime).toISOString();
          }
          noteValue = reminderData.note || null;
          actionPayload = {
            note: reminderData.note?.trim() ?? "",
          };
          break;
        }
        case "task": {
          const taskData = quickActionData as {
            title?: string;
            deadline?: string;
            time?: string;
            description?: string;
          };
          title = taskData.title || "Task";
          dueDateValue = taskData.deadline || getTodayDateOnly();
          if (taskData.deadline && taskData.time) {
            dueAtValue = new Date(
              `${dueDateValue}T${taskData.time}`,
            ).toISOString();
          }
          noteValue = taskData.description || null;
          actionPayload = {
            description: taskData.description?.trim() ?? "",
            time: taskData.time?.trim() ?? "",
          };
          break;
        }
        case "message": {
          const messageData = quickActionData as {
            subject?: string;
            recipient?: string;
            body?: string;
          };
          title = `Message: ${messageData.subject || "Email/Message"}`;
          dueDateValue = getTodayDateOnly();
          noteValue = `To: ${messageData.recipient}\n\n${messageData.body || ""}`;
          actionPayload = {
            recipient: messageData.recipient?.trim() ?? "",
            subject: messageData.subject?.trim() ?? "",
            body: messageData.body?.trim() ?? "",
          };
          break;
        }
      }

      if (!title.trim()) {
        setErrorMessage("Title is required");
        setSaving(false);
        return;
      }

      const payload = {
        businessId,
        businessSlug,
        orderId,
        title,
        dueDate: dueDateValue || getTodayDateOnly(),
        dueAt: dueAtValue,
        note: noteValue,
        actionType: quickActionType,
        actionPayload,
      };

      const created = (await createFollowUp(payload)) as FollowUpListItem;
      setItems((current) => sortFollowUpItems([created, ...current]));
      setQuickActionType(null);
      setQuickActionData({});
      emitOrderActivityRefresh(businessId, orderId);
      router.refresh();

      toast.success("Follow-up created successfully");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to create follow-up",
      );
      toast.error("Failed to create follow-up");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-[20px] border border-[#E5E7EB] bg-[linear-gradient(180deg,#ffffff_0%,#F9FAFB_100%)] p-4 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
      <div className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="product-section-title flex items-center gap-2">
              <span>Follow-up</span>
              <span className="text-xs font-semibold text-[#9CA3AF]">
                ({openItems.length})
              </span>
            </div>
            <p className="mt-1 text-sm text-[#6B7280]">
              Planned future actions for this order, separate from notes,
              activity, and checklist.
            </p>
          </div>
          {canManage && !quickActionType && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setQuickActionType("meeting")}
              className="h-9 gap-2 rounded-full border-[#E5E7EB] bg-white text-sm font-semibold text-[#374151] hover:border-[var(--brand-200)] hover:bg-[var(--brand-50)] hover:text-[var(--brand-600)]"
            >
              <CirclePlus className="h-4 w-4" />
              Quick Action
            </Button>
          )}
        </div>

        {canManage && quickActionType && (
          <div className="rounded-[18px] border border-[#C7D2FE] bg-[#EEF2FF] p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-[#3645A0]">
                Create{" "}
                {quickActionType === "meeting"
                  ? "Meeting"
                  : quickActionType === "reminder"
                    ? "Reminder"
                    : quickActionType === "task"
                      ? "Task"
                      : "Message"}
              </span>
              <button
                type="button"
                onClick={() => {
                  setQuickActionType(null);
                  setQuickActionData({});
                }}
                className="text-xs font-medium text-[#6B7280] hover:text-[#EF4444] transition"
              >
                Cancel
              </button>
            </div>

            <div className="mb-3 flex gap-2">
              <ActionButton
                active={quickActionType === "meeting"}
                onClick={() => setQuickActionType("meeting")}
                icon={CalendarDays}
                label="Meeting"
              />
              <ActionButton
                active={quickActionType === "reminder"}
                onClick={() => setQuickActionType("reminder")}
                icon={Bell}
                label="Reminder"
              />
              <ActionButton
                active={quickActionType === "task"}
                onClick={() => setQuickActionType("task")}
                icon={CheckSquare}
                label="Task"
              />
              <ActionButton
                active={quickActionType === "message"}
                onClick={() => setQuickActionType("message")}
                icon={Mail}
                label="Message"
              />
            </div>

            <div className="space-y-3">
              {quickActionType === "meeting" && (
                <MeetingQuickForm
                  data={quickActionData}
                  onChange={setQuickActionData}
                />
              )}
              {quickActionType === "reminder" && (
                <ReminderQuickForm
                  data={quickActionData}
                  onChange={setQuickActionData}
                />
              )}
              {quickActionType === "task" && (
                <TaskQuickForm
                  data={quickActionData}
                  onChange={setQuickActionData}
                />
              )}
              {quickActionType === "message" && (
                <MessageQuickForm
                  data={quickActionData}
                  onChange={setQuickActionData}
                />
              )}
            </div>

            <div className="mt-4 flex justify-end">
              <Button
                type="button"
                onClick={() => void handleQuickActionSubmit()}
                disabled={saving}
                className="h-9 rounded-full px-4 text-sm"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <CirclePlus className="mr-2 h-4 w-4" />
                    Create{" "}
                    {quickActionType === "meeting"
                      ? "Meeting"
                      : quickActionType === "reminder"
                        ? "Reminder"
                        : quickActionType === "task"
                          ? "Task"
                          : "Message"}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="rounded-[18px] border border-[#E5E7EB] bg-white px-4 py-8 text-sm text-[#6B7280] shadow-[0_4px_14px_rgba(15,23,42,0.04)]">
            Loading follow-ups...
          </div>
        ) : openItems.length === 0 ? (
          <div className="rounded-[18px] border border-dashed border-[#E5E7EB] bg-white/80 px-4 py-8 text-center">
            <div className="text-sm font-semibold text-[#1F2937]">
              No open follow-ups yet
            </div>
            <p className="mt-1 text-sm leading-6 text-[#6B7280]">
              Add the next action for this order so future commitments do not
              get lost in notes.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {openItems.map((item) => (
              <FollowUpItemRow
                key={item.id}
                item={item}
                canManage={canManage}
                onToggleDone={(current, done) =>
                  done
                    ? setCompleteDialogItem(current)
                    : void patchStatus(current, "open")
                }
                onReopen={(current) => void patchStatus(current, "open")}
              />
            ))}
          </div>
        )}

        {completedItems.length > 0 ? (
          <Collapsible open={completedOpen} onOpenChange={setCompletedOpen}>
            <div className="rounded-[18px] border border-[#E5E7EB] bg-white/70 px-3.5 py-3">
              <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 text-left">
                <div>
                  <div className="text-sm font-semibold text-[#1F2937]">
                    Completed and cancelled
                  </div>
                  <div className="mt-1 text-xs text-[#9CA3AF]">
                    {completedItems.length} items
                  </div>
                </div>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-[#6B7280] transition",
                    completedOpen ? "rotate-180" : "",
                  )}
                />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3 space-y-2.5">
                {completedItems.map((item) => (
                  <FollowUpItemRow
                    key={item.id}
                    item={item}
                    canManage={canManage}
                    onToggleDone={(current, done) =>
                      done
                        ? setCompleteDialogItem(current)
                        : void patchStatus(current, "open")
                    }
                    onReopen={(current) => void patchStatus(current, "open")}
                  />
                ))}
              </CollapsibleContent>
            </div>
          </Collapsible>
        ) : null}
      </div>

      <FollowUpCompleteDialog
        item={completeDialogItem}
        open={Boolean(completeDialogItem)}
        submitting={saving}
        onOpenChange={(open) => {
          if (!open) setCompleteDialogItem(null);
        }}
        onSubmit={(value) => void handleComplete(value)}
      />
    </div>
  );
}

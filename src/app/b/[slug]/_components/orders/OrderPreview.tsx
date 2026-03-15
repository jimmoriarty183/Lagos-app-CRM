"use client";

import * as React from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  Check,
  ChevronDown,
  MessageSquareText,
  Tag,
  X,
} from "lucide-react";

import { OrderChecklist } from "@/app/b/[slug]/OrderChecklist";
import { OrderComments } from "@/app/b/[slug]/OrderComments";
import { setOrderManager, setOrderStatus, updateOrder } from "@/app/b/[slug]/actions";
import { normalizeOrderClient } from "@/lib/order-client";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { statusTone } from "@/app/b/[slug]/statusTone";

type Status =
  | "NEW"
  | "IN_PROGRESS"
  | "WAITING_PAYMENT"
  | "DONE"
  | "CANCELED"
  | "DUPLICATE";

type TeamActor = {
  id: string;
  label: string;
  kind: "OWNER" | "MANAGER";
};

type OrderRow = {
  id: string;
  client_name: string | null;
  client_first_name?: string | null;
  client_last_name?: string | null;
  client_full_name?: string | null;
  client_phone: string | null;
  amount: number;
  description: string | null;
  due_date: string | null;
  status: Status;
  order_number: number | null;
  created_at: string;
  manager_id: string | null;
  manager_name: string | null;
  created_by?: string | null;
  created_by_name?: string | null;
  created_by_role?: "OWNER" | "MANAGER" | null;
};

type Props = {
  open: boolean;
  order: OrderRow | null;
  businessId: string;
  businessSlug: string;
  phoneRaw: string;
  userRole: "OWNER" | "MANAGER" | "GUEST";
  canManage: boolean;
  currentUserName: string;
  actors: TeamActor[];
  supabase: SupabaseClient;
  onClose: () => void;
};

type ActivityEvent = {
  id: string;
  actorName: string;
  actorRole?: string | null;
  description: string;
  ts: string;
  tone?: "default" | "success" | "warning";
};

type LocalActivityEvent = {
  id: string;
  type: "status_changed" | "label_added" | "label_removed" | "order_updated" | "manager_changed";
  actorName: string;
  actorRole?: string | null;
  description: string;
  ts: string;
};

type ChecklistActivityRow = {
  id: string;
  title: string;
  created_at: string;
  done_at: string | null;
  is_done: boolean;
};

type CommentActivityRow = {
  id: string;
  body: string;
  author_phone: string | null;
  author_role: string | null;
  created_at: string;
};

const LABEL_SUGGESTIONS = ["urgent", "VIP", "paid", "callback", "installation", "follow-up"];
const STATUS_OPTIONS: Array<{ value: Status; label: string }> = [
  { value: "NEW", label: "New" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "WAITING_PAYMENT", label: "Waiting payment" },
  { value: "DONE", label: "Done" },
  { value: "CANCELED", label: "Canceled" },
  { value: "DUPLICATE", label: "Duplicate" },
];

function statusLabel(status: Status) {
  return STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status;
}

function getActivityStorageKey(businessId: string, orderId: string) {
  return `order-activity:${businessId}:${orderId}`;
}

function getSuggestedLabelsStorageKey(businessId: string) {
  return `order-label-suggestions:${businessId}`;
}

function readSuggestedLabels(businessId: string) {
  if (typeof window === "undefined") return [] as string[];
  try {
    const raw = window.localStorage.getItem(getSuggestedLabelsStorageKey(businessId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function saveSuggestedLabel(businessId: string, label: string) {
  if (typeof window === "undefined") return;
  const normalized = label.trim();
  if (!normalized) return;

  const previous = readSuggestedLabels(businessId);
  const next: string[] = [];
  const seen = new Set<string>();
  for (const item of [
    normalized,
    ...previous,
    ...LABEL_SUGGESTIONS,
  ]) {
    const candidate = item.trim();
    const key = candidate.toLowerCase();
    if (!candidate || seen.has(key)) continue;
    seen.add(key);
    next.push(candidate);
    if (next.length >= 12) break;
  }

  window.localStorage.setItem(getSuggestedLabelsStorageKey(businessId), JSON.stringify(next));
}

function dedupeLocalActivityEvents(events: LocalActivityEvent[]) {
  const deduped: LocalActivityEvent[] = [];
  const seen = new Set<string>();

  for (const event of events) {
    if (!event?.id || seen.has(event.id)) continue;
    seen.add(event.id);
    deduped.push(event);
  }

  return deduped;
}

function readLocalActivityEvents(businessId: string, orderId: string) {
  if (typeof window === "undefined") return [] as LocalActivityEvent[];
  try {
    const raw = window.localStorage.getItem(getActivityStorageKey(businessId, orderId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const deduped = dedupeLocalActivityEvents(parsed as LocalActivityEvent[]);
    if (deduped.length !== parsed.length) {
      window.localStorage.setItem(getActivityStorageKey(businessId, orderId), JSON.stringify(deduped));
    }
    return deduped;
  } catch {
    return [];
  }
}

function appendLocalActivityEvent(businessId: string, orderId: string, event: LocalActivityEvent) {
  if (typeof window === "undefined") return;
  const next = dedupeLocalActivityEvents([...readLocalActivityEvents(businessId, orderId), event]).slice(-50);
  window.localStorage.setItem(getActivityStorageKey(businessId, orderId), JSON.stringify(next));
}

function makeLocalActivityEventId(prefix: string) {
  const randomPart =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}-${randomPart}`;
}

function fmtAmount(n: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Number(n || 0));
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(value: string | null) {
  if (!value) return "No due date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatPhoneValue(value: string | null) {
  return value?.trim() || "No phone number";
}

function formatDescriptionValue(value: string | null) {
  const text = value?.trim() || "";
  if (!text) return "No description";
  return text.length > 72 ? `"${text.slice(0, 72)}..."` : `"${text}"`;
}

function formatAmountValue(value: number | string | null) {
  const amount = Number(value || 0);
  return `$${fmtAmount(amount)}`;
}

function ActorAvatar({ label }: { label: string }) {
  const initials = label
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "?";

  return (
    <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#111827] text-[10px] font-semibold text-white">
      {initials}
    </span>
  );
}

function DrawerStatusSelect({
  orderId,
  businessId,
  businessSlug,
  value,
  canManage,
  currentUserName,
  userRole,
  onCommitted,
}: {
  orderId: string;
  businessId: string;
  businessSlug: string;
  value: Status;
  canManage: boolean;
  currentUserName: string;
  userRole: "OWNER" | "MANAGER" | "GUEST";
  onCommitted?: (nextStatus: Status) => void;
}) {
  const [localStatus, setLocalStatus] = React.useState<Status>(value);
  const [open, setOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();

  React.useEffect(() => {
    setLocalStatus(value);
  }, [value]);

  const tone = statusTone(localStatus);

  return (
    <DropdownMenu modal={false} open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={!canManage || isPending}
          className="inline-flex h-[25px] min-w-[116px] items-center justify-between gap-2 rounded-full px-[11px] text-left text-[12px] font-medium leading-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111827]/10 disabled:cursor-default disabled:opacity-60"
          style={{
            background: tone.background,
            color: tone.color,
          }}
        >
          <span className="inline-flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="h-[6px] w-[6px] rounded-full"
              style={{ background: tone.dot }}
            />
            <span>{statusLabel(localStatus)}</span>
          </span>
          {canManage ? <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" /> : null}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={8}
        className="z-[120] w-56 rounded-xl border-[#dde3ee] bg-white p-1.5 shadow-[0_16px_40px_rgba(15,23,42,0.14)]"
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        {STATUS_OPTIONS.map((option) => {
          const optionTone = statusTone(option.value);
          const selected = option.value === localStatus;

          return (
            <DropdownMenuItem
              key={option.value}
              className="rounded-lg px-3 py-2 text-sm font-medium text-[#182230] focus:bg-[#f8fafc] focus:text-[#182230]"
              onSelect={(event) => {
                event.preventDefault();
                if (option.value === localStatus) {
                  setOpen(false);
                  return;
                }

                const next = option.value;
                const prevStatus = localStatus;
                setOpen(false);
                setLocalStatus(next);

                startTransition(async () => {
                  try {
                    await setOrderStatus({ orderId, businessSlug, status: next });
                    onCommitted?.(next);
                    appendLocalActivityEvent(businessId, orderId, {
                      id: makeLocalActivityEventId("status"),
                      type: "status_changed",
                      actorName: currentUserName || "Manager",
                      actorRole: userRole,
                      description: `changed status from "${statusLabel(prevStatus)}" to "${statusLabel(next)}"`,
                      ts: new Date().toISOString(),
                    });
                  } catch (error) {
                    setLocalStatus(prevStatus);
                    window.alert(error instanceof Error ? error.message : "Failed to update status.");
                  }
                });
              }}
              style={{
                background: selected ? optionTone.selectedBackground : undefined,
                color: selected ? optionTone.color : undefined,
              }}
            >
              <div className="flex w-full items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="h-[6px] w-[6px] rounded-full"
                    style={{ background: optionTone.dot }}
                  />
                  <span>{option.label}</span>
                </span>
                {selected ? <Check className="h-4 w-4 shrink-0 text-[#667085]" /> : null}
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MetaItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#eef2f7] bg-[#fbfcfe] px-4 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#98a2b3]">{label}</div>
      <div className="mt-1 text-sm font-medium text-[#111827]">{value}</div>
    </div>
  );
}

function LabelsSection({
  businessId,
  orderId,
  currentUserName,
  userRole,
  value,
  onChange,
}: {
  businessId: string;
  orderId: string;
  currentUserName: string;
  userRole: "OWNER" | "MANAGER" | "GUEST";
  value: string[];
  onChange: React.Dispatch<React.SetStateAction<string[]>>;
}) {
  const [draft, setDraft] = React.useState("");
  const [suggestedLabels, setSuggestedLabels] = React.useState<string[]>(LABEL_SUGGESTIONS);

  React.useEffect(() => {
    const stored = readSuggestedLabels(businessId);
    const merged: string[] = [];
    const seen = new Set<string>();
    for (const item of [...stored, ...LABEL_SUGGESTIONS]) {
      const candidate = item.trim();
      const key = candidate.toLowerCase();
      if (!candidate || seen.has(key)) continue;
      seen.add(key);
      merged.push(candidate);
    }
    setSuggestedLabels(merged);
  }, [businessId]);

  const addLabel = (nextLabel: string) => {
    const normalized = nextLabel.trim();
    if (!normalized) return;
    saveSuggestedLabel(businessId, normalized);
    setSuggestedLabels((prev) => {
      const next = [normalized];
      const seen = new Set<string>([normalized.toLowerCase()]);
      for (const item of prev) {
        const candidate = item.trim();
        const key = candidate.toLowerCase();
        if (!candidate || seen.has(key)) continue;
        seen.add(key);
        next.push(candidate);
      }
      return next;
    });
    onChange((prev) => {
      if (prev.some((item) => item.toLowerCase() === normalized.toLowerCase())) return prev;
      appendLocalActivityEvent(businessId, orderId, {
        id: makeLocalActivityEventId("label-added"),
        type: "label_added",
        actorName: currentUserName || "Manager",
        actorRole: userRole,
        description: `added label "${normalized}"`,
        ts: new Date().toISOString(),
      });
      return [...prev, normalized];
    });
    setDraft("");
  };

  const removeLabel = (label: string) => {
    onChange((prev) => {
      appendLocalActivityEvent(businessId, orderId, {
        id: makeLocalActivityEventId("label-removed"),
        type: "label_removed",
        actorName: currentUserName || "Manager",
        actorRole: userRole,
        description: `removed label "${label}"`,
        ts: new Date().toISOString(),
      });
      return prev.filter((item) => item !== label);
    });
  };

  return (
    <div className="rounded-2xl border border-[#eef2f7] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="flex items-center gap-2 text-sm font-semibold text-[#111827]">
        <Tag className="h-4 w-4 text-[#98a2b3]" />
        Labels
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {value.length > 0 ? (
          value.map((label) => (
            <button
              key={label}
              type="button"
              onClick={() => removeLabel(label)}
              className="inline-flex items-center rounded-full border border-[#dbe2ea] bg-[#fbfcfe] px-2.5 py-1 text-[11px] font-semibold text-[#667085] transition hover:border-[#cbd5e1] hover:bg-white"
            >
              {label}
            </button>
          ))
        ) : (
          <span className="text-xs text-[#98a2b3]">No labels yet.</span>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {suggestedLabels.filter((label) => !value.some((item) => item.toLowerCase() === label.toLowerCase())).map((label) => (
          <button
            key={label}
            type="button"
            onClick={() => addLabel(label)}
            className="inline-flex items-center rounded-full border border-dashed border-[#d0d5dd] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#667085] transition hover:border-[#98a2b3] hover:text-[#111827]"
          >
            + {label}
          </button>
        ))}
      </div>

      <div className="mt-4 flex gap-2">
        <input
          value={draft}
          onChange={(event) => setDraft(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addLabel(draft);
            }
          }}
          placeholder="Add label"
          className="h-10 flex-1 rounded-xl border border-[#dde3ee] bg-[#fbfcfe] px-3 text-sm outline-none transition focus:border-[#111827] focus:bg-white"
        />
        <button
          type="button"
          onClick={() => addLabel(draft)}
          disabled={!draft.trim()}
          className="rounded-xl border border-[#dde3ee] bg-white px-4 text-sm font-semibold text-[#344054] transition hover:bg-[#f8fafc]"
        >
          {draft.trim() ? `Add "${draft.trim()}"` : "+ Add label"}
        </button>
      </div>

      <p className="mt-3 text-xs leading-5 text-[#98a2b3]">
        Labels are currently session-only UI until backend storage is connected.
      </p>
    </div>
  );
}

function ActivityTab({
  order,
  businessId,
  supabase,
  phoneRaw,
  currentUserName,
  actors,
}: {
  order: OrderRow;
  businessId: string;
  supabase: SupabaseClient;
  phoneRaw: string;
  currentUserName: string;
  actors: TeamActor[];
}) {
  const [events, setEvents] = React.useState<ActivityEvent[]>([]);
  const [loading, setLoading] = React.useState(true);
  const actorById = React.useMemo(() => new Map(actors.map((actor) => [actor.id, actor])), [actors]);

  React.useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);

      const [commentsResult, checklistResult] = await Promise.all([
        supabase
          .from("order_comments")
          .select("id, body, author_phone, author_role, created_at")
          .eq("order_id", order.id)
          .order("created_at", { ascending: true }),
        supabase
          .from("order_checklist_items")
          .select("id, title, created_at, done_at, is_done")
          .eq("order_id", order.id)
          .order("created_at", { ascending: true }),
      ]);

      if (!active) return;

      const nextEvents: ActivityEvent[] = [];
      const localEvents = readLocalActivityEvents(businessId, order.id);

      nextEvents.push({
        id: `order-created-${order.id}`,
        actorName:
          order.created_by_name ||
          (order.created_by && actorById.get(order.created_by)?.label) ||
          order.manager_name ||
          (order.created_by_role === "MANAGER" ? "Manager" : order.created_by_role === "OWNER" ? "Owner" : "Team member"),
        actorRole: order.created_by_role || null,
        description: "created this order",
        ts: order.created_at,
      });

      if (order.manager_name?.trim()) {
        const managerActor = order.manager_id ? actorById.get(order.manager_id) : null;
        nextEvents.push({
          id: `manager-assigned-${order.id}`,
          actorName: managerActor?.label || order.manager_name,
          actorRole: managerActor?.kind || "MANAGER",
          description: "is currently assigned as manager",
          ts: order.created_at,
        });
      } else {
        nextEvents.push({
          id: `manager-unassigned-${order.id}`,
          actorName: "System",
          actorRole: null,
          description: "shows no assigned manager",
          ts: order.created_at,
          tone: "warning",
        });
      }

      if (order.due_date) {
        nextEvents.push({
          id: `due-date-${order.id}`,
          actorName: "System",
          actorRole: null,
          description: `set due date to ${formatDate(order.due_date)}`,
          ts: order.due_date,
          tone: "warning",
        });
      }

      if (!commentsResult.error) {
        for (const comment of (commentsResult.data ?? []) as CommentActivityRow[]) {
          const actorName =
            comment.author_phone && comment.author_phone === phoneRaw
              ? currentUserName
              : comment.author_phone || "Unknown teammate";

          nextEvents.push({
            id: `comment-${comment.id}`,
            actorName,
            actorRole: comment.author_role,
            description: `added comment: "${comment.body.trim().slice(0, 72)}${comment.body.trim().length > 72 ? "..." : ""}"`,
            ts: comment.created_at,
          });
        }
      }

      if (!checklistResult.error) {
        for (const item of (checklistResult.data ?? []) as ChecklistActivityRow[]) {
          nextEvents.push({
            id: `checklist-created-${item.id}`,
            actorName: "Team member",
            actorRole: null,
            description: `added checklist item "${item.title}"`,
            ts: item.created_at,
          });

          if (item.is_done && item.done_at) {
            nextEvents.push({
              id: `checklist-done-${item.id}`,
              actorName: "Team member",
              actorRole: null,
              description: `completed checklist item "${item.title}"`,
              ts: item.done_at,
              tone: "success",
            });
          }
        }
      }

      for (const event of localEvents) {
        nextEvents.push({
          id: event.id,
          actorName: event.actorName,
          actorRole: event.actorRole,
          description: event.description,
          ts: event.ts,
          tone: event.type === "status_changed" ? "default" : event.type === "label_added" ? "success" : "warning",
        });
      }

      nextEvents.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
      setEvents(nextEvents);
      setLoading(false);
    }

    void load();

    return () => {
      active = false;
    };
  }, [actorById, businessId, currentUserName, order, phoneRaw, supabase]);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[#eef2f7] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#111827]">
          <CalendarClock className="h-4 w-4 text-[#98a2b3]" />
          Activity
        </div>
        <p className="mt-1 text-xs leading-5 text-[#98a2b3]">
          User attribution is shown where current backend data provides it. Status changes, edits, due date changes, and labels are ready for deeper audit history.
        </p>
        <div className="mt-3 flex flex-wrap gap-3 text-[11px] font-medium text-[#98a2b3]">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#2459d3]" />
            Info
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#12b76a]" />
            Added / completed
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#f79009]" />
            Removed / warning
          </span>
        </div>
      </div>

      <div className="rounded-2xl border border-[#eef2f7] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        {loading ? (
          <div className="text-sm text-[#98a2b3]">Loading activity...</div>
        ) : (
          <div className="space-y-4">
            {events.map((event, index) => (
              <div key={event.id} className="flex gap-3">
                <div className="flex w-5 flex-col items-center">
                  <span
                    className={[
                      "mt-1 h-2.5 w-2.5 rounded-full",
                      event.tone === "success"
                        ? "bg-[#12b76a]"
                        : event.tone === "warning"
                          ? "bg-[#f79009]"
                          : "bg-[#2459d3]",
                    ].join(" ")}
                  />
                  {index < events.length - 1 ? <span className="mt-2 h-full w-px bg-[#e4e7ec]" /> : null}
                </div>
                <div className="min-w-0 flex-1 pb-4">
                  <div className="text-sm leading-6 text-[#111827]">
                    <span className="font-semibold">{event.actorName}</span>
                    {event.actorRole ? (
                      <span className="ml-2 rounded-full bg-[#f2f4f7] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#667085]">
                        {event.actorRole}
                      </span>
                    ) : null}
                    <span className="ml-2 text-[#475467]">{event.description}</span>
                  </div>
                  <div className="mt-1 text-xs font-medium text-[#98a2b3]">{formatDateTime(event.ts)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function NotesTab({ canManage }: { canManage: boolean }) {
  return (
    <div className="rounded-2xl border border-[#eef2f7] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="flex items-center gap-2 text-sm font-semibold text-[#111827]">
        <MessageSquareText className="h-4 w-4 text-[#98a2b3]" />
        Internal notes
      </div>
      <p className="mt-1 text-xs leading-5 text-[#98a2b3]">
        Reserved for manager-only notes. The UI is ready, but persistence is intentionally deferred until backend support exists.
      </p>
      <textarea
        disabled
        placeholder={canManage ? "Internal notes will appear here once storage is connected." : "Notes are available to managers."}
        className="mt-4 min-h-40 w-full resize-none rounded-2xl border border-[#dde3ee] bg-[#fbfcfe] px-4 py-3 text-sm text-[#98a2b3] outline-none"
      />
    </div>
  );
}

export function OrderPreview({
  open,
  order,
  businessId,
  businessSlug,
  phoneRaw,
  userRole,
  canManage,
  currentUserName,
  actors,
  supabase,
  onClose,
}: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState("overview");
  const [labels, setLabels] = React.useState<string[]>([]);
  const [isEditingOverview, setIsEditingOverview] = React.useState(false);
  const [isSavingOverview, startSavingOverview] = React.useTransition();
  const [previewOrder, setPreviewOrder] = React.useState<OrderRow | null>(order);
  const labelStorageKey = React.useMemo(
    () => (previewOrder ? `order-labels:${businessId}:${previewOrder.id}` : null),
    [businessId, previewOrder],
  );
  const [draft, setDraft] = React.useState({
    firstName: "",
    lastName: "",
    phone: "",
    managerId: "",
    amount: "",
    dueDate: "",
    description: "",
  });

  React.useEffect(() => {
    if (open) {
      setActiveTab("overview");
      setIsEditingOverview(false);
    }
  }, [open, order?.id]);

  React.useEffect(() => {
    setPreviewOrder(order);
  }, [order]);

  React.useEffect(() => {
    if (!labelStorageKey || typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(labelStorageKey);
      if (!stored) {
        setLabels([]);
        return;
      }
      const parsed = JSON.parse(stored);
      setLabels(Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : []);
    } catch {
      setLabels([]);
    }
  }, [labelStorageKey]);

  React.useEffect(() => {
    if (!labelStorageKey || typeof window === "undefined") return;
    window.localStorage.setItem(labelStorageKey, JSON.stringify(labels));
  }, [labelStorageKey, labels]);

  const client = normalizeOrderClient({
    client_name: previewOrder?.client_name,
    first_name: previewOrder?.client_first_name,
    last_name: previewOrder?.client_last_name,
    full_name: previewOrder?.client_full_name,
  });
  const displayName = client.fullName;
  const managerOptions = React.useMemo(
    () => actors.slice().sort((a, b) => a.label.localeCompare(b.label)),
    [actors],
  );

  React.useEffect(() => {
    if (!previewOrder) return;
    setDraft({
      firstName: previewOrder.client_first_name?.trim() || client.firstName || "",
      lastName: previewOrder.client_last_name?.trim() || client.lastName || "",
      phone: previewOrder.client_phone?.trim() || "",
      managerId: previewOrder.manager_id || "",
      amount: String(previewOrder.amount ?? ""),
      dueDate: previewOrder.due_date ? String(previewOrder.due_date).slice(0, 10) : "",
      description: previewOrder.description?.trim() || "",
    });
  }, [client.firstName, client.lastName, previewOrder]);
  const currentOrder = previewOrder;
  const dueISO = currentOrder?.due_date ? String(currentOrder.due_date).slice(0, 10) : null;
  const todayISO = new Date().toISOString().slice(0, 10);
  const isOverdue =
    !!currentOrder &&
    !!dueISO &&
    dueISO < todayISO &&
    (currentOrder.status === "NEW" || currentOrder.status === "IN_PROGRESS");

  return (
    <Sheet open={open} onOpenChange={(next) => (!next ? onClose() : undefined)}>
      <SheetContent
        side="right"
        className="w-full border-l border-[#e4e7ec] bg-[#f8fafc] p-0 sm:max-w-[680px]"
      >
        <SheetTitle className="sr-only">
          {currentOrder ? `Order #${currentOrder.order_number ?? currentOrder.id} details` : "Order details"}
        </SheetTitle>
        <SheetDescription className="sr-only">
          CRM-style order detail drawer with overview, checklist, comments, activity, and notes.
        </SheetDescription>

        {currentOrder ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex h-full min-h-0 flex-col">
            <div className="sticky top-0 z-20 border-b border-[#e4e7ec] bg-white/95 backdrop-blur">
              <div className="px-5 py-5 sm:px-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="text-lg font-semibold text-[#111827]">
                        Order #{currentOrder.order_number ?? currentOrder.id}
                      </div>
                    </div>

                    <div className="mt-3 text-lg font-semibold text-[#111827]">{displayName}</div>
                    <div className="mt-1 text-sm text-[#667085]">{currentOrder.client_phone?.trim() || "No phone number"}</div>

                    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[#475467]">
                      <span>${fmtAmount(currentOrder.amount)}</span>
                      <span className={isOverdue ? "font-semibold text-[#d92d20]" : ""}>Due {formatDate(currentOrder.due_date)}</span>
                      <span className="inline-flex items-center gap-1.5">
                        <ActorAvatar label={currentOrder.manager_name?.trim() || "Unassigned"} />
                        Manager: {currentOrder.manager_name?.trim() || "Unassigned"}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {labels.length > 0 ? (
                        labels.map((label) => (
                          <span
                            key={label}
                            className="inline-flex items-center rounded-full border border-[#dbe2ea] bg-[#fbfcfe] px-2.5 py-1 text-[11px] font-semibold text-[#667085]"
                          >
                            {label}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-[#98a2b3]">No labels yet</span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[#dde3ee] bg-white text-[#667085] transition hover:bg-[#f8fafc] hover:text-[#111827]"
                    aria-label="Close order preview"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="px-5 pb-3 sm:px-6">
                <TabsList className="grid h-auto w-full grid-cols-5 gap-2 rounded-2xl border border-[#e4e7ec] bg-[#f5f7fb] p-1.5">
                  {[
                    ["overview", "Overview"],
                    ["checklist", "Checklist"],
                    ["comments", "Comments"],
                    ["activity", "Activity"],
                    ["notes", "Notes"],
                  ].map(([value, label]) => (
                    <TabsTrigger
                      key={value}
                      value={value}
                      className="min-w-0 rounded-xl border border-transparent px-3 py-2.5 text-sm font-semibold text-[#667085] shadow-none transition data-[state=active]:border-[#cbd5e1] data-[state=active]:bg-white data-[state=active]:text-[#111827] data-[state=active]:shadow-[0_4px_12px_rgba(15,23,42,0.08)]"
                    >
                      {label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
            </div>

              <ScrollArea className="min-h-0 flex-1">
                <div className="space-y-4 px-5 py-5 sm:px-6">
                  <TabsContent value="overview" className="mt-0">
                    <div className="space-y-4">
                      {canManage ? (
                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#eef2f7] bg-white px-4 py-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
                          <div>
                            <div className="text-sm font-semibold text-[#111827]">Overview</div>
                            <p className="text-xs text-[#667085]">
                              {isEditingOverview ? "You are editing order details." : "Edit customer, manager, amount, due date, and description."}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {isEditingOverview ? (
                              <>
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="rounded-xl border-[#dde3ee] bg-white text-[#344054] hover:bg-[#f8fafc]"
                                  onClick={() => {
                                    setIsEditingOverview(false);
                                    setDraft({
                                      firstName: currentOrder.client_first_name?.trim() || client.firstName || "",
                                      lastName: currentOrder.client_last_name?.trim() || client.lastName || "",
                                      phone: currentOrder.client_phone?.trim() || "",
                                      managerId: currentOrder.manager_id || "",
                                      amount: String(currentOrder.amount ?? ""),
                                      dueDate: currentOrder.due_date ? String(currentOrder.due_date).slice(0, 10) : "",
                                      description: currentOrder.description?.trim() || "",
                                    });
                                  }}
                                >
                                  Cancel
                                </Button>
                                <button
                                  type="button"
                                  disabled={isSavingOverview}
                                  className="inline-flex h-9 min-w-24 items-center justify-center rounded-xl border border-[#111827] bg-[#111827] px-4 text-sm font-semibold shadow-[0_1px_2px_rgba(16,24,40,0.12)] transition hover:bg-[#1f2937] disabled:opacity-60"
                                  style={{ color: "#ffffff" }}
                                  onClick={() => {
                                    if (!draft.firstName.trim()) {
                                      window.alert("First name is required.");
                                      return;
                                    }
                                    const nextFirstName = draft.firstName.trim();
                                    const nextLastName = draft.lastName.trim();
                                    const nextPhone = draft.phone.trim() || null;
                                    const nextDescription = draft.description.trim() || null;
                                    const nextAmount = Number(draft.amount || 0);
                                    const nextDueDate = draft.dueDate || null;
                                    const nextManagerId = draft.managerId || null;
                                    const managerChanged = (currentOrder.manager_id || null) !== nextManagerId;
                                    const overviewChanges: Array<{ type: LocalActivityEvent["type"]; description: string }> = [];

                                    if ((currentOrder.client_first_name?.trim() || client.firstName || "") !== nextFirstName) {
                                      overviewChanges.push({
                                        type: "order_updated",
                                        description: `changed first name from "${currentOrder.client_first_name?.trim() || client.firstName || "Unknown"}" to "${nextFirstName}"`,
                                      });
                                    }

                                    if ((currentOrder.client_last_name?.trim() || client.lastName || "") !== nextLastName) {
                                      overviewChanges.push({
                                        type: "order_updated",
                                        description: `changed last name from "${currentOrder.client_last_name?.trim() || client.lastName || "Not provided"}" to "${nextLastName || "Not provided"}"`,
                                      });
                                    }

                                    if ((currentOrder.client_phone?.trim() || null) !== nextPhone) {
                                      overviewChanges.push({
                                        type: "order_updated",
                                        description: `changed phone from "${formatPhoneValue(currentOrder.client_phone || null)}" to "${formatPhoneValue(nextPhone)}"`,
                                      });
                                    }

                                    if (String(currentOrder.amount ?? 0) !== String(nextAmount)) {
                                      overviewChanges.push({
                                        type: "order_updated",
                                        description: `changed amount from "${formatAmountValue(currentOrder.amount)}" to "${formatAmountValue(nextAmount)}"`,
                                      });
                                    }

                                    if ((currentOrder.due_date ? String(currentOrder.due_date).slice(0, 10) : null) !== nextDueDate) {
                                      overviewChanges.push({
                                        type: "order_updated",
                                        description: `changed due date from "${formatDate(currentOrder.due_date)}" to "${formatDate(nextDueDate)}"`,
                                      });
                                    }

                                    if ((currentOrder.description?.trim() || null) !== nextDescription) {
                                      overviewChanges.push({
                                        type: "order_updated",
                                        description: `changed description from ${formatDescriptionValue(currentOrder.description)} to ${formatDescriptionValue(nextDescription)}`,
                                      });
                                    }

                                    startSavingOverview(async () => {
                                      try {
                                        await updateOrder({
                                          orderId: currentOrder.id,
                                          businessSlug,
                                          clientName: [nextFirstName, nextLastName].filter(Boolean).join(" "),
                                          firstName: nextFirstName,
                                          lastName: nextLastName,
                                          clientPhone: nextPhone,
                                          description: nextDescription,
                                          amount: nextAmount,
                                          dueDate: nextDueDate,
                                        });

                                        if (managerChanged) {
                                          await setOrderManager({
                                            orderId: currentOrder.id,
                                            businessSlug,
                                            managerId: nextManagerId,
                                          });
                                          appendLocalActivityEvent(businessId, currentOrder.id, {
                                            id: makeLocalActivityEventId("manager"),
                                            type: "manager_changed",
                                            actorName: currentUserName || "Manager",
                                            actorRole: userRole,
                                            description: nextManagerId
                                              ? `changed manager from "${currentOrder.manager_name?.trim() || "Unassigned"}" to "${managerOptions.find((actor) => actor.id === nextManagerId)?.label || "Manager"}"`
                                              : `changed manager from "${currentOrder.manager_name?.trim() || "Unassigned"}" to "Unassigned"`,
                                            ts: new Date().toISOString(),
                                          });
                                        }

                                        for (const change of overviewChanges) {
                                          appendLocalActivityEvent(businessId, currentOrder.id, {
                                            id: makeLocalActivityEventId("order-updated"),
                                            type: change.type,
                                            actorName: currentUserName || "Manager",
                                            actorRole: userRole,
                                            description: change.description,
                                            ts: new Date().toISOString(),
                                          });
                                        }

                                        setPreviewOrder((prev) =>
                                          prev
                                            ? {
                                                ...prev,
                                                client_name: [nextFirstName, nextLastName].filter(Boolean).join(" ") || prev.client_name,
                                                client_first_name: nextFirstName,
                                                client_last_name: nextLastName,
                                                client_full_name: [nextFirstName, nextLastName].filter(Boolean).join(" "),
                                                client_phone: nextPhone,
                                                manager_id: nextManagerId,
                                                manager_name: nextManagerId
                                                  ? managerOptions.find((actor) => actor.id === nextManagerId)?.label || prev.manager_name
                                                  : null,
                                                amount: nextAmount,
                                                due_date: nextDueDate,
                                                description: nextDescription,
                                              }
                                            : prev,
                                        );
                                        setIsEditingOverview(false);
                                        router.refresh();
                                      } catch (error) {
                                        window.alert(error instanceof Error ? error.message : "Failed to update order.");
                                      }
                                    });
                                  }}
                                >
                                  <span className="whitespace-nowrap leading-none text-white">
                                    {isSavingOverview ? "Saving..." : "Save"}
                                  </span>
                                </button>
                              </>
                            ) : (
                              <Button
                                type="button"
                                variant="outline"
                                className="rounded-xl border-[#dde3ee] bg-white text-[#344054] hover:bg-[#f8fafc]"
                                onClick={() => setIsEditingOverview(true)}
                              >
                                Edit overview
                              </Button>
                            )}
                          </div>
                        </div>
                      ) : null}

                      <div className="grid gap-3 sm:grid-cols-2">
                        <MetaItem
                          label="First Name"
                          value={
                            isEditingOverview ? (
                              <input
                                value={draft.firstName}
                                onChange={(event) => {
                                  const nextValue = event.currentTarget.value;
                                  setDraft((prev) => ({ ...prev, firstName: nextValue }));
                                }}
                                className="h-10 w-full rounded-xl border border-[#dde3ee] bg-white px-3 text-sm outline-none transition focus:border-[#111827]"
                              />
                            ) : (
                              currentOrder.client_first_name?.trim() || client.firstName || "Unknown"
                            )
                          }
                        />
                        <MetaItem
                          label="Last Name"
                          value={
                            isEditingOverview ? (
                              <input
                                value={draft.lastName}
                                onChange={(event) => {
                                  const nextValue = event.currentTarget.value;
                                  setDraft((prev) => ({ ...prev, lastName: nextValue }));
                                }}
                                className="h-10 w-full rounded-xl border border-[#dde3ee] bg-white px-3 text-sm outline-none transition focus:border-[#111827]"
                              />
                            ) : (
                              currentOrder.client_last_name?.trim() || client.lastName || "Not provided"
                            )
                          }
                        />
                        <MetaItem
                          label="Phone"
                          value={
                            isEditingOverview ? (
                              <input
                                value={draft.phone}
                                onChange={(event) => {
                                  const nextValue = event.currentTarget.value;
                                  setDraft((prev) => ({ ...prev, phone: nextValue }));
                                }}
                                className="h-10 w-full rounded-xl border border-[#dde3ee] bg-white px-3 text-sm outline-none transition focus:border-[#111827]"
                              />
                            ) : (
                              currentOrder.client_phone?.trim() || "No phone number"
                            )
                          }
                        />
                        <MetaItem
                          label="Manager"
                          value={
                            isEditingOverview ? (
                              <Select
                                value={draft.managerId || "__unassigned__"}
                                onValueChange={(value) =>
                                  setDraft((prev) => ({
                                    ...prev,
                                    managerId: value === "__unassigned__" ? "" : value,
                                  }))
                                }
                              >
                                <SelectTrigger className="h-10 w-full rounded-xl border-[#dde3ee] bg-white text-sm shadow-none">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="z-[120] rounded-2xl border-[#dde3ee] bg-white shadow-[0_16px_40px_rgba(15,23,42,0.18)]">
                                  <SelectItem value="__unassigned__">Unassigned</SelectItem>
                                  {managerOptions.map((actor) => (
                                    <SelectItem key={actor.id} value={actor.id}>
                                      {actor.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <span className="inline-flex items-center gap-2">
                                <ActorAvatar label={currentOrder.manager_name?.trim() || "Unassigned"} />
                                <span>{currentOrder.manager_name?.trim() || "Unassigned"}</span>
                              </span>
                            )
                          }
                        />
                        <MetaItem label="Created" value={formatDateTime(currentOrder.created_at)} />
                        <MetaItem
                          label="Due date"
                          value={
                            isEditingOverview ? (
                              <input
                                type="date"
                                value={draft.dueDate}
                                onChange={(event) => {
                                  const nextValue = event.currentTarget.value;
                                  setDraft((prev) => ({ ...prev, dueDate: nextValue }));
                                }}
                                className="h-10 w-full rounded-xl border border-[#dde3ee] bg-white px-3 text-sm outline-none transition focus:border-[#111827]"
                              />
                            ) : (
                              formatDate(currentOrder.due_date)
                            )
                          }
                        />
                        <MetaItem
                          label="Amount"
                          value={
                            isEditingOverview ? (
                              <input
                                inputMode="decimal"
                                value={draft.amount}
                                onChange={(event) => {
                                  const nextValue = event.currentTarget.value;
                                  setDraft((prev) => ({ ...prev, amount: nextValue }));
                                }}
                                className="h-10 w-full rounded-xl border border-[#dde3ee] bg-white px-3 text-sm outline-none transition focus:border-[#111827]"
                              />
                            ) : (
                              `$${fmtAmount(currentOrder.amount)}`
                            )
                          }
                        />
                        <MetaItem
                          label="Status"
                          value={
                            <DrawerStatusSelect
                              orderId={currentOrder.id}
                              businessSlug={businessSlug}
                              value={currentOrder.status}
                              canManage={canManage}
                              businessId={businessId}
                              currentUserName={currentUserName}
                              userRole={userRole}
                              onCommitted={(nextStatus) =>
                                setPreviewOrder((prev) =>
                                  prev
                                    ? {
                                        ...prev,
                                        status: nextStatus,
                                      }
                                    : prev,
                                )
                              }
                            />
                          }
                        />
                      </div>

                      <div className="rounded-2xl border border-[#eef2f7] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
                        <div className="text-sm font-semibold text-[#111827]">Description</div>
                        {isEditingOverview ? (
                          <textarea
                            value={draft.description}
                            onChange={(event) => {
                              const nextValue = event.currentTarget.value;
                              setDraft((prev) => ({ ...prev, description: nextValue }));
                            }}
                            className="mt-2 min-h-28 w-full rounded-2xl border border-[#dde3ee] bg-white px-4 py-3 text-sm leading-6 text-[#111827] outline-none transition focus:border-[#111827]"
                          />
                        ) : (
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#475467]">
                            {currentOrder.description?.trim() || "No description provided yet."}
                          </p>
                        )}
                      </div>

                      <LabelsSection
                        businessId={businessId}
                        orderId={currentOrder.id}
                        currentUserName={currentUserName}
                        userRole={userRole}
                        value={labels}
                        onChange={setLabels}
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="checklist" className="mt-0">
                    <OrderChecklist order={{ id: currentOrder.id, business_id: businessId }} supabase={supabase} />
                  </TabsContent>

                  <TabsContent value="comments" className="mt-0">
                    <OrderComments
                      order={{ id: currentOrder.id, business_id: businessId }}
                      supabase={supabase}
                      author={{ phone: phoneRaw, role: userRole }}
                    />
                  </TabsContent>

                  <TabsContent value="activity" className="mt-0">
                    <ActivityTab
                      order={currentOrder}
                      businessId={businessId}
                      supabase={supabase}
                      phoneRaw={phoneRaw}
                      currentUserName={currentUserName}
                      actors={actors}
                    />
                  </TabsContent>

                  <TabsContent value="notes" className="mt-0">
                    <NotesTab canManage={canManage} />
                  </TabsContent>
                </div>
              </ScrollArea>
          </Tabs>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

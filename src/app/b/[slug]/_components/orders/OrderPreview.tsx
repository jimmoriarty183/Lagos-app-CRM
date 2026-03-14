"use client";

import * as React from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AlertTriangle, CalendarClock, CircleDashed, MessageSquareText, Tag, UserRound, X } from "lucide-react";

import { OrderChecklist } from "@/app/b/[slug]/OrderChecklist";
import { OrderComments } from "@/app/b/[slug]/OrderComments";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Status =
  | "NEW"
  | "IN_PROGRESS"
  | "WAITING_PAYMENT"
  | "DONE"
  | "CANCELED"
  | "DUPLICATE";

type OrderRow = {
  id: string;
  client_name: string | null;
  client_phone: string | null;
  amount: number;
  description: string | null;
  due_date: string | null;
  status: Status;
  order_number: number | null;
  created_at: string;
  manager_id: string | null;
  manager_name: string | null;
};

type Props = {
  open: boolean;
  order: OrderRow | null;
  businessId: string;
  businessSlug: string;
  phoneRaw: string;
  userRole: "OWNER" | "MANAGER" | "GUEST";
  canManage: boolean;
  supabase: SupabaseClient;
  onClose: () => void;
};

type ActivityEvent = {
  id: string;
  title: string;
  meta: string;
  ts: string;
  tone?: "default" | "success" | "warning";
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

function statusLabel(status: Status) {
  if (status === "IN_PROGRESS") return "In progress";
  if (status === "WAITING_PAYMENT") return "Waiting payment";
  if (status === "DONE") return "Done";
  if (status === "CANCELED") return "Canceled";
  if (status === "DUPLICATE") return "Duplicate";
  return "New";
}

function statusClasses(status: Status) {
  if (status === "DONE") return "border-[#b7ebc6] bg-[#ecfdf3] text-[#067647]";
  if (status === "IN_PROGRESS") return "border-[#bfd7ff] bg-[#eff6ff] text-[#1d4ed8]";
  if (status === "WAITING_PAYMENT") return "border-[#f7d7a3] bg-[#fffaeb] text-[#b54708]";
  if (status === "CANCELED") return "border-[#f7c1bd] bg-[#fef3f2] text-[#b42318]";
  if (status === "DUPLICATE") return "border-[#d5dae1] bg-[#f8fafc] text-[#475467]";
  return "border-[#dbe2ea] bg-[#f8fafc] text-[#344054]";
}

function MetaItem({ label, value, accent = false }: { label: string; value: React.ReactNode; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-[#eef2f7] bg-[#fbfcfe] px-4 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#98a2b3]">{label}</div>
      <div className={["mt-1 text-sm font-medium", accent ? "text-[#111827]" : "text-[#475467]"].join(" ")}>
        {value}
      </div>
    </div>
  );
}

function LabelsSection() {
  return (
    <div className="rounded-2xl border border-dashed border-[#d8dee8] bg-[#fbfcfe] p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-[#111827]">
        <Tag className="h-4 w-4 text-[#98a2b3]" />
        Labels
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {LABEL_SUGGESTIONS.map((label) => (
          <span
            key={label}
            className="inline-flex items-center rounded-full border border-[#dbe2ea] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#667085]"
          >
            {label}
          </span>
        ))}
      </div>
      <p className="mt-3 text-xs leading-5 text-[#98a2b3]">
        Label UI is ready. Persistent labels can be connected once backend fields are available.
      </p>
    </div>
  );
}

function ActivityTab({ order, businessId, supabase }: { order: OrderRow; businessId: string; supabase: SupabaseClient }) {
  const [events, setEvents] = React.useState<ActivityEvent[]>([]);
  const [loading, setLoading] = React.useState(true);

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

      const nextEvents: ActivityEvent[] = [
        {
          id: `order-created-${order.id}`,
          title: "Order created",
          meta: `Created ${formatDateTime(order.created_at)}`,
          ts: order.created_at,
        },
      ];

      if (order.manager_name?.trim()) {
        nextEvents.push({
          id: `manager-current-${order.id}`,
          title: "Manager assigned",
          meta: `${order.manager_name} is currently assigned`,
          ts: order.created_at,
        });
      }

      if (order.due_date) {
        nextEvents.push({
          id: `due-date-${order.id}`,
          title: "Due date set",
          meta: formatDate(order.due_date),
          ts: order.due_date,
          tone: "warning",
        });
      }

      if (!commentsResult.error) {
        for (const comment of (commentsResult.data ?? []) as CommentActivityRow[]) {
          nextEvents.push({
            id: `comment-${comment.id}`,
            title: "Comment added",
            meta: `${comment.author_phone ?? "Unknown author"}${comment.author_role ? ` • ${comment.author_role}` : ""}`,
            ts: comment.created_at,
          });
        }
      }

      if (!checklistResult.error) {
        for (const item of (checklistResult.data ?? []) as ChecklistActivityRow[]) {
          nextEvents.push({
            id: `checklist-created-${item.id}`,
            title: "Checklist item added",
            meta: item.title,
            ts: item.created_at,
          });

          if (item.is_done && item.done_at) {
            nextEvents.push({
              id: `checklist-done-${item.id}`,
              title: "Checklist item completed",
              meta: item.title,
              ts: item.done_at,
              tone: "success",
            });
          }
        }
      }

      nextEvents.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
      setEvents(nextEvents);
      setLoading(false);
    }

    void load();

    return () => {
      active = false;
    };
  }, [businessId, order, supabase]);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[#eef2f7] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#111827]">
          <CalendarClock className="h-4 w-4 text-[#98a2b3]" />
          Activity
        </div>
        <p className="mt-1 text-xs leading-5 text-[#98a2b3]">
          Showing safe events from the current order, comments, and checklist. Deeper audit history can plug in later.
        </p>
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
                  <div className="text-sm font-semibold text-[#111827]">{event.title}</div>
                  <div className="mt-1 text-sm text-[#475467]">{event.meta}</div>
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
        Reserved for manager-only notes. Persistence is intentionally not enabled until backend support exists.
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
  supabase,
  onClose,
}: Props) {
  const [activeTab, setActiveTab] = React.useState("overview");

  React.useEffect(() => {
    if (open) {
      setActiveTab("overview");
    }
  }, [open, order?.id]);

  const dueISO = order?.due_date ? String(order.due_date).slice(0, 10) : null;
  const todayISO = new Date().toISOString().slice(0, 10);
  const isOverdue =
    !!order &&
    !!dueISO &&
    dueISO < todayISO &&
    (order.status === "NEW" || order.status === "IN_PROGRESS");

  return (
    <Sheet open={open} onOpenChange={(next) => (!next ? onClose() : undefined)}>
      <SheetContent
        side="right"
        className="w-full border-l border-[#e4e7ec] bg-[#f8fafc] p-0 sm:max-w-[720px]"
      >
        <SheetTitle className="sr-only">
          {order ? `Order #${order.order_number ?? order.id} details` : "Order details"}
        </SheetTitle>
        {order ? (
          <div className="flex h-full min-h-0 flex-col">
            <div className="border-b border-[#e4e7ec] bg-white px-5 py-5 sm:px-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-lg font-semibold text-[#111827]">
                      Order #{order.order_number ?? "—"}
                    </div>
                    <span
                      className={[
                        "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold",
                        statusClasses(order.status),
                      ].join(" ")}
                    >
                      {statusLabel(order.status)}
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[#475467]">
                    <span className="font-medium text-[#111827]">{order.client_name?.trim() || "Unknown client"}</span>
                    <span className="inline-flex items-center gap-1.5">
                      <UserRound className="h-4 w-4 text-[#98a2b3]" />
                      {order.manager_name?.trim() || "Unassigned"}
                    </span>
                    <span>${fmtAmount(order.amount)}</span>
                    <span className={isOverdue ? "font-semibold text-[#d92d20]" : ""}>
                      Due {formatDate(order.due_date)}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {LABEL_SUGGESTIONS.slice(0, 3).map((label) => (
                      <span
                        key={label}
                        className="inline-flex items-center rounded-full border border-[#dbe2ea] bg-[#fbfcfe] px-2.5 py-1 text-[11px] font-semibold text-[#667085]"
                      >
                        {label}
                      </span>
                    ))}
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

            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex min-h-0 flex-1 flex-col">
              <div className="border-b border-[#e4e7ec] bg-white px-5 py-3 sm:px-6">
                <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-2xl bg-[#f2f4f7] p-1">
                  <TabsTrigger value="overview" className="min-w-fit rounded-xl px-3 py-2 text-sm">
                    Overview
                  </TabsTrigger>
                  <TabsTrigger value="checklist" className="min-w-fit rounded-xl px-3 py-2 text-sm">
                    Checklist
                  </TabsTrigger>
                  <TabsTrigger value="comments" className="min-w-fit rounded-xl px-3 py-2 text-sm">
                    Comments
                  </TabsTrigger>
                  <TabsTrigger value="activity" className="min-w-fit rounded-xl px-3 py-2 text-sm">
                    Activity
                  </TabsTrigger>
                  <TabsTrigger value="notes" className="min-w-fit rounded-xl px-3 py-2 text-sm">
                    Notes
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="min-h-0 flex-1">
                <TabsContent value="overview" className="mt-0 h-full">
                  <ScrollArea className="h-full">
                    <div className="space-y-4 p-5 sm:p-6">
                      <div className="rounded-2xl border border-[#eef2f7] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
                        <div className="text-sm font-semibold text-[#111827]">Description</div>
                        <div className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-[#475467]">
                          {order.description?.trim() || "No description"}
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <MetaItem label="Client" value={order.client_name?.trim() || "Unknown"} accent />
                        <MetaItem label="Phone" value={order.client_phone?.trim() || "No phone number"} />
                        <MetaItem label="Assigned manager" value={order.manager_name?.trim() || "Unassigned"} />
                        <MetaItem label="Created" value={formatDateTime(order.created_at)} />
                        <MetaItem
                          label="Due date"
                          value={
                            <span className={isOverdue ? "inline-flex items-center gap-2 font-semibold text-[#d92d20]" : ""}>
                              {formatDate(order.due_date)}
                              {isOverdue ? <AlertTriangle className="h-4 w-4" /> : null}
                            </span>
                          }
                        />
                        <MetaItem label="Amount" value={`$${fmtAmount(order.amount)}`} accent />
                        <MetaItem label="Status" value={statusLabel(order.status)} />
                        <MetaItem label="View flow" value={`Edit: /b/${businessSlug}/o/${order.id}?u=${encodeURIComponent(phoneRaw)}`} />
                      </div>

                      <LabelsSection />
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="checklist" className="mt-0 h-full">
                  <ScrollArea className="h-full">
                    <div className="p-5 sm:p-6">
                      <OrderChecklist order={{ id: order.id, business_id: businessId }} supabase={supabase} />
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="comments" className="mt-0 h-full">
                  <ScrollArea className="h-full">
                    <div className="p-5 sm:p-6">
                      <OrderComments
                        order={{ id: order.id, business_id: businessId }}
                        supabase={supabase}
                        author={{
                          phone: phoneRaw,
                          role: userRole,
                        }}
                      />
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="activity" className="mt-0 h-full">
                  <ScrollArea className="h-full">
                    <div className="p-5 sm:p-6">
                      <ActivityTab order={order} businessId={businessId} supabase={supabase} />
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="notes" className="mt-0 h-full">
                  <ScrollArea className="h-full">
                    <div className="p-5 sm:p-6">
                      <NotesTab canManage={canManage} />
                    </div>
                  </ScrollArea>
                </TabsContent>
              </div>
            </Tabs>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center px-6 text-sm text-[#98a2b3]">
            <div className="flex items-center gap-2">
              <CircleDashed className="h-4 w-4" />
              Select an order to preview details.
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

"use client";

import * as React from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  Download,
  FileText,
  Maximize2,
  Minimize2,
  MoreHorizontal,
  Plus,
  Paperclip,
  Tag,
  Trash2,
  X,
} from "lucide-react";

import { OrderChecklist } from "@/app/b/[slug]/OrderChecklist";
import { OrderActivitySection } from "@/app/b/[slug]/_components/orders/OrderActivitySection";
import { OrderFollowUpsCard } from "@/app/b/[slug]/_components/orders/OrderFollowUpsCard";
import { ClientOrderForm } from "@/app/b/[slug]/_components/orders/ClientOrderForm";
import {
  OrderNotesPanel,
  type OrderNote,
} from "@/app/b/[slug]/_components/orders/OrderNotesPanel";
import {
  addOrderLineToExistingOrder,
  getCatalogOrderLineOptions,
  setOrderManager,
  setOrderStatus,
  updateOrder,
  type CatalogOrderLineOption,
} from "@/app/b/[slug]/actions";
import { CANCELED_REASONS } from "@/app/b/[slug]/order-status-reasons";
import {
  appendLocalActivityEvent,
  makeLocalActivityEventId,
  ORDER_ACTIVITY_REFRESH_EVENT,
  type LocalActivityEvent,
} from "@/app/b/[slug]/_components/orders/order-activity";
import { normalizeOrderClient } from "@/lib/order-client";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ClientErrorBoundary } from "@/components/ui/client-error-boundary";
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
import {
  getBusinessStatusesEventName,
  getStatusLabel,
  normalizeStatusColor,
  sanitizeStatusValue,
  STATUS_COLOR_OPTIONS,
  type StatusValue,
} from "@/lib/business-statuses";
import { formatDisplayOrderNumber } from "@/lib/orders/display";
import { useBusinessStatuses } from "@/lib/use-business-statuses";

type TeamActor = {
  id: string;
  label: string;
  kind: "OWNER" | "MANAGER";
  avatar_url?: string | null;
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
  status: StatusValue;
  order_number: number | null;
  created_at: string;
  manager_id: string | null;
  manager_name: string | null;
  created_by?: string | null;
  created_by_name?: string | null;
  created_by_role?: "OWNER" | "MANAGER" | null;
  status_reason?: string | null;
};

type Props = {
  open: boolean;
  order: OrderRow | null;
  businessId: string;
  businessSlug: string;
  phoneRaw: string;
  currentUserId?: string | null;
  userRole: "OWNER" | "MANAGER" | "GUEST";
  canManage: boolean;
  currentUserName: string;
  actors: TeamActor[];
  supabase: SupabaseClient;
  mode?: "view" | "create";
  isCleaning?: boolean;
  onClose: () => void;
};

const LABEL_SUGGESTIONS = [
  "urgent",
  "VIP",
  "paid",
  "callback",
  "installation",
  "follow-up",
];
const ORDER_PREVIEW_LAYOUT_STORAGE_KEY = "order-preview-layout-mode";
type OverviewAttachmentRow = {
  id: string;
  file_name: string;
  storage_path: string;
  mime_type: string | null;
  file_size: number | null;
  created_at: string | null;
  uploaded_by: string | null;
};

function normalizeActors(input: TeamActor[]): TeamActor[] {
  const map = new Map<string, TeamActor>();
  for (const actor of Array.isArray(input) ? input : []) {
    const id = String(actor?.id ?? "").trim();
    if (!id) continue;
    const label = String(actor?.label ?? "").trim() || "No name";
    const kind = actor?.kind === "OWNER" ? "OWNER" : "MANAGER";
    map.set(id, {
      id,
      label,
      kind,
      avatar_url: actor?.avatar_url ?? null,
    });
  }
  return Array.from(map.values()).sort((a, b) =>
    a.label.localeCompare(b.label),
  );
}

function getSuggestedLabelsStorageKey(businessId: string) {
  return `order-label-suggestions:${businessId}`;
}

function readSuggestedLabels(businessId: string) {
  if (typeof window === "undefined") return [] as string[];
  try {
    const raw = window.localStorage.getItem(
      getSuggestedLabelsStorageKey(businessId),
    );
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
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
  for (const item of [normalized, ...previous, ...LABEL_SUGGESTIONS]) {
    const candidate = item.trim();
    const key = candidate.toLowerCase();
    if (!candidate || seen.has(key)) continue;
    seen.add(key);
    next.push(candidate);
    if (next.length >= 12) break;
  }

  window.localStorage.setItem(
    getSuggestedLabelsStorageKey(businessId),
    JSON.stringify(next),
  );
}

function fmtAmount(n: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(
    Number(n || 0),
  );
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

function formatFileSize(value: number | null) {
  const size = Number(value || 0);
  if (!Number.isFinite(size) || size <= 0) return "Unknown size";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024)
    return `${(size / 1024).toFixed(size >= 10 * 1024 ? 0 : 1)} KB`;
  if (size < 1024 * 1024 * 1024)
    return `${(size / (1024 * 1024)).toFixed(size >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
  return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function ActorAvatar({ label, avatarUrl }: { label: string; avatarUrl?: string | null }) {
  const src = String(avatarUrl ?? "").trim();
  if (src) {
    return (
      <img
        src={src}
        alt={label || "Avatar"}
        className="h-6 w-6 shrink-0 rounded-full border border-[#E5E7EB] dark:border-white/10 object-cover"
      />
    );
  }
  const initials =
    label
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "?";

  return (
    <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1F2937] text-[10px] font-semibold text-white">
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
  value: StatusValue;
  canManage: boolean;
  currentUserName: string;
  userRole: "OWNER" | "MANAGER" | "GUEST";
  onCommitted?: (nextStatus: StatusValue, reason?: string | null) => void;
}) {
  const router = useRouter();
  const { customStatuses, statuses } = useBusinessStatuses(businessId);
  const workflowStatuses = statuses.filter((status) => status.active !== false);
  const [localStatus, setLocalStatus] = React.useState<StatusValue>(value);
  const [open, setOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [reasonTarget, setReasonTarget] = React.useState<StatusValue | null>(
    null,
  );
  const [customReason, setCustomReason] = React.useState("");
  const [draftStatusLabel, setDraftStatusLabel] = React.useState("");
  const [draftStatusColor, setDraftStatusColor] =
    React.useState<string>("blue");
  const [customStatusColor, setCustomStatusColor] = React.useState("#2563EB");
  const [createError, setCreateError] = React.useState<string | null>(null);
  const [isCreating, setIsCreating] = React.useState(false);

  React.useEffect(() => {
    setLocalStatus(value);
  }, [value]);

  React.useEffect(() => {
    if (!open) {
      setReasonTarget(null);
      setCustomReason("");
    }
  }, [open]);

  const tone = statusTone(localStatus, customStatuses);
  const canManageStatuses = userRole === "OWNER";

  const refreshStatuses = React.useCallback(() => {
    window.dispatchEvent(
      new CustomEvent(getBusinessStatusesEventName(), {
        detail: { businessId },
      }),
    );
  }, [businessId]);

  const commitStatusChange = React.useCallback(
    async (
      next: StatusValue,
      previous: StatusValue,
      reason?: string | null,
    ) => {
      await setOrderStatus({ orderId, businessSlug, status: next, reason });
      onCommitted?.(next, reason ?? null);
      appendLocalActivityEvent(businessId, orderId, {
        id: makeLocalActivityEventId("status"),
        type: "status_changed",
        actorName: currentUserName || "Manager",
        actorRole: userRole,
        description: `changed status from "${getStatusLabel(previous, customStatuses)}" to "${getStatusLabel(next, customStatuses)}"`,
        ts: new Date().toISOString(),
        payload: {
          field: "status",
          from: previous,
          to: next,
          fromLabel: getStatusLabel(previous, customStatuses),
          toLabel: getStatusLabel(next, customStatuses),
        },
      });
    },
    [
      businessId,
      businessSlug,
      currentUserName,
      customStatuses,
      onCommitted,
      orderId,
      userRole,
    ],
  );

  const applyStatusSelection = React.useCallback(
    (next: StatusValue, reason?: string | null) => {
      const prevStatus = localStatus;
      setOpen(false);
      setReasonTarget(null);
      setCustomReason("");
      setLocalStatus(next);

      startTransition(async () => {
        try {
          await commitStatusChange(next, prevStatus, reason);
        } catch (error) {
          setLocalStatus(prevStatus);
          window.alert(
            error instanceof Error ? error.message : "Failed to update status.",
          );
        }
      });
    },
    [commitStatusChange, localStatus],
  );

  const handleCreateStatus = async () => {
    const label = draftStatusLabel.trim();
    const valueToCreate = sanitizeStatusValue(label);

    if (!canManageStatuses) {
      setCreateError("Only the owner can add statuses.");
      return;
    }
    if (!label || !valueToCreate) {
      setCreateError("Enter a valid status name.");
      return;
    }

    setIsCreating(true);
    setCreateError(null);

    try {
      const res = await fetch("/api/business/statuses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId,
          label,
          value: valueToCreate,
          color: normalizeStatusColor(
            draftStatusColor === "custom"
              ? customStatusColor
              : draftStatusColor,
          ),
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(json.error || "Failed to create status.");
      }

      refreshStatuses();
      const prevStatus = localStatus;
      setLocalStatus(valueToCreate);
      setDraftStatusLabel("");
      setDraftStatusColor("blue");
      setCustomStatusColor("#2563EB");
      setIsCreateOpen(false);

      try {
        await commitStatusChange(valueToCreate, prevStatus, null);
      } catch (error) {
        setLocalStatus(prevStatus);
        throw error;
      }
    } catch (error) {
      setCreateError(
        error instanceof Error ? error.message : "Failed to create status.",
      );
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="w-full space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <DropdownMenu modal={false} open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              disabled={!canManage || isPending}
              className="inline-flex h-[25px] min-w-[116px] items-center justify-between gap-2 rounded-full px-[11px] text-left text-[12px] font-medium leading-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-600)]/15 disabled:cursor-default disabled:opacity-60"
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
                <span>{getStatusLabel(localStatus, customStatuses)}</span>
              </span>
              {canManage ? (
                <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
              ) : null}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            sideOffset={8}
            collisionPadding={12}
            avoidCollisions
            className="z-[120] w-72 max-w-[calc(100vw-1.5rem)] rounded-xl border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-[#0E0E1B] p-1.5 shadow-[0_16px_40px_rgba(15,23,42,0.14)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.55)]"
            onCloseAutoFocus={(event) => event.preventDefault()}
          >
            {reasonTarget === "CANCELED" ? (
              <div className="p-1">
                <div className="mb-2 flex items-start justify-between gap-3 px-2 py-1">
                  <div>
                    <div className="text-sm font-semibold text-[#1F2937] dark:text-white/90">
                      Why is this order canceled?
                    </div>
                    <div className="mt-1 text-xs text-[#6B7280] dark:text-white/55">
                      Pick a quick reason or write your own.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setReasonTarget(null);
                      setCustomReason("");
                    }}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-[#6B7280] dark:text-white/55 transition hover:bg-[#F9FAFB] dark:hover:bg-white/[0.06] hover:text-[#1F2937] dark:hover:text-white"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    Back
                  </button>
                </div>

                <div className="grid gap-1.5">
                  {CANCELED_REASONS.map((reason) => (
                    <button
                      key={reason}
                      type="button"
                      disabled={isPending}
                      onClick={() => applyStatusSelection("CANCELED", reason)}
                      className="w-full rounded-lg border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.03] px-3 py-2 text-left text-sm font-medium text-[#1F2937] dark:text-white/90 transition hover:border-[#C7D2FE] dark:hover:border-[var(--brand-500)]/40 hover:bg-[#F9FAFB] dark:hover:bg-white/[0.06] disabled:cursor-default disabled:opacity-60"
                    >
                      {reason}
                    </button>
                  ))}
                </div>

                <div className="mt-3 border-t border-[#F3F4F6] px-2 pt-3">
                  <textarea
                    value={customReason}
                    onChange={(event) =>
                      setCustomReason(event.currentTarget.value)
                    }
                    placeholder="Other reason..."
                    rows={3}
                    className="w-full resize-none rounded-xl border border-[#E5E7EB] dark:border-white/10 px-3 py-2 text-sm outline-none transition placeholder:text-[#9CA3AF] focus:border-[var(--brand-600)] focus:ring-2 focus:ring-[var(--brand-600)]/15"
                  />
                  <button
                    type="button"
                    disabled={isPending || !customReason.trim()}
                    onClick={() =>
                      applyStatusSelection("CANCELED", customReason.trim())
                    }
                    className="mt-2 inline-flex h-9 w-full items-center justify-center rounded-xl bg-[var(--brand-600)] px-3 text-sm font-semibold text-white transition hover:bg-[var(--brand-700)] disabled:cursor-default disabled:opacity-50"
                  >
                    Save reason
                  </button>
                </div>
              </div>
            ) : (
              workflowStatuses.map((option) => {
                const optionTone = statusTone(option.value, customStatuses);
                const selected = option.value === localStatus;

                return (
                  <DropdownMenuItem
                    key={option.value}
                    className="rounded-lg px-3 py-2 text-sm font-medium text-[#1F2937] dark:text-white/90 focus:bg-[#F9FAFB] focus:text-[#1F2937]"
                    onSelect={(event) => {
                      event.preventDefault();
                      if (option.value === localStatus) {
                        setOpen(false);
                        return;
                      }

                      if (option.value === "CANCELED") {
                        setReasonTarget("CANCELED");
                        return;
                      }

                      applyStatusSelection(option.value, null);
                    }}
                    style={{
                      background: selected
                        ? optionTone.selectedBackground
                        : undefined,
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
                      {selected ? (
                        <Check className="h-4 w-4 shrink-0 text-[#6B7280] dark:text-white/55" />
                      ) : null}
                    </div>
                  </DropdownMenuItem>
                );
              })
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {canManageStatuses ? (
          <>
            <button
              type="button"
              onClick={() => {
                router.push(`/b/${businessSlug}/settings/statuses`);
              }}
              className="inline-flex h-7 items-center rounded-full border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.04] px-2.5 text-[12px] font-semibold text-[#374151] dark:text-white/85 transition hover:border-[#C7D2FE] dark:hover:border-[var(--brand-500)]/40 hover:bg-[#F9FAFB] dark:hover:bg-white/[0.08] hover:text-[#1F2937] dark:hover:text-white"
            >
              Status settings
            </button>
            <button
              type="button"
              onClick={() => {
                setIsCreateOpen((prev) => !prev);
                setCreateError(null);
              }}
              className="inline-flex h-7 items-center gap-1 rounded-full border border-[#E5E7EB] dark:border-[var(--brand-500)]/40 bg-[var(--brand-50)] dark:bg-[var(--brand-600)]/20 px-2.5 text-[12px] font-semibold text-[var(--brand-600)] dark:text-[var(--brand-300)] transition hover:border-[var(--brand-200)] hover:bg-[var(--brand-50)] dark:hover:bg-[var(--brand-600)]/30"
            >
              <Plus className="h-3.5 w-3.5" />
              Add status
            </button>
          </>
        ) : null}
      </div>

      {isCreateOpen ? (
        <div className="rounded-2xl border border-[#E5E7EB] dark:border-white/10 bg-[#F9FAFB] dark:bg-white/[0.04] p-3">
          <div className="product-section-label">New status</div>
          <div className="mt-2 grid gap-2">
            <input
              value={draftStatusLabel}
              onChange={(event) =>
                setDraftStatusLabel(event.currentTarget.value)
              }
              placeholder="Ready for pickup"
              className="h-10 rounded-xl border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.03] px-3 text-sm outline-none transition focus:border-[var(--brand-600)] focus:ring-2 focus:ring-[var(--brand-600)]/15"
            />
            <div className="flex flex-wrap gap-2">
              {STATUS_COLOR_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setDraftStatusColor(option.value)}
                  className={[
                    "inline-flex h-9 items-center gap-2 rounded-xl border px-3 text-xs font-semibold transition",
                    draftStatusColor === option.value
                      ? "border-[var(--brand-600)] bg-[var(--brand-600)] !text-white"
                      : "border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.03] text-[#374151] hover:border-[#C7D2FE] dark:hover:border-[var(--brand-500)]/40 hover:bg-[#F9FAFB] dark:hover:bg-white/[0.06]",
                  ].join(" ")}
                >
                  <span
                    aria-hidden="true"
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: option.swatch }}
                  />
                  {option.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setDraftStatusColor("custom")}
                className={[
                  "inline-flex h-9 items-center gap-2 rounded-xl border px-3 text-xs font-semibold transition",
                  draftStatusColor === "custom"
                    ? "border-[var(--brand-600)] bg-[var(--brand-600)] !text-white"
                    : "border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.03] text-[#374151] hover:border-[#C7D2FE] dark:hover:border-[var(--brand-500)]/40 hover:bg-[#F9FAFB] dark:hover:bg-white/[0.06]",
                ].join(" ")}
              >
                <span
                  aria-hidden="true"
                  className="h-2.5 w-2.5 rounded-full border border-white/30"
                  style={{ background: customStatusColor }}
                />
                Custom
              </button>
            </div>
            {draftStatusColor === "custom" ? (
              <label className="flex items-center gap-3 rounded-xl border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.03] px-3 py-2">
                <input
                  type="color"
                  value={customStatusColor}
                  onChange={(event) =>
                    setCustomStatusColor(
                      event.currentTarget.value.toUpperCase(),
                    )
                  }
                  className="h-8 w-10 cursor-pointer rounded-md border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.03]"
                />
                <span className="text-xs font-medium text-[#6B7280] dark:text-white/55">
                  {customStatusColor.toUpperCase()} keeps the chosen client
                  color with softer badge tones
                </span>
              </label>
            ) : null}
            {createError ? (
              <div className="text-xs font-medium text-red-600">
                {createError}
              </div>
            ) : null}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                onClick={() => void handleCreateStatus()}
                className="h-9 rounded-xl bg-[var(--brand-600)] px-3 text-xs font-semibold !text-white hover:bg-[var(--brand-700)]"
                disabled={isCreating}
              >
                {isCreating ? "Saving..." : "Create and assign"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsCreateOpen(false);
                  setCreateError(null);
                }}
                className="h-9 rounded-xl px-3 text-xs font-semibold"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MetaItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-[14px] border border-[#F3F4F6] dark:border-white/10 bg-[#F9FAFB] dark:bg-white/[0.04] px-3 py-2">
      <div className="product-section-label">{label}</div>
      <div className="mt-0.5 text-sm font-medium leading-5 text-[#1F2937] dark:text-white/90">
        {value}
      </div>
    </div>
  );
}

function FilesSection({
  files,
  loading,
  uploading,
  canUpload,
  successMessage,
  onAddFiles,
  onDeleteFile,
  currentUserId,
}: {
  files: OverviewAttachmentRow[];
  loading: boolean;
  uploading: boolean;
  canUpload: boolean;
  successMessage: string | null;
  onAddFiles: () => void;
  onDeleteFile?: (id: string) => void;
  currentUserId?: string | null;
}) {
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  return (
    <div className="rounded-[20px] border border-[#F3F4F6] bg-white dark:bg-white/[0.03] p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-[#1F2937] dark:text-white/90">
            <Paperclip className="h-4 w-4 text-[#9CA3AF] dark:text-white/40" />
            Files
          </div>
          <p className="mt-1 text-xs text-[#6B7280] dark:text-white/55">
            Contracts, photos, invoices, and any order-related documents.
          </p>
        </div>
        {canUpload ? (
          <button
            type="button"
            onClick={onAddFiles}
            disabled={uploading}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.04] px-4 text-sm font-semibold text-[#374151] dark:text-white/85 transition hover:border-[#C7D2FE] dark:hover:border-[var(--brand-500)]/40 hover:bg-[#F9FAFB] dark:hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Plus className="h-4 w-4" />
            {uploading ? "Uploading..." : "Add file"}
          </button>
        ) : null}
      </div>

      {successMessage ? (
        <div className="mt-3 rounded-[16px] border border-[#b7ebc6] bg-[#ecfdf3] px-3.5 py-2.5 text-sm font-medium text-[#067647]">
          {successMessage}
        </div>
      ) : null}

      <div className="mt-3 space-y-2">
        {loading ? (
          <div className="rounded-[18px] border border-dashed border-[#E5E7EB] dark:border-white/10 bg-[#F9FAFB] dark:bg-white/[0.04] px-4 py-5 text-sm text-[#6B7280] dark:text-white/55">
            Loading files...
          </div>
        ) : files.length > 0 ? (
          files.map((file) => (
            <div
              key={file.id}
              className="flex items-center justify-between gap-3 rounded-[18px] border border-[#F3F4F6] bg-[#F9FAFB] dark:bg-white/[0.04] px-3.5 py-3 transition hover:border-[#C7D2FE] dark:hover:border-[var(--brand-500)]/40 hover:bg-white dark:hover:bg-white/[0.07]"
            >
              <a
                href={`/api/activity-attachments/${file.id}`}
                target="_blank"
                rel="noreferrer"
                className="min-w-0 flex-1"
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-[#1F2937] dark:text-white/90">
                  <FileText className="h-4 w-4 shrink-0 text-[#9CA3AF] dark:text-white/40" />
                  <span className="truncate">{file.file_name}</span>
                </div>
                <div className="mt-1 text-xs text-[#6B7280] dark:text-white/55">
                  {[
                    formatFileSize(file.file_size),
                    file.created_at ? formatDateTime(file.created_at) : null,
                  ]
                    .filter(Boolean)
                    .join(" • ")}
                </div>
              </a>
              <div className="flex shrink-0 items-center gap-1.5">
                <a
                  href={`/api/activity-attachments/${file.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.03] text-[#374151] transition hover:bg-[#F3F4F6]"
                >
                  <Download className="h-4 w-4" />
                </a>
                {onDeleteFile && (!currentUserId || file.uploaded_by === currentUserId) ? (
                  <button
                    type="button"
                    disabled={deletingId === file.id}
                    onClick={() => {
                      if (!confirm("Удалить этот файл?")) return;
                      setDeletingId(file.id);
                      onDeleteFile(file.id);
                    }}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.03] text-[#9CA3AF] dark:text-white/40 transition hover:border-[#FCA5A5] hover:bg-[#FEF2F2] hover:text-[#EF4444] disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-[18px] border border-dashed border-[#E5E7EB] dark:border-white/10 bg-[#F9FAFB] dark:bg-white/[0.04] px-4 py-5 text-sm text-[#6B7280] dark:text-white/55">
            No files attached yet.
          </div>
        )}
      </div>
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
  const [suggestedLabels, setSuggestedLabels] =
    React.useState<string[]>(LABEL_SUGGESTIONS);

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
      if (prev.some((item) => item.toLowerCase() === normalized.toLowerCase()))
        return prev;
      appendLocalActivityEvent(businessId, orderId, {
        id: makeLocalActivityEventId("label-added"),
        type: "label_added",
        actorName: currentUserName || "Manager",
        actorRole: userRole,
        description: `added label "${normalized}"`,
        ts: new Date().toISOString(),
        payload: {
          field: "tags",
          added: [normalized],
        },
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
        payload: {
          field: "tags",
          removed: [label],
        },
      });
      return prev.filter((item) => item !== label);
    });
  };

  return (
    <div className="rounded-[16px] border border-[#F3F4F6] bg-white dark:bg-white/[0.03] p-2.5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="flex items-center gap-1.5 text-[13px] font-semibold text-[#1F2937] dark:text-white/90">
        <Tag className="h-3.5 w-3.5 text-[#9CA3AF] dark:text-white/40" />
        Labels
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        {value.length > 0 ? (
          value.map((label) => (
            <button
              key={label}
              type="button"
              onClick={() => removeLabel(label)}
              className="inline-flex items-center rounded-full border border-[#E5E7EB] dark:border-white/10 bg-[#F9FAFB] dark:bg-white/[0.04] px-2.5 py-1 text-[11px] font-semibold text-[#6B7280] dark:text-white/55 transition hover:border-[#C7D2FE] dark:hover:border-[var(--brand-500)]/40 hover:bg-white dark:hover:bg-white/[0.07]"
            >
              {label}
            </button>
          ))
        ) : (
          <span className="text-xs text-[#9CA3AF] dark:text-white/40">No labels yet.</span>
        )}
      </div>

      <div className="mt-1.5 flex flex-wrap gap-1">
        {suggestedLabels
          .filter(
            (label) =>
              !value.some((item) => item.toLowerCase() === label.toLowerCase()),
          )
          .map((label) => (
            <button
              key={label}
              type="button"
              onClick={() => addLabel(label)}
              className="inline-flex items-center rounded-full border border-dashed border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.03] px-2 py-0.5 text-[10px] font-semibold text-[#6B7280] dark:text-white/55 transition hover:border-[#C7D2FE] dark:hover:border-[var(--brand-500)]/40 hover:text-[#1F2937] dark:hover:text-white"
            >
              + {label}
            </button>
          ))}
      </div>

      <div className="mt-2 flex min-w-0 gap-1.5">
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
          className="h-8 min-w-0 flex-1 rounded-lg border border-[#E5E7EB] dark:border-white/10 bg-[#F9FAFB] dark:bg-white/[0.04] px-2.5 text-[13px] text-[#1F2937] dark:text-white/90 placeholder:text-[#9CA3AF] dark:placeholder:text-white/40 outline-none transition focus:border-[var(--brand-600)] focus:bg-white dark:focus:bg-white/[0.06] focus:ring-2 focus:ring-[var(--brand-600)]/15"
        />
        {draft.trim() ? (
          <button
            type="button"
            onClick={() => addLabel(draft)}
            className="shrink-0 rounded-lg border border-[var(--brand-200)] dark:border-[var(--brand-500)]/40 bg-[var(--brand-50)] dark:bg-[var(--brand-600)]/20 px-3 text-[13px] font-semibold text-[var(--brand-600)] dark:text-[var(--brand-300)] transition hover:bg-[var(--brand-100)] dark:hover:bg-[var(--brand-600)]/30"
          >
            Add
          </button>
        ) : null}
      </div>

      <p className="mt-1.5 text-[10px] leading-3.5 text-[#9CA3AF] dark:text-white/35">
        Session-only UI for now.
      </p>
    </div>
  );
}

export function OrderPreview({
  open,
  order,
  businessId,
  businessSlug,
  phoneRaw,
  currentUserId,
  userRole,
  canManage,
  currentUserName,
  actors,
  supabase,
  mode = "view",
  isCleaning = false,
  onClose,
}: Props) {
  const router = useRouter();
  const isCreateMode = mode === "create";
  const [activeTab, setActiveTabRaw] = React.useState(() => {
    if (typeof window === "undefined") return "overview";
    const params = new URLSearchParams(window.location.search);
    return params.get("focusTab") || "overview";
  });
  const setActiveTab = React.useCallback(
    (tab: string) => {
      setActiveTabRaw(tab);
      if (typeof window === "undefined") return;
      const url = new URL(window.location.href);
      if (tab && tab !== "overview") {
        url.searchParams.set("focusTab", tab);
      } else {
        url.searchParams.delete("focusTab");
      }
      const next = `${url.pathname}${url.search}`;
      router.replace(next, { scroll: false });
    },
    [router],
  );
  const [labels, setLabels] = React.useState<string[]>([]);
  const [layoutMode, setLayoutMode] = React.useState<"default" | "wide">(
    "default",
  );
  const [isEditingOverview, setIsEditingOverview] = React.useState(false);
  const [isSavingOverview, startSavingOverview] = React.useTransition();
  const [previewOrder, setPreviewOrder] = React.useState<OrderRow | null>(
    order,
  );
  const [notesByOrderId, setNotesByOrderId] = React.useState<
    Record<string, OrderNote[]>
  >({});
  const [overviewFiles, setOverviewFiles] = React.useState<
    OverviewAttachmentRow[]
  >([]);
  const [isLoadingOverviewFiles, setIsLoadingOverviewFiles] =
    React.useState(false);
  const [isUploadingOverviewFiles, setIsUploadingOverviewFiles] =
    React.useState(false);
  const [showAddLineCard, setShowAddLineCard] = React.useState(false);
  const [isLoadingCatalogOptions, setIsLoadingCatalogOptions] =
    React.useState(false);
  const [isAddingLine, startAddingLine] = React.useTransition();
  const [catalogOptions, setCatalogOptions] = React.useState<{
    products: CatalogOrderLineOption[];
    services: CatalogOrderLineOption[];
  }>({ products: [], services: [] });
  const [lineTypeDraft, setLineTypeDraft] = React.useState<
    "PRODUCT" | "SERVICE"
  >("PRODUCT");
  const [lineItemIdDraft, setLineItemIdDraft] = React.useState("");
  const [lineQtyDraft, setLineQtyDraft] = React.useState("1");
  const [lineUnitPriceDraft, setLineUnitPriceDraft] = React.useState("");
  const [lineNewProductCodeDraft, setLineNewProductCodeDraft] =
    React.useState("");
  const [lineNewProductNameDraft, setLineNewProductNameDraft] =
    React.useState("");
  const [lineActionError, setLineActionError] = React.useState<string | null>(
    null,
  );
  const [lineActionSuccess, setLineActionSuccess] = React.useState<
    string | null
  >(null);
  const [overviewUploadSuccess, setOverviewUploadSuccess] = React.useState<
    string | null
  >(null);
  const overviewFileInputRef = React.useRef<HTMLInputElement | null>(null);
  const labelStorageKey = React.useMemo(
    () =>
      previewOrder ? `order-labels:${businessId}:${previewOrder.id}` : null,
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
      const urlTab =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("focusTab")
          : null;
      setActiveTabRaw(urlTab || "overview");
      setIsEditingOverview(isCreateMode);
    }
  }, [isCreateMode, open, order?.id]);

  React.useEffect(() => {
    setPreviewOrder(order);
  }, [order]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(
      ORDER_PREVIEW_LAYOUT_STORAGE_KEY,
    );
    if (stored === "wide" || stored === "default") {
      setLayoutMode(stored);
    }
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(ORDER_PREVIEW_LAYOUT_STORAGE_KEY, layoutMode);
  }, [layoutMode]);

  React.useEffect(() => {
    if (!labelStorageKey || typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(labelStorageKey);
      if (!stored) {
        setLabels([]);
        return;
      }
      const parsed = JSON.parse(stored);
      setLabels(
        Array.isArray(parsed)
          ? parsed.filter((item): item is string => typeof item === "string")
          : [],
      );
    } catch {
      setLabels([]);
    }
  }, [labelStorageKey]);

  React.useEffect(() => {
    if (!labelStorageKey || typeof window === "undefined") return;
    window.localStorage.setItem(labelStorageKey, JSON.stringify(labels));
  }, [labelStorageKey, labels]);

  const [cleaningTags, setCleaningTags] = React.useState<{
    recurrence_label: string | null;
    property_type: string | null;
  }>({ recurrence_label: null, property_type: null });

  React.useEffect(() => {
    if (!isCleaning) return;
    const orderId = previewOrder?.id;
    if (!orderId) {
      setCleaningTags({ recurrence_label: null, property_type: null });
      return;
    }
    let cancelled = false;
    void (async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("metadata")
        .eq("id", orderId)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        setCleaningTags({ recurrence_label: null, property_type: null });
        return;
      }
      const metadata = (data as { metadata?: Record<string, unknown> | null })
        .metadata;
      const cleaning =
        (metadata?.cleaning as Record<string, unknown> | null | undefined) ??
        null;
      const pickStr = (key: string) => {
        const value = cleaning?.[key];
        return typeof value === "string" && value.trim().length > 0
          ? value.trim()
          : null;
      };
      setCleaningTags({
        recurrence_label: pickStr("recurrence_label"),
        property_type: pickStr("property_type"),
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [isCleaning, previewOrder?.id, supabase]);

  const client = normalizeOrderClient({
    client_name: previewOrder?.client_name,
    first_name: previewOrder?.client_first_name,
    last_name: previewOrder?.client_last_name,
    full_name: previewOrder?.client_full_name,
  });
  const displayName = client.fullName;
  const hasIndividualName = Boolean(
    previewOrder?.client_first_name?.trim() ||
    client.firstName ||
    "" ||
    previewOrder?.client_last_name?.trim() ||
    client.lastName ||
    "",
  );
  const clientTypeLabel = hasIndividualName ? "individual" : "company";
  const clientTypeBadgeClass =
    clientTypeLabel === "company"
      ? "border-violet-200 bg-violet-50 text-violet-700"
      : "border-teal-200 bg-teal-50 text-teal-700";
  const managerOptions = React.useMemo(() => normalizeActors(actors), [actors]);

  React.useEffect(() => {
    setDraft({
      firstName:
        previewOrder?.client_first_name?.trim() || client.firstName || "",
      lastName: previewOrder?.client_last_name?.trim() || client.lastName || "",
      phone: previewOrder?.client_phone?.trim() || "",
      managerId: previewOrder?.manager_id || "",
      amount: previewOrder ? String(previewOrder.amount ?? "") : "",
      dueDate: previewOrder?.due_date
        ? String(previewOrder.due_date).slice(0, 10)
        : "",
      description: previewOrder?.description?.trim() || "",
    });
  }, [client.firstName, client.lastName, open, previewOrder]);
  const currentOrder = previewOrder;
  const managerAvatarUrl = React.useMemo(() => {
    if (!currentOrder?.manager_id) return null;
    return managerOptions.find((a) => a.id === currentOrder.manager_id)?.avatar_url ?? null;
  }, [currentOrder?.manager_id, managerOptions]);
  const dueISO = currentOrder?.due_date
    ? String(currentOrder.due_date).slice(0, 10)
    : null;
  const todayISO = new Date().toISOString().slice(0, 10);
  const isOverdue =
    !!currentOrder &&
    !!dueISO &&
    dueISO < todayISO &&
    (currentOrder.status === "NEW" || currentOrder.status === "IN_PROGRESS");
  const isWideLayout = layoutMode === "wide";
  const isCompactPreview = true;
  const isCompactTop = isCompactPreview || activeTab !== "overview";
  const isUltraCompactTop = isCompactPreview;
  const currentNotes = currentOrder
    ? (notesByOrderId[currentOrder.id] ?? [])
    : [];
  const canUploadFiles = userRole === "OWNER" || userRole === "MANAGER";

  const loadOverviewFiles = React.useCallback(
    async (orderId: string) => {
      setIsLoadingOverviewFiles(true);
      const { data, error } = await supabase
        .from("activity_attachments")
        .select("id, file_name, storage_path, mime_type, file_size, created_at, uploaded_by")
        .eq("business_id", businessId)
        .eq("order_id", orderId)
        .order("created_at", { ascending: false })
        .limit(8);

      if (error) {
        console.error("load overview files error:", error);
        setOverviewFiles([]);
        setIsLoadingOverviewFiles(false);
        return;
      }

      setOverviewFiles((data ?? []) as OverviewAttachmentRow[]);
      setIsLoadingOverviewFiles(false);
    },
    [businessId, supabase],
  );

  React.useEffect(() => {
    if (!open || !currentOrder || isCreateMode) {
      setOverviewFiles([]);
      setOverviewUploadSuccess(null);
      return;
    }
    void loadOverviewFiles(currentOrder.id);
  }, [currentOrder, isCreateMode, loadOverviewFiles, open]);

  React.useEffect(() => {
    if (!overviewUploadSuccess) return;
    const timeout = window.setTimeout(() => {
      setOverviewUploadSuccess(null);
    }, 3500);
    return () => window.clearTimeout(timeout);
  }, [overviewUploadSuccess]);

  React.useEffect(() => {
    if (!showAddLineCard || !open || isCreateMode) return;

    let cancelled = false;
    setIsLoadingCatalogOptions(true);
    setLineActionError(null);

    void getCatalogOrderLineOptions({ businessId })
      .then((result) => {
        if (cancelled) return;
        if (!result.ok) {
          setLineActionError(result.error || "Failed to load catalog items.");
          setCatalogOptions({ products: [], services: [] });
          return;
        }
        setCatalogOptions({
          products: result.products,
          services: result.services,
        });
      })
      .catch((error) => {
        if (cancelled) return;
        setLineActionError(
          error instanceof Error
            ? error.message
            : "Failed to load catalog items.",
        );
        setCatalogOptions({ products: [], services: [] });
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingCatalogOptions(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [businessId, isCreateMode, open, showAddLineCard]);

  const activeLineOptions = React.useMemo(
    () =>
      lineTypeDraft === "PRODUCT"
        ? catalogOptions.products
        : catalogOptions.services,
    [catalogOptions.products, catalogOptions.services, lineTypeDraft],
  );

  const selectedLineOption = React.useMemo(
    () => activeLineOptions.find((item) => item.id === lineItemIdDraft) ?? null,
    [activeLineOptions, lineItemIdDraft],
  );

  const openOverviewFilePicker = React.useCallback(() => {
    overviewFileInputRef.current?.click();
  }, []);

  const handleOverviewFilesSelected = React.useCallback(
    async (fileList: FileList | null) => {
      if (
        !fileList?.length ||
        !currentOrder ||
        !canUploadFiles ||
        isUploadingOverviewFiles
      )
        return;

      setIsUploadingOverviewFiles(true);
      setOverviewUploadSuccess(null);

      try {
        const uploadedNames: string[] = [];
        for (const file of Array.from(fileList)) {
          const formData = new FormData();
          formData.set("businessId", businessId);
          formData.set("orderId", currentOrder.id);
          formData.set("file", file);

          const response = await fetch("/api/activity-attachments/upload", {
            method: "POST",
            body: formData,
          });
          const payload = (await response.json().catch(() => ({}))) as {
            ok?: boolean;
            error?: string;
            attachment?: OverviewAttachmentRow;
          };

          if (!response.ok || !payload.attachment) {
            throw new Error(payload.error || "Failed to upload file.");
          }

          appendLocalActivityEvent(businessId, currentOrder.id, {
            id: makeLocalActivityEventId("file-uploaded"),
            type: "file_uploaded",
            actorName: currentUserName || "Manager",
            actorRole: userRole,
            description: `uploaded file ${file.name}`,
            ts: payload.attachment.created_at || new Date().toISOString(),
            payload: {
              attachmentId: payload.attachment.id,
              attachment_id: payload.attachment.id,
              fileName: file.name,
              fileType: file.type || null,
              fileSize: file.size,
            },
          });
          uploadedNames.push(file.name);
        }

        await loadOverviewFiles(currentOrder.id);
        if (uploadedNames.length === 1) {
          setOverviewUploadSuccess(`File uploaded: ${uploadedNames[0]}`);
        } else if (uploadedNames.length > 1) {
          setOverviewUploadSuccess(
            `${uploadedNames.length} files uploaded successfully.`,
          );
        }
      } catch (error) {
        console.error("overview file upload error:", error);
        window.alert(
          error instanceof Error ? error.message : "Failed to upload file.",
        );
      } finally {
        if (overviewFileInputRef.current) {
          overviewFileInputRef.current.value = "";
        }
        setIsUploadingOverviewFiles(false);
      }
    },
    [
      businessId,
      canUploadFiles,
      currentOrder,
      currentUserName,
      isUploadingOverviewFiles,
      loadOverviewFiles,
      supabase,
      userRole,
    ],
  );

  const handleDeleteFile = React.useCallback(
    async (attachmentId: string) => {
      if (!currentOrder) return;
      const file = overviewFiles.find((f) => f.id === attachmentId);
      try {
        const response = await fetch(
          `/api/activity-attachments/${attachmentId}`,
          { method: "DELETE" },
        );
        const payload = (await response.json().catch(() => ({}))) as {
          ok?: boolean;
          error?: string;
        };
        if (!response.ok || !payload.ok) {
          throw new Error(payload.error || "Failed to delete file.");
        }
        if (file) {
          appendLocalActivityEvent(businessId, currentOrder.id, {
            id: makeLocalActivityEventId("file-deleted"),
            type: "file_deleted",
            actorName: currentUserName || "Manager",
            actorRole: userRole,
            description: `deleted file ${file.file_name}`,
            ts: new Date().toISOString(),
            payload: {
              attachmentId: file.id,
              attachment_id: file.id,
              fileName: file.file_name,
              fileType: file.mime_type,
              fileSize: file.file_size,
            },
          });
          window.dispatchEvent(
            new CustomEvent(ORDER_ACTIVITY_REFRESH_EVENT, {
              detail: { orderId: currentOrder.id },
            }),
          );
        }
        await loadOverviewFiles(currentOrder.id);
      } catch (error) {
        console.error("delete file error:", error);
        window.alert(
          error instanceof Error ? error.message : "Failed to delete file.",
        );
      }
    },
    [businessId, currentOrder, currentUserName, loadOverviewFiles, overviewFiles, userRole],
  );

  function buildOrderNoteId() {
    if (
      typeof crypto !== "undefined" &&
      typeof crypto.randomUUID === "function"
    ) {
      return crypto.randomUUID();
    }

    return `note-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function buildNoteAuthorInitials(value: string) {
    const initials = value
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("");

    return initials || "M";
  }

  function handleCreateNote(note: { body: string; isPinned: boolean }) {
    if (!currentOrder) return;
    const timestamp = new Date().toISOString();

    setNotesByOrderId((current) => {
      const previous = current[currentOrder.id] ?? [];
      const nextNote: OrderNote = {
        id: buildOrderNoteId(),
        orderId: currentOrder.id,
        businessId,
        authorId: currentUserId?.trim() || "local-user",
        authorName: currentUserName.trim() || "Manager",
        authorInitials: buildNoteAuthorInitials(currentUserName || "Manager"),
        body: note.body,
        isPinned: note.isPinned,
        createdAt: timestamp,
      };

      return {
        ...current,
        [currentOrder.id]: [nextNote, ...previous],
      };
    });
  }

  function handleUpdateNote(
    noteId: string,
    note: { body: string; isPinned: boolean },
  ) {
    if (!currentOrder) return;
    const timestamp = new Date().toISOString();

    setNotesByOrderId((current) => {
      const previous = current[currentOrder.id] ?? [];

      return {
        ...current,
        [currentOrder.id]: previous.map((entry) =>
          entry.id === noteId
            ? {
                ...entry,
                body: note.body,
                isPinned: note.isPinned,
                updatedAt: timestamp,
              }
            : entry,
        ),
      };
    });
  }

  function handleDeleteNote(noteId: string) {
    if (!currentOrder) return;

    setNotesByOrderId((current) => {
      const previous = current[currentOrder.id] ?? [];

      return {
        ...current,
        [currentOrder.id]: previous.filter((entry) => entry.id !== noteId),
      };
    });
  }

  function resetAddLineDraft(nextType: "PRODUCT" | "SERVICE" = "PRODUCT") {
    setLineTypeDraft(nextType);
    setLineItemIdDraft("");
    setLineQtyDraft("1");
    setLineUnitPriceDraft("");
    setLineNewProductCodeDraft("");
    setLineNewProductNameDraft("");
    setLineActionError(null);
  }

  return (
    <Sheet open={open} onOpenChange={(next) => (!next ? onClose() : undefined)}>
      <SheetContent
        side="right"
        showClose={false}
        className={[
          "h-auto w-[calc(100vw-24px)] overflow-hidden border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-[#0E0E1B] p-0 transition-[max-width] duration-200",
          // Normal mode: stick to right
          !isWideLayout && "top-3 right-3 bottom-3 sm:max-w-[700px]",
          // Wide mode: center on screen
          isWideLayout &&
            "top-3 bottom-3 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:max-w-[1024px] sm:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15)]",
          // Both modes
          "sm:rounded-[28px]",
        ].join(" ")}
      >
        <SheetTitle className="sr-only">
          {isCreateMode
            ? "Create order"
            : currentOrder
              ? `Order ${formatDisplayOrderNumber({ orderNumber: currentOrder.order_number, orderId: currentOrder.id })} details`
              : "Order details"}
        </SheetTitle>
        <SheetDescription className="sr-only">
          {isCreateMode
            ? "Empty order preview drawer used to create a new order."
            : "CRM-style order detail drawer with overview, checklist, comments, activity, and notes."}
        </SheetDescription>

        {isCreateMode ? (
          <div className="flex h-full min-h-0 flex-col">
            <div className="sticky top-0 z-20 border-b border-[#E5E7EB] dark:border-white/10 bg-white/95 dark:bg-[#0E0E1B]/95 backdrop-blur">
              <div className="flex items-start justify-between gap-4 px-5 py-4 sm:px-6">
                <div>
                  <div className="text-lg font-semibold text-[#1F2937] dark:text-white/90">
                    Create order
                  </div>
                  <div className="mt-1 text-sm text-[#6B7280] dark:text-white/55">
                    Type-driven creation with live duplicate checking
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setLayoutMode((current) =>
                        current === "wide" ? "default" : "wide",
                      )
                    }
                    className="inline-flex h-10 items-center gap-1.5 rounded-[18px] border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.03] px-4 text-sm font-semibold text-[#1F2937] dark:text-white/90 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition hover:border-[#C7D2FE] dark:hover:border-[var(--brand-500)]/40 hover:bg-[#F9FAFB] dark:hover:bg-white/[0.06]"
                    aria-label={
                      isWideLayout
                        ? "Use default order preview width"
                        : "Use wide order preview width"
                    }
                  >
                    {isWideLayout ? (
                      <Minimize2 className="h-3.5 w-3.5" />
                    ) : (
                      <Maximize2 className="h-3.5 w-3.5" />
                    )}
                    {isWideLayout ? "Default width" : "Expand"}
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-[18px] border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.03] text-[#374151] shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition hover:border-[#C7D2FE] dark:hover:border-[var(--brand-500)]/40 hover:bg-[#F9FAFB] dark:hover:bg-white/[0.06] hover:text-[#1F2937] dark:hover:text-white"
                    aria-label="Close order preview"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
            <ScrollArea className="min-h-0 flex-1">
              <div className="space-y-4 px-5 py-5 sm:px-6">
                <ClientErrorBoundary
                  resetKeys={[open, businessId, businessSlug]}
                  fallback={({ error, reset }) => (
                    <div className="space-y-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                      <div className="font-medium">
                        Create order form failed to render.
                      </div>
                      {error?.message ? (
                        <div className="break-words text-xs text-rose-800">
                          {error.message}
                        </div>
                      ) : null}
                      {error?.stack ? (
                        <pre className="max-h-28 overflow-auto rounded-lg border border-rose-200 bg-white/70 dark:bg-white/[0.05] p-2 text-[11px] text-rose-900">
                          {error.stack}
                        </pre>
                      ) : null}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={reset}
                          className="inline-flex h-9 items-center justify-center rounded-lg border border-rose-300 bg-white dark:bg-white/[0.03] px-3 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                        >
                          Try again
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            reset();
                            router.refresh();
                          }}
                          className="inline-flex h-9 items-center justify-center rounded-lg border border-rose-300 bg-white dark:bg-white/[0.03] px-3 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                        >
                          Refresh data
                        </button>
                      </div>
                    </div>
                  )}
                >
                  <ClientOrderForm
                    businessId={businessId}
                    businessSlug={businessSlug}
                    actors={managerOptions}
                    compact
                    isCleaning={isCleaning}
                    onCreated={() => {
                      router.refresh();
                      onClose();
                    }}
                  />
                </ClientErrorBoundary>
              </div>
            </ScrollArea>
          </div>
        ) : currentOrder ? (
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex h-full min-h-0 flex-col"
          >
            <div className="border-b border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.03]">
              <div
                className={[
                  "px-4 sm:px-5 transition-all",
                  isUltraCompactTop ? "py-2" : isCompactTop ? "py-3" : "py-5",
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <div
                        className={[
                          "font-semibold text-[#1F2937] dark:text-white/90 transition-all",
                          isUltraCompactTop
                            ? "text-xs sm:text-[13px]"
                            : isCompactTop
                              ? "text-[14px] sm:text-[15px]"
                              : "text-[15px] sm:text-[16px]",
                        ].join(" ")}
                      >
                        Order{" "}
                        {formatDisplayOrderNumber({
                          orderNumber: currentOrder.order_number,
                          orderId: currentOrder.id,
                        })}
                      </div>
                    </div>

                    <div
                      className={[
                        "font-semibold leading-none text-[#1F2937] dark:text-white/90 transition-all",
                        isUltraCompactTop
                          ? "mt-0.5 text-lg"
                          : isCompactTop
                            ? "mt-1 text-[19px]"
                            : "mt-2 text-[22px] sm:text-[23px]",
                      ].join(" ")}
                    >
                      {displayName}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <span className="inline-flex max-w-full items-center rounded-full border border-[#C7D2FE] dark:border-[var(--brand-500)]/40 bg-[#EEF2FF] dark:bg-[var(--brand-600)]/15 px-2.5 py-1 text-[11px] font-semibold text-[#3730A3]">
                        Client: {displayName || "Unknown client"}
                      </span>
                      {labels.length > 0 ? (
                        labels.map((label) => (
                          <span
                            key={label}
                            className="inline-flex items-center rounded-full border border-[#E5E7EB] dark:border-white/10 bg-[#F9FAFB] dark:bg-white/[0.04] px-2.5 py-1 text-[11px] font-semibold text-[#6B7280] dark:text-white/55"
                          >
                            {label}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-[#9CA3AF] dark:text-white/40">
                          No labels yet
                        </span>
                      )}
                    </div>
                    {!isUltraCompactTop ? (
                      <div
                        className={[
                          "text-sm text-[#6B7280] dark:text-white/55 transition-all",
                          isCompactTop ? "mt-0.5" : "mt-1",
                        ].join(" ")}
                      >
                        {currentOrder.client_phone?.trim() || "No phone number"}
                      </div>
                    ) : null}

                    <div
                      className={[
                        "flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[#4B5563] dark:text-white/70 transition-all",
                        isUltraCompactTop
                          ? "mt-1 text-xs"
                          : isCompactTop
                            ? "mt-2"
                            : "mt-3",
                      ].join(" ")}
                    >
                      <span>${fmtAmount(currentOrder.amount)}</span>
                      <span
                        className={
                          isOverdue ? "font-semibold text-[#d92d20]" : ""
                        }
                      >
                        Due {formatDate(currentOrder.due_date)}
                      </span>
                      {!isUltraCompactTop ? (
                        <span className="inline-flex items-center gap-1.5">
                          <ActorAvatar
                            label={
                              currentOrder.manager_name?.trim() || "Unassigned"
                            }
                            avatarUrl={managerAvatarUrl}
                          />
                          Manager:{" "}
                          {currentOrder.manager_name?.trim() || "Unassigned"}
                        </span>
                      ) : null}
                    </div>

                    {!isCompactTop &&
                    currentOrder.status === "CANCELED" &&
                    currentOrder.status_reason?.trim() ? (
                      <div className="mt-3 inline-flex max-w-full items-start gap-2 rounded-2xl border border-[#f3d1cd] bg-[#fff6f5] px-3 py-2 text-sm text-[#9f1239]">
                        <span className="font-semibold text-[#b42318]">
                          Canceled:
                        </span>
                        <span className="min-w-0 break-words text-[#7a271a]">
                          {currentOrder.status_reason.trim()}
                        </span>
                      </div>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setLayoutMode((current) =>
                          current === "wide" ? "default" : "wide",
                        )
                      }
                      className={[
                        "hidden items-center gap-1.5 rounded-[16px] border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.03] font-semibold text-[#1F2937] dark:text-white/90 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition hover:border-[#C7D2FE] dark:hover:border-[var(--brand-500)]/40 hover:bg-[#F9FAFB] dark:hover:bg-white/[0.06] sm:inline-flex",
                        isUltraCompactTop
                          ? "h-8 px-3 text-[13px]"
                          : "h-11 px-5",
                      ].join(" ")}
                      aria-label={
                        isWideLayout
                          ? "Use default order preview width"
                          : "Use wide order preview width"
                      }
                    >
                      {isWideLayout ? (
                        <Minimize2 className="h-3.5 w-3.5" />
                      ) : (
                        <Maximize2 className="h-3.5 w-3.5" />
                      )}
                      {isWideLayout ? "Default width" : "Expand"}
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className={[
                        "inline-flex items-center justify-center rounded-[16px] border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.03] text-[#6B7280] dark:text-white/55 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition hover:border-[#C7D2FE] dark:hover:border-[var(--brand-500)]/40 hover:bg-[#F9FAFB] dark:hover:bg-white/[0.06] hover:text-[#1F2937] dark:hover:text-white",
                        isUltraCompactTop ? "h-8 w-8" : "h-11 w-11",
                      ].join(" ")}
                      aria-label="Close order preview"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="sticky top-0 z-30 bg-white dark:bg-[#0E0E1B] shadow-[0_8px_18px_rgba(15,23,42,0.06)] dark:shadow-[0_8px_18px_rgba(0,0,0,0.45)]">
              <div
                className={[
                  "px-4 sm:px-5 transition-all",
                  isUltraCompactTop
                    ? "py-0.5"
                    : isCompactTop
                      ? "py-2"
                      : "py-2.5",
                ].join(" ")}
              >
                <TabsList
                  className={[
                    "grid h-auto w-full grid-cols-6 border border-[#E5E7EB] dark:border-white/10 bg-[#EEF2FF] dark:bg-white/[0.04] shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)]",
                    isUltraCompactTop
                      ? "gap-0.5 rounded-[16px] p-0.5"
                      : "gap-1 rounded-[26px] p-1.5",
                  ].join(" ")}
                >
                  {[
                    ["overview", "Overview"],
                    ["followups", "Follow-up"],
                    ["checklist", "Checklist"],
                    ["activity", "Activity"],
                    ["notes", "Notes"],
                    ["files", "Files"],
                  ].map(([value, label]) => (
                    <TabsTrigger
                      key={value}
                      value={value}
                      className={[
                        "min-w-0 border border-transparent font-semibold text-[#6B7280] dark:text-white/60 shadow-none transition data-[state=active]:border-[#C7D2FE] dark:data-[state=active]:border-[var(--brand-500)]/40 data-[state=active]:bg-white dark:data-[state=active]:bg-[var(--brand-600)]/20 data-[state=active]:text-[#1F2937] dark:data-[state=active]:text-white data-[state=active]:shadow-[0_6px_16px_rgba(15,23,42,0.08)]",
                        isUltraCompactTop
                          ? "rounded-[12px] px-2 py-1 text-xs"
                          : "rounded-[20px] px-3 py-3 text-base",
                      ].join(" ")}
                    >
                      {label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
              <div
                className={
                  isUltraCompactTop
                    ? "h-1 border-t border-[#F3F4F6] dark:border-white/10 bg-white dark:bg-[#0E0E1B]"
                    : "h-2 border-t border-[#F3F4F6] dark:border-white/10 bg-white dark:bg-[#0E0E1B]"
                }
              />
            </div>

            <ScrollArea className="min-h-0 flex-1">
              <div
                className={[
                  "space-y-2 px-3 pb-3 sm:px-4",
                  isUltraCompactTop ? "pt-0.5" : "pt-1",
                ].join(" ")}
              >
                <div className="grid gap-2.5 lg:grid-cols-[minmax(0,4fr)_minmax(180px,1fr)]">
                  <div className="min-w-0 space-y-2">
                    <TabsContent value="overview" className="mt-0">
                      <div className="space-y-2">
                        {canManage ? (
                          <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-[20px] border border-[#F3F4F6] dark:border-white/10 bg-white dark:bg-white/[0.03] px-3 py-2 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="text-sm font-semibold text-[#1F2937] dark:text-white/90">
                                  Overview
                                </div>
                                <span
                                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold uppercase tracking-[0.08em] ${clientTypeBadgeClass}`}
                                >
                                  {clientTypeLabel}
                                </span>
                                {isCleaning && cleaningTags.recurrence_label ? (
                                  <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-xs font-semibold uppercase tracking-[0.08em] text-sky-700">
                                    {cleaningTags.recurrence_label}
                                  </span>
                                ) : null}
                                {isCleaning && cleaningTags.property_type ? (
                                  <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold uppercase tracking-[0.08em] text-amber-700">
                                    {cleaningTags.property_type}
                                  </span>
                                ) : null}
                              </div>
                              <p className="text-xs text-[#6B7280] dark:text-white/55">
                                {isEditingOverview
                                  ? "Editing order details."
                                  : "Customer, manager, amount, due date, and description."}
                              </p>
                              {overviewUploadSuccess ? (
                                <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-[#b7ebc6] bg-[#ecfdf3] px-3 py-1 text-xs font-semibold text-[#067647]">
                                  <Check className="h-3.5 w-3.5" />
                                  <span>{overviewUploadSuccess}</span>
                                </div>
                              ) : null}
                            </div>
                            <div className="flex items-center gap-2">
                              {isEditingOverview ? (
                                <>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className="h-10 min-w-24 rounded-xl border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.04] px-5 text-sm font-semibold text-[#374151] dark:text-white/85 hover:border-[#C7D2FE] dark:hover:border-[var(--brand-500)]/40 hover:bg-[#F9FAFB] dark:hover:bg-white/[0.08] hover:text-[#1F2937] dark:hover:text-white"
                                    onClick={() => {
                                      setIsEditingOverview(false);
                                      setDraft({
                                        firstName:
                                          currentOrder.client_first_name?.trim() ||
                                          client.firstName ||
                                          "",
                                        lastName:
                                          currentOrder.client_last_name?.trim() ||
                                          client.lastName ||
                                          "",
                                        phone:
                                          currentOrder.client_phone?.trim() ||
                                          "",
                                        managerId:
                                          currentOrder.manager_id || "",
                                        amount: String(
                                          currentOrder.amount ?? "",
                                        ),
                                        dueDate: currentOrder.due_date
                                          ? String(currentOrder.due_date).slice(
                                              0,
                                              10,
                                            )
                                          : "",
                                        description:
                                          currentOrder.description?.trim() ||
                                          "",
                                      });
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="default"
                                    disabled={isSavingOverview}
                                    className="h-10 min-w-24 rounded-xl px-5 text-sm font-semibold text-white hover:text-white shadow-[0_1px_2px_rgba(16,24,40,0.12)] disabled:opacity-60"
                                    onClick={() => {
                                      if (!draft.firstName.trim()) {
                                        window.alert("First name is required.");
                                        return;
                                      }
                                      const nextFirstName =
                                        draft.firstName.trim();
                                      const nextLastName =
                                        draft.lastName.trim();
                                      const nextPhone =
                                        draft.phone.trim() || null;
                                      const nextDescription =
                                        draft.description.trim() || null;
                                      const nextAmount = Number(
                                        draft.amount || 0,
                                      );
                                      const nextDueDate = draft.dueDate || null;
                                      const nextManagerId =
                                        draft.managerId || null;
                                      const managerChanged =
                                        (currentOrder.manager_id || null) !==
                                        nextManagerId;
                                      const overviewChanges: Array<{
                                        type: LocalActivityEvent["type"];
                                        description: string;
                                        payload: NonNullable<
                                          LocalActivityEvent["payload"]
                                        >;
                                      }> = [];

                                      if (
                                        (currentOrder.client_first_name?.trim() ||
                                          client.firstName ||
                                          "") !== nextFirstName
                                      ) {
                                        overviewChanges.push({
                                          type: "order_updated",
                                          description: `changed first name from "${currentOrder.client_first_name?.trim() || client.firstName || "Unknown"}" to "${nextFirstName}"`,
                                          payload: {
                                            field: "first_name",
                                            from:
                                              currentOrder.client_first_name?.trim() ||
                                              client.firstName ||
                                              "Unknown",
                                            to: nextFirstName,
                                          },
                                        });
                                      }

                                      if (
                                        (currentOrder.client_last_name?.trim() ||
                                          client.lastName ||
                                          "") !== nextLastName
                                      ) {
                                        overviewChanges.push({
                                          type: "order_updated",
                                          description: `changed last name from "${currentOrder.client_last_name?.trim() || client.lastName || "Not provided"}" to "${nextLastName || "Not provided"}"`,
                                          payload: {
                                            field: "last_name",
                                            from:
                                              currentOrder.client_last_name?.trim() ||
                                              client.lastName ||
                                              "Not provided",
                                            to: nextLastName || "Not provided",
                                          },
                                        });
                                      }

                                      if (
                                        (currentOrder.client_phone?.trim() ||
                                          null) !== nextPhone
                                      ) {
                                        overviewChanges.push({
                                          type: "order_updated",
                                          description: `changed phone from "${formatPhoneValue(currentOrder.client_phone || null)}" to "${formatPhoneValue(nextPhone)}"`,
                                          payload: {
                                            field: "phone",
                                            from: formatPhoneValue(
                                              currentOrder.client_phone || null,
                                            ),
                                            to: formatPhoneValue(nextPhone),
                                          },
                                        });
                                      }

                                      if (
                                        String(currentOrder.amount ?? 0) !==
                                        String(nextAmount)
                                      ) {
                                        overviewChanges.push({
                                          type: "order_updated",
                                          description: `changed amount from "${formatAmountValue(currentOrder.amount)}" to "${formatAmountValue(nextAmount)}"`,
                                          payload: {
                                            field: "amount",
                                            from: currentOrder.amount,
                                            to: nextAmount,
                                            fromLabel: formatAmountValue(
                                              currentOrder.amount,
                                            ),
                                            toLabel:
                                              formatAmountValue(nextAmount),
                                          },
                                        });
                                      }

                                      if (
                                        (currentOrder.due_date
                                          ? String(currentOrder.due_date).slice(
                                              0,
                                              10,
                                            )
                                          : null) !== nextDueDate
                                      ) {
                                        overviewChanges.push({
                                          type: "order_updated",
                                          description: `changed due date from "${formatDate(currentOrder.due_date)}" to "${formatDate(nextDueDate)}"`,
                                          payload: {
                                            field: "due_date",
                                            from: currentOrder.due_date || null,
                                            to: nextDueDate || null,
                                            fromLabel: formatDate(
                                              currentOrder.due_date,
                                            ),
                                            toLabel: formatDate(nextDueDate),
                                          },
                                        });
                                      }

                                      if (
                                        (currentOrder.description?.trim() ||
                                          null) !== nextDescription
                                      ) {
                                        overviewChanges.push({
                                          type: "order_updated",
                                          description: `changed description from ${formatDescriptionValue(currentOrder.description)} to ${formatDescriptionValue(nextDescription)}`,
                                          payload: {
                                            field: "description",
                                            from:
                                              currentOrder.description?.trim() ||
                                              null,
                                            to: nextDescription,
                                            fromLabel: formatDescriptionValue(
                                              currentOrder.description,
                                            ),
                                            toLabel:
                                              formatDescriptionValue(
                                                nextDescription,
                                              ),
                                          },
                                        });
                                      }

                                      startSavingOverview(async () => {
                                        try {
                                          await updateOrder({
                                            orderId: currentOrder.id,
                                            businessSlug,
                                            clientName: [
                                              nextFirstName,
                                              nextLastName,
                                            ]
                                              .filter(Boolean)
                                              .join(" "),
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
                                            appendLocalActivityEvent(
                                              businessId,
                                              currentOrder.id,
                                              {
                                                id: makeLocalActivityEventId(
                                                  "manager",
                                                ),
                                                type: "manager_changed",
                                                actorName:
                                                  currentUserName || "Manager",
                                                actorRole: userRole,
                                                description: nextManagerId
                                                  ? `changed manager from "${currentOrder.manager_name?.trim() || "Unassigned"}" to "${managerOptions.find((actor) => actor.id === nextManagerId)?.label || "Manager"}"`
                                                  : `changed manager from "${currentOrder.manager_name?.trim() || "Unassigned"}" to "Unassigned"`,
                                                ts: new Date().toISOString(),
                                                payload: {
                                                  field: "manager_id",
                                                  from: currentOrder.manager_id,
                                                  to: nextManagerId,
                                                  fromLabel:
                                                    currentOrder.manager_name?.trim() ||
                                                    "Unassigned",
                                                  toLabel: nextManagerId
                                                    ? managerOptions.find(
                                                        (actor) =>
                                                          actor.id ===
                                                          nextManagerId,
                                                      )?.label || "Manager"
                                                    : "Unassigned",
                                                },
                                              },
                                            );
                                          }

                                          for (const change of overviewChanges) {
                                            appendLocalActivityEvent(
                                              businessId,
                                              currentOrder.id,
                                              {
                                                id: makeLocalActivityEventId(
                                                  "order-updated",
                                                ),
                                                type: change.type,
                                                actorName:
                                                  currentUserName || "Manager",
                                                actorRole: userRole,
                                                description: change.description,
                                                ts: new Date().toISOString(),
                                                payload: change.payload,
                                              },
                                            );
                                          }

                                          setPreviewOrder((prev) =>
                                            prev
                                              ? {
                                                  ...prev,
                                                  client_name:
                                                    [
                                                      nextFirstName,
                                                      nextLastName,
                                                    ]
                                                      .filter(Boolean)
                                                      .join(" ") ||
                                                    prev.client_name,
                                                  client_first_name:
                                                    nextFirstName,
                                                  client_last_name:
                                                    nextLastName,
                                                  client_full_name: [
                                                    nextFirstName,
                                                    nextLastName,
                                                  ]
                                                    .filter(Boolean)
                                                    .join(" "),
                                                  client_phone: nextPhone,
                                                  manager_id: nextManagerId,
                                                  manager_name: nextManagerId
                                                    ? managerOptions.find(
                                                        (actor) =>
                                                          actor.id ===
                                                          nextManagerId,
                                                      )?.label ||
                                                      prev.manager_name
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
                                          window.alert(
                                            error instanceof Error
                                              ? error.message
                                              : "Failed to update order.",
                                          );
                                        }
                                      });
                                    }}
                                  >
                                    <span className="whitespace-nowrap leading-none text-white">
                                      {isSavingOverview ? "Saving..." : "Save"}
                                    </span>
                                  </Button>
                                </>
                              ) : (
                                <DropdownMenu modal={false}>
                                  <DropdownMenuTrigger asChild>
                                    <button
                                      type="button"
                                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.03] text-[#6B7280] dark:text-white/55 transition hover:border-[#C7D2FE] dark:hover:border-[var(--brand-500)]/40 hover:bg-[#F9FAFB] dark:hover:bg-white/[0.06] hover:text-[#1F2937] dark:hover:text-white"
                                      aria-label="Overview actions"
                                    >
                                      <MoreHorizontal className="h-4 w-4" />
                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent
                                    align="end"
                                    className="z-[120] w-44 rounded-xl border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-[#0E0E1B] p-1.5 shadow-[0_16px_40px_rgba(15,23,42,0.14)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.55)]"
                                  >
                                    <DropdownMenuItem
                                      className="rounded-lg px-3 py-2 text-sm font-medium text-[#1F2937] dark:text-white/90 focus:bg-[#F9FAFB] focus:text-[#1F2937]"
                                      onSelect={(event) => {
                                        event.preventDefault();
                                        setIsEditingOverview(true);
                                      }}
                                    >
                                      Edit overview
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="rounded-lg px-3 py-2 text-sm font-medium text-[#1F2937] dark:text-white/90 focus:bg-[#F9FAFB] focus:text-[#1F2937]"
                                      onSelect={(event) => {
                                        event.preventDefault();
                                        setShowAddLineCard(true);
                                        setLineActionSuccess(null);
                                        setLineActionError(null);
                                      }}
                                    >
                                      Add product/service
                                    </DropdownMenuItem>
                                    {canUploadFiles ? (
                                      <DropdownMenuItem
                                        className="rounded-lg px-3 py-2 text-sm font-medium text-[#1F2937] dark:text-white/90 focus:bg-[#F9FAFB] focus:text-[#1F2937]"
                                        onSelect={(event) => {
                                          event.preventDefault();
                                          openOverviewFilePicker();
                                        }}
                                      >
                                        Add file
                                      </DropdownMenuItem>
                                    ) : null}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </div>
                          </div>
                        ) : null}

                        <div className="grid gap-2 sm:grid-cols-2">
                          <MetaItem
                            label="First Name"
                            value={
                              isEditingOverview ? (
                                <input
                                  value={draft.firstName}
                                  onChange={(event) => {
                                    const nextValue = event.currentTarget.value;
                                    setDraft((prev) => ({
                                      ...prev,
                                      firstName: nextValue,
                                    }));
                                  }}
                                  className="h-10 w-full rounded-xl border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.03] px-3 text-sm outline-none transition focus:border-[var(--brand-600)] focus:ring-2 focus:ring-[var(--brand-600)]/15"
                                />
                              ) : (
                                currentOrder.client_first_name?.trim() ||
                                client.firstName ||
                                "Unknown"
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
                                    setDraft((prev) => ({
                                      ...prev,
                                      lastName: nextValue,
                                    }));
                                  }}
                                  className="h-10 w-full rounded-xl border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.03] px-3 text-sm outline-none transition focus:border-[var(--brand-600)] focus:ring-2 focus:ring-[var(--brand-600)]/15"
                                />
                              ) : (
                                currentOrder.client_last_name?.trim() ||
                                client.lastName ||
                                "Not provided"
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
                                    setDraft((prev) => ({
                                      ...prev,
                                      phone: nextValue,
                                    }));
                                  }}
                                  className="h-10 w-full rounded-xl border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.03] px-3 text-sm outline-none transition focus:border-[var(--brand-600)] focus:ring-2 focus:ring-[var(--brand-600)]/15"
                                />
                              ) : (
                                currentOrder.client_phone?.trim() ||
                                "No phone number"
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
                                      managerId:
                                        value === "__unassigned__" ? "" : value,
                                    }))
                                  }
                                >
                                  <SelectTrigger className="h-10 w-full rounded-xl border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.03] text-sm shadow-none focus:border-[var(--brand-600)] focus:ring-2 focus:ring-[var(--brand-600)]/15">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="z-[120] rounded-2xl border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.03] shadow-[0_16px_40px_rgba(15,23,42,0.18)]">
                                    <SelectItem value="__unassigned__">
                                      Unassigned
                                    </SelectItem>
                                    {managerOptions.map((actor) => (
                                      <SelectItem
                                        key={actor.id}
                                        value={actor.id}
                                      >
                                        {actor.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <span className="inline-flex items-center gap-2">
                                  <ActorAvatar
                                    label={
                                      currentOrder.manager_name?.trim() ||
                                      "Unassigned"
                                    }
                                    avatarUrl={managerAvatarUrl}
                                  />
                                  <span>
                                    {currentOrder.manager_name?.trim() ||
                                      "Unassigned"}
                                  </span>
                                </span>
                              )
                            }
                          />
                          <MetaItem
                            label="Created"
                            value={formatDateTime(currentOrder.created_at)}
                          />
                          <MetaItem
                            label="Due date"
                            value={
                              isEditingOverview ? (
                                <input
                                  type="date"
                                  value={draft.dueDate}
                                  onChange={(event) => {
                                    const nextValue = event.currentTarget.value;
                                    setDraft((prev) => ({
                                      ...prev,
                                      dueDate: nextValue,
                                    }));
                                  }}
                                  className="h-10 w-full rounded-xl border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.03] px-3 text-sm outline-none transition focus:border-[var(--brand-600)] focus:ring-2 focus:ring-[var(--brand-600)]/15"
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
                                    setDraft((prev) => ({
                                      ...prev,
                                      amount: nextValue,
                                    }));
                                  }}
                                  className="h-10 w-full rounded-xl border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.03] px-3 text-sm outline-none transition focus:border-[var(--brand-600)] focus:ring-2 focus:ring-[var(--brand-600)]/15"
                                />
                              ) : (
                                `$${fmtAmount(currentOrder.amount)}`
                              )
                            }
                          />
                        </div>

                        <div className="rounded-[18px] border border-[#F3F4F6] dark:border-white/10 bg-white dark:bg-white/[0.03] p-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
                          <div className="text-sm font-semibold text-[#1F2937] dark:text-white/90">
                            Description
                          </div>
                          {isEditingOverview ? (
                            <textarea
                              value={draft.description}
                              onChange={(event) => {
                                const nextValue = event.currentTarget.value;
                                setDraft((prev) => ({
                                  ...prev,
                                  description: nextValue,
                                }));
                              }}
                              className="mt-2 min-h-24 w-full rounded-[18px] border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.03] px-4 py-3 text-sm leading-6 text-[#1F2937] dark:text-white/90 outline-none transition focus:border-[var(--brand-600)] focus:ring-2 focus:ring-[var(--brand-600)]/15"
                            />
                          ) : (
                            <p className="mt-2 whitespace-pre-wrap text-sm leading-5 text-[#4B5563] dark:text-white/70">
                              {currentOrder.description?.trim() ||
                                "No description provided yet."}
                            </p>
                          )}
                        </div>

                        {canManage ? (
                          <div className="rounded-[18px] border border-[#F3F4F6] dark:border-white/10 bg-white dark:bg-white/[0.03] p-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <div className="text-sm font-semibold text-[#1F2937] dark:text-white/90">
                                  Products and services
                                </div>
                                <p className="text-xs text-[#6B7280] dark:text-white/55">
                                  Add a line item to this existing order.
                                </p>
                              </div>
                              {!showAddLineCard ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="h-9 rounded-xl border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.04] px-3 text-sm font-semibold text-[#374151] dark:text-white/85 hover:border-[#C7D2FE] dark:hover:border-[var(--brand-500)]/40 hover:bg-[#F9FAFB] dark:hover:bg-white/[0.08]"
                                  onClick={() => {
                                    setShowAddLineCard(true);
                                    setLineActionError(null);
                                    setLineActionSuccess(null);
                                  }}
                                >
                                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                                  Add line
                                </Button>
                              ) : null}
                            </div>

                            {lineActionSuccess ? (
                              <div className="mt-2 rounded-xl border border-[#b7ebc6] bg-[#ecfdf3] px-3 py-2 text-xs font-semibold text-[#067647]">
                                {lineActionSuccess}
                              </div>
                            ) : null}

                            {showAddLineCard ? (
                              <div className="mt-3 space-y-3 rounded-2xl border border-[#E5E7EB] dark:border-white/10 bg-[#F9FAFB] dark:bg-white/[0.04] p-3">
                                <div className="grid gap-2 sm:grid-cols-2">
                                  <label className="space-y-1">
                                    <span className="text-xs font-semibold uppercase tracking-[0.04em] text-[#6B7280] dark:text-white/55">
                                      Type
                                    </span>
                                    <select
                                      value={lineTypeDraft}
                                      onChange={(event) => {
                                        const nextType =
                                          event.currentTarget.value ===
                                          "SERVICE"
                                            ? "SERVICE"
                                            : "PRODUCT";
                                        resetAddLineDraft(nextType);
                                      }}
                                      className="h-10 w-full rounded-xl border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.04] px-3 text-sm text-[#1F2937] dark:text-white/90 outline-none transition focus:border-[var(--brand-600)] focus:ring-2 focus:ring-[var(--brand-600)]/15 [color-scheme:light] dark:[color-scheme:dark]"
                                    >
                                      <option value="PRODUCT">Product</option>
                                      <option value="SERVICE">Service</option>
                                    </select>
                                  </label>

                                  <label className="space-y-1">
                                    <span className="text-xs font-semibold uppercase tracking-[0.04em] text-[#6B7280] dark:text-white/55">
                                      Item
                                    </span>
                                    <select
                                      value={lineItemIdDraft}
                                      onChange={(event) => {
                                        const nextId =
                                          event.currentTarget.value;
                                        setLineItemIdDraft(nextId);
                                        if (
                                          lineTypeDraft === "PRODUCT" &&
                                          nextId === "__new_product__"
                                        ) {
                                          setLineUnitPriceDraft("");
                                          setLineActionError(null);
                                          return;
                                        }
                                        const option = activeLineOptions.find(
                                          (item) => item.id === nextId,
                                        );
                                        setLineUnitPriceDraft(
                                          option
                                            ? String(option.unitPrice ?? 0)
                                            : "",
                                        );
                                        setLineActionError(null);
                                      }}
                                      disabled={
                                        isLoadingCatalogOptions ||
                                        activeLineOptions.length === 0
                                      }
                                      className="h-10 w-full rounded-xl border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.04] px-3 text-sm text-[#1F2937] dark:text-white/90 outline-none transition focus:border-[var(--brand-600)] focus:ring-2 focus:ring-[var(--brand-600)]/15 disabled:bg-[#F3F4F6] dark:disabled:bg-white/[0.02] [color-scheme:light] dark:[color-scheme:dark]"
                                    >
                                      <option value="">
                                        {isLoadingCatalogOptions
                                          ? "Loading catalog..."
                                          : activeLineOptions.length > 0
                                            ? "Select item"
                                            : "No active items"}
                                      </option>
                                      {lineTypeDraft === "PRODUCT" ? (
                                        <option value="__new_product__">
                                          + New product
                                        </option>
                                      ) : null}
                                      {activeLineOptions.map((item) => (
                                        <option key={item.id} value={item.id}>
                                          {item.code
                                            ? `${item.code} - ${item.name}`
                                            : item.name}
                                        </option>
                                      ))}
                                    </select>
                                  </label>
                                </div>

                                {lineTypeDraft === "PRODUCT" &&
                                lineItemIdDraft === "__new_product__" ? (
                                  <div className="grid gap-2 sm:grid-cols-2">
                                    <label className="space-y-1">
                                      <span className="text-xs font-semibold uppercase tracking-[0.04em] text-[#6B7280] dark:text-white/55">
                                        New product code
                                      </span>
                                      <input
                                        value={lineNewProductCodeDraft}
                                        onChange={(event) => {
                                          setLineNewProductCodeDraft(
                                            event.currentTarget.value,
                                          );
                                          setLineActionError(null);
                                        }}
                                        placeholder="e.g. SKU-100"
                                        className="h-10 w-full rounded-xl border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.03] px-3 text-sm outline-none transition focus:border-[var(--brand-600)] focus:ring-2 focus:ring-[var(--brand-600)]/15"
                                      />
                                    </label>
                                    <label className="space-y-1">
                                      <span className="text-xs font-semibold uppercase tracking-[0.04em] text-[#6B7280] dark:text-white/55">
                                        New product name
                                      </span>
                                      <input
                                        value={lineNewProductNameDraft}
                                        onChange={(event) => {
                                          setLineNewProductNameDraft(
                                            event.currentTarget.value,
                                          );
                                          setLineActionError(null);
                                        }}
                                        placeholder="e.g. Installation kit"
                                        className="h-10 w-full rounded-xl border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.03] px-3 text-sm outline-none transition focus:border-[var(--brand-600)] focus:ring-2 focus:ring-[var(--brand-600)]/15"
                                      />
                                    </label>
                                  </div>
                                ) : null}

                                <div className="grid gap-2 sm:grid-cols-2">
                                  <label className="space-y-1">
                                    <span className="text-xs font-semibold uppercase tracking-[0.04em] text-[#6B7280] dark:text-white/55">
                                      Qty
                                    </span>
                                    <input
                                      inputMode="decimal"
                                      value={lineQtyDraft}
                                      onChange={(event) => {
                                        setLineQtyDraft(
                                          event.currentTarget.value,
                                        );
                                        setLineActionError(null);
                                      }}
                                      className="h-10 w-full rounded-xl border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.03] px-3 text-sm outline-none transition focus:border-[var(--brand-600)] focus:ring-2 focus:ring-[var(--brand-600)]/15"
                                    />
                                  </label>

                                  <label className="space-y-1">
                                    <span className="text-xs font-semibold uppercase tracking-[0.04em] text-[#6B7280] dark:text-white/55">
                                      Unit price
                                    </span>
                                    <input
                                      inputMode="decimal"
                                      value={lineUnitPriceDraft}
                                      onChange={(event) => {
                                        setLineUnitPriceDraft(
                                          event.currentTarget.value,
                                        );
                                        setLineActionError(null);
                                      }}
                                      className="h-10 w-full rounded-xl border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.03] px-3 text-sm outline-none transition focus:border-[var(--brand-600)] focus:ring-2 focus:ring-[var(--brand-600)]/15"
                                    />
                                  </label>
                                </div>

                                {selectedLineOption ? (
                                  <div className="rounded-xl border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.03] px-3 py-2 text-xs text-[#6B7280] dark:text-white/55">
                                    Default price: $
                                    {fmtAmount(selectedLineOption.unitPrice)}
                                    {selectedLineOption.currencyCode
                                      ? ` ${selectedLineOption.currencyCode}`
                                      : ""}
                                  </div>
                                ) : null}

                                {lineActionError ? (
                                  <div className="rounded-xl border border-[#fecaca] bg-[#fef2f2] dark:bg-rose-500/10 px-3 py-2 text-xs text-[#b42318]">
                                    {lineActionError}
                                  </div>
                                ) : null}

                                <div className="flex flex-wrap items-center justify-end gap-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className="h-9 rounded-xl border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.04] px-3 text-sm font-semibold text-[#374151] dark:text-white/85 hover:border-[#C7D2FE] dark:hover:border-[var(--brand-500)]/40 hover:bg-[#F9FAFB] dark:hover:bg-white/[0.08] hover:text-[#1F2937] dark:hover:text-white"
                                    onClick={() => {
                                      setShowAddLineCard(false);
                                      resetAddLineDraft();
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="default"
                                    disabled={
                                      isAddingLine || isLoadingCatalogOptions
                                    }
                                    className="h-9 rounded-xl px-3 text-sm font-semibold text-white hover:text-white disabled:opacity-60"
                                    onClick={() => {
                                      if (!currentOrder) return;

                                      const qty = Number(lineQtyDraft);
                                      const unitPrice =
                                        Number(lineUnitPriceDraft);
                                      if (!lineItemIdDraft) {
                                        setLineActionError(
                                          "Select product or service.",
                                        );
                                        return;
                                      }
                                      if (
                                        lineTypeDraft === "PRODUCT" &&
                                        lineItemIdDraft === "__new_product__"
                                      ) {
                                        const nextCode =
                                          lineNewProductCodeDraft.trim();
                                        const nextName =
                                          lineNewProductNameDraft.trim();
                                        if (!nextCode || !nextName) {
                                          setLineActionError(
                                            "New product requires code and name.",
                                          );
                                          return;
                                        }
                                      }
                                      if (!Number.isFinite(qty) || qty <= 0) {
                                        setLineActionError(
                                          "Quantity must be greater than 0.",
                                        );
                                        return;
                                      }
                                      if (
                                        !Number.isFinite(unitPrice) ||
                                        unitPrice < 0
                                      ) {
                                        setLineActionError(
                                          "Unit price must be 0 or greater.",
                                        );
                                        return;
                                      }

                                      setLineActionError(null);
                                      startAddingLine(async () => {
                                        const result =
                                          await addOrderLineToExistingOrder({
                                            orderId: currentOrder.id,
                                            businessSlug,
                                            lineType: lineTypeDraft,
                                            catalogItemId:
                                              lineTypeDraft === "PRODUCT" &&
                                              lineItemIdDraft ===
                                                "__new_product__"
                                                ? ""
                                                : lineItemIdDraft,
                                            qty,
                                            unitPrice,
                                            newProduct:
                                              lineTypeDraft === "PRODUCT" &&
                                              lineItemIdDraft ===
                                                "__new_product__"
                                                ? {
                                                    sku: lineNewProductCodeDraft.trim(),
                                                    name: lineNewProductNameDraft.trim(),
                                                  }
                                                : null,
                                          });

                                        if (!result.ok) {
                                          setLineActionError(
                                            result.error ||
                                              "Failed to add order line.",
                                          );
                                          return;
                                        }

                                        appendLocalActivityEvent(
                                          businessId,
                                          currentOrder.id,
                                          {
                                            id: makeLocalActivityEventId(
                                              "order-line-added",
                                            ),
                                            type: "order_updated",
                                            actorName:
                                              currentUserName || "Manager",
                                            actorRole: userRole,
                                            description: `added ${lineTypeDraft === "PRODUCT" ? "product" : "service"} "${result.line.nameSnapshot}" x${result.line.qty}`,
                                            ts: new Date().toISOString(),
                                            payload: {
                                              field: "order_lines",
                                              to: result.line.id,
                                              toLabel: result.line.nameSnapshot,
                                            },
                                          },
                                        );

                                        setLineActionSuccess(
                                          `${lineTypeDraft === "PRODUCT" ? "Product" : "Service"} added: ${result.line.nameSnapshot}`,
                                        );
                                        setShowAddLineCard(false);
                                        resetAddLineDraft(lineTypeDraft);
                                        router.refresh();
                                      });
                                    }}
                                  >
                                    {isAddingLine ? "Adding..." : "Add line"}
                                  </Button>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    </TabsContent>

                    <TabsContent value="followups" className="mt-0">
                      <OrderFollowUpsCard
                        businessId={businessId}
                        businessSlug={businessSlug}
                        orderId={currentOrder.id}
                        canManage={canManage}
                        supabase={supabase}
                        currentUserName={currentUserName}
                        userRole={userRole}
                      />
                    </TabsContent>

                    <TabsContent value="checklist" className="mt-0">
                      <OrderChecklist
                        order={{ id: currentOrder.id, business_id: businessId }}
                        supabase={supabase}
                      />
                    </TabsContent>

                    <TabsContent value="activity" className="mt-0">
                      <OrderActivitySection
                        order={currentOrder}
                        businessId={businessId}
                        supabase={supabase}
                        phoneRaw={phoneRaw}
                        currentUserId={currentUserId}
                        currentUserName={currentUserName}
                        userRole={userRole}
                        actors={actors}
                        ownerName={
                          actors.find((actor) => actor.kind === "OWNER")
                            ?.label ?? null
                        }
                        managerName={
                          currentOrder.manager_name?.trim() ||
                          actors.find((actor) => actor.kind === "MANAGER")
                            ?.label ||
                          null
                        }
                        compact
                      />
                    </TabsContent>

                    <TabsContent value="notes" className="mt-0">
                      <OrderNotesPanel
                        orderId={currentOrder.id}
                        notes={currentNotes}
                        canManage={canManage}
                        onCreateNote={handleCreateNote}
                        onUpdateNote={handleUpdateNote}
                        onDeleteNote={handleDeleteNote}
                      />
                    </TabsContent>

                    <TabsContent value="files" className="mt-0">
                      <FilesSection
                        files={overviewFiles}
                        loading={isLoadingOverviewFiles}
                        uploading={isUploadingOverviewFiles}
                        canUpload={canUploadFiles}
                        successMessage={overviewUploadSuccess}
                        onAddFiles={openOverviewFilePicker}
                        onDeleteFile={canUploadFiles ? handleDeleteFile : undefined}
                        currentUserId={currentUserId}
                      />
                    </TabsContent>
                  </div>
                  <aside className="space-y-2 lg:sticky lg:top-0 lg:self-start lg:max-h-[calc(100vh-220px)] lg:overflow-y-auto lg:pr-1 [scrollbar-width:thin]">
                    <div className="rounded-[16px] border border-[#F3F4F6] bg-white dark:bg-white/[0.03] p-2.5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#6B7280] dark:text-white/55">
                        Status
                      </div>
                      <div className="mt-1.5">
                        <DrawerStatusSelect
                          orderId={currentOrder.id}
                          businessSlug={businessSlug}
                          value={currentOrder.status}
                          canManage={canManage}
                          businessId={businessId}
                          currentUserName={currentUserName}
                          userRole={userRole}
                          onCommitted={(nextStatus, reason) =>
                            setPreviewOrder((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    status: nextStatus,
                                    status_reason:
                                      nextStatus === "CANCELED"
                                        ? (reason ?? prev.status_reason ?? null)
                                        : null,
                                  }
                                : prev,
                            )
                          }
                        />
                      </div>
                      {currentOrder.status === "CANCELED" &&
                      currentOrder.status_reason?.trim() ? (
                        <div className="mt-2 rounded-xl border border-[#f3d1cd] bg-[#fff6f5] px-3 py-2 text-xs text-[#7a271a]">
                          <span className="font-semibold">Canceled:</span>{" "}
                          {currentOrder.status_reason.trim()}
                        </div>
                      ) : null}
                    </div>

                    <div className="rounded-[16px] border border-[#F3F4F6] bg-white dark:bg-white/[0.03] p-2.5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#6B7280] dark:text-white/55">
                        Client
                      </div>
                      <div className="mt-1.5 space-y-1 text-sm text-[#374151]">
                        <div className="font-medium text-[#1F2937] dark:text-white/90">
                          {displayName || "Unknown client"}
                        </div>
                        <div className="text-[#6B7280] dark:text-white/55">
                          {currentOrder.client_phone?.trim() ||
                            "No phone number"}
                        </div>
                        <div className="inline-flex items-center gap-1.5 text-xs text-[#6B7280] dark:text-white/55">
                          <ActorAvatar
                            label={
                              currentOrder.manager_name?.trim() || "Unassigned"
                            }
                            avatarUrl={managerAvatarUrl}
                          />
                          {currentOrder.manager_name?.trim() || "Unassigned"}
                        </div>
                      </div>
                    </div>

                    <LabelsSection
                      businessId={businessId}
                      orderId={currentOrder.id}
                      currentUserName={currentUserName}
                      userRole={userRole}
                      value={labels}
                      onChange={setLabels}
                    />

                    {canUploadFiles && activeTab === "overview" ? (
                      <div className="rounded-[16px] border border-[#F3F4F6] bg-white dark:bg-white/[0.03] p-2.5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#6B7280] dark:text-white/55">
                          Quick Actions
                        </div>
                        <div className="mt-2 space-y-1.5">
                          {canUploadFiles ? (
                            <Button
                              type="button"
                              variant="outline"
                              className="h-8 w-full rounded-lg border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.04] px-2.5 text-[13px] font-semibold text-[#374151] dark:text-white/85 hover:border-[#C7D2FE] dark:hover:border-[var(--brand-500)]/40 hover:bg-[#F9FAFB] dark:hover:bg-white/[0.08]"
                              onClick={openOverviewFilePicker}
                              disabled={isUploadingOverviewFiles}
                            >
                              {isUploadingOverviewFiles
                                ? "Uploading..."
                                : "Add file"}
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                  </aside>
                </div>
                <input
                  ref={overviewFileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(event) =>
                    void handleOverviewFilesSelected(event.currentTarget.files)
                  }
                />
              </div>
            </ScrollArea>
          </Tabs>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

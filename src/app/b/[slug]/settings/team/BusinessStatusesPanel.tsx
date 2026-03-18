"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, GripVertical, PencilLine, Plus, Save, Trash2, X } from "lucide-react";
import {
  DEFAULT_STATUS_DEFINITIONS,
  getBusinessStatusesEventName,
  getInactiveWorkflowStatuses,
  getStatusColorOption,
  getWorkflowStatuses,
  isRequiredWorkflowStatus,
  isTerminalStatus,
  normalizeStatusColor,
  sanitizeStatusValue,
  STATUS_COLOR_OPTIONS,
  type BusinessStatusDefinition,
} from "@/lib/business-statuses";
import { useBusinessStatuses } from "@/lib/use-business-statuses";

type Props = {
  businessId: string;
  canManageStatuses: boolean;
};

function normalizeDraft(items: BusinessStatusDefinition[]) {
  const unique = new Map<string, BusinessStatusDefinition>();
  for (const item of items) {
    if (!item?.value) continue;
    unique.set(item.value, item);
  }

  const next = Array.from(unique.values());
  const active = next.filter((item) => item.active !== false);
  const activeWorking = active.filter((item) => !isTerminalStatus(item.value));
  const activeTerminal = active.filter((item) => isTerminalStatus(item.value));
  const inactive = next.filter((item) => item.active === false);
  return [...activeWorking, ...activeTerminal, ...inactive].map((item, index) => ({
    ...item,
    sortOrder: index,
  }));
}

function colorButtonClass(selected: boolean) {
  return [
    "inline-flex h-11 items-center gap-2 rounded-xl border px-3 text-sm font-medium transition",
    selected
      ? "border-slate-900 bg-slate-50 text-slate-900 shadow-[0_0_0_2px_rgba(15,23,42,0.08)]"
      : "border-[#E5E7EB] bg-white text-[#4B5563] hover:border-[#C7D2FE] hover:bg-[#F9FAFB]",
  ].join(" ");
}

export default function BusinessStatusesPanel({ businessId, canManageStatuses }: Props) {
  const { statuses } = useBusinessStatuses(businessId);
  const [draftStatuses, setDraftStatuses] = useState<BusinessStatusDefinition[]>(statuses);
  const [draftLabel, setDraftLabel] = useState("");
  const [draftColor, setDraftColor] = useState<string>("blue");
  const [customColor, setCustomColor] = useState("#2563EB");
  const [editingValue, setEditingValue] = useState<string | null>(null);
  const [selectedWorkflowValue, setSelectedWorkflowValue] = useState<string | null>(null);
  const [draggedValue, setDraggedValue] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [dragPreview, setDragPreview] = useState<{
    value: string;
    x: number;
    y: number;
    width: number;
    height: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const saveInProgressRef = useRef(false);
  const workflowItemRefs = useRef(new Map<string, HTMLDivElement>());
  const workflowStatusesRef = useRef<BusinessStatusDefinition[]>([]);
  const moveWorkflowStatusToIndexRef = useRef<(value: string, targetIndex: number) => void>(() => {});
  const getClosestDropIndexRef = useRef<(clientX: number, clientY: number, draggedValue: string) => number>(
    () => 0,
  );
  const pointerDragRef = useRef<{
    value: string;
    startX: number;
    startY: number;
    dragging: boolean;
    offsetX: number;
    offsetY: number;
    width: number;
    height: number;
  } | null>(null);

  useEffect(() => {
    if (isDirty) return;
    setDraftStatuses(statuses);
    setDraftLabel("");
    setDraftColor("blue");
    setCustomColor("#2563EB");
    setEditingValue(null);
    setSelectedWorkflowValue(null);
  }, [isDirty, statuses]);

  useEffect(() => {
    if (!isDirty) return;

    window.history.pushState({ statusesDraft: true }, "", window.location.href);

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    const handleDocumentClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || anchor.target === "_blank") return;
      if (saveInProgressRef.current) return;

      const nextUrl = new URL(anchor.href, window.location.href);
      const currentUrl = new URL(window.location.href);
      if (nextUrl.href === currentUrl.href) return;

      const shouldLeave = window.confirm("You have unsaved status changes. Leave this page without saving?");
      if (!shouldLeave) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    const handlePopState = () => {
      if (saveInProgressRef.current) return;
      const shouldLeave = window.confirm("You have unsaved status changes. Leave this page without saving?");
      if (!shouldLeave) {
        window.history.pushState({ statusesDraft: true }, "", window.location.href);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("popstate", handlePopState);
    document.addEventListener("click", handleDocumentClick, true);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
      document.removeEventListener("click", handleDocumentClick, true);
    };
  }, [isDirty]);

  const generatedValue = useMemo(() => sanitizeStatusValue(draftLabel), [draftLabel]);
  const workflowStatuses = useMemo(() => getWorkflowStatuses(draftStatuses), [draftStatuses]);
  const inactiveStatuses = useMemo(() => getInactiveWorkflowStatuses(draftStatuses), [draftStatuses]);
  const customStatuses = useMemo(
    () => draftStatuses.filter((status) => !status.builtIn),
    [draftStatuses],
  );
  const selectedWorkflowIndex = workflowStatuses.findIndex((status) => status.value === selectedWorkflowValue);
  const selectedWorkflowStatus = workflowStatuses[selectedWorkflowIndex] ?? null;
  const isEditing = Boolean(editingValue);
  const canSubmit = draftLabel.trim().length > 0 && canManageStatuses;
  const effectiveDraftColor = normalizeStatusColor(draftColor === "custom" ? customColor : draftColor);
  const customColorTone = getStatusColorOption(normalizeStatusColor(customColor));

  useEffect(() => {
    workflowStatusesRef.current = workflowStatuses;
  }, [workflowStatuses]);

  const markDirty = () => {
    if (!isDirty) setIsDirty(true);
    if (error) setError(null);
  };

  const replaceDraftStatuses = (updater: (current: BusinessStatusDefinition[]) => BusinessStatusDefinition[]) => {
    setDraftStatuses((current) => normalizeDraft(updater(current)));
    markDirty();
  };

  const resetEditor = () => {
    setDraftLabel("");
    setDraftColor("blue");
    setCustomColor("#2563EB");
    setEditingValue(null);
  };

  const startEditing = (status: BusinessStatusDefinition) => {
    if (status.builtIn) return;
    const normalizedColor = normalizeStatusColor(status.color);
    setEditingValue(status.value);
    setDraftLabel(status.label);
    setDraftColor(normalizedColor.startsWith("#") ? "custom" : normalizedColor);
    setCustomColor(normalizedColor.startsWith("#") ? normalizedColor : "#2563EB");
    if (error) setError(null);
  };

  const handleSubmitStatus = () => {
    const label = draftLabel.trim();
    const nextValue = sanitizeStatusValue(label);

    if (!canManageStatuses) {
      setError("Only the owner can manage custom statuses.");
      return;
    }
    if (!label) {
      setError("Enter a valid status name.");
      return;
    }

    if (editingValue) {
      replaceDraftStatuses((current) =>
        current.map((status) =>
          status.value === editingValue
            ? {
                ...status,
                label,
                color: effectiveDraftColor,
              }
            : status,
        ),
      );
      setSelectedWorkflowValue(editingValue);
      resetEditor();
      return;
    }

    if (!nextValue) {
      setError("Enter a valid status name.");
      return;
    }
    if (draftStatuses.some((item) => item.value === nextValue)) {
      setError("This status already exists.");
      return;
    }

    replaceDraftStatuses((current) => [
      ...current,
      {
        value: nextValue,
        label,
        color: effectiveDraftColor,
        active: true,
        builtIn: false,
      },
    ]);
    setSelectedWorkflowValue(nextValue);
    resetEditor();
  };

  const removeCustomStatusPermanently = (value: string) => {
    const target = draftStatuses.find((status) => status.value === value);
    if (!target || target.builtIn) return;

    const confirmed = window.confirm(
      `Delete "${target.label}" permanently from the draft? This will be applied only after Save changes.`,
    );
    if (!confirmed) return;

    replaceDraftStatuses((current) => current.filter((status) => status.value !== value));
    if (selectedWorkflowValue === value) {
      setSelectedWorkflowValue(null);
    }
    if (editingValue === value) {
      resetEditor();
    }
  };

  const moveWorkflowStatus = (direction: -1 | 1) => {
    if (selectedWorkflowIndex < 0) return;
    moveWorkflowStatusToIndex(workflowStatuses[selectedWorkflowIndex].value, selectedWorkflowIndex + direction);
  };

  const clampWorkflowTargetIndex = (
    value: string,
    targetIndex: number,
    activeStatuses: readonly BusinessStatusDefinition[],
  ) => {
    const terminalStart = activeStatuses.findIndex((status) => isTerminalStatus(status.value));
    const boundaryIndex = terminalStart === -1 ? activeStatuses.length : terminalStart;

    if (isTerminalStatus(value)) {
      return Math.max(boundaryIndex, Math.min(targetIndex, activeStatuses.length));
    }

    return Math.max(0, Math.min(targetIndex, boundaryIndex));
  };

  const moveWorkflowStatusToIndex = (value: string, targetIndex: number) => {
    replaceDraftStatuses((current) => {
      const active = getWorkflowStatuses(current);
      const inactive = getInactiveWorkflowStatuses(current);
      const currentIndex = active.findIndex((status) => status.value === value);
      if (currentIndex < 0) return current;

      const next = [...active];
      const [moved] = next.splice(currentIndex, 1);
      if (!moved) return current;

      const clampedTarget = clampWorkflowTargetIndex(value, targetIndex, active);
      const adjustedTarget = currentIndex < clampedTarget ? clampedTarget - 1 : clampedTarget;
      next.splice(Math.max(0, Math.min(adjustedTarget, next.length)), 0, moved);
      return [...next, ...inactive];
    });
    setSelectedWorkflowValue(value);
  };

  const setWorkflowItemRef = (value: string, node: HTMLDivElement | null) => {
    if (node) {
      workflowItemRefs.current.set(value, node);
      return;
    }
    workflowItemRefs.current.delete(value);
  };

  const getClosestDropIndex = (clientX: number, clientY: number, draggedWorkflowValue: string) => {
    const active = workflowStatusesRef.current;
    const visibleStatuses = active.filter((status) => status.value !== draggedWorkflowValue);
    if (visibleStatuses.length === 0) return 0;

    const hoveredElement = document.elementFromPoint(clientX, clientY);
    const hoveredStatus = hoveredElement instanceof HTMLElement
      ? hoveredElement.closest<HTMLElement>("[data-workflow-status]")
      : null;
    const hoveredValue = hoveredStatus?.dataset.workflowStatus;
    const hoveredIndex = visibleStatuses.findIndex((status) => status.value === hoveredValue);

    if (hoveredIndex >= 0 && hoveredValue) {
      const hoveredNode = workflowItemRefs.current.get(hoveredValue);
      if (hoveredNode) {
        const rect = hoveredNode.getBoundingClientRect();
        const insertAfter = clientX > rect.left + rect.width / 2;
        return clampWorkflowTargetIndex(
          draggedWorkflowValue,
          hoveredIndex + (insertAfter ? 1 : 0),
          active,
        );
      }
    }

    let bestIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;

    visibleStatuses.forEach((status, index) => {
      const node = workflowItemRefs.current.get(status.value);
      if (!node) return;

      const rect = node.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const distance = Math.hypot(clientX - centerX, clientY - centerY);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index + (clientX > centerX ? 1 : 0);
      }
    });

    return clampWorkflowTargetIndex(draggedWorkflowValue, bestIndex, active);
  };
  moveWorkflowStatusToIndexRef.current = moveWorkflowStatusToIndex;
  getClosestDropIndexRef.current = getClosestDropIndex;

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const state = pointerDragRef.current;
      if (!state) return;

      const movedEnough =
        Math.abs(event.clientX - state.startX) > 4 || Math.abs(event.clientY - state.startY) > 4;

      if (!state.dragging && !movedEnough) return;

      if (!state.dragging) {
        state.dragging = true;
        setDraggedValue(state.value);
        setDragPreview({
          value: state.value,
          x: event.clientX - state.offsetX,
          y: event.clientY - state.offsetY,
          width: state.width,
          height: state.height,
          offsetX: state.offsetX,
          offsetY: state.offsetY,
        });
      }

      event.preventDefault();
      document.body.style.userSelect = "none";
      document.body.style.cursor = "grabbing";
      setDragPreview((current) =>
        current
          ? {
              ...current,
              x: event.clientX - current.offsetX,
              y: event.clientY - current.offsetY,
            }
          : current,
      );
      setDragOverIndex(getClosestDropIndexRef.current(event.clientX, event.clientY, state.value));
    };

    const finishPointerDrag = () => {
      const state = pointerDragRef.current;
      if (!state) return;

      if (state.dragging) {
        moveWorkflowStatusToIndexRef.current(
          state.value,
          dragOverIndex !== null
            ? dragOverIndex
            : getClosestDropIndexRef.current(state.startX, state.startY, state.value),
        );
      } else {
        setSelectedWorkflowValue(state.value);
      }

      pointerDragRef.current = null;
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      setDraggedValue(null);
      setDragOverIndex(null);
      setDragPreview(null);
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: false });
    window.addEventListener("pointerup", finishPointerDrag);
    window.addEventListener("pointercancel", finishPointerDrag);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", finishPointerDrag);
      window.removeEventListener("pointercancel", finishPointerDrag);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      setDragPreview(null);
    };
  }, [dragOverIndex]);

  const toggleWorkflow = (value: string, nextActive: boolean) => {
    if (!nextActive && isRequiredWorkflowStatus(value)) {
      setError("New, In progress, Done, and Canceled must stay in the workflow.");
      return;
    }

    replaceDraftStatuses((current) => {
      const next = current.map((status) =>
        status.value === value ? { ...status, active: nextActive } : status,
      );

      if (nextActive) {
        const item = next.find((status) => status.value === value);
        const remaining = next.filter((status) => status.value !== value);
        return item
          ? [
              ...remaining.filter((status) => status.active !== false),
              item,
              ...remaining.filter((status) => status.active === false),
            ]
          : next;
      }

      return next;
    });

    if (!nextActive && selectedWorkflowValue === value) {
      setSelectedWorkflowValue(null);
    }
    if (nextActive) {
      setSelectedWorkflowValue(value);
    }
  };

  const handleReset = () => {
    setDraftStatuses(statuses);
    setSelectedWorkflowValue(null);
    setDraggedValue(null);
    setDragOverIndex(null);
    setDragPreview(null);
    setError(null);
    setIsDirty(false);
    resetEditor();
  };

  const handleRestoreDefaults = () => {
    if (!canManageStatuses) {
      setError("Only the owner can manage custom statuses.");
      return;
    }

    const confirmed = window.confirm(
      "Restore default statuses only? This will remove all custom statuses from the draft after you save.",
    );
    if (!confirmed) return;

    const finalConfirmed = window.confirm(
      "Please confirm again: restore defaults and permanently discard all custom statuses from this draft?",
    );
    if (!finalConfirmed) return;

    setDraftStatuses(
      DEFAULT_STATUS_DEFINITIONS.map((status, index) => ({
        ...status,
        active: true,
        sortOrder: index,
      })),
    );
    setSelectedWorkflowValue(null);
    setDraggedValue(null);
    setDragOverIndex(null);
    setDragPreview(null);
    setError(null);
    setEditingValue(null);
    setDraftLabel("");
    setDraftColor("blue");
    setCustomColor("#2563EB");
    setIsDirty(true);
  };

  const handleSaveChanges = async () => {
    if (!canManageStatuses) {
      setError("Only the owner can manage custom statuses.");
      return;
    }

    setIsSaving(true);
    saveInProgressRef.current = true;
    try {
      const res = await fetch("/api/business/statuses", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId,
          items: draftStatuses.map((status) => ({
            value: status.value,
            label: status.label,
            color: status.color,
            builtIn: Boolean(status.builtIn),
            active: status.active !== false,
          })),
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };

      if (!res.ok) {
        throw new Error(json.error || "Failed to save statuses.");
      }

      setIsDirty(false);
      setError(null);
      window.dispatchEvent(new CustomEvent(getBusinessStatusesEventName(), { detail: { businessId } }));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to save statuses.");
    } finally {
      setIsSaving(false);
      saveInProgressRef.current = false;
    }
  };

  return (
    <section className="mt-5 rounded-[20px] border border-[#E5E7EB] bg-[#F9FAFB] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="product-section-label text-[#6B7280]">
            Statuses
          </div>
          <h2 className="product-section-title mt-1.5">
            Workflow statuses
          </h2>
          <p className="product-page-subtitle mt-1.5 max-w-[700px]">
            Edit the workflow locally first. Nothing is published until you save changes.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleRestoreDefaults}
            disabled={isSaving}
            className="inline-flex h-10 items-center rounded-full border border-[#f3d5d8] bg-[#fff5f5] px-4 text-sm font-semibold text-red-600 transition hover:border-[#efb8bf] hover:bg-[#ffe8e8] disabled:cursor-not-allowed disabled:opacity-45"
          >
            Restore defaults
          </button>
          <button
            type="button"
            onClick={handleReset}
            disabled={isSaving || !isDirty}
            className="inline-flex h-10 items-center rounded-full border border-[#E5E7EB] bg-white px-4 text-sm font-semibold text-[#4B5563] transition hover:border-[#C7D2FE] hover:bg-[#F9FAFB] hover:text-[#1F2937] disabled:cursor-not-allowed disabled:opacity-45"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={() => void handleSaveChanges()}
            disabled={isSaving || !isDirty}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-slate-900 px-4 text-sm font-semibold !text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:!text-white disabled:opacity-80"
          >
            <Save className="h-4 w-4" />
            {isSaving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 rounded-[18px] border border-[#E5E7EB] bg-white p-3.5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div className="grid gap-3">
          <label className="grid gap-1">
            <span className="text-xs font-semibold text-slate-600">
              {isEditing ? "Rename status" : "Status name"}
            </span>
            <input
              value={draftLabel}
              onChange={(event) => {
                setDraftLabel(event.currentTarget.value);
                if (error) setError(null);
              }}
              placeholder={isEditing ? "Update label" : "Ready for pickup"}
              className={[
                "h-11 rounded-xl border px-3 text-sm outline-none transition",
                isEditing
                  ? "border-[#f4c77d] bg-[#fff8ec] text-slate-900 shadow-[0_0_0_3px_rgba(245,158,11,0.12)] focus:border-[#d97706] focus:ring-2 focus:ring-[#f59e0b]/20"
                  : "border-[#E5E7EB] bg-white focus:border-[#6366F1] focus:ring-2 focus:ring-[#6366F1]/15",
              ].join(" ")}
            />
            <span className="text-[11px] text-slate-400">
              {isEditing
                ? `Internal value stays ${editingValue}`
                : `Value: ${generatedValue || "WILL_BE_GENERATED"}`}
            </span>
          </label>
        </div>

        <div className="grid gap-3">
          <div className="grid gap-1">
            <span className="text-xs font-semibold text-slate-600">Color</span>
            <div className="flex flex-wrap gap-2">
              {STATUS_COLOR_OPTIONS.map((option) => {
                const selected = option.value === draftColor;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setDraftColor(option.value)}
                    className={colorButtonClass(selected)}
                  >
                    <span
                      aria-hidden="true"
                      className="h-3 w-3 rounded-full"
                      style={{ background: option.swatch }}
                    />
                    {option.label}
                    {selected ? <Check className="h-4 w-4" /> : null}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setDraftColor("custom")}
                className={colorButtonClass(draftColor === "custom")}
              >
                <span
                  aria-hidden="true"
                  className="h-3 w-3 rounded-full border border-white/60"
                  style={{
                    background:
                      "conic-gradient(from 0deg, #2563EB 0deg, #DB2777 72deg, #EA580C 144deg, #059669 216deg, #756EAE 288deg, #2563EB 360deg)",
                  }}
                />
                Custom
                {draftColor === "custom" ? <Check className="h-4 w-4" /> : null}
              </button>
            </div>
          </div>

          {draftColor === "custom" ? (
            <label className="flex items-center gap-3 rounded-xl border border-[#E5E7EB] bg-white px-3 py-2">
              <input
                type="color"
                value={customColor}
                onChange={(event) => setCustomColor(event.currentTarget.value.toUpperCase())}
                className="h-8 w-10 cursor-pointer rounded-md border border-[#E5E7EB] bg-white"
              />
              <span className="text-xs font-medium text-slate-500">
                {customColor.toUpperCase()} will be softened for badges while preserving the chosen color.
              </span>
              <span
                aria-hidden="true"
                className="ml-auto h-4 w-4 rounded-full border border-white/60"
                style={{ background: customColorTone.swatch }}
              />
            </label>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleSubmitStatus}
              disabled={!canSubmit}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#2563eb] px-4 text-sm font-semibold !text-white transition hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:!text-white disabled:opacity-80"
            >
              {isEditing ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {isEditing ? "Save status" : "Add to draft"}
            </button>

            {isEditing ? (
              <button
                type="button"
                onClick={resetEditor}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-4 text-sm font-semibold text-[#4B5563] transition hover:border-[#C7D2FE] hover:bg-[#F9FAFB]"
              >
                <X className="h-4 w-4" />
                Cancel
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-[18px] border border-[#E5E7EB] bg-white p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            Active workflow
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => moveWorkflowStatus(-1)}
              disabled={selectedWorkflowIndex <= 0}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#E5E7EB] bg-white text-[#6B7280] transition hover:border-[#C7D2FE] hover:bg-[#F9FAFB] disabled:cursor-not-allowed disabled:opacity-35"
              aria-label="Move selected status left"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => moveWorkflowStatus(1)}
              disabled={selectedWorkflowIndex < 0 || selectedWorkflowIndex >= workflowStatuses.length - 1}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#E5E7EB] bg-white text-[#6B7280] transition hover:border-[#C7D2FE] hover:bg-[#F9FAFB] disabled:cursor-not-allowed disabled:opacity-35"
              aria-label="Move selected status right"
            >
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                if (!selectedWorkflowValue) return;
                toggleWorkflow(selectedWorkflowValue, false);
              }}
              disabled={!selectedWorkflowValue || (selectedWorkflowStatus ? isRequiredWorkflowStatus(selectedWorkflowStatus.value) : false)}
              className="inline-flex h-8 items-center gap-2 rounded-full border border-[#f3d5d8] bg-[#fff5f5] px-3 text-xs font-semibold text-red-600 transition hover:border-[#efb8bf] hover:bg-[#ffe8e8] disabled:cursor-not-allowed disabled:opacity-35"
            >
              <X className="h-3.5 w-3.5" />
              Remove
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {workflowStatuses.map((status, index) => {
            const color = getStatusColorOption(status.color);
            const selected = selectedWorkflowValue === status.value;
            const isDragged = draggedValue === status.value;

            return (
              <Fragment key={status.value}>
                {draggedValue && dragOverIndex === index ? (
                  <div className="h-9 w-6 rounded-full border border-dashed border-slate-400 bg-slate-100" />
                ) : null}

                <div
                  ref={(node) => setWorkflowItemRef(status.value, node)}
                  role="button"
                  tabIndex={0}
                  data-workflow-status={status.value}
                  onPointerDown={(event) => {
                    if (event.button !== 0 || !canManageStatuses) return;
                    const rect = event.currentTarget.getBoundingClientRect();
                    pointerDragRef.current = {
                      value: status.value,
                      startX: event.clientX,
                      startY: event.clientY,
                      dragging: false,
                      offsetX: event.clientX - rect.left,
                      offsetY: event.clientY - rect.top,
                      width: rect.width,
                      height: rect.height,
                    };
                    setSelectedWorkflowValue(status.value);
                    setDragOverIndex(index);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedWorkflowValue(status.value);
                    }
                  }}
                  className="inline-flex cursor-grab select-none items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition active:cursor-grabbing"
                  style={{
                    background: color.background,
                    color: color.color,
                    borderColor: selected ? color.dot : color.selectedBackground,
                    boxShadow: selected ? "0 0 0 2px rgba(17,24,39,0.08)" : "none",
                    opacity: isDragged ? 0.28 : 1,
                    transform: isDragged ? "scale(0.98)" : "none",
                  }}
                >
                  <GripVertical className="pointer-events-none h-3.5 w-3.5 opacity-50" />
                  <span
                    aria-hidden="true"
                    className="pointer-events-none h-2 w-2 rounded-full"
                    style={{ background: color.dot }}
                  />
                  <span className="pointer-events-none">{status.label}</span>
                </div>
              </Fragment>
            );
          })}

          {draggedValue && dragOverIndex === workflowStatuses.length ? (
            <div className="h-9 w-6 rounded-full border border-dashed border-slate-400 bg-slate-100" />
          ) : null}
        </div>
        <div className="mt-2 text-[11px] text-slate-400">
          Click a status to select it. Drag the marker to reorder it anywhere in the active workflow, or use arrows as a fallback.
        </div>
      </div>

      {error ? <div className="mt-2 text-sm font-medium text-red-600">{error}</div> : null}

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            Default statuses
          </div>
          <div className="flex flex-wrap gap-2">
            {draftStatuses
              .filter((status) => status.builtIn)
              .map((status) => {
                const color = getStatusColorOption(status.color);
                const inWorkflow = status.active !== false;
                const isLocked = inWorkflow && isRequiredWorkflowStatus(status.value);
                return (
                  <button
                    key={status.value}
                    type="button"
                    onClick={() => {
                      if (isLocked) return;
                      toggleWorkflow(status.value, !inWorkflow);
                    }}
                    className="inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition"
                    style={{
                      background: color.background,
                      color: color.color,
                      borderColor: inWorkflow ? color.selectedBackground : "#E5E7EB",
                      opacity: inWorkflow ? 1 : 0.55,
                    }}
                  >
                    <span
                      aria-hidden="true"
                      className="h-2 w-2 rounded-full"
                      style={{ background: color.dot }}
                    />
                    {status.label}
                    {isLocked ? (
                      <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                        Locked
                      </span>
                    ) : null}
                  </button>
                );
              })}
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            New, In progress, Done, and Canceled are fixed. Waiting payment can be removed from the active workflow if needed.
          </div>
        </div>

        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            Custom statuses
          </div>
          {customStatuses.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#E5E7EB] bg-white px-4 py-5 text-sm text-[#6B7280]">
              No custom statuses yet. Add your first one to keep the workflow clear for the team.
            </div>
          ) : (
            <div className="grid gap-2">
              {customStatuses.map((status) => {
                const color = getStatusColorOption(status.color);
                const inWorkflow = status.active !== false;
                const editing = editingValue === status.value;

                return (
                  <div
                    key={status.value}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        if (inWorkflow) setSelectedWorkflowValue(status.value);
                      }}
                      className="min-w-0 text-left"
                    >
                      <div
                        className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium"
                        style={{ background: color.background, color: color.color, opacity: inWorkflow ? 1 : 0.55 }}
                      >
                        <span
                          aria-hidden="true"
                          className="h-2 w-2 rounded-full"
                          style={{ background: color.dot }}
                        />
                        {status.label}
                      </div>
                      <div className="mt-1 text-xs uppercase tracking-[0.08em] text-slate-400">
                        {inWorkflow ? "In workflow" : "Inactive"} В· {status.value}
                      </div>
                    </button>

                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => startEditing(status)}
                        className={[
                          "inline-flex h-9 items-center gap-2 rounded-xl border px-3 text-xs font-semibold transition",
                          editing
                            ? "border-slate-900 bg-slate-50 text-slate-900"
                            : "border-[#E5E7EB] bg-white text-[#4B5563] hover:border-[#C7D2FE] hover:bg-[#F9FAFB]",
                        ].join(" ")}
                      >
                        <PencilLine className="h-3.5 w-3.5" />
                        Rename
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleWorkflow(status.value, !inWorkflow)}
                        className={[
                          "inline-flex h-9 items-center gap-2 rounded-xl px-3 text-xs font-semibold transition",
                          inWorkflow
                            ? "border border-[#f3d5d8] bg-[#fff5f5] text-red-600 hover:border-[#efb8bf] hover:bg-[#ffe8e8]"
                            : "border border-[#E5E7EB] bg-white text-[#4B5563] hover:border-[#C7D2FE] hover:bg-[#F9FAFB]",
                        ].join(" ")}
                      >
                        {inWorkflow ? "Remove from workflow" : "Add to workflow"}
                      </button>

                      <button
                        type="button"
                        onClick={() => removeCustomStatusPermanently(status.value)}
                        className="inline-flex h-9 items-center gap-2 rounded-xl border border-[#f3d5d8] bg-[#fff5f5] px-3 text-xs font-semibold text-red-600 transition hover:border-[#efb8bf] hover:bg-[#ffe8e8]"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete forever
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="mt-2 text-[11px] text-slate-400">
            Rename, remove from workflow, or mark a custom status for permanent deletion in the current draft.
          </div>
        </div>
      </div>

      {inactiveStatuses.length > 0 ? (
        <div className="mt-4 text-[11px] text-slate-400">
          Inactive statuses remain available historically and can be returned to the workflow at any time.
        </div>
      ) : null}

      {dragPreview ? (
        <div
          className="pointer-events-none fixed z-50 inline-flex select-none items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium shadow-[0_14px_34px_rgba(15,23,42,0.18)]"
          style={{
            left: dragPreview.x,
            top: dragPreview.y,
            width: dragPreview.width,
            height: dragPreview.height,
            background: getStatusColorOption(
              workflowStatuses.find((status) => status.value === dragPreview.value)?.color ?? "slate",
            ).background,
            color: getStatusColorOption(
              workflowStatuses.find((status) => status.value === dragPreview.value)?.color ?? "slate",
            ).color,
            borderColor: getStatusColorOption(
              workflowStatuses.find((status) => status.value === dragPreview.value)?.color ?? "slate",
            ).dot,
            transform: "rotate(-2deg) scale(1.03)",
          }}
        >
          <GripVertical className="h-3.5 w-3.5 opacity-50" />
          <span
            aria-hidden="true"
            className="h-2 w-2 rounded-full"
            style={{
              background: getStatusColorOption(
                workflowStatuses.find((status) => status.value === dragPreview.value)?.color ?? "slate",
              ).dot,
            }}
          />
          <span>
            {workflowStatuses.find((status) => status.value === dragPreview.value)?.label ?? dragPreview.value}
          </span>
        </div>
      ) : null}
    </section>
  );
}


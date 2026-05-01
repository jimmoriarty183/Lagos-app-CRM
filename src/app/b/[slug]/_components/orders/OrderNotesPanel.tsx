"use client";

import * as React from "react";
import {
  Ellipsis,
  MessageSquareText,
  PencilLine,
  Pin,
  Trash2,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/components/ui/utils";

export type OrderNote = {
  id: string;
  orderId: string;
  businessId: string;
  authorId: string;
  authorName: string;
  authorInitials?: string;
  body: string;
  isPinned: boolean;
  createdAt: string;
  updatedAt?: string;
};

type OrderNoteDraft = {
  body: string;
  isPinned: boolean;
};

type OrderNotesPanelProps = {
  orderId: string;
  notes: OrderNote[];
  canManage: boolean;
  onCreateNote: (draft: OrderNoteDraft) => void;
  onUpdateNote: (noteId: string, draft: OrderNoteDraft) => void;
  onDeleteNote: (noteId: string) => void;
  className?: string;
};

function getInitials(value: string) {
  const initials = value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return initials || "?";
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function sortByCreatedAtDesc(a: OrderNote, b: OrderNote) {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

export function OrderNoteComposer({
  mode,
  initialBody = "",
  initialPinned = false,
  submitLabel,
  onCancel,
  onSubmit,
}: {
  mode: "create" | "edit";
  initialBody?: string;
  initialPinned?: boolean;
  submitLabel: string;
  onCancel: () => void;
  onSubmit: (draft: OrderNoteDraft) => void;
}) {
  const [body, setBody] = React.useState(initialBody);
  const [isPinned, setIsPinned] = React.useState(initialPinned);

  React.useEffect(() => {
    setBody(initialBody);
    setIsPinned(initialPinned);
  }, [initialBody, initialPinned]);

  const trimmedBody = body.trim();

  return (
    <div className="rounded-[24px] border border-[#dfe6ef] dark:border-white/10 bg-white/95 dark:bg-white/[0.05] p-4">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-sm font-semibold text-[#1F2937] dark:text-white/90">
              {mode === "create" ? "New internal note" : "Edit note"}
            </div>
            <p className="mt-1 text-xs leading-5 text-[#6B7280] dark:text-white/55">
              Capture internal context, blockers, or next steps for the order
              team.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsPinned((current) => !current)}
            className={cn(
              "inline-flex h-9 items-center gap-2 rounded-full border px-3 text-xs font-semibold transition",
              isPinned
                ? "border-[#d5ddf6] bg-[#eef2ff] dark:bg-[var(--brand-600)]/15 text-[#3645a0] dark:text-[var(--brand-300)]"
                : "border-[#E5E7EB] dark:border-white/10 bg-[#F9FAFB] dark:bg-white/[0.04] text-[#6B7280] dark:text-white/55 hover:border-[#C7D2FE] dark:hover:border-[var(--brand-500)]/40 hover:bg-white dark:hover:bg-white/[0.07] hover:text-[#374151]",
            )}
            aria-pressed={isPinned}
          >
            <Pin
              className={cn("h-3.5 w-3.5", isPinned ? "fill-current" : "")}
            />
            {isPinned ? "Pinned" : "Pin note"}
          </button>
        </div>

        <Textarea
          value={body}
          onChange={(event) => setBody(event.currentTarget.value)}
          placeholder="Add private notes for this order"
          className="min-h-[112px] rounded-[20px] border-[#E5E7EB] dark:border-white/10 bg-[#F9FAFB] dark:bg-white/[0.04] px-4 py-3 text-sm leading-6 text-[#1F2937] dark:text-white/90 placeholder:text-[#9CA3AF] focus-visible:border-[var(--brand-600)] focus-visible:ring-[var(--brand-600)]/15"
        />

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.04] px-5 text-base font-semibold text-[#374151] dark:text-white/85 transition hover:border-[#C7D2FE] dark:hover:border-[var(--brand-500)]/40 hover:bg-[#F9FAFB] dark:hover:bg-white/[0.08] hover:text-[#1F2937] dark:hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSubmit({ body: trimmedBody, isPinned })}
            disabled={!trimmedBody}
            className="inline-flex h-11 min-w-32 items-center justify-center rounded-xl border border-[var(--brand-600)] bg-[var(--brand-600)] px-5 text-base font-semibold transition hover:bg-[var(--brand-700)] disabled:cursor-not-allowed disabled:border-[#9CA3AF] disabled:bg-[#9CA3AF]"
            style={{ color: "#ffffff" }}
          >
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function OrderNoteItem({
  note,
  canManage,
  isEditing,
  onEdit,
  onDelete,
  onTogglePinned,
  onSave,
  onCancelEdit,
}: {
  note: OrderNote;
  canManage: boolean;
  isEditing: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onTogglePinned: () => void;
  onSave: (draft: OrderNoteDraft) => void;
  onCancelEdit: () => void;
}) {
  const updatedAt = note.updatedAt?.trim();
  const wasEdited = Boolean(updatedAt && updatedAt !== note.createdAt);

  if (isEditing) {
    return (
      <OrderNoteComposer
        mode="edit"
        initialBody={note.body}
        initialPinned={note.isPinned}
        submitLabel="Save note"
        onCancel={onCancelEdit}
        onSubmit={onSave}
      />
    );
  }

  return (
    <article
      className={cn(
        "rounded-[24px] border bg-white/95 dark:bg-white/[0.05] p-4 transition",
        note.isPinned
          ? "border-[#d7dff2] dark:border-[var(--brand-500)]/30 bg-[linear-gradient(180deg,#ffffff_0%,#f8faff_100%)] dark:bg-none dark:bg-[var(--brand-600)]/12"
          : "border-[#e6ebf2] dark:border-white/10 hover:border-[#d9e2ec] dark:hover:border-white/20 hover:bg-white dark:hover:bg-white/[0.07]",
      )}
    >
      <div className="flex items-start gap-3">
        <Avatar className="mt-0.5 h-10 w-10 rounded-2xl">
          <AvatarFallback className="rounded-2xl bg-[#1F2937] text-xs font-semibold text-white">
            {note.authorInitials || getInitials(note.authorName)}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-[#1F2937] dark:text-white/90">
                  {note.authorName}
                </span>
                {note.isPinned ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-[#d5ddf6] bg-[#eef2ff] dark:bg-[var(--brand-600)]/15 px-2.5 py-1 text-[11px] font-semibold text-[#3645a0] dark:text-[var(--brand-300)]">
                    <Pin className="h-3 w-3 fill-current" />
                    Pinned
                  </span>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#9CA3AF] dark:text-white/40">
                <span>{formatDateTime(note.createdAt)}</span>
                {wasEdited ? (
                  <span>Edited {formatDateTime(updatedAt!)}</span>
                ) : null}
              </div>
            </div>

            {canManage ? (
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-transparent bg-[#F9FAFB] dark:bg-white/[0.04] text-[#6B7280] dark:text-white/55 transition hover:border-[#E5E7EB] dark:hover:border-white/15 hover:bg-white dark:hover:bg-white/[0.07] hover:text-[#1F2937] dark:hover:text-white"
                    aria-label={`Manage note from ${note.authorName}`}
                  >
                    <Ellipsis className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-40 rounded-xl border-[#E5E7EB] dark:border-white/10"
                >
                  <DropdownMenuItem onSelect={onEdit}>
                    <PencilLine className="h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={onTogglePinned}>
                    <Pin
                      className={cn(
                        "h-4 w-4",
                        note.isPinned ? "fill-current" : "",
                      )}
                    />
                    {note.isPinned ? "Unpin" : "Pin"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={onDelete} variant="destructive">
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>

          <div className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#374151]">
            {note.body}
          </div>
        </div>
      </div>
    </article>
  );
}

export function OrderNotesEmptyState({
  canManage,
  onAddFirstNote,
}: {
  canManage: boolean;
  onAddFirstNote: () => void;
}) {
  return (
    <div className="rounded-[24px] border border-dashed border-[#E5E7EB] dark:border-white/10 bg-white/80 dark:bg-white/[0.05] px-5 py-8 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F9FAFB] dark:bg-white/[0.04] text-[#6B7280] dark:text-white/55">
        <MessageSquareText className="h-5 w-5" />
      </div>
      <div className="mt-3 text-sm font-semibold text-[#1F2937] dark:text-white/90">
        No notes yet
      </div>
      <p className="mt-1 text-sm leading-6 text-[#6B7280] dark:text-white/55">
        Add internal notes so the team keeps context, decisions, and handoffs in
        one place.
      </p>
      {canManage ? (
        <button
          type="button"
          onClick={onAddFirstNote}
          className="mt-4 inline-flex h-11 min-w-40 items-center justify-center rounded-[18px] border border-[var(--brand-600)] bg-[var(--brand-600)] px-5 text-base font-semibold shadow-[0_8px_18px_rgba(91,91,179,0.18)] transition hover:bg-[var(--brand-700)]"
          style={{ color: "#ffffff" }}
        >
          Add first note
        </button>
      ) : null}
    </div>
  );
}

export function OrderNotesPanel({
  orderId,
  notes,
  canManage,
  onCreateNote,
  onUpdateNote,
  onDeleteNote,
  className,
}: OrderNotesPanelProps) {
  const [composerMode, setComposerMode] = React.useState<
    "create" | "edit" | null
  >(null);
  const [editingNoteId, setEditingNoteId] = React.useState<string | null>(null);

  React.useEffect(() => {
    setComposerMode(null);
    setEditingNoteId(null);
  }, [orderId]);

  const pinnedNotes = React.useMemo(
    () => notes.filter((note) => note.isPinned).sort(sortByCreatedAtDesc),
    [notes],
  );
  const regularNotes = React.useMemo(
    () => notes.filter((note) => !note.isPinned).sort(sortByCreatedAtDesc),
    [notes],
  );
  const editingNote = notes.find((note) => note.id === editingNoteId) ?? null;

  const openCreateComposer = () => {
    setEditingNoteId(null);
    setComposerMode("create");
  };

  const handleCancelComposer = () => {
    setComposerMode(null);
    setEditingNoteId(null);
  };

  const handleCreate = (draft: OrderNoteDraft) => {
    onCreateNote(draft);
    setComposerMode(null);
  };

  const handleSaveEdit = (draft: OrderNoteDraft) => {
    if (!editingNoteId) return;
    onUpdateNote(editingNoteId, draft);
    setEditingNoteId(null);
    setComposerMode(null);
  };

  const beginEdit = (noteId: string) => {
    setEditingNoteId(noteId);
    setComposerMode("edit");
  };

  const noteCountLabel = `${notes.length} ${notes.length === 1 ? "note" : "notes"}`;

  return (
    <section
      className={cn(
        "rounded-[28px] border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.04] p-4 shadow-[0_10px_30px_rgba(15,23,42,0.06)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.45)] sm:p-5",
        className,
      )}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div>
              <div className="product-section-title flex items-center gap-2">
                <MessageSquareText className="h-4 w-4 text-[#6B7280] dark:text-white/55" />
                <span>Internal notes</span>
              </div>
              <p className="mt-1 text-sm text-[#6B7280] dark:text-white/55">
                Private notes visible only to managers
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
              <span className="inline-flex items-center rounded-full bg-[#EEF2FF] dark:bg-[var(--brand-600)]/15 px-3 py-1 text-[#374151]">
                {noteCountLabel}
              </span>
              {pinnedNotes.length > 0 ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F9FAFB] dark:bg-white/[0.04] px-3 py-1 text-[#4B5563] dark:text-white/70">
                  <Pin className="h-3.5 w-3.5 fill-current text-[var(--brand-600)]" />
                  {pinnedNotes.length} pinned
                </span>
              ) : null}
            </div>
          </div>

          {canManage ? (
            <button
              type="button"
              onClick={openCreateComposer}
              className="inline-flex h-11 items-center justify-center rounded-[18px] border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-white/[0.04] px-5 text-base font-semibold text-[#374151] dark:text-white/85 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition hover:border-[#C7D2FE] dark:hover:border-[var(--brand-500)]/40 hover:bg-[#F9FAFB] dark:hover:bg-white/[0.08] hover:text-[#1F2937] dark:hover:text-white"
            >
              Add note
            </button>
          ) : null}
        </div>

        {canManage && composerMode === "create" ? (
          <OrderNoteComposer
            mode="create"
            submitLabel="Save note"
            onCancel={handleCancelComposer}
            onSubmit={handleCreate}
          />
        ) : null}

        {!canManage ? (
          <div className="rounded-[24px] border border-[#E5E7EB] dark:border-white/10 bg-white/85 dark:bg-white/[0.04] px-5 py-6 text-sm leading-6 text-[#6B7280] dark:text-white/55">
            Only managers can view and add internal notes for this order.
          </div>
        ) : notes.length === 0 ? (
          <OrderNotesEmptyState
            canManage={canManage}
            onAddFirstNote={openCreateComposer}
          />
        ) : (
          <div className="space-y-3">
            {pinnedNotes.length > 0 ? (
              <div className="space-y-3">
                <div className="product-section-label flex items-center gap-2 px-1">
                  <Pin className="h-3.5 w-3.5 text-[#6B7280] dark:text-white/55" />
                  Pinned notes
                </div>
                {pinnedNotes.map((note) => (
                  <OrderNoteItem
                    key={note.id}
                    note={note}
                    canManage={canManage}
                    isEditing={editingNote?.id === note.id}
                    onEdit={() => beginEdit(note.id)}
                    onDelete={() => onDeleteNote(note.id)}
                    onTogglePinned={() =>
                      onUpdateNote(note.id, {
                        body: note.body,
                        isPinned: !note.isPinned,
                      })
                    }
                    onSave={handleSaveEdit}
                    onCancelEdit={handleCancelComposer}
                  />
                ))}
              </div>
            ) : null}

            {regularNotes.length > 0 ? (
              <div className="space-y-3">
                {pinnedNotes.length > 0 ? (
                  <div className="product-section-label flex items-center gap-2 px-1 pt-1">
                    Recent notes
                  </div>
                ) : null}
                {regularNotes.map((note) => (
                  <OrderNoteItem
                    key={note.id}
                    note={note}
                    canManage={canManage}
                    isEditing={editingNote?.id === note.id}
                    onEdit={() => beginEdit(note.id)}
                    onDelete={() => onDeleteNote(note.id)}
                    onTogglePinned={() =>
                      onUpdateNote(note.id, {
                        body: note.body,
                        isPinned: !note.isPinned,
                      })
                    }
                    onSave={handleSaveEdit}
                    onCancelEdit={handleCancelComposer}
                  />
                ))}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}

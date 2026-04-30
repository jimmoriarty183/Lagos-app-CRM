"use client";

import { useState } from "react";
import type { SurveyOption } from "@/lib/campaigns/types";

type Props = {
  questionId: string;
  options: SurveyOption[];
  onCreated: (option: SurveyOption) => void;
  onUpdated: (option: SurveyOption) => void;
  onDeleted: (optionId: string) => void;
};

async function safeJson<T>(response: Response): Promise<T | null> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export function SurveyOptionEditor({
  questionId,
  options,
  onCreated,
  onUpdated,
  onDeleted,
}: Props) {
  const [label, setLabel] = useState("");
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingOptionId, setEditingOptionId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editValue, setEditValue] = useState("");
  const [actionBusy, setActionBusy] = useState(false);

  const submit = async () => {
    if (!label.trim()) {
      setError("Введите вариант ответа");
      return;
    }
    setBusy(true);
    setError(null);

    const response = await fetch(`/api/admin/questions/${questionId}/options`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        optionOrder: options.length + 1,
        label: label.trim(),
        value: value.trim() || null,
      }),
    });
    const json = await safeJson<{
      ok: boolean;
      option?: SurveyOption;
      error?: string;
    }>(response);

    if (!response.ok || !json?.ok || !json.option) {
      setError(json?.error ?? "Не удалось создать вариант");
      setBusy(false);
      return;
    }

    onCreated(json.option);
    setLabel("");
    setValue("");
    setBusy(false);
  };

  const startEditing = (option: SurveyOption) => {
    setEditingOptionId(option.id);
    setEditLabel(option.label);
    setEditValue(option.value ?? "");
    setError(null);
  };

  const saveEditing = async () => {
    if (!editingOptionId) return;
    const normalizedLabel = editLabel.trim();
    if (!normalizedLabel) {
      setError("Введите текст варианта ответа");
      return;
    }
    setActionBusy(true);
    setError(null);
    const response = await fetch(
      `/api/admin/questions/${questionId}/options/${editingOptionId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: normalizedLabel,
          value: editValue.trim() || null,
        }),
      },
    );
    const json = await safeJson<{
      ok: boolean;
      option?: SurveyOption;
      error?: string;
    }>(response);
    if (!response.ok || !json?.ok || !json.option) {
      setError(json?.error ?? "Не удалось обновить вариант");
      setActionBusy(false);
      return;
    }
    onUpdated(json.option);
    setEditingOptionId(null);
    setActionBusy(false);
  };

  const removeOption = async (optionId: string) => {
    setActionBusy(true);
    setError(null);
    const response = await fetch(
      `/api/admin/questions/${questionId}/options/${optionId}`,
      {
        method: "DELETE",
      },
    );
    const json = await safeJson<{ ok: boolean; error?: string }>(response);
    if (!response.ok || !json?.ok) {
      setError(json?.error ?? "Не удалось удалить вариант");
      setActionBusy(false);
      return;
    }
    onDeleted(optionId);
    if (editingOptionId === optionId) setEditingOptionId(null);
    setActionBusy(false);
  };

  return (
    <div className="space-y-2 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.04] p-3">
      <div className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-white/55">
        Варианты ответов
      </div>
      <div className="space-y-2">
        {options.map((option) => {
          const isEditing = editingOptionId === option.id;
          return (
            <div
              key={option.id}
              className="rounded-md border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] px-3 py-2 text-sm text-slate-700 dark:text-white/80"
            >
              {isEditing ? (
                <div className="space-y-2">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input
                      value={editLabel}
                      onChange={(event) => setEditLabel(event.target.value)}
                      placeholder="Текст варианта"
                      className="h-9 rounded-md border border-slate-200 dark:border-white/10 px-2 text-xs"
                    />
                    <input
                      value={editValue}
                      onChange={(event) => setEditValue(event.target.value)}
                      placeholder="Значение (необязательно)"
                      className="h-9 rounded-md border border-slate-200 dark:border-white/10 px-2 text-xs"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={saveEditing}
                      disabled={actionBusy}
                      className="inline-flex h-8 items-center rounded-md bg-[var(--brand-600)] px-2.5 text-xs font-semibold text-white disabled:opacity-60"
                    >
                      Сохранить
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingOptionId(null)}
                      disabled={actionBusy}
                      className="inline-flex h-8 items-center rounded-md border border-slate-300 dark:border-white/15 bg-white dark:bg-white/[0.03] px-2.5 text-xs font-semibold text-slate-700 dark:text-white/80 disabled:opacity-60"
                    >
                      Отмена
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <span>
                    {option.optionOrder}. {option.label}
                  </span>
                  <span className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => startEditing(option)}
                      disabled={actionBusy}
                      className="text-xs font-medium text-[var(--brand-700)] hover:text-[var(--brand-800)] disabled:opacity-60"
                    >
                      Изменить
                    </button>
                    <button
                      type="button"
                      onClick={() => removeOption(option.id)}
                      disabled={actionBusy}
                      className="text-xs font-medium text-rose-600 hover:text-rose-700 disabled:opacity-60"
                    >
                      Удалить
                    </button>
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <input
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          placeholder="Текст варианта"
          className="h-10 rounded-lg border border-slate-200 dark:border-white/10 px-3 text-sm"
        />
        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Значение (необязательно)"
          className="h-10 rounded-lg border border-slate-200 dark:border-white/10 px-3 text-sm"
        />
      </div>
      {error ? <div className="text-xs text-rose-600">{error}</div> : null}
      <button
        type="button"
        onClick={submit}
        disabled={busy}
        className="inline-flex h-9 items-center rounded-lg bg-slate-900 px-3 text-xs font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60"
      >
        {busy ? "Сохранение..." : "Добавить вариант"}
      </button>
    </div>
  );
}

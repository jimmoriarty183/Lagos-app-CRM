"use client";

import { useState } from "react";
import type { SurveyOption } from "@/lib/campaigns/types";

type Props = {
  questionId: string;
  options: SurveyOption[];
  onCreated: (option: SurveyOption) => void;
};

async function safeJson<T>(response: Response): Promise<T | null> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export function SurveyOptionEditor({ questionId, options, onCreated }: Props) {
  const [label, setLabel] = useState("");
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    const json = await safeJson<{ ok: boolean; option?: SurveyOption; error?: string }>(response);

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

  return (
    <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Варианты ответов</div>
      <div className="space-y-2">
        {options.map((option) => (
          <div key={option.id} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
            {option.optionOrder}. {option.label}
          </div>
        ))}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <input
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          placeholder="Текст варианта"
          className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
        />
        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Значение (необязательно)"
          className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
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

"use client";

import { useState } from "react";
import { SurveyOptionEditor } from "@/components/campaigns/SurveyOptionEditor";
import type { SurveyOption, SurveyQuestion, SurveyQuestionType } from "@/lib/campaigns/types";

type Props = {
  campaignId: string;
  initialQuestions: SurveyQuestion[];
};

async function safeJson<T>(response: Response): Promise<T | null> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

const QUESTION_TYPES: SurveyQuestionType[] = ["single_choice", "multiple_choice", "yes_no", "rating_1_5"];

export function SurveyQuestionEditor({ campaignId, initialQuestions }: Props) {
  const [questions, setQuestions] = useState<SurveyQuestion[]>(initialQuestions);
  const [title, setTitle] = useState("");
  const [questionType, setQuestionType] = useState<SurveyQuestionType>("single_choice");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTypeHelp, setShowTypeHelp] = useState(false);
  const questionTypeLabel: Record<SurveyQuestionType, string> = {
    single_choice: "Один вариант",
    multiple_choice: "Несколько вариантов",
    yes_no: "Да/Нет",
    rating_1_5: "Оценка 1-5",
  };

  const createQuestion = async () => {
    if (!title.trim()) {
      setError("Введите текст вопроса");
      return;
    }
    setBusy(true);
    setError(null);

    const response = await fetch(`/api/admin/campaigns/${campaignId}/questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        questionOrder: questions.length + 1,
        questionType,
        title: title.trim(),
      }),
    });
    const json = await safeJson<{ ok: boolean; question?: SurveyQuestion; error?: string }>(response);
    if (!response.ok || !json?.ok || !json.question) {
      setError(json?.error ?? "Не удалось создать вопрос");
      setBusy(false);
      return;
    }

    setQuestions((current) => [...current, json.question as SurveyQuestion]);
    setTitle("");
    setBusy(false);
  };

  const onOptionCreated = (questionId: string, option: SurveyOption) => {
    setQuestions((current) =>
      current.map((question) =>
        question.id === questionId ? { ...question, options: [...question.options, option] } : question,
      ),
    );
  };

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2">
        <div className="text-sm font-semibold text-slate-900">Вопросы опроса</div>
        <button
          type="button"
          onClick={() => setShowTypeHelp((current) => !current)}
          aria-expanded={showTypeHelp}
          aria-label="Показать подсказку по типам вопросов"
          className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-300 bg-white text-xs font-bold text-slate-700"
        >
          ?
        </button>
      </div>
      {showTypeHelp ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
          <div><b>Один вариант</b>: пользователь выбирает только один ответ.</div>
          <div><b>Несколько вариантов</b>: можно выбрать несколько ответов.</div>
          <div><b>Да/Нет</b>: два варианта ответа.</div>
          <div><b>Оценка 1-5</b>: оценка по шкале от 1 до 5.</div>
        </div>
      ) : null}

      <div className="grid gap-2 md:grid-cols-[1fr_180px_auto]">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Текст вопроса"
          className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
        />
        <select
          value={questionType}
          onChange={(event) => setQuestionType(event.target.value as SurveyQuestionType)}
          className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
        >
          {QUESTION_TYPES.map((value) => (
            <option key={value} value={value}>
              {questionTypeLabel[value]}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={createQuestion}
          disabled={busy}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-60"
          >
            {busy ? "Сохранение..." : "Добавить вопрос"}
          </button>
      </div>

      {error ? <div className="text-sm text-rose-600">{error}</div> : null}

      {questions.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">
          Вопросов пока нет
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map((question) => (
            <div key={question.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="text-sm font-semibold text-slate-900">
                {question.questionOrder}. {question.title}
              </div>
              <div className="mt-1 text-xs uppercase tracking-[0.08em] text-slate-500">{questionTypeLabel[question.questionType]}</div>
              <div className="mt-3">
                <SurveyOptionEditor
                  questionId={question.id}
                  options={question.options}
                  onCreated={(option) => onOptionCreated(question.id, option)}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

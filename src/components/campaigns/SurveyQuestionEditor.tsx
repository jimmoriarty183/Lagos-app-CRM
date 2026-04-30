"use client";

import { useState } from "react";
import { SurveyOptionEditor } from "@/components/campaigns/SurveyOptionEditor";
import type {
  SurveyOption,
  SurveyQuestion,
  SurveyQuestionType,
} from "@/lib/campaigns/types";

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

const QUESTION_TYPES: SurveyQuestionType[] = [
  "single_choice",
  "multiple_choice",
  "yes_no",
  "rating_1_5",
];

export function SurveyQuestionEditor({ campaignId, initialQuestions }: Props) {
  const [questions, setQuestions] =
    useState<SurveyQuestion[]>(initialQuestions);
  const [title, setTitle] = useState("");
  const [questionType, setQuestionType] =
    useState<SurveyQuestionType>("single_choice");
  const [busy, setBusy] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTypeHelp, setShowTypeHelp] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(
    null,
  );
  const [editQuestionTitle, setEditQuestionTitle] = useState("");
  const [editQuestionType, setEditQuestionType] =
    useState<SurveyQuestionType>("single_choice");
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

    const response = await fetch(
      `/api/admin/campaigns/${campaignId}/questions`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionOrder: questions.length + 1,
          questionType,
          title: title.trim(),
        }),
      },
    );
    const json = await safeJson<{
      ok: boolean;
      question?: SurveyQuestion;
      error?: string;
    }>(response);
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
        question.id === questionId
          ? { ...question, options: [...question.options, option] }
          : question,
      ),
    );
  };

  const onOptionUpdated = (questionId: string, option: SurveyOption) => {
    setQuestions((current) =>
      current.map((question) =>
        question.id === questionId
          ? {
              ...question,
              options: question.options.map((candidate) =>
                candidate.id === option.id ? option : candidate,
              ),
            }
          : question,
      ),
    );
  };

  const onOptionDeleted = (questionId: string, optionId: string) => {
    setQuestions((current) =>
      current.map((question) =>
        question.id === questionId
          ? {
              ...question,
              options: question.options.filter(
                (option) => option.id !== optionId,
              ),
            }
          : question,
      ),
    );
  };

  const startEditingQuestion = (question: SurveyQuestion) => {
    setEditingQuestionId(question.id);
    setEditQuestionTitle(question.title);
    setEditQuestionType(question.questionType);
    setError(null);
  };

  const saveQuestion = async () => {
    if (!editingQuestionId) return;
    const normalizedTitle = editQuestionTitle.trim();
    if (!normalizedTitle) {
      setError("Введите текст вопроса");
      return;
    }
    setActionBusy(true);
    setError(null);
    const response = await fetch(
      `/api/admin/campaigns/${campaignId}/questions/${editingQuestionId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: normalizedTitle,
          questionType: editQuestionType,
        }),
      },
    );
    const json = await safeJson<{
      ok: boolean;
      question?: SurveyQuestion;
      error?: string;
    }>(response);
    if (!response.ok || !json?.ok || !json.question) {
      setError(json?.error ?? "Не удалось обновить вопрос");
      setActionBusy(false);
      return;
    }
    setQuestions((current) =>
      current.map((question) =>
        question.id === editingQuestionId
          ? {
              ...question,
              title: json.question!.title,
              questionType: json.question!.questionType,
            }
          : question,
      ),
    );
    setEditingQuestionId(null);
    setActionBusy(false);
  };

  const removeQuestion = async (questionId: string) => {
    setActionBusy(true);
    setError(null);
    const response = await fetch(
      `/api/admin/campaigns/${campaignId}/questions/${questionId}`,
      {
        method: "DELETE",
      },
    );
    const json = await safeJson<{ ok: boolean; error?: string }>(response);
    if (!response.ok || !json?.ok) {
      setError(json?.error ?? "Не удалось удалить вопрос");
      setActionBusy(false);
      return;
    }
    setQuestions((current) =>
      current.filter((question) => question.id !== questionId),
    );
    if (editingQuestionId === questionId) setEditingQuestionId(null);
    setActionBusy(false);
  };

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-4">
      <div className="flex items-center gap-2">
        <div className="text-sm font-semibold text-slate-900 dark:text-white">
          Вопросы опроса
        </div>
        <button
          type="button"
          onClick={() => setShowTypeHelp((current) => !current)}
          aria-expanded={showTypeHelp}
          aria-label="Показать подсказку по типам вопросов"
          className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-300 dark:border-white/15 bg-white dark:bg-white/[0.03] text-xs font-bold text-slate-700 dark:text-white/80"
        >
          ?
        </button>
      </div>
      {showTypeHelp ? (
        <div className="rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.04] px-3 py-2 text-xs text-slate-700 dark:text-white/80">
          <div>
            <b>Один вариант</b>: пользователь выбирает только один ответ.
          </div>
          <div>
            <b>Несколько вариантов</b>: можно выбрать несколько ответов.
          </div>
          <div>
            <b>Да/Нет</b>: два варианта ответа.
          </div>
          <div>
            <b>Оценка 1-5</b>: оценка по шкале от 1 до 5.
          </div>
        </div>
      ) : null}

      <div className="grid gap-2 md:grid-cols-[1fr_180px_auto]">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Текст вопроса"
          className="h-10 rounded-lg border border-slate-200 dark:border-white/10 px-3 text-sm"
        />
        <select
          value={questionType}
          onChange={(event) =>
            setQuestionType(event.target.value as SurveyQuestionType)
          }
          className="h-10 rounded-lg border border-slate-200 dark:border-white/10 px-3 text-sm"
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
          className="inline-flex h-10 items-center justify-center rounded-lg bg-[var(--brand-600)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--brand-700)] disabled:opacity-60"
        >
          {busy ? "Сохранение..." : "Добавить вопрос"}
        </button>
      </div>

      {error ? <div className="text-sm text-rose-600">{error}</div> : null}

      {questions.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-white/[0.04] px-3 py-6 text-center text-sm text-slate-500 dark:text-white/55">
          Вопросов пока нет
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map((question) => (
            <div
              key={question.id}
              className="rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.04] p-3"
            >
              <div className="text-sm font-semibold text-slate-900 dark:text-white">
                {question.questionOrder}. {question.title}
              </div>
              <div className="mt-1 text-xs uppercase tracking-[0.08em] text-slate-500 dark:text-white/55">
                {questionTypeLabel[question.questionType]}
              </div>
              <div className="mt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => startEditingQuestion(question)}
                  disabled={actionBusy}
                  className="text-xs font-medium text-[var(--brand-700)] hover:text-[var(--brand-800)] disabled:opacity-60"
                >
                  Изменить вопрос
                </button>
                <button
                  type="button"
                  onClick={() => removeQuestion(question.id)}
                  disabled={actionBusy}
                  className="text-xs font-medium text-rose-600 hover:text-rose-700 disabled:opacity-60"
                >
                  Удалить вопрос
                </button>
              </div>
              {editingQuestionId === question.id ? (
                <div className="mt-2 space-y-2 rounded-md border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-2">
                  <div className="grid gap-2 md:grid-cols-[1fr_180px_auto]">
                    <input
                      value={editQuestionTitle}
                      onChange={(event) =>
                        setEditQuestionTitle(event.target.value)
                      }
                      className="h-9 rounded-md border border-slate-200 dark:border-white/10 px-2 text-xs"
                    />
                    <select
                      value={editQuestionType}
                      onChange={(event) =>
                        setEditQuestionType(
                          event.target.value as SurveyQuestionType,
                        )
                      }
                      className="h-9 rounded-md border border-slate-200 dark:border-white/10 px-2 text-xs"
                    >
                      {QUESTION_TYPES.map((value) => (
                        <option key={value} value={value}>
                          {questionTypeLabel[value]}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={saveQuestion}
                      disabled={actionBusy}
                      className="inline-flex h-9 items-center justify-center rounded-md bg-[var(--brand-600)] px-3 text-xs font-semibold text-white disabled:opacity-60"
                    >
                      Сохранить
                    </button>
                  </div>
                </div>
              ) : null}
              <div className="mt-3">
                <SurveyOptionEditor
                  questionId={question.id}
                  options={question.options}
                  onCreated={(option) => onOptionCreated(question.id, option)}
                  onUpdated={(option) => onOptionUpdated(question.id, option)}
                  onDeleted={(optionId) =>
                    onOptionDeleted(question.id, optionId)
                  }
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
